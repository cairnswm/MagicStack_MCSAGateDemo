import { AsyncLocalStorage } from 'async_hooks';
import os from 'os';

interface RequestContext {
  requestId: string;
  hostname?: string;
  tenantId?: string;
}

export const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generates a unique request ID encoded as base64url.
 * Format before encoding: <SERVICE_NAME>:<ip|hostname>:<timestamp_ms>:<4-char hex>
 * This allows the origin service, source IP, and time to be decoded for tracing.
 */
export function generateRequestId(ip?: string): string {
  const service = process.env.SERVICE_NAME || 'app';
  const source = ip || os.hostname();
  const timestamp = Date.now();
  const random = Math.random().toString(16).slice(2, 6);
  const raw = `${service}:${source}:${timestamp}:${random}`;
  return Buffer.from(raw).toString('base64url');
}

export function getRequestId(): string {
  return requestStorage.getStore()?.requestId ?? generateRequestId();
}

export function getHostname(): string | undefined {
  return requestStorage.getStore()?.hostname;
}

export function getContextTenantId(): string | undefined {
  return requestStorage.getStore()?.tenantId;
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
type LogLevel = typeof LOG_LEVELS[number];

function getConfiguredLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return (LOG_LEVELS as readonly string[]).includes(env) ? (env as LogLevel) : 'info';
}

export function log(level: Exclude<LogLevel, 'silent'>, message: string): void {
  if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(getConfiguredLevel())) {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}
