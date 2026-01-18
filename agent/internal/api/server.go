package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	"github.com/your-org/app-tracker/agent/internal/collector"
	"github.com/your-org/app-tracker/agent/internal/config"
)

// Server is the HTTP/WebSocket API server
type Server struct {
	cfg      *config.Config
	manager  *collector.Manager
	logger   *zap.Logger
	server   *http.Server
	upgrader websocket.Upgrader

	// Prometheus metrics
	requestsTotal   *prometheus.CounterVec
	requestDuration *prometheus.HistogramVec
	activeWS        prometheus.Gauge
}

// NewServer creates a new API server
func NewServer(cfg *config.Config, manager *collector.Manager, logger *zap.Logger) *Server {
	s := &Server{
		cfg:     cfg,
		manager: manager,
		logger:  logger,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins (configure for production)
			},
		},
	}

	s.initMetrics()
	return s
}

func (s *Server) initMetrics() {
	s.requestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "agent_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	s.requestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "agent_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	s.activeWS = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "agent_websocket_connections_active",
			Help: "Number of active WebSocket connections",
		},
	)

	prometheus.MustRegister(s.requestsTotal, s.requestDuration, s.activeWS)
}

// Start starts the API server
func (s *Server) Start() error {
	router := mux.NewRouter()

	// Middleware
	router.Use(s.loggingMiddleware)
	router.Use(s.authMiddleware)

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()
	api.HandleFunc("/health", s.handleHealth).Methods("GET")
	api.HandleFunc("/data", s.handleData).Methods("GET")
	api.HandleFunc("/processes", s.handleProcesses).Methods("GET")
	api.HandleFunc("/ports", s.handlePorts).Methods("GET")
	api.HandleFunc("/system", s.handleSystem).Methods("GET")
	api.HandleFunc("/containers", s.handleContainers).Methods("GET")
	api.HandleFunc("/systemd", s.handleSystemd).Methods("GET")
	api.HandleFunc("/pods", s.handlePods).Methods("GET")

	// WebSocket for real-time updates
	api.HandleFunc("/ws", s.handleWebSocket).Methods("GET")

	// Prometheus metrics
	router.Handle("/metrics", promhttp.Handler())

	s.server = &http.Server{
		Addr:         s.cfg.Listen,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	s.logger.Info("starting API server", zap.String("addr", s.cfg.Listen))

	if s.cfg.TLS.Enabled {
		return s.server.ListenAndServeTLS(s.cfg.TLS.CertFile, s.cfg.TLS.KeyFile)
	}

	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
		
		next.ServeHTTP(wrapped, r)
		
		duration := time.Since(start)
		s.logger.Debug("request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", wrapped.statusCode),
			zap.Duration("duration", duration),
		)

		s.requestsTotal.WithLabelValues(r.Method, r.URL.Path, fmt.Sprintf("%d", wrapped.statusCode)).Inc()
		s.requestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration.Seconds())
	})
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for health and metrics endpoints
		if r.URL.Path == "/api/v1/health" || r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		// Check for token if configured
		if s.cfg.Token != "" {
			token := r.Header.Get("Authorization")
			if token == "" {
				token = r.URL.Query().Get("token")
			}

			// Strip "Bearer " prefix if present
			if len(token) > 7 && token[:7] == "Bearer " {
				token = token[7:]
			}

			if token != s.cfg.Token {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":     "ok",
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"version":    "1.0.0",
		"collectors": len(s.manager.GetCollectors()),
	}

	s.writeJSON(w, response)
}

func (s *Server) handleData(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data)
}

func (s *Server) handleProcesses(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data.Processes)
}

func (s *Server) handlePorts(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data.Ports)
}

func (s *Server) handleSystem(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data.System)
}

func (s *Server) handleContainers(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data.Containers)
}

func (s *Server) handleSystemd(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data.SystemdUnits)
}

func (s *Server) handlePods(w http.ResponseWriter, r *http.Request) {
	data := s.manager.GetLatestData()
	s.writeJSON(w, data.Pods)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error("websocket upgrade failed", zap.Error(err))
		return
	}
	defer conn.Close()

	s.activeWS.Inc()
	defer s.activeWS.Dec()

	// Subscribe to updates
	updateCh := s.manager.Subscribe()
	defer s.manager.Unsubscribe(updateCh)

	// Send initial data
	if data := s.manager.GetLatestData(); data != nil {
		if err := conn.WriteJSON(data); err != nil {
			return
		}
	}

	// Create channels for coordination
	done := make(chan struct{})
	var once sync.Once

	// Read goroutine (to detect client disconnect)
	go func() {
		defer once.Do(func() { close(done) })
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				return
			}
		}
	}()

	// Write updates
	for {
		select {
		case data := <-updateCh:
			if err := conn.WriteJSON(data); err != nil {
				return
			}
		case <-done:
			return
		}
	}
}

func (s *Server) writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		s.logger.Error("failed to encode response", zap.Error(err))
	}
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
