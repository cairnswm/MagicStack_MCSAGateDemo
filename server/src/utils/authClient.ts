const AUTH_API = process.env.MAGICSTACK_AUTH_API || '';
import { Request } from 'express';
import cache from '@runeworkz/cache';
import { getRequestId, getHostname, getContextTenantId, log } from './requestContext';

export function getFetch() {
  const f = (globalThis as any).fetch as typeof globalThis.fetch;
  if (!f) throw new Error('Global fetch is not available in this runtime');

  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const requestId = getRequestId();
    const hostname = getHostname();
    const tenantId = getContextTenantId() ?? process.env.TENANT_ID;
    if (!tenantId) {
      throw new Error('x-tenant-id is required: not present in request headers and TENANT_ID env var is not set');
    }
    const headers = new Headers(init?.headers);
    headers.set('X-Request-ID', requestId);
    if (hostname) headers.set('X-Hostname', hostname);
    if (!headers.has('x-tenant-id')) headers.set('X-Tenant-ID', tenantId);
    const urlStr = typeof url === 'string' ? url : url.toString();
    const method = init?.method ?? 'GET';
    log('info', `[fetch] ${requestId} → ${method} ${urlStr}`);
    const start = Date.now();
    const response = await f(url, { ...init, headers });
    log('info', `[fetch] ${requestId} ← ${response.status} ${Date.now() - start}ms`);
    return response;
  };
}

export interface TenantResponse {
  tenant: {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    owner: string;
    date_created: string;
  };
  properties: Array<{ name: string; value: string }>;
  settings: Record<string, any>;
}

export interface ValidateTokenUser {
  id: number;
  email: string;
  active: number;
  avatar: string | null;
  lastname: string;
  username: string;
  firstname: string;
  tenant_id: string;
  date_created: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  profile: {
    user: ValidateTokenUser;
    roles: string[];
    properties: Array<{ name: string; value: string }>;
    user_permissions: string[];
  };
}

export async function validateToken(bearerToken: string): Promise<ValidateTokenResponse> {
  if (!AUTH_API) throw new Error('MAGICSTACK_AUTH_API is not configured');
  const url = `${AUTH_API.replace(/\/$/, '')}/validate-api`;

  const fetchFn = getFetch();

  const res = await fetchFn(url, {
    method: 'GET',
    headers: {
      Authorization: bearerToken,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token validation failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<ValidateTokenResponse>;
}

export function getUserJwt(req: Request): string | undefined {
  const header = req.header('authorization') || req.header('Authorization');
  if (!header) return undefined;
  // Ensure the value is a Bearer token string (e.g. "Bearer ey...")
  return header.startsWith('Bearer ') ? header : `Bearer ${header}`;
}

export async function fetchTenant(tenantId: string, bearerToken?: string): Promise<TenantResponse> {
  if (!AUTH_API) throw new Error('MAGICSTACK_AUTH_API is not configured');

  cache.setTenantId(tenantId);
  return cache.getSet<TenantResponse>(
    'tenant',
    tenantId,
    async () => {
      const url = `${AUTH_API.replace(/\/$/, '')}/tenant/`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      };

      if (bearerToken) headers.Authorization = bearerToken;

      const fetchFn = getFetch();

      const res = await fetchFn(url, { method: 'GET', headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fetch tenant failed: ${res.status} ${text}`);
      }

      return res.json() as Promise<TenantResponse>;
    },
    { ttl: 300, shared: true },
  );
}

export default { validateToken, fetchTenant, getUserJwt };
