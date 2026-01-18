package collector

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

// PortCollector collects information about open ports
type PortCollector struct {
	logger   *zap.Logger
	interval time.Duration
}

// NewPortCollector creates a new port collector
func NewPortCollector(logger *zap.Logger) *PortCollector {
	return &PortCollector{
		logger:   logger,
		interval: 10 * time.Second,
	}
}

// Name returns the collector name
func (c *PortCollector) Name() string {
	return "port"
}

// Interval returns the collection interval
func (c *PortCollector) Interval() time.Duration {
	return c.interval
}

// Collect gathers information about open ports
func (c *PortCollector) Collect(ctx context.Context) (*CollectionResult, error) {
	result := &CollectionResult{
		Timestamp: time.Now(),
		Ports:     make([]PortInfo, 0),
	}

	// Try to use ss first (faster), fall back to reading /proc/net
	ports, err := c.collectWithSS(ctx)
	if err != nil {
		c.logger.Debug("ss failed, falling back to /proc/net", zap.Error(err))
		ports, err = c.collectFromProcNet(ctx)
		if err != nil {
			return nil, err
		}
	}

	result.Ports = ports
	return result, nil
}

// collectWithSS uses the ss command to get listening sockets
func (c *PortCollector) collectWithSS(ctx context.Context) ([]PortInfo, error) {
	// ss -tulnp gives us TCP/UDP listening sockets with process info
	cmd := exec.CommandContext(ctx, "ss", "-tulnp")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ss command failed: %w", err)
	}

	ports := make([]PortInfo, 0)
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	
	// Skip header
	scanner.Scan()

	for scanner.Scan() {
		line := scanner.Text()
		port, err := c.parseSSLine(line)
		if err != nil {
			continue
		}
		if port != nil {
			ports = append(ports, *port)
		}
	}

	return ports, nil
}

// parseSSLine parses a line from ss output
// Format: Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process
func (c *PortCollector) parseSSLine(line string) (*PortInfo, error) {
	fields := strings.Fields(line)
	if len(fields) < 5 {
		return nil, fmt.Errorf("invalid line format")
	}

	info := &PortInfo{}

	// Parse protocol
	switch fields[0] {
	case "tcp", "tcp6":
		info.Protocol = "tcp"
	case "udp", "udp6":
		info.Protocol = "udp"
	default:
		return nil, fmt.Errorf("unknown protocol: %s", fields[0])
	}

	// Parse state
	info.State = fields[1]

	// Parse local address:port (field 4)
	localAddr := fields[4]
	addr, port, err := parseAddressPort(localAddr)
	if err != nil {
		return nil, err
	}
	info.Address = addr
	info.Port = port

	// Parse process info if available
	// Format: users:(("nginx",pid=1234,fd=5))
	if len(fields) > 6 {
		procInfo := fields[6]
		if strings.HasPrefix(procInfo, "users:") {
			pid, name := parseProcessInfo(procInfo)
			info.PID = pid
			info.ProcessName = name
			
			// Get additional process info
			if pid > 0 {
				c.enrichWithProcessInfo(info, pid)
			}
		}
	}

	return info, nil
}

// parseAddressPort parses an address:port string
func parseAddressPort(s string) (string, uint32, error) {
	// Handle IPv6 addresses like [::]:80 or [::1]:80
	if strings.HasPrefix(s, "[") {
		idx := strings.LastIndex(s, "]:")
		if idx == -1 {
			return "", 0, fmt.Errorf("invalid IPv6 address format")
		}
		addr := s[1:idx]
		port, err := strconv.ParseUint(s[idx+2:], 10, 32)
		if err != nil {
			return "", 0, err
		}
		return addr, uint32(port), nil
	}

	// Handle IPv4 addresses like 0.0.0.0:80 or 127.0.0.1:80
	lastColon := strings.LastIndex(s, ":")
	if lastColon == -1 {
		return "", 0, fmt.Errorf("no port found in address")
	}

	addr := s[:lastColon]
	port, err := strconv.ParseUint(s[lastColon+1:], 10, 32)
	if err != nil {
		return "", 0, err
	}

	// Handle * as 0.0.0.0
	if addr == "*" {
		addr = "0.0.0.0"
	}

	return addr, uint32(port), nil
}

// parseProcessInfo extracts PID and process name from ss process info
func parseProcessInfo(s string) (int32, string) {
	// Format: users:(("nginx",pid=1234,fd=5),("nginx",pid=1235,fd=5))
	// We just get the first one
	
	// Find first "(" after users:
	start := strings.Index(s, "((")
	if start == -1 {
		return 0, ""
	}
	
	// Extract the first process entry
	end := strings.Index(s[start:], ")")
	if end == -1 {
		return 0, ""
	}
	
	entry := s[start+2 : start+end]
	
	// Parse name and pid
	parts := strings.Split(entry, ",")
	if len(parts) < 2 {
		return 0, ""
	}

	name := strings.Trim(parts[0], "\"")
	
	for _, part := range parts[1:] {
		if strings.HasPrefix(part, "pid=") {
			pidStr := strings.TrimPrefix(part, "pid=")
			pid, err := strconv.ParseInt(pidStr, 10, 32)
			if err == nil {
				return int32(pid), name
			}
		}
	}

	return 0, name
}

// enrichWithProcessInfo adds additional process information to the port info
func (c *PortCollector) enrichWithProcessInfo(info *PortInfo, pid int32) {
	p, err := process.NewProcess(pid)
	if err != nil {
		return
	}

	if cmdline, err := p.Cmdline(); err == nil {
		info.Cmdline = cmdline
	}

	if username, err := p.Username(); err == nil {
		info.Username = username
	}

	if exe, err := p.Exe(); err == nil {
		info.Exe = exe
	}
}

