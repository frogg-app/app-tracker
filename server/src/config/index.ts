import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('32400'),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DATABASE_PATH: z.string().default('./data/app-tracker.db'),
  
  // Auth
  JWT_SECRET: z.string().default('change-me-in-production-please'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  API_TOKEN: z.string().optional(),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  
  // Agent settings
  AGENT_TOKEN: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Demo mode - set to 'true' to enable fake data generation
  DEMO_MODE: z.string().default('false'),
});

const env = envSchema.parse(process.env);

export const config = {
  version: '1.0.0',
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  host: env.HOST,
  
  database: {
    path: env.DATABASE_PATH,
  },
  
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    apiToken: env.API_TOKEN,
  },
  
  corsOrigins: env.CORS_ORIGINS.split(',').map(s => s.trim()),
  
  agent: {
    token: env.AGENT_TOKEN,
  },
  
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  
  // Demo mode generates fake data when no real agents are connected
  demoMode: env.DEMO_MODE === 'true',
};

export type Config = typeof config;
