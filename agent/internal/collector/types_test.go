package collector

import (
	"testing"
)

func TestProcessInfo(t *testing.T) {
	info := ProcessInfo{
		PID:         1234,
		Name:        "test-process",
		Exe:         "/usr/bin/test",
		Cmdline:     "/usr/bin/test --flag",
		Username:    "testuser",
		UID:         1000,
		Status:      "running",
		CPUPercent:  25.5,
		MemoryBytes: 1024 * 1024 * 100,
		NumThreads:  4,
		NumFDs:      10,
		StartTime:   1609459200,
	}

	if info.PID != 1234 {
		t.Errorf("Expected PID 1234, got %d", info.PID)
	}

	if info.Name != "test-process" {
		t.Errorf("Expected name 'test-process', got %s", info.Name)
	}

	if info.CPUPercent != 25.5 {
		t.Errorf("Expected CPU 25.5, got %f", info.CPUPercent)
	}
}

func TestPortInfo(t *testing.T) {
	info := PortInfo{
		Port:        8080,
		Protocol:    "tcp",
		Address:     "0.0.0.0",
		PID:         1234,
		ProcessName: "nginx",
		State:       "LISTEN",
	}

	if info.Port != 8080 {
		t.Errorf("Expected port 8080, got %d", info.Port)
	}

	if info.Protocol != "tcp" {
		t.Errorf("Expected protocol 'tcp', got %s", info.Protocol)
	}
}

func TestSystemInfo(t *testing.T) {
	info := SystemInfo{
		Hostname:     "test-host",
		OS:           "linux",
		Platform:     "ubuntu",
		Kernel:       "5.15.0",
		Uptime:       3600,
		CPUPercent:   45.0,
		MemoryTotal:  8 * 1024 * 1024 * 1024,
		MemoryUsed:   4 * 1024 * 1024 * 1024,
		DiskTotal:    100 * 1024 * 1024 * 1024,
		DiskUsed:     50 * 1024 * 1024 * 1024,
		NumCPUs:      4,
	}

	if info.Hostname != "test-host" {
		t.Errorf("Expected hostname 'test-host', got %s", info.Hostname)
	}

	expectedMemoryPercent := float64(info.MemoryUsed) / float64(info.MemoryTotal) * 100
	if expectedMemoryPercent != 50.0 {
		t.Errorf("Expected memory percent 50.0, got %f", expectedMemoryPercent)
	}
}

func TestContainerInfo(t *testing.T) {
	info := ContainerInfo{
		ID:          "abc123def456",
		Name:        "my-container",
		Image:       "nginx:latest",
		State:       "running",
		CPUPercent:  10.5,
		MemoryBytes: 256 * 1024 * 1024,
		MemoryLimit: 512 * 1024 * 1024,
		Ports: []ContainerPort{
			{PrivatePort: 80, PublicPort: 8080, Type: "tcp"},
		},
	}

	if info.ID != "abc123def456" {
		t.Errorf("Expected ID 'abc123def456', got %s", info.ID)
	}

	if len(info.Ports) != 1 {
		t.Errorf("Expected 1 port, got %d", len(info.Ports))
	}

	if info.Ports[0].PrivatePort != 80 {
		t.Errorf("Expected private port 80, got %d", info.Ports[0].PrivatePort)
	}
}

func TestSystemdUnitInfo(t *testing.T) {
	info := SystemdUnitInfo{
		Name:        "nginx.service",
		Description: "A high performance web server",
		LoadState:   "loaded",
		ActiveState: "active",
		SubState:    "running",
		MainPID:     1234,
	}

	if info.Name != "nginx.service" {
		t.Errorf("Expected name 'nginx.service', got %s", info.Name)
	}

	if info.ActiveState != "active" {
		t.Errorf("Expected active state 'active', got %s", info.ActiveState)
	}
}

func TestKubernetesPodInfo(t *testing.T) {
	info := KubernetesPodInfo{
		Name:      "my-pod",
		Namespace: "default",
		UID:       "pod-uid-123",
		Phase:     "Running",
		HostIP:    "192.168.1.1",
		PodIP:     "10.0.0.5",
		Containers: []KubernetesContainerInfo{
			{
				Name:        "main",
				Image:       "myapp:v1",
				ContainerID: "containerd://abc123",
				Ready:       true,
				State:       "running",
			},
		},
	}

	if info.Name != "my-pod" {
		t.Errorf("Expected name 'my-pod', got %s", info.Name)
	}

	if len(info.Containers) != 1 {
		t.Errorf("Expected 1 container, got %d", len(info.Containers))
	}

	if !info.Containers[0].Ready {
		t.Error("Expected container to be ready")
	}
}

func TestCollectedData(t *testing.T) {
	data := &CollectedData{
		Processes: []ProcessInfo{
			{PID: 1, Name: "init"},
			{PID: 2, Name: "kthreadd"},
		},
		Ports: []PortInfo{
			{Port: 22, Protocol: "tcp"},
			{Port: 80, Protocol: "tcp"},
		},
		System: SystemInfo{
			Hostname: "test-host",
		},
	}

	if len(data.Processes) != 2 {
		t.Errorf("Expected 2 processes, got %d", len(data.Processes))
	}

	if len(data.Ports) != 2 {
		t.Errorf("Expected 2 ports, got %d", len(data.Ports))
	}
}
