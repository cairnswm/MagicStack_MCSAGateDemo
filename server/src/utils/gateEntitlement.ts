import { query } from './db';
import { AuthContext } from '../middleware/auth';
import { getAssignedGateIds } from './gateAccess';

export type DenyReason = 'not_member' | 'no_permit' | 'not_approved' | 'wrong_property' | 'wrong_date';

export interface CodeAccess {
  granted: boolean;
  reason?: DenyReason;
}

const GRANTED: CodeAccess = { granted: true };
const deny = (reason: DenyReason): CodeAccess => ({ granted: false, reason });

/**
 * May this caller see the code of this gate? Looked up on every call (never cached).
 * - Administrators, and Gate Controllers / Property Owners linked to the gate: yes.
 * - Regular members: yes.
 * - Permit holders (temporary members): only with an approved permit for the gate's PROPERTY whose dates
 *   include today (database clock). Otherwise the most specific reason is returned.
 * - Anyone else (no active member record): no.
 */
export async function getGateCodeAccess(
  auth: AuthContext,
  gate: { id: number; property_id: number },
): Promise<CodeAccess> {
  if (auth.isAdmin) return GRANTED;
  if ((await getAssignedGateIds(auth)).includes(gate.id)) return GRANTED;

  const members = await query<any[]>(
    `SELECT id, member_type FROM members WHERE tenant_id = ? AND user_id = ? AND active = 1 ORDER BY id`,
    [auth.tenantId, auth.userId],
  );
  if (members.length === 0) return deny('not_member');
  if (members.some((m) => m.member_type !== 'permit')) return GRANTED;

  const permits = await query<any[]>(
    `SELECT property_id, status, (CURDATE() BETWEEN valid_from AND valid_to) AS in_date
       FROM permits
      WHERE tenant_id = ? AND active = 1 AND member_id IN (${members.map(() => '?').join(',')})`,
    [auth.tenantId, ...members.map((m) => m.id)],
  );
  if (permits.length === 0) return deny('no_permit');
  const here = permits.filter((p) => p.property_id === gate.property_id);
  if (here.length === 0) return deny('wrong_property');
  const approved = here.filter((p) => p.status === 'approved');
  if (approved.length === 0) return deny('not_approved');
  return approved.some((p) => Number(p.in_date) === 1) ? GRANTED : deny('wrong_date');
}
