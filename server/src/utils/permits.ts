import { randomBytes } from 'crypto';
import { query } from './db';
import { AuthContext } from '../middleware/auth';
import { getAssignedGateIds } from './gateAccess';

export const PERMIT_STATUSES = ['invited', 'submitted', 'approved', 'rejected', 'cancelled'] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];

/** Dates are formatted by MySQL so they stay plain YYYY-MM-DD strings (no timezone shifting). */
export const PERMIT_SELECT = `
  SELECT pm.id, pm.property_id, p.name AS property_name, pm.member_id, m.member_number,
         m.first_name, m.last_name, m.phone, pm.email, pm.invite_token,
         DATE_FORMAT(pm.valid_from, '%Y-%m-%d') AS valid_from, DATE_FORMAT(pm.valid_to, '%Y-%m-%d') AS valid_to,
         pm.status, pm.created_by_name, pm.submitted_at, pm.decided_by_name, pm.decided_at, pm.created_at
    FROM permits pm
    LEFT JOIN properties p ON p.id = pm.property_id AND p.tenant_id = pm.tenant_id
    LEFT JOIN members m ON m.id = pm.member_id AND m.tenant_id = pm.tenant_id`;

export const newInviteToken = () => randomBytes(32).toString('hex');

/** The temporary member number: Permit<1000 + members.id>. Stable, so a repeat permit reuses it. */
export const permitMemberNumber = (memberId: number) => `Permit${1000 + memberId}`;

/**
 * Property ids the caller may manage permits for: null = every property (administrator); otherwise the
 * properties that own at least one gate the caller is linked to (Property Owner). Never cached.
 */
export async function getPermitPropertyScope(auth: AuthContext): Promise<number[] | null> {
  if (auth.isAdmin) return null;
  const gateIds = await getAssignedGateIds(auth);
  if (gateIds.length === 0) return [];
  const rows = await query<any[]>(
    `SELECT DISTINCT property_id FROM gates WHERE tenant_id = ? AND active = 1 AND id IN (${gateIds.map(() => '?').join(',')})`,
    [auth.tenantId, ...gateIds],
  );
  return rows.map((r) => r.property_id);
}

export const inScope = (scope: number[] | null, propertyId: number) => scope === null || scope.includes(propertyId);

export async function findPermit(tenantId: string, id: number) {
  const rows = await query<any[]>(`${PERMIT_SELECT} WHERE pm.tenant_id = ? AND pm.id = ? AND pm.active = 1`, [
    tenantId,
    id,
  ]);
  return rows[0] ?? null;
}

export async function findPermitByToken(tenantId: string, token: string) {
  const rows = await query<any[]>(
    `${PERMIT_SELECT} WHERE pm.tenant_id = ? AND pm.invite_token = ? AND pm.active = 1`,
    [tenantId, token],
  );
  return rows[0] ?? null;
}

export async function today(): Promise<string> {
  const rows = await query<any[]>(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS d`);
  return rows[0].d;
}

/** Strict YYYY-MM-DD that is also a real calendar date. */
export function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

export type MemberForPermit = { id: number } | { error: string };

/**
 * Finds or creates the temporary member for an email. An existing permit member is reused (same number);
 * a regular or deactivated member is refused. New members get Permit<1000+id> after insert.
 */
export async function ensurePermitMember(tenantId: string, email: string): Promise<MemberForPermit> {
  const rows = await query<any[]>(
    `SELECT id, member_type, active FROM members WHERE tenant_id = ? AND LOWER(email) = LOWER(?) ORDER BY id LIMIT 1`,
    [tenantId, email],
  );
  const existing = rows[0];
  if (existing) {
    if (existing.member_type !== 'permit') return { error: 'That email already belongs to a club member' };
    if (!existing.active) return { error: 'That permit holder has been deactivated' };
    return { id: existing.id };
  }
  const placeholder = `tmp-${randomBytes(12).toString('hex')}`;
  const result = await query<any>(
    `INSERT INTO members (tenant_id, member_number, email, phone, member_type) VALUES (?, ?, ?, '', 'permit')`,
    [tenantId, placeholder, email],
  );
  await query('UPDATE members SET member_number = ? WHERE id = ? AND tenant_id = ?', [
    permitMemberNumber(result.insertId),
    result.insertId,
    tenantId,
  ]);
  return { id: result.insertId };
}
