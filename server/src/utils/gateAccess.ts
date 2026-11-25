import { query } from './db';
import { AuthContext } from '../middleware/auth';

/**
 * Ids of the gates the caller is linked to as a Gate Controller (via their member record).
 * Looked up on every call: assignments are never cached so changes apply immediately.
 */
export async function getAssignedGateIds(auth: Pick<AuthContext, 'tenantId' | 'userId'>): Promise<number[]> {
  const rows = await query<any[]>(
    `SELECT DISTINCT gc.gate_id
       FROM gate_controllers gc
       JOIN members m ON m.id = gc.member_id AND m.tenant_id = gc.tenant_id
      WHERE gc.tenant_id = ? AND gc.active = 1 AND m.active = 1 AND m.user_id = ?`,
    [auth.tenantId, auth.userId],
  );
  return rows.map((r) => r.gate_id);
}

/** Administrators may use any gate; Gate Controllers only the gates linked to them. */
export async function canUseGate(auth: AuthContext, gateId: number): Promise<boolean> {
  if (auth.isAdmin) return true;
  return (await getAssignedGateIds(auth)).includes(gateId);
}
