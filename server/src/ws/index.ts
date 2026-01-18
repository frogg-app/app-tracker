import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { AgentManager, AggregatedData } from '../agents/manager.js';
import { logger } from '../utils/logger.js';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  clientType?: 'ui' | 'agent';
  clientId?: string;
}

export function setupWebSocket(wss: WebSocketServer, agentManager: AgentManager): void {
  logger.info('WebSocket server initialized');

  // Ping/pong for connection health
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (!extWs.isAlive) {
        return extWs.terminate();
      }
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;

    logger.info('WebSocket client connected', {
      ip: req.socket.remoteAddress,
    });

    extWs.on('pong', () => {
      extWs.isAlive = true;
    });

    extWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(extWs, message, agentManager);
      } catch (err) {
        logger.error('Failed to parse WebSocket message', { error: String(err) });
      }
    });

    extWs.on('close', () => {
      logger.info('WebSocket client disconnected');
    });

    extWs.on('error', (err) => {
      logger.error('WebSocket error', { error: err.message });
    });

    // Send initial data
    const data = agentManager.getAggregatedData();
    sendMessage(extWs, { type: 'data', payload: data });
  });

  // Subscribe to agent updates and broadcast to all UI clients
  agentManager.subscribe((data: AggregatedData) => {
    broadcast(wss, { type: 'data', payload: data });
  });
}

function handleMessage(
  ws: ExtendedWebSocket,
  message: { type: string; payload?: unknown },
  agentManager: AgentManager
): void {
  switch (message.type) {
    case 'subscribe':
      ws.clientType = 'ui';
      logger.debug('Client subscribed to updates');
      break;

    case 'agent_data':
      ws.clientType = 'agent';
      if (message.payload && typeof message.payload === 'object') {
        const data = message.payload as AggregatedData & { agentId?: string };
        if (data.agentId) {
          agentManager.updateAgentData(data.agentId, data);
        }
      }
      break;

    case 'ping':
      sendMessage(ws, { type: 'pong' });
      break;

    default:
      logger.warn('Unknown message type', { type: message.type });
  }
}

function sendMessage(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(wss: WebSocketServer, message: unknown): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
