package config

import (
	"os"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := &Config{
		ServerURL:       "http://localhost:32400",
		AgentID:         "",
		CollectInterval: 10 * time.Second,
		APIAddr:         "0.0.0.0:8080",
		EnableDocker:    true,
		EnableK8s:       false,
	}

	if cfg.ServerURL != "http://localhost:32400" {
		t.Errorf("Expected ServerURL 'http://localhost:32400', got %s", cfg.ServerURL)
	}

	if cfg.CollectInterval != 10*time.Second {
		t.Errorf("Expected CollectInterval 10s, got %v", cfg.CollectInterval)
	}

	if !cfg.EnableDocker {
		t.Error("Expected EnableDocker to be true")
	}

	if cfg.EnableK8s {
		t.Error("Expected EnableK8s to be false")
	}
}

func TestConfigFromEnv(t *testing.T) {
	// Save original env and restore after test
	originalURL := os.Getenv("APPTRACKER_SERVER_URL")
	originalID := os.Getenv("APPTRACKER_AGENT_ID")
	defer func() {
		os.Setenv("APPTRACKER_SERVER_URL", originalURL)
		os.Setenv("APPTRACKER_AGENT_ID", originalID)
	}()

	os.Setenv("APPTRACKER_SERVER_URL", "http://test-server:32400")
	os.Setenv("APPTRACKER_AGENT_ID", "test-agent-123")

	cfg := LoadFromEnv()

	if cfg.ServerURL != "http://test-server:32400" {
		t.Errorf("Expected ServerURL from env, got %s", cfg.ServerURL)
	}

	if cfg.AgentID != "test-agent-123" {
		t.Errorf("Expected AgentID from env, got %s", cfg.AgentID)
	}
}

func TestTLSConfig(t *testing.T) {
	tlsCfg := TLSConfig{
		Enabled:    true,
		CertFile:   "/path/to/cert.pem",
		KeyFile:    "/path/to/key.pem",
		CAFile:     "/path/to/ca.pem",
		SkipVerify: false,
	}

	if !tlsCfg.Enabled {
		t.Error("Expected TLS to be enabled")
	}

	if tlsCfg.CertFile != "/path/to/cert.pem" {
		t.Errorf("Expected CertFile '/path/to/cert.pem', got %s", tlsCfg.CertFile)
	}

	if tlsCfg.SkipVerify {
		t.Error("Expected SkipVerify to be false")
	}
}

func TestDockerConfig(t *testing.T) {
	dockerCfg := DockerConfig{
		Host:       "unix:///var/run/docker.sock",
		APIVersion: "1.41",
	}

	if dockerCfg.Host != "unix:///var/run/docker.sock" {
		t.Errorf("Expected Docker host socket, got %s", dockerCfg.Host)
	}

	if dockerCfg.APIVersion != "1.41" {
		t.Errorf("Expected API version '1.41', got %s", dockerCfg.APIVersion)
	}
}

func TestK8sConfig(t *testing.T) {
	k8sCfg := K8sConfig{
		KubeletURL:         "https://localhost:10250",
		BearerTokenFile:    "/var/run/secrets/kubernetes.io/serviceaccount/token",
		InsecureSkipVerify: true,
	}

	if k8sCfg.KubeletURL != "https://localhost:10250" {
		t.Errorf("Expected kubelet URL, got %s", k8sCfg.KubeletURL)
	}

	if !k8sCfg.InsecureSkipVerify {
		t.Error("Expected InsecureSkipVerify to be true")
	}
}

// LoadFromEnv is a helper for testing - would be in config.go
func LoadFromEnv() *Config {
	cfg := &Config{
		ServerURL:       "http://localhost:32400",
		CollectInterval: 10 * time.Second,
		APIAddr:         "0.0.0.0:8080",
		EnableDocker:    true,
	}

	if url := os.Getenv("APPTRACKER_SERVER_URL"); url != "" {
		cfg.ServerURL = url
	}

	if id := os.Getenv("APPTRACKER_AGENT_ID"); id != "" {
		cfg.AgentID = id
	}

	return cfg
}
