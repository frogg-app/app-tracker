# App Tracker Plugin System

App Tracker supports a plugin architecture for extending data collection capabilities. This guide explains how to create custom collectors for the Go agent.

## Overview

Plugins implement the `Collector` interface and are registered with the Manager at startup. Each collector runs independently and contributes to the aggregated system data.

## Collector Interface

```go
package collector

import "context"

// Collector interface that all plugins must implement
type Collector interface {
    // Name returns a unique identifier for this collector
    Name() string
    
    // Collect gathers data and returns it
    // Context is used for cancellation and timeouts
    Collect(ctx context.Context) (*CollectedData, error)
}
```

## Creating a Plugin

### 1. Define Your Collector

Create a new file in `internal/collector/`:

```go
// internal/collector/custom.go
package collector

import (
    "context"
)

type CustomCollector struct {
    config CustomConfig
}

type CustomConfig struct {
    Enabled  bool
    Endpoint string
    Timeout  time.Duration
}

func NewCustomCollector(cfg CustomConfig) *CustomCollector {
    return &CustomCollector{
        config: cfg,
    }
}

func (c *CustomCollector) Name() string {
    return "custom"
}

func (c *CustomCollector) Collect(ctx context.Context) (*CollectedData, error) {
    if !c.config.Enabled {
        return &CollectedData{}, nil
    }
    
    data := &CollectedData{
        // Populate with your custom data
        // Use existing fields or extend CollectedData
    }
    
    return data, nil
}
```

### 2. Register the Collector

In `cmd/agent/main.go`:

```go
func main() {
    // ... existing setup ...
    
    manager := collector.NewManager(cfg.CollectInterval)
    
    // Register built-in collectors
    manager.Register(collector.NewProcessCollector())
    manager.Register(collector.NewPortCollector())
    
    // Register your custom collector
    if cfg.EnableCustom {
        customCfg := collector.CustomConfig{
            Enabled:  true,
            Endpoint: cfg.CustomEndpoint,
            Timeout:  5 * time.Second,
        }
        manager.Register(collector.NewCustomCollector(customCfg))
    }
    
    // ... rest of setup ...
}
```

### 3. Add Configuration

In `internal/config/config.go`:

```go
type Config struct {
    // ... existing fields ...
    
    EnableCustom   bool   `mapstructure:"enable_custom"`
    CustomEndpoint string `mapstructure:"custom_endpoint"`
}
```

## Best Practices

### Error Handling

```go
func (c *CustomCollector) Collect(ctx context.Context) (*CollectedData, error) {
    data, err := c.fetchData(ctx)
    if err != nil {
        // Log the error but don't fail completely
        log.Printf("custom collector warning: %v", err)
        // Return partial data or empty data
        return &CollectedData{}, nil
    }
    return data, nil
}
```

### Context Handling

```go
func (c *CustomCollector) Collect(ctx context.Context) (*CollectedData, error) {
    // Create timeout context
    ctx, cancel := context.WithTimeout(ctx, c.config.Timeout)
    defer cancel()
    
    // Check for cancellation
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }
    
    // Proceed with collection
    return c.doCollect(ctx)
}
```

### Concurrency Safety

```go
type CustomCollector struct {
    mu     sync.RWMutex
    cache  *CachedData
    config CustomConfig
}

func (c *CustomCollector) Collect(ctx context.Context) (*CollectedData, error) {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    // Safe to modify shared state
    return c.collectWithCache(ctx)
}
```

## Extending Data Types

To add new data types to `CollectedData`:

```go
// internal/collector/types.go

type CollectedData struct {
    // Existing fields...
    Processes  []ProcessInfo
    Ports      []PortInfo
    
    // Add your custom type
    CustomData []CustomMetric `json:"custom_data,omitempty"`
}

type CustomMetric struct {
    Name      string            `json:"name"`
    Value     float64           `json:"value"`
    Labels    map[string]string `json:"labels,omitempty"`
    Timestamp time.Time         `json:"timestamp"`
}
```

## Example: GPU Collector

```go
// internal/collector/gpu.go
package collector

import (
    "context"
    "os/exec"
    "encoding/xml"
)

type GPUCollector struct {
    enabled bool
}

type GPUInfo struct {
    Index       int     `json:"index"`
    Name        string  `json:"name"`
    Memory      uint64  `json:"memory_bytes"`
    MemoryUsed  uint64  `json:"memory_used_bytes"`
    Temperature float64 `json:"temperature"`
    Utilization float64 `json:"utilization_percent"`
}

func NewGPUCollector(enabled bool) *GPUCollector {
    return &GPUCollector{enabled: enabled}
}

func (c *GPUCollector) Name() string {
    return "gpu"
}

func (c *GPUCollector) Collect(ctx context.Context) (*CollectedData, error) {
    if !c.enabled {
        return &CollectedData{}, nil
    }
    
    // Check if nvidia-smi is available
    cmd := exec.CommandContext(ctx, "nvidia-smi", "-q", "-x")
    output, err := cmd.Output()
    if err != nil {
        return &CollectedData{}, nil // No GPU or nvidia-smi not installed
    }
    
    gpus, err := parseNvidiaSmiOutput(output)
    if err != nil {
        return &CollectedData{}, nil
    }
    
    return &CollectedData{
        GPUs: gpus,
    }, nil
}
```

## Testing Plugins

```go
// internal/collector/custom_test.go
package collector

import (
    "context"
    "testing"
)

func TestCustomCollector(t *testing.T) {
    cfg := CustomConfig{
        Enabled: true,
    }
    
    collector := NewCustomCollector(cfg)
    
    ctx := context.Background()
    data, err := collector.Collect(ctx)
    
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    if data == nil {
        t.Fatal("expected data, got nil")
    }
}

func TestCustomCollectorDisabled(t *testing.T) {
    cfg := CustomConfig{
        Enabled: false,
    }
    
    collector := NewCustomCollector(cfg)
    
    ctx := context.Background()
    data, err := collector.Collect(ctx)
    
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    // Should return empty data when disabled
    if len(data.CustomData) != 0 {
        t.Error("expected empty data when disabled")
    }
}
```

## Server-Side Plugin Support

For displaying custom data in the UI:

1. The server forwards all data from agents as-is
2. Add UI components to display custom fields
3. Use the extension points in the dashboard

## Contributing Plugins

1. Fork the repository
2. Create your plugin following this guide
3. Add tests
4. Update documentation
5. Submit a pull request

Popular plugin ideas:
- Database connectors (MySQL, PostgreSQL status)
- Application metrics (JVM, Node.js runtime)
- Cloud provider metadata
- Custom log parsing
- Network monitoring
