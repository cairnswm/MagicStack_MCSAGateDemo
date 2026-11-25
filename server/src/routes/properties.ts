import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOnly, getAuth, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

const COLUMNS = 'id, name, active, created_at, updated_at';

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

function cleanName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 255) : null;
}

async function findProperty(tenantId: string, id: number) {
  const rows = await query<any[]>(`SELECT ${COLUMNS} FROM properties WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  return rows[0] ?? null;
}

// GET / - list properties (active only unless ?includeInactive=true)
router.get('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const all = req.query.includeInactive === 'true';
    const rows = await query(
      `SELECT ${COLUMNS} FROM properties WHERE tenant_id = ? ${all ? '' : 'AND active = 1'} ORDER BY name`,
      [tenantId],
    );
    return res.json(successResponse(rows));
  } catch (err) {
    return fail(res, err);
  }
});

router.get('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const row = await findProperty(getAuth(res).tenantId, Number(req.params.id));
    if (!row) return res.status(404).json(errorResponse('Property not found'));
    return res.json(successResponse(row));
  } catch (err) {
    return fail(res, err);
  }
});

router.post('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json(errorResponse('name is required'));
    const { tenantId } = getAuth(res);
    const result = await query<any>('INSERT INTO properties (tenant_id, name) VALUES (?, ?)', [tenantId, name]);
    return res.status(201).json(successResponse(await findProperty(tenantId, result.insertId)));
  } catch (err) {
    return fail(res, err);
  }
});

router.put('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    const existing = await findProperty(tenantId, id);
    if (!existing) return res.status(404).json(errorResponse('Property not found'));
    const name = req.body?.name === undefined ? existing.name : cleanName(req.body.name);
    if (!name) return res.status(400).json(errorResponse('name must not be empty'));
    const active = req.body?.active === undefined ? existing.active : req.body.active ? 1 : 0;
    await query('UPDATE properties SET name = ?, active = ? WHERE id = ? AND tenant_id = ?', [name, active, id, tenantId]);
    return res.json(successResponse(await findProperty(tenantId, id)));
  } catch (err) {
    return fail(res, err);
  }
});

// DELETE /:id - deactivates the property and its gates (records are never deleted)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    if (!(await findProperty(tenantId, id))) return res.status(404).json(errorResponse('Property not found'));
    await query('UPDATE properties SET active = 0 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    await query('UPDATE gates SET active = 0 WHERE property_id = ? AND tenant_id = ?', [id, tenantId]);
    return res.json(successResponse(await findProperty(tenantId, id)));
  } catch (err) {
    return fail(res, err);
  }
});

export default router;
