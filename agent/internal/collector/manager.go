package collector

import (
	"context"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Manager manages multiple collectors and aggregates results
type Manager struct {
	collectors []Collector
	interval   time.Duration
	logger     *zap.Logger

	mu           sync.RWMutex
	latestData   *AggregatedData
	subscribers  []chan *AggregatedData
}

// AggregatedData contains all collected data from all collectors
type AggregatedData struct {
	Timestamp    time.Time           `json:"timestamp"`
	Processes    []ProcessInfo       `json:"processes"`
	Ports        []PortInfo          `json:"ports"`
	System       *SystemInfo         `json:"system"`
	SystemdUnits []SystemdUnitInfo   `json:"systemd_units"`
	Containers   []ContainerInfo     `json:"containers"`
	Pods         []KubernetesPodInfo `json:"pods"`
	Metrics      []Metric            `json:"metrics"`
}

// NewManager creates a new collector manager
func NewManager(collectors []Collector, interval time.Duration, logger *zap.Logger) *Manager {
	return &Manager{
		collectors:  collectors,
		interval:    interval,
		logger:      logger,
		latestData:  &AggregatedData{},
		subscribers: make([]chan *AggregatedData, 0),
	}
}

// Start begins the collection loop
func (m *Manager) Start(ctx context.Context) {
	m.logger.Info("starting collector manager",
		zap.Int("collectors", len(m.collectors)),
		zap.Duration("interval", m.interval),
	)

	// Initial collection
	m.collect(ctx)

	ticker := time.NewTicker(m.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			m.logger.Info("stopping collector manager")
			return
		case <-ticker.C:
			m.collect(ctx)
		}
	}
}

func (m *Manager) collect(ctx context.Context) {
	start := time.Now()
	
	data := &AggregatedData{
		Timestamp:    start,
		Processes:    make([]ProcessInfo, 0),
		Ports:        make([]PortInfo, 0),
		SystemdUnits: make([]SystemdUnitInfo, 0),
		Containers:   make([]ContainerInfo, 0),
		Pods:         make([]KubernetesPodInfo, 0),
		Metrics:      make([]Metric, 0),
	}

	var wg sync.WaitGroup
	results := make(chan *CollectionResult, len(m.collectors))
	errors := make(chan error, len(m.collectors))

	// Run collectors in parallel
	for _, c := range m.collectors {
		wg.Add(1)
		go func(collector Collector) {
			defer wg.Done()
			
			result, err := collector.Collect(ctx)
			if err != nil {
				errors <- err
				m.logger.Error("collector error",
					zap.String("collector", collector.Name()),
					zap.Error(err),
				)
				return
			}
			results <- result
		}(c)
	}

	// Wait for all collectors
	go func() {
		wg.Wait()
		close(results)
		close(errors)
	}()

	// Aggregate results
	for result := range results {
		if result == nil {
			continue
		}
		
		if result.Processes != nil {
			data.Processes = append(data.Processes, result.Processes...)
		}
		if result.Ports != nil {
			data.Ports = append(data.Ports, result.Ports...)
		}
		if result.System != nil {
			data.System = result.System
		}
		if result.SystemdUnits != nil {
			data.SystemdUnits = append(data.SystemdUnits, result.SystemdUnits...)
		}
		if result.Containers != nil {
			data.Containers = append(data.Containers, result.Containers...)
		}
		if result.Pods != nil {
			data.Pods = append(data.Pods, result.Pods...)
		}
		if result.Metrics != nil {
			data.Metrics = append(data.Metrics, result.Metrics...)
		}
	}

	// Enrich data with cross-references
	m.enrichData(data)

	// Store latest data
	m.mu.Lock()
	m.latestData = data
	m.mu.Unlock()

	// Notify subscribers
	m.notifySubscribers(data)

	duration := time.Since(start)
	m.logger.Debug("collection complete",
		zap.Duration("duration", duration),
		zap.Int("processes", len(data.Processes)),
		zap.Int("ports", len(data.Ports)),
		zap.Int("containers", len(data.Containers)),
	)
}

// enrichData adds cross-references between processes, ports, containers, etc.
func (m *Manager) enrichData(data *AggregatedData) {
	// Build PID to container map
	pidToContainer := make(map[int32]*ContainerInfo)
	for i := range data.Containers {
		c := &data.Containers[i]
		if c.Pid > 0 {
			pidToContainer[int32(c.Pid)] = c
		}
	}

	// Build PID to systemd unit map
	pidToUnit := make(map[int32]string)
	for _, unit := range data.SystemdUnits {
		if unit.MainPID > 0 {
			pidToUnit[int32(unit.MainPID)] = unit.Name
		}
	}

	// Enrich processes
	for i := range data.Processes {
		p := &data.Processes[i]
		
		// Add container info
		if c, ok := pidToContainer[p.PID]; ok {
			p.ContainerID = c.ID
			p.ContainerName = c.Name
			p.PodName = c.PodName
			p.PodNamespace = c.PodNamespace
		}
		
		// Add systemd unit info
		if unit, ok := pidToUnit[p.PID]; ok {
			p.SystemdUnit = unit
		}
	}

	// Enrich ports
	for i := range data.Ports {
		port := &data.Ports[i]
		
		// Add container info
		if c, ok := pidToContainer[port.PID]; ok {
			port.ContainerID = c.ID
			port.ContainerName = c.Name
			port.ContainerImage = c.Image
			port.PodName = c.PodName
			port.PodNamespace = c.PodNamespace
		}
		
		// Add systemd unit info
		if unit, ok := pidToUnit[port.PID]; ok {
			port.SystemdUnit = unit
		}
	}
}

// GetLatestData returns the most recent collected data
func (m *Manager) GetLatestData() *AggregatedData {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.latestData
}

// Subscribe returns a channel that receives updates
func (m *Manager) Subscribe() chan *AggregatedData {
	ch := make(chan *AggregatedData, 10)
	m.mu.Lock()
	m.subscribers = append(m.subscribers, ch)
	m.mu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber
func (m *Manager) Unsubscribe(ch chan *AggregatedData) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	for i, sub := range m.subscribers {
		if sub == ch {
			m.subscribers = append(m.subscribers[:i], m.subscribers[i+1:]...)
			close(ch)
			return
		}
	}
}

func (m *Manager) notifySubscribers(data *AggregatedData) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	for _, ch := range m.subscribers {
		select {
		case ch <- data:
		default:
			// Channel full, skip this update
		}
	}
}

// GetCollectors returns the list of active collectors
func (m *Manager) GetCollectors() []Collector {
	return m.collectors
}
