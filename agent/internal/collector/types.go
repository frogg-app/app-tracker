package collector

import (
	"context"
	"time"
)

// Metric represents a collected metric with labels
type Metric struct {
	Name      string            `json:"name"`
	Value     float64           `json:"value"`
	Labels    map[string]string `json:"labels"`
	Timestamp time.Time         `json:"timestamp"`
}

// ProcessInfo contains detailed process information
type ProcessInfo struct {
	PID        int32             `json:"pid"`
	PPID       int32             `json:"ppid"`
	Name       string            `json:"name"`
	Cmdline    string            `json:"cmdline"`
	Exe        string            `json:"exe"`
	Cwd        string            `json:"cwd"`
	Username   string            `json:"username"`
	UID        int32             `json:"uid"`
	GID        int32             `json:"gid"`
	Status     string            `json:"status"`
	CreateTime int64             `json:"create_time"`
	CPUPercent float64           `json:"cpu_percent"`
	MemPercent float32           `json:"mem_percent"`
	MemRSS     uint64            `json:"mem_rss"`
	MemVMS     uint64            `json:"mem_vms"`
	NumFDs     int32             `json:"num_fds"`
	NumThreads int32             `json:"num_threads"`
	IORead     uint64            `json:"io_read"`
	IOWrite    uint64            `json:"io_write"`
	Environ    map[string]string `json:"environ,omitempty"`
	OpenFiles  []OpenFile        `json:"open_files,omitempty"`
	Connections []Connection     `json:"connections,omitempty"`
	
	// Container info (if applicable)
	ContainerID   string `json:"container_id,omitempty"`
	ContainerName string `json:"container_name,omitempty"`
	
	// Kubernetes info (if applicable)
	PodName      string `json:"pod_name,omitempty"`
	PodNamespace string `json:"pod_namespace,omitempty"`
	
	// Systemd info (if applicable)
	SystemdUnit string `json:"systemd_unit,omitempty"`
}

// OpenFile represents an open file descriptor
type OpenFile struct {
	Path string `json:"path"`
	FD   uint64 `json:"fd"`
	Mode string `json:"mode"`
}

// Connection represents a network connection
type Connection struct {
	FD         uint32 `json:"fd"`
	Family     uint32 `json:"family"`
	Type       uint32 `json:"type"`
	LocalAddr  string `json:"local_addr"`
	LocalPort  uint32 `json:"local_port"`
	RemoteAddr string `json:"remote_addr,omitempty"`
	RemotePort uint32 `json:"remote_port,omitempty"`
	Status     string `json:"status"`
}

// PortInfo contains information about an open port
type PortInfo struct {
	Port       uint32 `json:"port"`
	Protocol   string `json:"protocol"` // tcp, udp
	Address    string `json:"address"`
	PID        int32  `json:"pid"`
	ProcessName string `json:"process_name"`
	Cmdline    string `json:"cmdline"`
	Username   string `json:"username"`
	Exe        string `json:"exe"`
	State      string `json:"state"`
	
	// Container info
	ContainerID    string `json:"container_id,omitempty"`
	ContainerName  string `json:"container_name,omitempty"`
	ContainerImage string `json:"container_image,omitempty"`
	
	// Kubernetes info
	PodName      string `json:"pod_name,omitempty"`
	PodNamespace string `json:"pod_namespace,omitempty"`
	
	// Systemd info
	SystemdUnit string `json:"systemd_unit,omitempty"`
}

// SystemInfo contains system-level metrics
type SystemInfo struct {
	Hostname     string  `json:"hostname"`
	OS           string  `json:"os"`
	Platform     string  `json:"platform"`
	KernelVersion string `json:"kernel_version"`
	Uptime       uint64  `json:"uptime"`
	BootTime     uint64  `json:"boot_time"`
	
	// CPU
	CPUCount     int     `json:"cpu_count"`
	CPUPercent   float64 `json:"cpu_percent"`
	CPUUser      float64 `json:"cpu_user"`
	CPUSystem    float64 `json:"cpu_system"`
	CPUIdle      float64 `json:"cpu_idle"`
	CPUIowait    float64 `json:"cpu_iowait"`
	LoadAvg1    float64 `json:"load_avg_1"`
	LoadAvg5    float64 `json:"load_avg_5"`
	LoadAvg15   float64 `json:"load_avg_15"`
	
	// Memory
	MemTotal     uint64  `json:"mem_total"`
	MemUsed      uint64  `json:"mem_used"`
	MemFree      uint64  `json:"mem_free"`
	MemAvailable uint64  `json:"mem_available"`
	MemPercent   float64 `json:"mem_percent"`
	SwapTotal    uint64  `json:"swap_total"`
	SwapUsed     uint64  `json:"swap_used"`
	SwapPercent  float64 `json:"swap_percent"`
	
	// Disk
	DiskTotal    uint64  `json:"disk_total"`
	DiskUsed     uint64  `json:"disk_used"`
	DiskFree     uint64  `json:"disk_free"`
	DiskPercent  float64 `json:"disk_percent"`
	DiskReadBytes  uint64 `json:"disk_read_bytes"`
	DiskWriteBytes uint64 `json:"disk_write_bytes"`
	
	// Network
	NetBytesSent uint64 `json:"net_bytes_sent"`
	NetBytesRecv uint64 `json:"net_bytes_recv"`
	NetPacketsSent uint64 `json:"net_packets_sent"`
	NetPacketsRecv uint64 `json:"net_packets_recv"`
}

