import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[config.logging.level];
}

function formatLog(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (config.logging.format === 'pretty') {
    const color = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }[level];
    const reset = '\x1b[0m';
    
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${color}[${entry.timestamp}] ${level.toUpperCase()}${reset}: ${msg}${metaStr}`;
  }

  return JSON.stringify(entry);
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  
  const output = formatLog(level, msg, meta);
  
  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
