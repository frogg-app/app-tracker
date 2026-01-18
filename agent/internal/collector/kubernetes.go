package collector

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// KubernetesCollector collects Kubernetes pod information from kubelet
type KubernetesCollector struct {
	logger     *zap.Logger
	interval   time.Duration
	kubeletURL string
	client     *http.Client
}

// kubeletPodsResponse represents the kubelet pods API response
type kubeletPodsResponse struct {
	Kind       string `json:"kind"`
	APIVersion string `json:"apiVersion"`
	Items      []struct {
		Metadata struct {
			Name      string            `json:"name"`
			Namespace string            `json:"namespace"`
			UID       string            `json:"uid"`
			Labels    map[string]string `json:"labels"`
		} `json:"metadata"`
		Spec struct {
			NodeName   string `json:"nodeName"`
			Containers []struct {
				Name  string `json:"name"`
				Image string `json:"image"`
			} `json:"containers"`
		} `json:"spec"`
		Status struct {
			Phase     string `json:"phase"`
			HostIP    string `json:"hostIP"`
			PodIP     string `json:"podIP"`
			StartTime string `json:"startTime"`
			ContainerStatuses []struct {
				Name         string `json:"name"`
				ContainerID  string `json:"containerID"`
				Image        string `json:"image"`
				Ready        bool   `json:"ready"`
				RestartCount int32  `json:"restartCount"`
				State        struct {
					Running    *struct{} `json:"running,omitempty"`
					Waiting    *struct{} `json:"waiting,omitempty"`
					Terminated *struct{} `json:"terminated,omitempty"`
				} `json:"state"`
			} `json:"containerStatuses"`
		} `json:"status"`
	} `json:"items"`
}

// NewKubernetesCollector creates a new Kubernetes collector
func NewKubernetesCollector(kubeletURL string, logger *zap.Logger) (*KubernetesCollector, error) {
	if kubeletURL == "" {
		kubeletURL = "http://localhost:10255"
	}

	// Create HTTP client with insecure TLS (kubelet often uses self-signed certs)
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", kubeletURL+"/healthz", nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to kubelet: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kubelet health check failed: %d", resp.StatusCode)
	}

	return &KubernetesCollector{
		logger:     logger,
		interval:   30 * time.Second,
		kubeletURL: kubeletURL,
		client:     client,
	}, nil
}

// Name returns the collector name
func (c *KubernetesCollector) Name() string {
	return "kubernetes"
}

// Interval returns the collection interval
func (c *KubernetesCollector) Interval() time.Duration {
	return c.interval
}

// Collect gathers Kubernetes pod information
func (c *KubernetesCollector) Collect(ctx context.Context) (*CollectionResult, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.kubeletURL+"/pods", nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get pods: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("kubelet pods API returned: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024)) // 10MB limit
	if err != nil {
		return nil, err
	}

	var podsResp kubeletPodsResponse
	if err := json.Unmarshal(body, &podsResp); err != nil {
		return nil, fmt.Errorf("failed to parse pods response: %w", err)
	}

	result := &CollectionResult{
		Timestamp: time.Now(),
		Pods:      make([]KubernetesPodInfo, 0, len(podsResp.Items)),
	}

	for _, item := range podsResp.Items {
		pod := KubernetesPodInfo{
			Name:      item.Metadata.Name,
			Namespace: item.Metadata.Namespace,
			UID:       item.Metadata.UID,
			NodeName:  item.Spec.NodeName,
			HostIP:    item.Status.HostIP,
			PodIP:     item.Status.PodIP,
			Phase:     item.Status.Phase,
			StartTime: item.Status.StartTime,
			Labels:    item.Metadata.Labels,
		}

		// Map container statuses
		pod.Containers = make([]KubeContainer, 0, len(item.Status.ContainerStatuses))
		for _, cs := range item.Status.ContainerStatuses {
			state := "unknown"
			if cs.State.Running != nil {
				state = "running"
			} else if cs.State.Waiting != nil {
				state = "waiting"
			} else if cs.State.Terminated != nil {
				state = "terminated"
			}

			pod.Containers = append(pod.Containers, KubeContainer{
				Name:         cs.Name,
				ContainerID:  cs.ContainerID,
				Image:        cs.Image,
				Ready:        cs.Ready,
				RestartCount: cs.RestartCount,
				State:        state,
			})
		}

		result.Pods = append(result.Pods, pod)
	}

	return result, nil
}
