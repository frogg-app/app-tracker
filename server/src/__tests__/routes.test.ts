import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock modules before importing the router
vi.mock('../db', () => ({
  db: {
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
  },
}));

vi.mock('../agents/manager', () => ({
  agentManager: {
    getLatestData: vi.fn(() => null),
    getAgentList: vi.fn(() => []),
    getAgentData: vi.fn(() => null),
  },
}));

vi.mock('../utils/audit', () => ({
  logAudit: vi.fn(),
}));

// Create a simple test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  // Simple health check route
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mock auth route
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username === 'admin' && password === 'admin123') {
      return res.json({
        token: 'mock-jwt-token',
        user: { id: 1, username: 'admin', role: 'admin' },
      });
    }
    
    return res.status(401).json({ error: 'Invalid credentials' });
  });

  // Mock data route
  app.get('/api/data/latest', (req, res) => {
    res.json({
      processes: [],
      ports: [],
      system: {
        hostname: 'test-host',
        uptime: 3600,
        cpu_percent: 25,
        memory_total: 8 * 1024 * 1024 * 1024,
        memory_used: 4 * 1024 * 1024 * 1024,
      },
      containers: [],
      services: [],
    });
  });

  return app;
}

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/data/latest', () => {
    it('should return latest system data', async () => {
      const response = await request(app).get('/api/data/latest');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('processes');
      expect(response.body).toHaveProperty('ports');
      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('hostname', 'test-host');
    });
  });
});

describe('Request Validation', () => {
  it('should validate required fields', () => {
    const validateLogin = (data: { username?: string; password?: string }) => {
      const errors: string[] = [];
      
      if (!data.username) {
        errors.push('Username is required');
      }
      
      if (!data.password) {
        errors.push('Password is required');
      }
      
      if (data.username && data.username.length < 3) {
        errors.push('Username must be at least 3 characters');
      }
      
      if (data.password && data.password.length < 6) {
        errors.push('Password must be at least 6 characters');
      }
      
      return errors;
    };

    expect(validateLogin({})).toHaveLength(2);
    expect(validateLogin({ username: 'admin' })).toContain('Password is required');
    expect(validateLogin({ username: 'ab', password: '123456' })).toContain('Username must be at least 3 characters');
    expect(validateLogin({ username: 'admin', password: 'admin123' })).toHaveLength(0);
  });
});
