import { createHash } from 'crypto';
import cache from '@runeworkz/cache';
import { Request, Response, NextFunction } from 'express';
import { getUserJwt, validateToken } from '../utils/authClient';
import { getTenantId } from '../utils/tenant';
import { log } from '../utils/requestContext';
import { errorResponse } from '../utils/formatters';
import { syncMemberFromUser } from '../utils/memberSync';
import { isAdminRole, isGateControllerRole, isPropertyOwnerRole, normaliseRoles } from '../utils/roles';

export interface AuthContext {
  tenantId: string;
  userId: number;
  userName: string;
  roles: string[];
  isAdmin: boolean;
  isGateController: boolean;
  isPropertyOwner: boolean;
}

export function getAuth(res: Response): AuthContext {
  return res.locals.auth as AuthContext;
}

const TOKEN_CACHE_TTL_SECONDS = 100;

interface Identity {
  userId: number;
  userName: string;
  roles: string[];
}

async function loadIdentity(tenantId: string, jwt: string): Promise<Identity> {
  const result = await validateToken(jwt);
  if (!result.valid) throw new Error('Token is not valid');
  const user = result.profile.user;
  await syncMemberFromUser(tenantId, user);
  return {
    userId: user.id,
    userName: [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username || user.email,
    roles: normaliseRoles(result.profile.roles),
  };
}

/**
 * Resolves the caller from a bearer token, caching successful validations in Cachey for 100 seconds.
 * The cache key is a hash of the token (the raw token is never sent to Cachey). Failed validations are
 * never cached, and a Cachey outage falls back to validating against the auth API directly.
 */
async function getIdentity(tenantId: string, jwt: string): Promise<Identity> {
  const key = createHash('sha256').update(jwt).digest('hex');
  let failure: unknown;
  try {
    cache.setTenantId(tenantId);
    return await cache.getSet<Identity>('auth-token', key, async () => {
      try {
        return await loadIdentity(tenantId, jwt);
      } catch (err) {
        failure = err; // genuine validation failure: report it rather than retrying
        throw err;
      }
    }, { ttl: TOKEN_CACHE_TTL_SECONDS });
  } catch (err) {
    if (failure) throw failure;
    log('warn', `Token cache unavailable, validating directly: ${err instanceof Error ? err.message : String(err)}`);
    return loadIdentity(tenantId, jwt);
  }
}

/** Validates the bearer token and attaches the caller's identity and roles to res.locals.auth. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tenantId = getTenantId(req) || process.env.TENANT_ID || '';
  if (!tenantId) {
    res.status(400).json(errorResponse('Tenant id is required (header X-Tenant-ID or query ?tenantId=)'));
    return;
  }
  const jwt = getUserJwt(req);
  if (!jwt) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }
  try {
    const identity = await getIdentity(tenantId, jwt);
    const roles = identity.roles;
    const auth: AuthContext = {
      tenantId,
      userId: identity.userId,
      userName: identity.userName,
      roles,
      isAdmin: isAdminRole(roles),
      isGateController: isGateControllerRole(roles),
      isPropertyOwner: isPropertyOwnerRole(roles),
    };
    res.locals.auth = auth;
    next();
  } catch (err) {
    log('error', `Token validation failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(401).json(errorResponse('Invalid or expired token'));
  }
}

/** Allows only callers for whom `allowed` returns true (run after requireAuth). */
export function requireAccess(allowed: (auth: AuthContext) => boolean, message = 'Forbidden') {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!allowed(getAuth(res))) {
      res.status(403).json(errorResponse(message));
      return;
    }
    next();
  };
}

export const adminOnly = requireAccess((a) => a.isAdmin, 'Administrator access required');
export const adminOrGateController = requireAccess(
  (a) => a.isAdmin || a.isGateController,
  'Administrator or Gate Controller access required',
);
export const adminOrPropertyOwner = requireAccess(
  (a) => a.isAdmin || a.isPropertyOwner,
  'Administrator or Property Owner access required',
);
