package collector

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"go.uber.org/zap"
)

// SystemCollector collects system-level metrics
type SystemCollector struct {
	logger   *zap.Logger
	interval time.Duration
}

// NewSystemCollector creates a new system collector
func NewSystemCollector(logger *zap.Logger) *SystemCollector {
	return &SystemCollector{
		logger:   logger,
		interval: 10 * time.Second,
	}
}

// Name returns the collector name
func (c *SystemCollector) Name() string {
	return "system"
}

// Interval returns the collection interval
func (c *SystemCollector) Interval() time.Duration {
	return c.interval
}

// Collect gathers system-level metrics
func (c *SystemCollector) Collect(ctx context.Context) (*CollectionResult, error) {
	info := &SystemInfo{}

	// Host info
	if hostInfo, err := host.InfoWithContext(ctx); err == nil {
		info.Hostname = hostInfo.Hostname
		info.OS = hostInfo.OS
		info.Platform = hostInfo.Platform
		info.KernelVersion = hostInfo.KernelVersion
		info.Uptime = hostInfo.Uptime
		info.BootTime = hostInfo.BootTime
	}

	// CPU info
	if cpuCounts, err := cpu.CountsWithContext(ctx, true); err == nil {
		info.CPUCount = cpuCounts
	}

	if cpuPercent, err := cpu.PercentWithContext(ctx, 0, false); err == nil && len(cpuPercent) > 0 {
		info.CPUPercent = cpuPercent[0]
	}

	if cpuTimes, err := cpu.TimesWithContext(ctx, false); err == nil && len(cpuTimes) > 0 {
		total := cpuTimes[0].User + cpuTimes[0].System + cpuTimes[0].Idle + cpuTimes[0].Iowait
		if total > 0 {
			info.CPUUser = cpuTimes[0].User / total * 100
			info.CPUSystem = cpuTimes[0].System / total * 100
			info.CPUIdle = cpuTimes[0].Idle / total * 100
			info.CPUIowait = cpuTimes[0].Iowait / total * 100
		}
	}

	// Load average
	if loadAvg, err := load.AvgWithContext(ctx); err == nil {
		info.LoadAvg1 = loadAvg.Load1
		info.LoadAvg5 = loadAvg.Load5
		info.LoadAvg15 = loadAvg.Load15
	}

	// Memory info
	if memInfo, err := mem.VirtualMemoryWithContext(ctx); err == nil {
		info.MemTotal = memInfo.Total
		info.MemUsed = memInfo.Used
		info.MemFree = memInfo.Free
		info.MemAvailable = memInfo.Available
		info.MemPercent = memInfo.UsedPercent
	}

	if swapInfo, err := mem.SwapMemoryWithContext(ctx); err == nil {
		info.SwapTotal = swapInfo.Total
		info.SwapUsed = swapInfo.Used
		info.SwapPercent = swapInfo.UsedPercent
	}

	// Disk info (root partition)
	if diskUsage, err := disk.UsageWithContext(ctx, "/"); err == nil {
		info.DiskTotal = diskUsage.Total
		info.DiskUsed = diskUsage.Used
		info.DiskFree = diskUsage.Free
		info.DiskPercent = diskUsage.UsedPercent
	}

	// Disk I/O
	if diskIO, err := disk.IOCountersWithContext(ctx); err == nil {
		for _, io := range diskIO {
			info.DiskReadBytes += io.ReadBytes
			info.DiskWriteBytes += io.WriteBytes
		}
	}

	// Network I/O
	if netIO, err := net.IOCountersWithContext(ctx, false); err == nil && len(netIO) > 0 {
		info.NetBytesSent = netIO[0].BytesSent
		info.NetBytesRecv = netIO[0].BytesRecv
		info.NetPacketsSent = netIO[0].PacketsSent
		info.NetPacketsRecv = netIO[0].PacketsRecv
	}

	result := &CollectionResult{
		Timestamp: time.Now(),
		System:    info,
	}

	return result, nil
}
