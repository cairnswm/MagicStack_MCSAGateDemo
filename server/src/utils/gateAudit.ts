import { query } from './db';
import { AuthContext } from '../middleware/auth';

/** Records that a gate's code changed. Deliberately stores who/when/gate only, never the code values. */
export async function recordGateCodeChange(
  auth: AuthContext,
  gate: { id: number; property_id: number; name: string },
  action: 'create' | 'update' | 'clear' | 'regenerate',
): Promise<void> {
  const role = auth.isAdmin ? 'Administrator' : 'Gate Controller';
  await query(
    `INSERT INTO gate_code_audit
       (tenant_id, gate_id, property_id, gate_name, action, changed_by_user_id, changed_by_name, changed_by_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [auth.tenantId, gate.id, gate.property_id, gate.name, action, auth.userId, auth.userName, role],
  );
}
