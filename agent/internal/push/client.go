package push

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	"github.com/your-org/app-tracker/agent/internal/collector"
	"github.com/your-org/app-tracker/agent/internal/config"
)

// Client handles pushing data to the backend server via WebSocket
type Client struct {
	cfg      *config.Config
	manager  *collector.Manager
	logger   *zap.Logger

	conn     *websocket.Conn
	connMu   sync.Mutex
	agentID  string

	stopCh   chan struct{}
	doneCh   chan struct{}
}

// NewClient creates a new push client
func NewClient(cfg *config.Config, manager *collector.Manager, logger *zap.Logger) *Client {
	return &Client{
		cfg:     cfg,
		manager: manager,
		logger:  logger,
		stopCh:  make(chan struct{}),
		doneCh:  make(chan struct{}),
	}
}

// Start begins the push loop
func (c *Client) Start(ctx context.Context) error {
	c.logger.Info("starting push client",
		zap.String("server_url", c.cfg.Push.ServerURL),
		zap.Duration("interval", c.cfg.Push.Interval),
	)

	// Use agent ID from environment or generate one
	c.agentID = c.cfg.Server
	if c.agentID == "" {
		c.agentID = fmt.Sprintf("agent-%d", time.Now().UnixNano())
	}

	// Try to get agent ID from env
	// The agent ID should be configured or registered
	c.agentID = getAgentID(c.cfg)

	// Initial connection
	if err := c.connect(); err != nil {
		c.logger.Warn("initial connection failed, will retry", zap.Error(err))
	}

	// Start push loop
	go c.pushLoop(ctx)

	return nil
}

func getAgentID(cfg *config.Config) string {
	// Try environment variable first
	// If not set, use a combination of server URL hash
	if cfg.Token != "" {
		// Use token as identifier hint
		return fmt.Sprintf("agent-%s", cfg.Token[:8])
	}
	return fmt.Sprintf("agent-%d", time.Now().UnixNano()%1000000)
}

// Stop stops the push client
func (c *Client) Stop() {
	close(c.stopCh)
	<-c.doneCh
}

func (c *Client) connect() error {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	// Close existing connection if any
	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
	}

	// Build WebSocket URL
	wsURL := c.cfg.Push.ServerURL
	if wsURL == "" {
		return fmt.Errorf("push server URL not configured")
	}

	c.logger.Debug("connecting to server", zap.String("url", wsURL))

	// Create dialer with headers
	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	headers := http.Header{}
	if c.cfg.Token != "" {
		headers.Set("Authorization", "Bearer "+c.cfg.Token)
	}

	conn, resp, err := dialer.Dial(wsURL, headers)
	if err != nil {
		if resp != nil {
			return fmt.Errorf("websocket dial failed: %w (status: %d)", err, resp.StatusCode)
		}
		return fmt.Errorf("websocket dial failed: %w", err)
	}

	c.conn = conn
	c.logger.Info("connected to server", zap.String("url", wsURL))

	// Start reading messages (for pong, errors, etc.)
	go c.readLoop()

	return nil
}

func (c *Client) readLoop() {
	conn := c.conn
	if conn == nil {
		return
	}

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				c.logger.Warn("websocket read error", zap.Error(err))
			}
			return
		}

		// Handle server messages (e.g., pong, commands)
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err == nil {
			msgType, _ := msg["type"].(string)
			c.logger.Debug("received message from server", zap.String("type", msgType))
		}
	}
}

func (c *Client) pushLoop(ctx context.Context) {
	defer close(c.doneCh)

	ticker := time.NewTicker(c.cfg.Push.Interval)
	defer ticker.Stop()

	// Send initial data
	c.sendData()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("push loop stopped (context canceled)")
			c.closeConnection()
			return
		case <-c.stopCh:
			c.logger.Info("push loop stopped")
			c.closeConnection()
			return
		case <-ticker.C:
			c.sendData()
		}
	}
}

func (c *Client) sendData() {
	data := c.manager.GetLatestData()
	if data == nil {
		return
	}

	// Build message in format expected by server
	message := map[string]interface{}{
		"type": "agent_data",
		"payload": map[string]interface{}{
			"agentId":      c.agentID,
			"timestamp":    data.Timestamp.Format(time.RFC3339),
			"processes":    data.Processes,
			"ports":        data.Ports,
			"system":       data.System,
			"systemdUnits": data.SystemdUnits,
			"containers":   data.Containers,
			"pods":         data.Pods,
		},
	}

	c.connMu.Lock()
	conn := c.conn
	c.connMu.Unlock()

	if conn == nil {
		// Try to reconnect
		if err := c.connect(); err != nil {
			c.logger.Warn("reconnection failed", zap.Error(err))
			return
		}
		c.connMu.Lock()
		conn = c.conn
		c.connMu.Unlock()
	}

	if conn == nil {
		return
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		c.logger.Error("failed to marshal data", zap.Error(err))
		return
	}

	if err := conn.WriteMessage(websocket.TextMessage, messageBytes); err != nil {
		c.logger.Warn("failed to send data", zap.Error(err))
		// Connection might be broken, clear it to trigger reconnect
		c.connMu.Lock()
		if c.conn == conn {
			c.conn.Close()
			c.conn = nil
		}
		c.connMu.Unlock()
		return
	}

	c.logger.Debug("data sent to server",
		zap.Int("processes", len(data.Processes)),
		zap.Int("ports", len(data.Ports)),
		zap.Int("containers", len(data.Containers)),
	)
}

func (c *Client) closeConnection() {
	c.connMu.Lock()
	defer c.connMu.Unlock()

	if c.conn != nil {
		c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		c.conn.Close()
		c.conn = nil
	}
}
