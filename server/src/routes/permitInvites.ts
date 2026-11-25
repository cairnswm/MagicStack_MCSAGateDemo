import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { getAuth, requireAuth } from '../middleware/auth';
import { getTenantId } from '../utils/tenant';
import { findPermitByToken, today } from '../utils/permits';

// Mounted at /permits/invite, before the admin permits router.
const router = Router();

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

const cleanText = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// GET /:token - PUBLIC (tenant header only). What the invite link shows before sign-in. The token is the secret;
// nothing about the member and no gate code is returned.
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req) || process.env.TENANT_ID || '';
    const permit = tenantId ? await findPermitByToken(tenantId, req.params.token) : null;
    if (!permit) return res.status(404).json(errorResponse('This permit link is not valid'));
    res.set('Cache-Control', 'no-store');
    return res.json(
      successResponse({
        propertyName: permit.property_name,
        email: permit.email,
        validFrom: permit.valid_from,
        validTo: permit.valid_to,
        status: permit.status,
      }),
    );
  } catch (err) {
    return fail(res, err);
  }
});

// POST /:token/submit { firstName, lastName, phone } - the invited person completes their details.
// The caller must be the user linked (by email) to the permit's member. Moves invited -> submitted.
router.post('/:token/submit', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const permit = await findPermitByToken(auth.tenantId, req.params.token);
    if (!permit) return res.status(404).json(errorResponse('This permit link is not valid'));

    const linked = await query<any[]>('SELECT id FROM members WHERE id = ? AND tenant_id = ? AND user_id = ?', [
      permit.member_id,
      auth.tenantId,
      auth.userId,
    ]);
    if (linked.length === 0) {
      return res.status(403).json(errorResponse('Sign in or register with the email address this permit was sent to'));
    }
    if (permit.status !== 'invited') return res.status(400).json(errorResponse(`This permit is already ${permit.status}`));
    if (permit.valid_to < (await today())) return res.status(400).json(errorResponse('the permit period is already over'));

    const firstName = cleanText(req.body?.firstName, 100);
    const lastName = cleanText(req.body?.lastName, 100);
    const phone = cleanText(req.body?.phone, 32);
    if (!firstName || !lastName) return res.status(400).json(errorResponse('firstName and lastName are required'));
    if (!phone) return res.status(400).json(errorResponse('phone is required'));

    await query('UPDATE members SET first_name = ?, last_name = ?, phone = ? WHERE id = ? AND tenant_id = ?', [
      firstName,
      lastName,
      phone,
      permit.member_id,
      auth.tenantId,
    ]);
    const result = await query<any>(
      `UPDATE permits SET status = 'submitted', submitted_at = NOW()
        WHERE id = ? AND tenant_id = ? AND status = 'invited'`,
      [permit.id, auth.tenantId],
    );
    if (result.affectedRows === 0) return res.status(400).json(errorResponse('This permit was already submitted'));
    return res.json(successResponse({ status: 'submitted' }));
  } catch (err) {
    return fail(res, err);
  }
});

export default router;
