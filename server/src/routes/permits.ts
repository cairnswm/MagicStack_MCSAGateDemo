import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOrPropertyOwner, getAuth, requireAuth } from '../middleware/auth';
import {
  PERMIT_SELECT,
  PERMIT_STATUSES,
  ensurePermitMember,
  findPermit,
  getPermitPropertyScope,
  inScope,
  newInviteToken,
  parseDate,
  today,
} from '../utils/permits';

const router = Router();
router.use(requireAuth as any);
router.use(adminOrPropertyOwner);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

const linkPath = (token: string) => `/permit/${token}`;
const view = (permit: any) => ({ ...permit, linkPath: linkPath(permit.invite_token) });

// GET /?status= - permits for the properties the caller manages (administrator: all), newest first
router.get('/', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const scope = await getPermitPropertyScope(auth);
    if (scope && scope.length === 0) return res.json(successResponse([]));
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    if (status && !(PERMIT_STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json(errorResponse('status is not valid'));
    }
    const params: any[] = [auth.tenantId];
    let where = 'WHERE pm.tenant_id = ? AND pm.active = 1';
    if (status) {
      where += ' AND pm.status = ?';
      params.push(status);
    }
    if (scope) {
      where += ` AND pm.property_id IN (${scope.map(() => '?').join(',')})`;
      params.push(...scope);
    }
    const rows = await query<any[]>(`${PERMIT_SELECT} ${where} ORDER BY pm.id DESC`, params);
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse(rows.map(view)));
  } catch (err) {
    return fail(res, err);
  }
});

// POST / { propertyId, email, validFrom, validTo } - start a permit application; returns the invite link path.
// Reuses the temporary member for a repeat email. Property Owners may only use properties of their own gates.
router.post('/', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const propertyId = Number(req.body?.propertyId);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().slice(0, 255) : '';
    const validFrom = parseDate(req.body?.validFrom);
    const validTo = parseDate(req.body?.validTo);
    if (!Number.isInteger(propertyId) || propertyId <= 0) return res.status(400).json(errorResponse('propertyId is required'));
    if (!EMAIL.test(email)) return res.status(400).json(errorResponse('a valid email is required'));
    if (!validFrom || !validTo) return res.status(400).json(errorResponse('validFrom and validTo must be dates (YYYY-MM-DD)'));
    if (validTo < validFrom) return res.status(400).json(errorResponse('validTo must not be before validFrom'));
    if (validTo < (await today())) return res.status(400).json(errorResponse('the permit period is already over'));

    if (!inScope(await getPermitPropertyScope(auth), propertyId)) {
      return res.status(403).json(errorResponse('You can only create permits for your own properties'));
    }
    const property = await query<any[]>('SELECT id FROM properties WHERE id = ? AND tenant_id = ? AND active = 1', [
      propertyId,
      auth.tenantId,
    ]);
    if (property.length === 0) return res.status(404).json(errorResponse('Property not found'));

    const member = await ensurePermitMember(auth.tenantId, email);
    if ('error' in member) return res.status(400).json(errorResponse(member.error));

    const result = await query<any>(
      `INSERT INTO permits (tenant_id, property_id, member_id, email, invite_token, valid_from, valid_to,
                            created_by_user_id, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [auth.tenantId, propertyId, member.id, email, newInviteToken(), validFrom, validTo, auth.userId, auth.userName],
    );
    return res.status(201).json(successResponse(view(await findPermit(auth.tenantId, result.insertId))));
  } catch (err) {
    return fail(res, err);
  }
});

/** Moves a permit to `to` if it is currently in one of `from` (atomic), after the scope check. */
function decide(to: 'approved' | 'rejected' | 'cancelled', from: string[]) {
  return async (req: Request, res: Response) => {
    try {
      const auth = getAuth(res);
      const permit = await findPermit(auth.tenantId, Number(req.params.id));
      // A permit outside the caller's scope is reported as missing so owners cannot probe other properties.
      if (!permit || !inScope(await getPermitPropertyScope(auth), permit.property_id)) {
        return res.status(404).json(errorResponse('Permit not found'));
      }
      if (to === 'approved' && permit.valid_to < (await today())) {
        return res.status(400).json(errorResponse('the permit period is already over'));
      }
      const result = await query<any>(
        `UPDATE permits SET status = ?, decided_by_user_id = ?, decided_by_name = ?, decided_at = NOW()
          WHERE id = ? AND tenant_id = ? AND active = 1 AND status IN (${from.map(() => '?').join(',')})`,
        [to, auth.userId, auth.userName, permit.id, auth.tenantId, ...from],
      );
      if (result.affectedRows === 0) {
        return res.status(400).json(errorResponse(`A ${permit.status} permit cannot be ${to}`));
      }
      return res.json(successResponse(view(await findPermit(auth.tenantId, permit.id))));
    } catch (err) {
      return fail(res, err);
    }
  };
}

router.post('/:id/approve', decide('approved', ['submitted']));
router.post('/:id/reject', decide('rejected', ['invited', 'submitted']));
router.post('/:id/cancel', decide('cancelled', ['invited', 'submitted', 'approved']));

export default router;