// SystemdUnitInfo contains systemd unit information
type SystemdUnitInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	LoadState   string `json:"load_state"`
	ActiveState string `json:"active_state"`
	SubState    string `json:"sub_state"`
	MainPID     uint32 `json:"main_pid"`
	ExecMainPID uint32 `json:"exec_main_pid"`
	MemoryCurrent uint64 `json:"memory_current"`
	CPUUsageNSec  uint64 `json:"cpu_usage_nsec"`
	TasksCurrent  uint64 `json:"tasks_current"`
}

// ContainerInfo contains container information
type ContainerInfo struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	ImageID      string            `json:"image_id"`
	State        string            `json:"state"`
	Status       string            `json:"status"`
	Created      int64             `json:"created"`
	StartedAt    string            `json:"started_at"`
	Pid          int               `json:"pid"`
	Ports        []ContainerPort   `json:"ports"`
	Labels       map[string]string `json:"labels"`
	NetworkMode  string            `json:"network_mode"`
	
	// Resource usage
	CPUPercent   float64 `json:"cpu_percent"`
	MemUsage     uint64  `json:"mem_usage"`
	MemLimit     uint64  `json:"mem_limit"`
	MemPercent   float64 `json:"mem_percent"`
	NetRxBytes   uint64  `json:"net_rx_bytes"`
	NetTxBytes   uint64  `json:"net_tx_bytes"`
	BlockRead    uint64  `json:"block_read"`
	BlockWrite   uint64  `json:"block_write"`
	
	// Kubernetes info (from labels)
	PodName      string `json:"pod_name,omitempty"`
	PodNamespace string `json:"pod_namespace,omitempty"`
	PodUID       string `json:"pod_uid,omitempty"`
}

// ContainerPort represents a port mapping
type ContainerPort struct {
	PrivatePort uint16 `json:"private_port"`
	PublicPort  uint16 `json:"public_port"`
	Type        string `json:"type"`
	IP          string `json:"ip"`
}

// KubernetesPodInfo contains Kubernetes pod information
type KubernetesPodInfo struct {
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	UID        string            `json:"uid"`
	NodeName   string            `json:"node_name"`
	HostIP     string            `json:"host_ip"`
	PodIP      string            `json:"pod_ip"`
	Phase      string            `json:"phase"`
	StartTime  string            `json:"start_time"`
	Labels     map[string]string `json:"labels"`
	Containers []KubeContainer   `json:"containers"`
}

// KubeContainer represents a container in a Kubernetes pod
type KubeContainer struct {
	Name         string `json:"name"`
	ContainerID  string `json:"container_id"`
	Image        string `json:"image"`
	Ready        bool   `json:"ready"`
	RestartCount int32  `json:"restart_count"`
	State        string `json:"state"`
}

// Collector is the interface that all collectors must implement
type Collector interface {
	// Name returns the collector name
	Name() string
	
	// Collect gathers metrics and returns them
	Collect(ctx context.Context) (*CollectionResult, error)
	
	// Interval returns how often this collector should run
	Interval() time.Duration
}

// CollectionResult contains all collected data from a single collection run
type CollectionResult struct {
	Timestamp    time.Time          `json:"timestamp"`
	Metrics      []Metric           `json:"metrics,omitempty"`
	Processes    []ProcessInfo      `json:"processes,omitempty"`
	Ports        []PortInfo         `json:"ports,omitempty"`
	System       *SystemInfo        `json:"system,omitempty"`
	SystemdUnits []SystemdUnitInfo  `json:"systemd_units,omitempty"`
	Containers   []ContainerInfo    `json:"containers,omitempty"`
	Pods         []KubernetesPodInfo `json:"pods,omitempty"`
}
