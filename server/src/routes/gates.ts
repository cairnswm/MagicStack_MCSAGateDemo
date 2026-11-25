import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOnly, adminOrGateController, getAuth, requireAuth } from '../middleware/auth';
import { recordGateCodeChange } from '../utils/gateAudit';
import { canUseGate, getAssignedGateIds } from '../utils/gateAccess';
import { accessLinks, generateAccessToken } from '../utils/accessToken';

const router = Router();
router.use(requireAuth as any);

const COLUMNS = 'id, property_id, name, latitude, longitude, code, active, created_at, updated_at';

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

function cleanText(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

/** Returns a number within range, null when blank, or undefined when invalid. */
function cleanCoord(value: unknown, limit: number): number | null | undefined {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined;
}

async function findGate(tenantId: string, id: number) {
  const rows = await query<any[]>(`SELECT ${COLUMNS} FROM gates WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  return rows[0] ?? null;
}

async function propertyExists(tenantId: string, id: number) {
  const rows = await query<any[]>('SELECT id FROM properties WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  return rows.length > 0;
}

// GET / - list gates; filter with ?propertyId=, inactive hidden unless ?includeInactive=true.
// Gate Controllers only receive the gates linked to them.
router.get('/', adminOrGateController, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const { tenantId } = auth;
    const where = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (!auth.isAdmin) {
      const ids = await getAssignedGateIds(auth);
      if (ids.length === 0) return res.json(successResponse([]));
      where.push(`id IN (${ids.map(() => '?').join(', ')})`);
      params.push(...ids);
    }
    if (req.query.propertyId) {
      where.push('property_id = ?');
      params.push(Number(req.query.propertyId));
    }
    if (req.query.includeInactive !== 'true') where.push('active = 1');
    const rows = await query(`SELECT ${COLUMNS} FROM gates WHERE ${where.join(' AND ')} ORDER BY name`, params);
    return res.json(successResponse(rows));
  } catch (err) {
    return fail(res, err);
  }
});

router.get('/:id', adminOrGateController, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const id = Number(req.params.id);
    const row = (await canUseGate(auth, id)) ? await findGate(auth.tenantId, id) : null;
    if (!row) return res.status(404).json(errorResponse('Gate not found'));
    return res.json(successResponse(row));
  } catch (err) {
    return fail(res, err);
  }
});

router.post('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const { propertyId, name, latitude, longitude, code } = req.body ?? {};
    const gateName = cleanText(name, 255);
    const lat = cleanCoord(latitude, 90);
    const lng = cleanCoord(longitude, 180);
    if (!gateName) return res.status(400).json(errorResponse('name is required'));
    if (lat === undefined) return res.status(400).json(errorResponse('latitude must be between -90 and 90'));
    if (lng === undefined) return res.status(400).json(errorResponse('longitude must be between -180 and 180'));
    if (!(await propertyExists(auth.tenantId, Number(propertyId)))) {
      return res.status(400).json(errorResponse('propertyId does not refer to an existing property'));
    }
    const gateCode = cleanText(code, 64);
    const result = await query<any>(
      'INSERT INTO gates (tenant_id, property_id, name, latitude, longitude, code, access_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [auth.tenantId, Number(propertyId), gateName, lat, lng, gateCode, generateAccessToken()],
    );
    const gate = await findGate(auth.tenantId, result.insertId);
    if (gateCode) await recordGateCodeChange(auth, gate, 'create');
    return res.status(201).json(successResponse(gate));
  } catch (err) {
    return fail(res, err);
  }
});

// PUT /:id - administrators only; may change any field including the code
router.put('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const id = Number(req.params.id);
    const gate = await findGate(auth.tenantId, id);
    if (!gate) return res.status(404).json(errorResponse('Gate not found'));
    const b = req.body ?? {};

    const name = b.name === undefined ? gate.name : cleanText(b.name, 255);
    const lat = b.latitude === undefined ? gate.latitude : cleanCoord(b.latitude, 90);
    const lng = b.longitude === undefined ? gate.longitude : cleanCoord(b.longitude, 180);
    const code = b.code === undefined ? gate.code : cleanText(b.code, 64);
    const propertyId = b.propertyId === undefined ? gate.property_id : Number(b.propertyId);
    const active = b.active === undefined ? gate.active : b.active ? 1 : 0;
    if (!name) return res.status(400).json(errorResponse('name must not be empty'));
    if (lat === undefined) return res.status(400).json(errorResponse('latitude must be between -90 and 90'));
    if (lng === undefined) return res.status(400).json(errorResponse('longitude must be between -180 and 180'));
    if (propertyId !== gate.property_id && !(await propertyExists(auth.tenantId, propertyId))) {
      return res.status(400).json(errorResponse('propertyId does not refer to an existing property'));
    }

    await query(
      'UPDATE gates SET property_id = ?, name = ?, latitude = ?, longitude = ?, code = ?, active = ? WHERE id = ? AND tenant_id = ?',
      [propertyId, name, lat, lng, code, active, id, auth.tenantId],
    );
    const updated = await findGate(auth.tenantId, id);
    if (code !== gate.code) await recordGateCodeChange(auth, updated, code ? 'update' : 'clear');
    return res.json(successResponse(updated));
  } catch (err) {
    return fail(res, err);
  }
});

// PUT /:id/code - the only write a Gate Controller may make, and only on their own gates; always audited
router.put('/:id/code', adminOrGateController, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const id = Number(req.params.id);
    const gate = (await canUseGate(auth, id)) ? await findGate(auth.tenantId, id) : null;
    if (!gate || !gate.active) return res.status(404).json(errorResponse('Gate not found'));
    const code = cleanText(req.body?.code, 64);
    if (!code) return res.status(400).json(errorResponse('code is required'));
    await query('UPDATE gates SET code = ? WHERE id = ? AND tenant_id = ?', [code, id, auth.tenantId]);
    await recordGateCodeChange(auth, gate, 'update');
    return res.json(successResponse(await findGate(auth.tenantId, id)));
  } catch (err) {
    return fail(res, err);
  }
});

/** Returns the gate's access token, creating one if the gate has none yet. */
async function ensureAccessToken(tenantId: string, id: number): Promise<string> {
  const rows = await query<any[]>('SELECT access_token FROM gates WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (rows[0].access_token) return rows[0].access_token;
  const token = generateAccessToken();
  await query('UPDATE gates SET access_token = ? WHERE id = ? AND tenant_id = ? AND access_token IS NULL', [token, id, tenantId]);
  const again = await query<any[]>('SELECT access_token FROM gates WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  return again[0].access_token;
}

// GET /:id/access-token - administrators only; the token and QR link for the gate (never cached)
router.get('/:id/access-token', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    if (!(await findGate(tenantId, id))) return res.status(404).json(errorResponse('Gate not found'));
    const token = await ensureAccessToken(tenantId, id);
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse(accessLinks(token)));
  } catch (err) {
    return fail(res, err);
  }
});

// POST /:id/access-token/regenerate - administrators only. Invalidates every printed QR code for the gate, so the
// caller must confirm by sending the gate's exact name as confirmGateName. Audited.
router.post('/:id/access-token/regenerate', adminOnly, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(res);
    const id = Number(req.params.id);
    const gate = await findGate(auth.tenantId, id);
    if (!gate) return res.status(404).json(errorResponse('Gate not found'));
    if (req.body?.confirmGateName !== gate.name) {
      return res.status(400).json(errorResponse('confirmGateName must match the gate name exactly'));
    }
    const token = generateAccessToken();
    await query('UPDATE gates SET access_token = ? WHERE id = ? AND tenant_id = ?', [token, id, auth.tenantId]);
    await recordGateCodeChange(auth, gate, 'regenerate');
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse(accessLinks(token)));
  } catch (err) {
    return fail(res, err);
  }
});

// DELETE /:id - deactivates the gate (records are never deleted)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const id = Number(req.params.id);
    if (!(await findGate(tenantId, id))) return res.status(404).json(errorResponse('Gate not found'));
    await query('UPDATE gates SET active = 0 WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    return res.json(successResponse(await findGate(tenantId, id)));
  } catch (err) {
    return fail(res, err);
  }
});

export default router;
