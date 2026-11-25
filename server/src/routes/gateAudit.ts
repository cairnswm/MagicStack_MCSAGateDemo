import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOnly, getAuth, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

// GET / - gate code change history, newest first. Filter with ?gateId= ; ?limit= (default 100, max 500)
router.get('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const where = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (req.query.gateId) {
      where.push('gate_id = ?');
      params.push(Number(req.query.gateId));
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const rows = await query(
      `SELECT id, gate_id, property_id, gate_name, action, changed_by_user_id, changed_by_name, changed_by_role, changed_at
       FROM gate_code_audit WHERE ${where.join(' AND ')} ORDER BY changed_at DESC, id DESC LIMIT ${limit}`,
      params,
    );
    return res.json(successResponse(rows));
  } catch (err) {
    return res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));
  }
});

export default router;
