import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import { getDatabase } from '../db/index.js';
import { config } from '../config/index.js';
import { AgentManager } from '../agents/manager.js';
import { auditLog } from '../utils/audit.js';

export function setupRoutes(agentManager: AgentManager): Router {
  const router = Router();

  // ============ Auth Routes ============
  router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      });

      const { username, password } = schema.parse(req.body);
      const db = getDatabase();

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
        id: string;
        username: string;
        password_hash: string;
        role: string;
      } | undefined;

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const signOptions: SignOptions = { expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        config.auth.jwtSecret,
        signOptions
      );

      auditLog({
        userId: user.id,
        action: 'login',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip || 'unknown',
      });

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(8),
      });

      const { username, password } = schema.parse(req.body);
      const db = getDatabase();

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        res.status(400).json({ error: 'Username already exists' });
        return;
      }

      const id = uuidv4();
      const passwordHash = bcrypt.hashSync(password, 10);

      db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
        id,
        username,
        passwordHash,
        'viewer'
      );

      auditLog({
        userId: id,
        action: 'register',
        resourceType: 'user',
        resourceId: id,
        ipAddress: req.ip || 'unknown',
      });

      res.status(201).json({ id, username, role: 'viewer' });
    } catch (error) {
      next(error);
    }
  });

  // ============ Data Routes ============
  router.get('/data', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data);
  });

  router.get('/processes', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data.processes);
  });

  router.get('/ports', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data.ports);
  });

  router.get('/system', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data.system);
  });

  router.get('/containers', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data.containers);
  });

  router.get('/services', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data.systemdUnits);
  });

  router.get('/pods', (_req: Request, res: Response) => {
    const data = agentManager.getAggregatedData();
    res.json(data.pods);
  });

  // ============ Agent Management ============
  router.get('/agents', (_req: Request, res: Response) => {
    const agents = agentManager.getAgents();
    res.json(agents);
  });

  router.post('/agents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
      });

      const { name } = schema.parse(req.body);
      const agent = agentManager.createAgent(name);

      auditLog({
        userId: (req as unknown as { user?: { userId: string } }).user?.userId,
        action: 'create_agent',
        resourceType: 'agent',
        resourceId: agent.id,
        ipAddress: req.ip || 'unknown',
      });

      res.status(201).json(agent);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/agents/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'];
      if (!id) {
        res.status(400).json({ error: 'Agent ID required' });
        return;
      }
      agentManager.removeAgent(id);

      auditLog({
        userId: (req as unknown as { user?: { userId: string } }).user?.userId,
        action: 'delete_agent',
        resourceType: 'agent',
        resourceId: id,
        ipAddress: req.ip || 'unknown',
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ============ Historical Data ============
  router.get('/history/system', (req: Request, res: Response) => {
    const db = getDatabase();
    const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 1000);
    
    const snapshots = db.prepare(`
      SELECT timestamp, data FROM metrics_snapshots
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as { timestamp: string; data: string }[];

    const history = snapshots.map(s => ({
      timestamp: s.timestamp,
      ...JSON.parse(s.data).system,
    })).reverse();

    res.json(history);
  });

  // ============ Audit Log ============
  router.get('/audit', (req: Request, res: Response) => {
    const db = getDatabase();
    const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 1000);
    
    const logs = db.prepare(`
      SELECT * FROM audit_log
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    res.json(logs);
  });

  // ============ Users (Admin only) ============
  router.get('/users', (_req: Request, res: Response) => {
    const db = getDatabase();
    const users = db.prepare('SELECT id, username, role, created_at, updated_at FROM users').all();
    res.json(users);
  });

  router.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        role: z.enum(['admin', 'operator', 'viewer']),
      });

      const { role } = schema.parse(req.body);
      const { id } = req.params;
      const db = getDatabase();

      db.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?').run(role, id);

      auditLog({
        userId: (req as unknown as { user?: { userId: string } }).user?.userId,
        action: 'update_user_role',
        resourceType: 'user',
        resourceId: id,
        details: JSON.stringify({ role }),
        ipAddress: req.ip || 'unknown',
      });

      res.json({ id, role });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
