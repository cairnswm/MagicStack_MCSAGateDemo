import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOnly, getAuth, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);
router.use(adminOnly);

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

async function listForGate(tenantId: string, gateId: number) {
  return query(
    `SELECT gc.id, gc.gate_id, gc.member_id, gc.active, m.member_number, m.first_name, m.last_name, m.email
       FROM gate_controllers gc
       JOIN members m ON m.id = gc.member_id AND m.tenant_id = gc.tenant_id
      WHERE gc.tenant_id = ? AND gc.gate_id = ? AND gc.active = 1
      ORDER BY m.member_number`,
    [tenantId, gateId],
  );
}

// GET /?gateId= - members linked to a gate
router.get('/', async (req: Request, res: Response) => {
  try {
    const gateId = Number(req.query.gateId);
    if (!Number.isInteger(gateId) || gateId <= 0) return res.status(400).json(errorResponse('gateId is required'));
    return res.json(successResponse(await listForGate(getAuth(res).tenantId, gateId)));
  } catch (err) {
    return fail(res, err);
  }
});

// POST / { gateId, memberId } - link a member to a gate (idempotent; reactivates a removed link)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const gateId = Number(req.body?.gateId);
    const memberId = Number(req.body?.memberId);
    const gates = await query<any[]>('SELECT id FROM gates WHERE id = ? AND tenant_id = ?', [gateId, tenantId]);
    if (gates.length === 0) return res.status(400).json(errorResponse('gateId does not refer to an existing gate'));
    const members = await query<any[]>('SELECT id FROM members WHERE id = ? AND tenant_id = ? AND active = 1', [
      memberId,
      tenantId,
    ]);
    if (members.length === 0) return res.status(400).json(errorResponse('memberId does not refer to an active member'));
    await query(
      `INSERT INTO gate_controllers (tenant_id, gate_id, member_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE active = 1`,
      [tenantId, gateId, memberId],
    );
    return res.status(201).json(successResponse(await listForGate(tenantId, gateId)));
  } catch (err) {
    return fail(res, err);
  }
});

// DELETE /:id - removes the link (deactivates it)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    const rows = await query<any[]>('SELECT gate_id FROM gate_controllers WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (rows.length === 0) return res.status(404).json(errorResponse('Link not found'));
    await query('UPDATE gate_controllers SET active = 0 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return res.json(successResponse(await listForGate(tenantId, rows[0].gate_id)));
  } catch (err) {
    return fail(res, err);
  }
});

export default router;
