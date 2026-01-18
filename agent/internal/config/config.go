package config

import (
	"time"

	"github.com/spf13/viper"
)

// Config holds all agent configuration
type Config struct {
	Listen   string        `mapstructure:"listen"`
	Server   string        `mapstructure:"server"`
	Token    string        `mapstructure:"token"`
	Interval time.Duration `mapstructure:"interval"`
	Debug    bool          `mapstructure:"debug"`

	TLS        TLSConfig        `mapstructure:"tls"`
	Collectors CollectorsConfig `mapstructure:"collectors"`
	Docker     DockerConfig     `mapstructure:"docker"`
	Kubernetes KubernetesConfig `mapstructure:"kubernetes"`
	Push       PushConfig       `mapstructure:"push"`
}

// TLSConfig holds TLS settings
type TLSConfig struct {
	Enabled  bool   `mapstructure:"enabled"`
	CertFile string `mapstructure:"cert"`
	KeyFile  string `mapstructure:"key"`
	CAFile   string `mapstructure:"ca"`
}

// CollectorsConfig enables/disables specific collectors
type CollectorsConfig struct {
	Process    bool `mapstructure:"process"`
	Port       bool `mapstructure:"port"`
	System     bool `mapstructure:"system"`
	Systemd    bool `mapstructure:"systemd"`
	Docker     bool `mapstructure:"docker"`
	Podman     bool `mapstructure:"podman"`
	Kubernetes bool `mapstructure:"kubernetes"`
}

// DockerConfig holds Docker-specific settings
type DockerConfig struct {
	Socket string `mapstructure:"socket"`
}

// KubernetesConfig holds Kubernetes-specific settings
type KubernetesConfig struct {
	KubeletURL string `mapstructure:"kubelet_url"`
	Token      string `mapstructure:"token"`
}

// PushConfig holds settings for push mode to backend
type PushConfig struct {
	Enabled   bool          `mapstructure:"enabled"`
	ServerURL string        `mapstructure:"server_url"`
	Interval  time.Duration `mapstructure:"interval"`
	BatchSize int           `mapstructure:"batch_size"`
}

// Load loads configuration from file and environment
func Load(configFile string) (*Config, error) {
	// Set defaults
	setDefaults()

	// Load config file if specified
	if configFile != "" {
		viper.SetConfigFile(configFile)
	} else {
		viper.SetConfigName("agent")
		viper.SetConfigType("yaml")
		viper.AddConfigPath("/etc/app-tracker/")
		viper.AddConfigPath("$HOME/.app-tracker")
		viper.AddConfigPath(".")
	}

	// Try to read config file (ignore if not found)
	_ = viper.ReadInConfig()

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	// Convert interval from seconds to duration if not already set
	if cfg.Interval == 0 {
		// Try to parse as duration string first (e.g., "10s")
		intervalStr := viper.GetString("interval")
		if d, err := time.ParseDuration(intervalStr); err == nil {
			cfg.Interval = d
		} else {
			// Fall back to integer seconds
			cfg.Interval = time.Duration(viper.GetInt("interval")) * time.Second
		}
	}

	// Push interval is already parsed as duration from string like "10s"
	// No additional conversion needed

	return &cfg, nil
}

func setDefaults() {
	viper.SetDefault("listen", ":9090")
	viper.SetDefault("interval", 10)
	viper.SetDefault("debug", false)

	viper.SetDefault("tls.enabled", false)

	viper.SetDefault("collectors.process", true)
	viper.SetDefault("collectors.port", true)
	viper.SetDefault("collectors.system", true)
	viper.SetDefault("collectors.systemd", true)
	viper.SetDefault("collectors.docker", true)
	viper.SetDefault("collectors.podman", false)
	viper.SetDefault("collectors.kubernetes", false)

	viper.SetDefault("docker.socket", "/var/run/docker.sock")

	viper.SetDefault("kubernetes.kubelet_url", "http://localhost:10255")

	viper.SetDefault("push.enabled", false)
	viper.SetDefault("push.interval", "10s")
	viper.SetDefault("push.batch_size", 100)
	viper.SetDefault("push.server_url", "")

	// Bind environment variables for push mode
	viper.BindEnv("push.enabled", "APPTRACKER_PUSH_ENABLED")
	viper.BindEnv("push.server_url", "APPTRACKER_SERVER_WS_URL")
	viper.BindEnv("push.interval", "APPTRACKER_PUSH_INTERVAL")
	
	// Bind environment variables for collector settings
	viper.BindEnv("interval", "APPTRACKER_COLLECT_INTERVAL")
	viper.BindEnv("listen", "APPTRACKER_API_ADDR")
	viper.BindEnv("collectors.docker", "APPTRACKER_ENABLE_DOCKER")
	viper.BindEnv("collectors.kubernetes", "APPTRACKER_ENABLE_KUBERNETES")
}
