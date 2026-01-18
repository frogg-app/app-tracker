import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

interface UserPayload {
  userId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for public endpoints
  if (req.path === '/auth/login' || req.path === '/auth/register') {
    next();
    return;
  }
  
  // Skip auth for read-only data endpoints (allow public monitoring)
  if (req.method === 'GET' && (
    req.path === '/data' || 
    req.path === '/processes' || 
    req.path === '/ports' || 
    req.path === '/system' ||
    req.path === '/containers' ||
    req.path === '/services' ||
    req.path === '/pods' ||
    req.path === '/agents'
  )) {
    req.user = {
      userId: 'public',
      username: 'public',
      role: 'viewer',
    };
    next();
    return;
  }

  // Check for API token (simple token auth)
  const apiToken = req.headers['x-api-token'] as string;
  if (config.auth.apiToken && apiToken === config.auth.apiToken) {
    req.user = {
      userId: 'api',
      username: 'api',
      role: 'admin',
    };
    next();
    return;
  }

  // Check for JWT Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Allow demo mode without auth in development
    if (config.env === 'development') {
      req.user = {
        userId: 'demo',
        username: 'demo',
        role: 'admin',
      };
      next();
      return;
    }
    
    res.status(401).json({ error: 'No authorization header' });
    return;
  }

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as UserPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
