package collector

import (
	"context"
	"sync"
	"testing"
	"time"
)

// MockCollector implements Collector interface for testing
type MockCollector struct {
	name    string
	data    *CollectedData
	err     error
	called  bool
	mu      sync.Mutex
}

func NewMockCollector(name string, data *CollectedData, err error) *MockCollector {
	return &MockCollector{
		name: name,
		data: data,
		err:  err,
	}
}

func (m *MockCollector) Name() string {
	return m.name
}

func (m *MockCollector) Collect(ctx context.Context) (*CollectedData, error) {
	m.mu.Lock()
	m.called = true
	m.mu.Unlock()
	return m.data, m.err
}

func (m *MockCollector) WasCalled() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.called
}

func TestManagerCreation(t *testing.T) {
	manager := NewManager(5 * time.Second)

	if manager == nil {
		t.Fatal("Expected manager to be created")
	}

	if manager.interval != 5*time.Second {
		t.Errorf("Expected interval 5s, got %v", manager.interval)
	}
}

func TestManagerRegisterCollector(t *testing.T) {
	manager := NewManager(5 * time.Second)
	collector := NewMockCollector("test", nil, nil)

	manager.Register(collector)

	if len(manager.collectors) != 1 {
		t.Errorf("Expected 1 collector, got %d", len(manager.collectors))
	}
}

func TestManagerCollectOnce(t *testing.T) {
	manager := NewManager(5 * time.Second)

	processData := &CollectedData{
		Processes: []ProcessInfo{
			{PID: 1, Name: "test"},
		},
	}

	portData := &CollectedData{
		Ports: []PortInfo{
			{Port: 8080, Protocol: "tcp"},
		},
	}

	processCollector := NewMockCollector("process", processData, nil)
	portCollector := NewMockCollector("port", portData, nil)

	manager.Register(processCollector)
	manager.Register(portCollector)

	ctx := context.Background()
	data := manager.CollectOnce(ctx)

	if !processCollector.WasCalled() {
		t.Error("Process collector was not called")
	}

	if !portCollector.WasCalled() {
		t.Error("Port collector was not called")
	}

	if len(data.Processes) != 1 {
		t.Errorf("Expected 1 process, got %d", len(data.Processes))
	}

	if len(data.Ports) != 1 {
		t.Errorf("Expected 1 port, got %d", len(data.Ports))
	}
}

func TestManagerSubscription(t *testing.T) {
	manager := NewManager(100 * time.Millisecond)

	collector := NewMockCollector("test", &CollectedData{
		Processes: []ProcessInfo{{PID: 1}},
	}, nil)

	manager.Register(collector)

	received := make(chan *CollectedData, 1)
	unsubscribe := manager.Subscribe(func(data *CollectedData) {
		select {
		case received <- data:
		default:
		}
	})

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	go manager.Start(ctx)

	select {
	case data := <-received:
		if len(data.Processes) != 1 {
			t.Errorf("Expected 1 process, got %d", len(data.Processes))
		}
	case <-ctx.Done():
		t.Error("Timeout waiting for subscription data")
	}

	unsubscribe()
}

func TestManagerMergeData(t *testing.T) {
	manager := NewManager(5 * time.Second)

	data1 := &CollectedData{
		Processes: []ProcessInfo{{PID: 1}},
		System: SystemInfo{
			Hostname: "test-host",
		},
	}

	data2 := &CollectedData{
		Ports: []PortInfo{{Port: 80}},
	}

	data3 := &CollectedData{
		Containers: []ContainerInfo{{ID: "abc123"}},
	}

	results := []*CollectedData{data1, data2, data3}
	merged := manager.mergeData(results)

	if len(merged.Processes) != 1 {
		t.Errorf("Expected 1 process, got %d", len(merged.Processes))
	}

	if len(merged.Ports) != 1 {
		t.Errorf("Expected 1 port, got %d", len(merged.Ports))
	}

	if len(merged.Containers) != 1 {
		t.Errorf("Expected 1 container, got %d", len(merged.Containers))
	}

	if merged.System.Hostname != "test-host" {
		t.Errorf("Expected hostname 'test-host', got %s", merged.System.Hostname)
	}
}
