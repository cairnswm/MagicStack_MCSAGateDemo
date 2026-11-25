import { query } from './db';

interface AuthUser {
  id: number;
  email?: string;
  firstname?: string;
  lastname?: string;
}

/**
 * Called when validate-api succeeds: fills in the auth user's id and name on the member whose email matches
 * (case-insensitive). Does nothing if no member has that email. Never throws, so auth is never blocked by it.
 */
export async function syncMemberFromUser(tenantId: string, user: AuthUser): Promise<void> {
  const email = user.email?.trim();
  if (!email) return;
  try {
    await query(
      `UPDATE members SET user_id = ?, first_name = ?, last_name = ?
        WHERE tenant_id = ? AND LOWER(email) = LOWER(?)`,
      [user.id, user.firstname || null, user.lastname || null, tenantId, email],
    );
  } catch {
    // best effort only
  }
}
