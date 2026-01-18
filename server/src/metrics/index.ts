import { Express } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'app_tracker_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'app_tracker_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const wsConnectionsActive = new client.Gauge({
  name: 'app_tracker_websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

const agentsActive = new client.Gauge({
  name: 'app_tracker_agents_active',
  help: 'Number of active agents',
  registers: [register],
});

export function setupMetrics(app: Express): void {
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

export const metrics = {
  httpRequestsTotal,
  httpRequestDuration,
  wsConnectionsActive,
  agentsActive,
};

export { register };
