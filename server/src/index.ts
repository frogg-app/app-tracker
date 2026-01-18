import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './db/index.js';
import { setupRoutes } from './api/routes.js';
import { setupWebSocket } from './ws/index.js';
import { setupMetrics } from './metrics/index.js';
import { AgentManager } from './agents/manager.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';

async function main() {
  logger.info('Starting App Tracker Server', { version: config.version });

  // Initialize database
  await initDatabase();
  logger.info('Database initialized');

  // Initialize agent manager
  const agentManager = new AgentManager();

  // Create Express app
  const app = express();
  const server = createServer(app);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for demo
  }));
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.version,
    });
  });

  // Metrics endpoint (no auth)
  setupMetrics(app);

  // API routes with auth
  app.use('/api/v1', authMiddleware, setupRoutes(agentManager));

  // Error handler
  app.use(errorHandler);

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });
  setupWebSocket(wss, agentManager);

  // Start server
  server.listen(config.port, config.host, () => {
    logger.info(`Server listening on ${config.host}:${config.port}`);
    logger.info(`API: http://${config.host}:${config.port}/api/v1`);
    logger.info(`WebSocket: ws://${config.host}:${config.port}/ws`);
    logger.info(`Metrics: http://${config.host}:${config.port}/metrics`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    
    wss.close();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.error('Force shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
