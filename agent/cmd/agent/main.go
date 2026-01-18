package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/your-org/app-tracker/agent/internal/api"
	"github.com/your-org/app-tracker/agent/internal/collector"
	"github.com/your-org/app-tracker/agent/internal/config"
	"github.com/your-org/app-tracker/agent/internal/push"
)

var (
	version   = "dev"
	commit    = "unknown"
	buildDate = "unknown"
)

func main() {
	rootCmd := &cobra.Command{
		Use:     "app-tracker-agent",
		Short:   "Linux Server Service Tracker Agent",
		Long:    `A lightweight agent that collects metrics from Linux servers for the App Tracker system.`,
		Version: fmt.Sprintf("%s (commit: %s, built: %s)", version, commit, buildDate),
		RunE:    run,
	}

	// Configuration flags
	rootCmd.Flags().StringP("config", "c", "", "config file path")
	rootCmd.Flags().String("listen", ":9090", "address to listen on")
	rootCmd.Flags().String("server", "", "backend server URL for push mode")
	rootCmd.Flags().String("token", "", "authentication token")
	rootCmd.Flags().Bool("tls", false, "enable TLS")
	rootCmd.Flags().String("cert", "", "TLS certificate file")
	rootCmd.Flags().String("key", "", "TLS key file")
	rootCmd.Flags().Int("interval", 10, "collection interval in seconds")
	rootCmd.Flags().Bool("debug", false, "enable debug logging")

	// Bind flags to viper
	viper.BindPFlag("listen", rootCmd.Flags().Lookup("listen"))
	viper.BindPFlag("server", rootCmd.Flags().Lookup("server"))
	viper.BindPFlag("token", rootCmd.Flags().Lookup("token"))
	viper.BindPFlag("tls.enabled", rootCmd.Flags().Lookup("tls"))
	viper.BindPFlag("tls.cert", rootCmd.Flags().Lookup("cert"))
	viper.BindPFlag("tls.key", rootCmd.Flags().Lookup("key"))
	viper.BindPFlag("interval", rootCmd.Flags().Lookup("interval"))
	viper.BindPFlag("debug", rootCmd.Flags().Lookup("debug"))

	// Environment variable binding
	viper.SetEnvPrefix("TRACKER")
	viper.AutomaticEnv()

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run(cmd *cobra.Command, args []string) error {
	// Load configuration
	configFile, _ := cmd.Flags().GetString("config")
	cfg, err := config.Load(configFile)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Setup logger
	logger := setupLogger(cfg.Debug)
	defer logger.Sync()

	logger.Info("starting app-tracker-agent",
		zap.String("version", version),
		zap.String("listen", cfg.Listen),
	)

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize collectors
	collectors, err := initCollectors(ctx, cfg, logger)
	if err != nil {
		return fmt.Errorf("failed to initialize collectors: %w", err)
	}

	// Create collector manager
	manager := collector.NewManager(collectors, cfg.Interval, logger)

	// Start collection
	go manager.Start(ctx)

	// Create and start API server
	server := api.NewServer(cfg, manager, logger)
	go func() {
		if err := server.Start(); err != nil {
			logger.Error("server error", zap.Error(err))
			cancel()
		}
	}()

	// Start push client if push mode is enabled
	var pushClient *push.Client
	if cfg.Push.Enabled && cfg.Push.ServerURL != "" {
		pushClient = push.NewClient(cfg, manager, logger)
		if err := pushClient.Start(ctx); err != nil {
			logger.Error("push client error", zap.Error(err))
		}
	}

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	logger.Info("shutting down...")
	cancel()

	// Stop push client if running
	if pushClient != nil {
		pushClient.Stop()
	}

	if err := server.Shutdown(context.Background()); err != nil {
		logger.Error("server shutdown error", zap.Error(err))
	}

	return nil
}

func setupLogger(debug bool) *zap.Logger {
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "ts",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    zapcore.OmitKey,
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	level := zap.InfoLevel
	if debug {
		level = zap.DebugLevel
	}

	config := zap.Config{
		Level:            zap.NewAtomicLevelAt(level),
		Development:      debug,
		Encoding:         "json",
		EncoderConfig:    encoderConfig,
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	logger, _ := config.Build()
	return logger
}

func initCollectors(ctx context.Context, cfg *config.Config, logger *zap.Logger) ([]collector.Collector, error) {
	var collectors []collector.Collector

	// Process collector (always enabled)
	procCollector := collector.NewProcessCollector(logger)
	collectors = append(collectors, procCollector)

	// Port collector (always enabled)
	portCollector := collector.NewPortCollector(logger)
	collectors = append(collectors, portCollector)

	// System collector (always enabled)
	sysCollector := collector.NewSystemCollector(logger)
	collectors = append(collectors, sysCollector)

	// Systemd collector (if available)
	if cfg.Collectors.Systemd {
		systemdCollector, err := collector.NewSystemdCollector(logger)
		if err != nil {
			logger.Warn("systemd collector not available", zap.Error(err))
		} else {
			collectors = append(collectors, systemdCollector)
		}
	}

	// Docker collector (if available)
	if cfg.Collectors.Docker {
		dockerCollector, err := collector.NewDockerCollector(cfg.Docker.Socket, logger)
		if err != nil {
			logger.Warn("docker collector not available", zap.Error(err))
		} else {
			collectors = append(collectors, dockerCollector)
		}
	}

	// Kubernetes collector (if kubelet available)
	if cfg.Collectors.Kubernetes {
		k8sCollector, err := collector.NewKubernetesCollector(cfg.Kubernetes.KubeletURL, logger)
		if err != nil {
			logger.Warn("kubernetes collector not available", zap.Error(err))
		} else {
			collectors = append(collectors, k8sCollector)
		}
	}

	return collectors, nil
}
