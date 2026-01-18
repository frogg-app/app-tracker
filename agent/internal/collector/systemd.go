package collector

import (
	"context"
	"fmt"
	"time"

	"github.com/coreos/go-systemd/v22/dbus"
	"go.uber.org/zap"
)

// SystemdCollector collects systemd unit information
type SystemdCollector struct {
	logger   *zap.Logger
	interval time.Duration
	conn     *dbus.Conn
}

// NewSystemdCollector creates a new systemd collector
func NewSystemdCollector(logger *zap.Logger) (*SystemdCollector, error) {
	conn, err := dbus.NewSystemConnectionContext(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to connect to systemd: %w", err)
	}

	return &SystemdCollector{
		logger:   logger,
		interval: 30 * time.Second,
		conn:     conn,
	}, nil
}

// Name returns the collector name
func (c *SystemdCollector) Name() string {
	return "systemd"
}

// Interval returns the collection interval
func (c *SystemdCollector) Interval() time.Duration {
	return c.interval
}

// Collect gathers systemd unit information
func (c *SystemdCollector) Collect(ctx context.Context) (*CollectionResult, error) {
	units, err := c.conn.ListUnitsContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list units: %w", err)
	}

	result := &CollectionResult{
		Timestamp:    time.Now(),
		SystemdUnits: make([]SystemdUnitInfo, 0, len(units)),
	}

	for _, unit := range units {
		// Only include services and relevant unit types
		if !isRelevantUnit(unit.Name) {
			continue
		}

		info := SystemdUnitInfo{
			Name:        unit.Name,
			Description: unit.Description,
			LoadState:   unit.LoadState,
			ActiveState: unit.ActiveState,
			SubState:    unit.SubState,
		}

		// Get additional properties for active units
		if unit.ActiveState == "active" {
			c.enrichUnitInfo(&info)
		}

		result.SystemdUnits = append(result.SystemdUnits, info)
	}

	return result, nil
}

func isRelevantUnit(name string) bool {
	// Include services and sockets
	relevantSuffixes := []string{".service", ".socket", ".timer"}
	for _, suffix := range relevantSuffixes {
		if len(name) > len(suffix) && name[len(name)-len(suffix):] == suffix {
			return true
		}
	}
	return false
}

func (c *SystemdCollector) enrichUnitInfo(info *SystemdUnitInfo) {
	ctx := context.Background()

	// Get MainPID
	mainPID, err := c.conn.GetServicePropertyContext(ctx, info.Name, "MainPID")
	if err == nil {
		if pid, ok := mainPID.Value.Value().(uint32); ok {
			info.MainPID = pid
		}
	}

	// Get ExecMainPID
	execMainPID, err := c.conn.GetServicePropertyContext(ctx, info.Name, "ExecMainPID")
	if err == nil {
		if pid, ok := execMainPID.Value.Value().(uint32); ok {
			info.ExecMainPID = pid
		}
	}

	// Get MemoryCurrent
	memCurrent, err := c.conn.GetServicePropertyContext(ctx, info.Name, "MemoryCurrent")
	if err == nil {
		if mem, ok := memCurrent.Value.Value().(uint64); ok {
			info.MemoryCurrent = mem
		}
	}

	// Get CPUUsageNSec
	cpuUsage, err := c.conn.GetServicePropertyContext(ctx, info.Name, "CPUUsageNSec")
	if err == nil {
		if cpu, ok := cpuUsage.Value.Value().(uint64); ok {
			info.CPUUsageNSec = cpu
		}
	}

	// Get TasksCurrent
	tasksCurrent, err := c.conn.GetServicePropertyContext(ctx, info.Name, "TasksCurrent")
	if err == nil {
		if tasks, ok := tasksCurrent.Value.Value().(uint64); ok {
			info.TasksCurrent = tasks
		}
	}
}

// Close closes the D-Bus connection
func (c *SystemdCollector) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}
