import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { getAuth, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

async function findGateByToken(tenantId: string, token: string) {
  const rows = await query<any[]>(
    `SELECT g.id, g.property_id, g.name, g.code, p.name AS property_name
       FROM gates g
       LEFT JOIN properties p ON p.id = g.property_id AND p.tenant_id = g.tenant_id
      WHERE g.tenant_id = ? AND g.access_token = ? AND g.active = 1`,
    [tenantId, token],
  );
  return rows[0] ?? null;
}

const gateView = (gate: any) => ({
  gateId: gate.id,
  gateName: gate.name,
  propertyName: gate.property_name,
  code: gate.code,
});

// GET /mine?days=30 - the caller's own access records, newest first, for the last `days` days (default 30, max 3650).
// "Load more" in the UI just asks for a larger window; hasMore says whether older records exist. Registered before
// /:token so "mine" is never treated as a QR token. Contains no gate codes.
router.get('/mine', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const parsed = Number.parseInt(String(req.query.days ?? '30'), 10);
    const days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 3650) : 30;
    const records = await query<any[]>(
      `SELECT pa.id, pa.property_id, p.name AS property_name, pa.gate_id, g.name AS gate_name,
              pa.access_date, pa.status, pa.in_at, pa.out_at
         FROM property_access pa
         LEFT JOIN properties p ON p.id = pa.property_id AND p.tenant_id = pa.tenant_id
         LEFT JOIN gates g ON g.id = pa.gate_id AND g.tenant_id = pa.tenant_id
        WHERE pa.tenant_id = ? AND pa.user_id = ? AND pa.access_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY pa.access_date DESC, COALESCE(pa.out_at, pa.in_at) DESC, pa.id DESC`,
      [auth.tenantId, auth.userId, days],
    );
    const older = await query<any[]>(
      `SELECT 1 AS found FROM property_access
        WHERE tenant_id = ? AND user_id = ? AND access_date < DATE_SUB(CURDATE(), INTERVAL ? DAY) LIMIT 1`,
      [auth.tenantId, auth.userId, days],
    );
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse({ days, hasMore: older.length > 0, records }));
  } catch (err) {
    return fail(res, err);
  }
});

// GET /:token - the gate behind a scanned QR link, with its current code. Any signed-in user. Records nothing.
// The response contains the gate code, so it must never be cached (here or by a browser/proxy).
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const gate = await findGateByToken(getAuth(res).tenantId, req.params.token);
    if (!gate) return res.status(404).json(errorResponse('This access link is not valid'));
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse(gateView(gate)));
  } catch (err) {
    return fail(res, err);
  }
});

/**
 * POST /:token/in and /:token/out - the gate's "in" and "out" QR codes. Records the signed-in user's scan in
 * property_access: one row per user, gate and day, so a day's in and out scans share a record. Not idempotent by
 * design (repeat scans are harmless): 'in' keeps the day's first in_at and clears out_at (re-entering means they are in again), 'out' overwrites out_at with the latest.
 * POST (not GET) so link previews and prefetchers cannot create records. Returns the gate and its code.
 */
function recordScan(direction: 'in' | 'out') {
  return async (req: Request, res: Response) => {
    try {
      const auth = getAuth(res);
      const gate = await findGateByToken(auth.tenantId, req.params.token);
      if (!gate) return res.status(404).json(errorResponse('This access link is not valid'));
      // Atomic upsert on uq_access_visit; CURDATE()/NOW() come from the DB so the day boundary is consistent.
      await query(
        `INSERT INTO property_access
           (tenant_id, user_id, user_name, property_id, gate_id, access_date, status, in_at, out_at)
         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ${direction === 'in' ? 'NOW()' : 'NULL'}, ${direction === 'out' ? 'NOW()' : 'NULL'})
         ON DUPLICATE KEY UPDATE
           user_name = VALUES(user_name), property_id = VALUES(property_id), status = VALUES(status),
           ${direction === 'in' ? 'in_at = COALESCE(in_at, NOW()), out_at = NULL' : 'out_at = NOW()'}`,
        [auth.tenantId, auth.userId, auth.userName, gate.property_id, gate.id, direction],
      );
      const rows = await query<any[]>(
        `SELECT id, user_id, user_name, property_id, gate_id, access_date, status, in_at, out_at
           FROM property_access
          WHERE tenant_id = ? AND user_id = ? AND gate_id = ? AND access_date = CURDATE()`,
        [auth.tenantId, auth.userId, gate.id],
      );
      res.set('Cache-Control', 'no-store');
      return res.json(successResponse({ ...gateView(gate), direction, access: rows[0] }));
    } catch (err) {
      return fail(res, err);
    }
  };
}

router.post('/:token/in', recordScan('in'));
router.post('/:token/out', recordScan('out'));

export default router;