// collectFromProcNet reads port information from /proc/net/tcp and /proc/net/udp
func (c *PortCollector) collectFromProcNet(ctx context.Context) ([]PortInfo, error) {
	ports := make([]PortInfo, 0)

	// Collect TCP ports
	tcpPorts, err := c.readProcNetFile("/proc/net/tcp", "tcp")
	if err == nil {
		ports = append(ports, tcpPorts...)
	}

	tcpPorts6, err := c.readProcNetFile("/proc/net/tcp6", "tcp")
	if err == nil {
		ports = append(ports, tcpPorts6...)
	}

	// Collect UDP ports
	udpPorts, err := c.readProcNetFile("/proc/net/udp", "udp")
	if err == nil {
		ports = append(ports, udpPorts...)
	}

	udpPorts6, err := c.readProcNetFile("/proc/net/udp6", "udp")
	if err == nil {
		ports = append(ports, udpPorts6...)
	}

	return ports, nil
}

// readProcNetFile reads and parses a /proc/net/* file
func (c *PortCollector) readProcNetFile(path, protocol string) ([]PortInfo, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	ports := make([]PortInfo, 0)
	scanner := bufio.NewScanner(file)

	// Skip header
	scanner.Scan()

	for scanner.Scan() {
		line := scanner.Text()
		port, err := c.parseProcNetLine(line, protocol)
		if err != nil {
			continue
		}
		if port != nil {
			ports = append(ports, *port)
		}
	}

	return ports, nil
}

// parseProcNetLine parses a line from /proc/net/tcp or /proc/net/udp
// Format: sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
func (c *PortCollector) parseProcNetLine(line string, protocol string) (*PortInfo, error) {
	fields := strings.Fields(line)
	if len(fields) < 10 {
		return nil, fmt.Errorf("invalid line format")
	}

	// Parse state (only interested in LISTEN for TCP)
	state, _ := strconv.ParseInt(fields[3], 16, 32)
	
	// For TCP, 0A = LISTEN
	// For UDP, we include all (UDP is connectionless)
	if protocol == "tcp" && state != 0x0A {
		return nil, nil // Not listening
	}

	// Parse local address
	localAddr := fields[1]
	addr, port, err := c.parseHexAddress(localAddr)
	if err != nil {
		return nil, err
	}

	// Parse inode to find process
	inode := fields[9]
	pid := c.findPIDByInode(inode)

	info := &PortInfo{
		Protocol: protocol,
		Address:  addr,
		Port:     port,
		PID:      pid,
		State:    c.tcpStateToString(int(state)),
	}

	if pid > 0 {
		c.enrichWithProcessInfo(info, pid)
	}

	return info, nil
}

// parseHexAddress parses a hex-encoded address:port from /proc/net/*
func (c *PortCollector) parseHexAddress(s string) (string, uint32, error) {
	parts := strings.Split(s, ":")
	if len(parts) != 2 {
		return "", 0, fmt.Errorf("invalid address format")
	}

	// Parse hex port
	port, err := strconv.ParseUint(parts[1], 16, 32)
	if err != nil {
		return "", 0, err
	}

	// Parse hex IP address (little-endian for IPv4)
	addrHex := parts[0]
	if len(addrHex) == 8 {
		// IPv4
		var octets [4]uint64
		for i := 0; i < 4; i++ {
			octets[3-i], _ = strconv.ParseUint(addrHex[i*2:i*2+2], 16, 8)
		}
		addr := fmt.Sprintf("%d.%d.%d.%d", octets[0], octets[1], octets[2], octets[3])
		return addr, uint32(port), nil
	}

	// IPv6 (32 hex chars)
	if len(addrHex) == 32 {
		// Simplified IPv6 handling
		return "::", uint32(port), nil
	}

	return "", 0, fmt.Errorf("unknown address format")
}

// findPIDByInode finds the process that owns a socket inode
func (c *PortCollector) findPIDByInode(inode string) int32 {
	// Read /proc/*/fd/* to find the process
	procDirs, err := os.ReadDir("/proc")
	if err != nil {
		return 0
	}

	socketPattern := fmt.Sprintf("socket:[%s]", inode)

	for _, dir := range procDirs {
		if !dir.IsDir() {
			continue
		}

		pid, err := strconv.ParseInt(dir.Name(), 10, 32)
		if err != nil {
			continue // Not a PID directory
		}

		fdPath := fmt.Sprintf("/proc/%d/fd", pid)
		fds, err := os.ReadDir(fdPath)
		if err != nil {
			continue
		}

		for _, fd := range fds {
			linkPath := fmt.Sprintf("%s/%s", fdPath, fd.Name())
			link, err := os.Readlink(linkPath)
			if err != nil {
				continue
			}

			if link == socketPattern {
				return int32(pid)
			}
		}
	}

	return 0
}

// tcpStateToString converts TCP state number to string
func (c *PortCollector) tcpStateToString(state int) string {
	states := map[int]string{
		1:  "ESTABLISHED",
		2:  "SYN_SENT",
		3:  "SYN_RECV",
		4:  "FIN_WAIT1",
		5:  "FIN_WAIT2",
		6:  "TIME_WAIT",
		7:  "CLOSE",
		8:  "CLOSE_WAIT",
		9:  "LAST_ACK",
		10: "LISTEN",
		11: "CLOSING",
	}

	if s, ok := states[state]; ok {
		return s
	}
	return "UNKNOWN"
}
