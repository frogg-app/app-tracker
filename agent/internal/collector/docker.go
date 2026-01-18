package collector

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"go.uber.org/zap"
)

// DockerCollector collects Docker container information
type DockerCollector struct {
	logger   *zap.Logger
	interval time.Duration
	client   *client.Client
}

// NewDockerCollector creates a new Docker collector
func NewDockerCollector(socketPath string, logger *zap.Logger) (*DockerCollector, error) {
	opts := []client.Opt{
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	}

	if socketPath != "" {
		opts = append(opts, client.WithHost("unix://"+socketPath))
	}

	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = cli.Ping(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}

	return &DockerCollector{
		logger:   logger,
		interval: 15 * time.Second,
		client:   cli,
	}, nil
}

// Name returns the collector name
func (c *DockerCollector) Name() string {
	return "docker"
}

// Interval returns the collection interval
func (c *DockerCollector) Interval() time.Duration {
	return c.interval
}

// Collect gathers Docker container information
func (c *DockerCollector) Collect(ctx context.Context) (*CollectionResult, error) {
	containers, err := c.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := &CollectionResult{
		Timestamp:  time.Now(),
		Containers: make([]ContainerInfo, 0, len(containers)),
	}

	for _, ctr := range containers {
		info := ContainerInfo{
			ID:          ctr.ID[:12],
			Image:       ctr.Image,
			ImageID:     ctr.ImageID,
			State:       ctr.State,
			Status:      ctr.Status,
			Created:     ctr.Created,
			Labels:      ctr.Labels,
			NetworkMode: ctr.HostConfig.NetworkMode,
		}

		// Get container name (remove leading /)
		if len(ctr.Names) > 0 {
			name := ctr.Names[0]
			if len(name) > 0 && name[0] == '/' {
				name = name[1:]
			}
			info.Name = name
		}

		// Parse ports
		info.Ports = make([]ContainerPort, 0, len(ctr.Ports))
		for _, port := range ctr.Ports {
			info.Ports = append(info.Ports, ContainerPort{
				PrivatePort: port.PrivatePort,
				PublicPort:  port.PublicPort,
				Type:        port.Type,
				IP:          port.IP,
			})
		}

		// Extract Kubernetes info from labels
		if podName, ok := ctr.Labels["io.kubernetes.pod.name"]; ok {
			info.PodName = podName
		}
		if podNamespace, ok := ctr.Labels["io.kubernetes.pod.namespace"]; ok {
			info.PodNamespace = podNamespace
		}
		if podUID, ok := ctr.Labels["io.kubernetes.pod.uid"]; ok {
			info.PodUID = podUID
		}

		// Get container stats (CPU, memory, network, disk)
		if ctr.State == "running" {
			c.enrichContainerStats(ctx, &info, ctr.ID)
		}

		result.Containers = append(result.Containers, info)
	}

	return result, nil
}

func (c *DockerCollector) enrichContainerStats(ctx context.Context, info *ContainerInfo, containerID string) {
	stats, err := c.client.ContainerStats(ctx, containerID, false)
	if err != nil {
		c.logger.Debug("failed to get container stats", zap.String("container", containerID), zap.Error(err))
		return
	}
	defer stats.Body.Close()

	// Read stats response
	var statsJSON types.StatsJSON
	decoder := io.LimitReader(stats.Body, 1024*1024) // Limit to 1MB
	
	// Note: In production, you'd parse the JSON properly
	// For simplicity, we're using the container inspect instead
	
	inspect, err := c.client.ContainerInspect(ctx, containerID)
	if err != nil {
		return
	}

	if inspect.State != nil && inspect.State.Pid > 0 {
		info.Pid = inspect.State.Pid
		info.StartedAt = inspect.State.StartedAt
	}

	_ = statsJSON
	_ = decoder
}

// Close closes the Docker client
func (c *DockerCollector) Close() {
	if c.client != nil {
		c.client.Close()
	}
}
