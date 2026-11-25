import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOnly, getAuth, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

const COLUMNS = 'id, member_number, email, phone, first_name, last_name, user_id, active, created_at, updated_at';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

function cleanText(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

async function findMember(tenantId: string, id: number) {
  const rows = await query<any[]>(`SELECT ${COLUMNS} FROM members WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  return rows[0] ?? null;
}

async function findOwnMember(tenantId: string, userId: number) {
  const rows = await query<any[]>(
    `SELECT ${COLUMNS} FROM members WHERE tenant_id = ? AND user_id = ? AND active = 1 ORDER BY id LIMIT 1`,
    [tenantId, userId],
  );
  return rows[0] ?? null;
}

async function numberTaken(tenantId: string, memberNumber: string, exceptId = 0) {
  const rows = await query<any[]>('SELECT id FROM members WHERE tenant_id = ? AND member_number = ? AND id <> ?', [
    tenantId,
    memberNumber,
    exceptId,
  ]);
  return rows.length > 0;
}

// GET /me - the signed-in user's own member record (any authenticated user)
router.get('/me', async (_req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const member = await findOwnMember(auth.tenantId, auth.userId);
    if (!member) return res.status(404).json(errorResponse('No member record is linked to your account'));
    return res.json(successResponse(member));
  } catch (err) {
    return fail(res, err);
  }
});

// PUT /me - a member may change only their own phone number
router.put('/me', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const member = await findOwnMember(auth.tenantId, auth.userId);
    if (!member) return res.status(404).json(errorResponse('No member record is linked to your account'));
    const phone = cleanText(req.body?.phone, 32);
    if (!phone) return res.status(400).json(errorResponse('phone is required'));
    await query('UPDATE members SET phone = ? WHERE id = ? AND tenant_id = ?', [phone, member.id, auth.tenantId]);
    return res.json(successResponse(await findOwnMember(auth.tenantId, auth.userId)));
  } catch (err) {
    return fail(res, err);
  }
});

// Everything below is administrator only
router.use(adminOnly);

// GET / - list members (active only unless ?includeInactive=true)
router.get('/', async (req: Request, res: Response) => {
  try {
    const all = req.query.includeInactive === 'true';
    const rows = await query(
      `SELECT ${COLUMNS} FROM members WHERE tenant_id = ? ${all ? '' : 'AND active = 1'} ORDER BY member_number`,
      [getAuth(res).tenantId],
    );
    return res.json(successResponse(rows));
  } catch (err) {
    return fail(res, err);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const memberNumber = cleanText(req.body?.memberNumber, 32);
    const email = cleanText(req.body?.email, 255);
    const phone = cleanText(req.body?.phone, 32);
    if (!memberNumber) return res.status(400).json(errorResponse('memberNumber is required'));
    if (!email || !EMAIL.test(email)) return res.status(400).json(errorResponse('a valid email is required'));
    if (!phone) return res.status(400).json(errorResponse('phone is required'));
    if (await numberTaken(tenantId, memberNumber)) {
      return res.status(400).json(errorResponse('memberNumber is already in use'));
    }
    const result = await query<any>(
      'INSERT INTO members (tenant_id, member_number, email, phone) VALUES (?, ?, ?, ?)',
      [tenantId, memberNumber, email, phone],
    );
    return res.status(201).json(successResponse(await findMember(tenantId, result.insertId)));
  } catch (err) {
    return fail(res, err);
  }
});

// PUT /:id - memberNumber, email, phone, active. Name and user link come from the auth service, not from here.
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    const member = await findMember(tenantId, id);
    if (!member) return res.status(404).json(errorResponse('Member not found'));
    const b = req.body ?? {};
    const memberNumber = b.memberNumber === undefined ? member.member_number : cleanText(b.memberNumber, 32);
    const email = b.email === undefined ? member.email : cleanText(b.email, 255);
    const phone = b.phone === undefined ? member.phone : cleanText(b.phone, 32);
    const active = b.active === undefined ? member.active : b.active ? 1 : 0;
    if (!memberNumber) return res.status(400).json(errorResponse('memberNumber must not be empty'));
    if (!email || !EMAIL.test(email)) return res.status(400).json(errorResponse('a valid email is required'));
    if (!phone) return res.status(400).json(errorResponse('phone must not be empty'));
    if (await numberTaken(tenantId, memberNumber, id)) {
      return res.status(400).json(errorResponse('memberNumber is already in use'));
    }
    // A changed email breaks the link to the auth user until that person next signs in.
    const emailChanged = email.toLowerCase() !== String(member.email).toLowerCase();
    await query(
      `UPDATE members SET member_number = ?, email = ?, phone = ?, active = ?${emailChanged ? ', user_id = NULL' : ''}
        WHERE id = ? AND tenant_id = ?`,
      [memberNumber, email, phone, active, id, tenantId],
    );
    return res.json(successResponse(await findMember(tenantId, id)));
  } catch (err) {
    return fail(res, err);
  }
});

// DELETE /:id - deactivates the member (records are never deleted)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    if (!(await findMember(tenantId, id))) return res.status(404).json(errorResponse('Member not found'));
    await query('UPDATE members SET active = 0 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return res.json(successResponse(await findMember(tenantId, id)));
  } catch (err) {
    return fail(res, err);
  }
});

export default router;
