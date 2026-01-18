package collector

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

// ProcessCollector collects process information from /proc
type ProcessCollector struct {
	logger   *zap.Logger
	interval time.Duration
}

// NewProcessCollector creates a new process collector
func NewProcessCollector(logger *zap.Logger) *ProcessCollector {
	return &ProcessCollector{
		logger:   logger,
		interval: 10 * time.Second,
	}
}

// Name returns the collector name
func (c *ProcessCollector) Name() string {
	return "process"
}

// Interval returns the collection interval
func (c *ProcessCollector) Interval() time.Duration {
	return c.interval
}

// Collect gathers process information
func (c *ProcessCollector) Collect(ctx context.Context) (*CollectionResult, error) {
	procs, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list processes: %w", err)
	}

	result := &CollectionResult{
		Timestamp: time.Now(),
		Processes: make([]ProcessInfo, 0, len(procs)),
	}

	for _, p := range procs {
		info, err := c.collectProcess(ctx, p)
		if err != nil {
			// Process may have exited, skip it
			continue
		}
		result.Processes = append(result.Processes, *info)
	}

	return result, nil
}

func (c *ProcessCollector) collectProcess(ctx context.Context, p *process.Process) (*ProcessInfo, error) {
	info := &ProcessInfo{
		PID: p.Pid,
	}

	// Get basic info
	if name, err := p.NameWithContext(ctx); err == nil {
		info.Name = name
	}

	if ppid, err := p.PpidWithContext(ctx); err == nil {
		info.PPID = ppid
	}

	if cmdline, err := p.CmdlineWithContext(ctx); err == nil {
		info.Cmdline = cmdline
	}

	if exe, err := p.ExeWithContext(ctx); err == nil {
		info.Exe = exe
	}

	if cwd, err := p.CwdWithContext(ctx); err == nil {
		info.Cwd = cwd
	}

	if username, err := p.UsernameWithContext(ctx); err == nil {
		info.Username = username
	}

	if uids, err := p.UidsWithContext(ctx); err == nil && len(uids) > 0 {
		info.UID = uids[0]
	}

	if gids, err := p.GidsWithContext(ctx); err == nil && len(gids) > 0 {
		info.GID = gids[0]
	}

	if status, err := p.StatusWithContext(ctx); err == nil && len(status) > 0 {
		info.Status = status[0]
	}

	if createTime, err := p.CreateTimeWithContext(ctx); err == nil {
		info.CreateTime = createTime
	}

	// Get resource usage
	if cpuPercent, err := p.CPUPercentWithContext(ctx); err == nil {
		info.CPUPercent = cpuPercent
	}

	if memPercent, err := p.MemoryPercentWithContext(ctx); err == nil {
		info.MemPercent = memPercent
	}

	if memInfo, err := p.MemoryInfoWithContext(ctx); err == nil {
		info.MemRSS = memInfo.RSS
		info.MemVMS = memInfo.VMS
	}

	if numFDs, err := p.NumFDsWithContext(ctx); err == nil {
		info.NumFDs = numFDs
	}

	if numThreads, err := p.NumThreadsWithContext(ctx); err == nil {
		info.NumThreads = numThreads
	}

	if ioCounters, err := p.IOCountersWithContext(ctx); err == nil {
		info.IORead = ioCounters.ReadBytes
		info.IOWrite = ioCounters.WriteBytes
	}

	// Get connections (for enrichment)
	if conns, err := p.ConnectionsWithContext(ctx); err == nil {
		info.Connections = make([]Connection, 0, len(conns))
		for _, conn := range conns {
			info.Connections = append(info.Connections, Connection{
				FD:         conn.Fd,
				Family:     conn.Family,
				Type:       conn.Type,
				LocalAddr:  conn.Laddr.IP,
				LocalPort:  conn.Laddr.Port,
				RemoteAddr: conn.Raddr.IP,
				RemotePort: conn.Raddr.Port,
				Status:     conn.Status,
			})
		}
	}

	// Check for container (via cgroup)
	info.ContainerID = c.getContainerID(p.Pid)

	// Check for systemd unit
	info.SystemdUnit = c.getSystemdUnit(p.Pid)

	return info, nil
}

// getContainerID tries to extract container ID from cgroup
func (c *ProcessCollector) getContainerID(pid int32) string {
	cgroupPath := fmt.Sprintf("/proc/%d/cgroup", pid)
	data, err := os.ReadFile(cgroupPath)
	if err != nil {
		return ""
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		// Docker format: /docker/<container_id>
		// Podman format: /libpod-<container_id>
		// Kubernetes format: /kubepods/.../<container_id>
		
		if strings.Contains(line, "/docker/") {
			parts := strings.Split(line, "/docker/")
			if len(parts) > 1 {
				id := strings.TrimSpace(parts[1])
				if len(id) >= 12 {
					return id[:12]
				}
			}
		}
		
		if strings.Contains(line, "/libpod-") {
			parts := strings.Split(line, "/libpod-")
			if len(parts) > 1 {
				id := strings.Split(parts[1], ".")[0]
				if len(id) >= 12 {
					return id[:12]
				}
			}
		}

		if strings.Contains(line, "/kubepods/") {
			// Extract the last segment which is typically the container ID
			parts := strings.Split(line, "/")
			if len(parts) > 0 {
				lastPart := parts[len(parts)-1]
				// Remove cri-containerd- or docker- prefix
				lastPart = strings.TrimPrefix(lastPart, "cri-containerd-")
				lastPart = strings.TrimPrefix(lastPart, "docker-")
				if len(lastPart) >= 12 {
					return lastPart[:12]
				}
			}
		}
	}

	return ""
}

// getSystemdUnit tries to get the systemd unit for a process
func (c *ProcessCollector) getSystemdUnit(pid int32) string {
	cgroupPath := fmt.Sprintf("/proc/%d/cgroup", pid)
	data, err := os.ReadFile(cgroupPath)
	if err != nil {
		return ""
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		// Look for systemd scope/service
		// Format: 1:name=systemd:/system.slice/docker.service
		if strings.Contains(line, ".service") || strings.Contains(line, ".scope") {
			parts := strings.Split(line, "/")
			for _, part := range parts {
				if strings.HasSuffix(part, ".service") || strings.HasSuffix(part, ".scope") {
					return part
				}
			}
		}
	}

	return ""
}
