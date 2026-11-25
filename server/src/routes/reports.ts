import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { errorResponse, successResponse } from '../utils/formatters';
import { adminOnly, getAuth, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

const MAX_ROWS = 5000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fail = (res: Response, err: unknown) =>
  res.status(500).json(errorResponse(err instanceof Error ? err.message : 'Unknown error'));

const positiveInt = (value: unknown) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));

// GET /property-access?propertyId=&from=YYYY-MM-DD&to=YYYY-MM-DD[&gateId=] - access records for one property, newest
// first. Administrator only. Contains no gate codes.
router.get('/property-access', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const propertyId = positiveInt(req.query.propertyId);
    if (!propertyId) return res.status(400).json(errorResponse('propertyId is required'));
    const { from, to } = req.query;
    if (!validDate(from) || !validDate(to)) return res.status(400).json(errorResponse('from and to must be dates (YYYY-MM-DD)'));
    if (from > to) return res.status(400).json(errorResponse('from must not be after to'));
    const gateId = req.query.gateId === undefined || req.query.gateId === '' ? null : positiveInt(req.query.gateId);
    if (req.query.gateId !== undefined && req.query.gateId !== '' && !gateId) {
      return res.status(400).json(errorResponse('gateId must be a positive number'));
    }

    const params: unknown[] = [tenantId, propertyId, from, to];
    if (gateId) params.push(gateId);
    const rows = await query<any[]>(
      `SELECT pa.id, pa.user_id, pa.user_name, pa.property_id, pa.gate_id, g.name AS gate_name,
              pa.access_date, pa.status, pa.in_at, pa.out_at
         FROM property_access pa
         LEFT JOIN gates g ON g.id = pa.gate_id AND g.tenant_id = pa.tenant_id
        WHERE pa.tenant_id = ? AND pa.property_id = ? AND pa.access_date >= ? AND pa.access_date <= ?
          ${gateId ? 'AND pa.gate_id = ?' : ''}
        ORDER BY pa.access_date DESC, COALESCE(pa.out_at, pa.in_at) DESC, pa.id DESC
        LIMIT ${MAX_ROWS + 1}`,
      params,
    );
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse({ truncated: rows.length > MAX_ROWS, records: rows.slice(0, MAX_ROWS) }));
  } catch (err) {
    return fail(res, err);
  }
});

/**
 * GET /access-now - who is on each active property, bucketed by how long ago they entered without leaving.
 * Administrator only. Age is whole days between today and the record's access_date:
 *   todayIn   - entered today and still in (age 0, latest scan is an in)
 *   todayOut  - entered today and has since left (age 0, latest scan is an out)
 *   yesterday - entered yesterday and not out (age 1)
 *   week      - entered 2 to 7 days ago and not out
 *   overdue   - entered more than 7 days ago and not out
 * "Not out" means the latest scan is an in (status = 'in'). Counts are distinct people; each bucket also lists them.
 */
router.get('/access-now', adminOnly, async (_req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const properties = await query<any[]>(
      'SELECT id, name FROM properties WHERE tenant_id = ? AND active = 1 ORDER BY name',
      [tenantId],
    );
    const rows = await query<any[]>(
      `SELECT pa.property_id, pa.user_id, pa.user_name, g.name AS gate_name, pa.in_at, pa.status,
              DATEDIFF(CURDATE(), pa.access_date) AS age_days
         FROM property_access pa
         LEFT JOIN gates g ON g.id = pa.gate_id AND g.tenant_id = pa.tenant_id
        WHERE pa.tenant_id = ?
          AND ((pa.access_date = CURDATE() AND pa.in_at IS NOT NULL)
               OR (pa.access_date < CURDATE() AND pa.status = 'in'))
        ORDER BY pa.in_at DESC`,
      [tenantId],
    );

    const bucketOf = (r: any) => {
      const age = Number(r.age_days);
      if (age <= 0) return r.status === 'in' ? 'todayIn' : 'todayOut';
      return age === 1 ? 'yesterday' : age <= 7 ? 'week' : 'overdue';
    };
    const result = properties.map((p) => {
      const buckets: Record<string, any[]> = { todayIn: [], todayOut: [], yesterday: [], week: [], overdue: [] };
      for (const r of rows.filter((x) => x.property_id === p.id)) {
        buckets[bucketOf(r)].push({
          userId: r.user_id,
          userName: r.user_name,
          gateName: r.gate_name,
          inAt: r.in_at,
        });
      }
      const summary = (people: any[]) => ({
        count: new Set(people.map((x) => x.userId)).size,
        people,
      });
      return {
        propertyId: p.id,
        propertyName: p.name,
        todayIn: summary(buckets.todayIn),
        todayOut: summary(buckets.todayOut),
        yesterday: summary(buckets.yesterday),
        week: summary(buckets.week),
        overdue: summary(buckets.overdue),
      };
    });
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse(result));
  } catch (err) {
    return fail(res, err);
  }
});

const MAX_USAGE_DAYS = 366;
const LOOKBACK_DAYS = 60;
const dayMs = 86400000;
const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * dayMs).toISOString().slice(0, 10);

/**
 * GET /usage?from=YYYY-MM-DD&to=YYYY-MM-DD[&propertyId=] - how many distinct people were on site each day.
 * Administrator only; defaults to the last 30 days, all properties. Per day:
 *   count     - people on site at any point that day
 *   overnight - people whose stay continues past that day (their out scan is on a later date, or they have not
 *               signed out yet)
 * A stay runs from an 'in' scan to the next 'out' scan for the same person at the same property (any gate). A stay
 * with no out scan runs to today. Visits starting up to 60 days before `from` are considered so long stays show.
 */
router.get('/usage', adminOnly, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuth(res);
    const [{ today }] = await query<any[]>(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today`);
    const to = req.query.to === undefined || req.query.to === '' ? today : req.query.to;
    const from = req.query.from === undefined || req.query.from === '' ? addDays(to as string, -29) : req.query.from;
    if (!validDate(from) || !validDate(to)) return res.status(400).json(errorResponse('from and to must be dates (YYYY-MM-DD)'));
    if (from > to) return res.status(400).json(errorResponse('from must not be after to'));
    if ((Date.parse(to) - Date.parse(from)) / dayMs >= MAX_USAGE_DAYS) {
      return res.status(400).json(errorResponse(`The date range must be ${MAX_USAGE_DAYS} days or fewer`));
    }
    const hasProperty = req.query.propertyId !== undefined && req.query.propertyId !== '';
    const propertyId = hasProperty ? positiveInt(req.query.propertyId) : null;
    if (hasProperty && !propertyId) return res.status(400).json(errorResponse('propertyId must be a positive number'));

    const params: unknown[] = [tenantId, addDays(from, -LOOKBACK_DAYS), to];
    if (propertyId) params.push(propertyId);
    const rows = await query<any[]>(
      `SELECT user_id, property_id,
              DATE_FORMAT(in_at, '%Y-%m-%d %H:%i:%s') AS in_at, DATE_FORMAT(out_at, '%Y-%m-%d %H:%i:%s') AS out_at
         FROM property_access
        WHERE tenant_id = ? AND access_date >= ? AND access_date <= ?
          ${propertyId ? 'AND property_id = ?' : ''}`,
      params,
    );

    // Turn each person's scans (per property) into stays, then mark the days each stay covers.
    const scans = new Map<string, { at: string; kind: 'in' | 'out' }[]>();
    for (const r of rows) {
      const key = `${r.property_id}:${r.user_id}`;
      const list = scans.get(key) ?? scans.set(key, []).get(key)!;
      if (r.in_at) list.push({ at: r.in_at, kind: 'in' });
      if (r.out_at) list.push({ at: r.out_at, kind: 'out' });
    }
    const days = new Map<string, { present: Set<number>; overnight: Set<number> }>();
    for (let d = from; d <= to; d = addDays(d, 1)) days.set(d, { present: new Set(), overnight: new Set() });
    const addStay = (userId: number, start: string, end: string) => {
      for (let d = start < from ? from : start; d <= end && d <= to; d = addDays(d, 1)) {
        const day = days.get(d)!;
        day.present.add(userId);
        if (d < end) day.overnight.add(userId);
      }
    };
    for (const [key, list] of scans) {
      const userId = Number(key.split(':')[1]);
      let start: string | null = null;
      for (const s of list.sort((a, b) => a.at.localeCompare(b.at))) {
        if (s.kind === 'in') start = start ?? s.at.slice(0, 10);
        else if (start) {
          addStay(userId, start, s.at.slice(0, 10));
          start = null;
        }
      }
      if (start) addStay(userId, start, today);
    }

    const result = [...days].map(([date, d]) => ({ date, count: d.present.size, overnight: d.overnight.size }));
    res.set('Cache-Control', 'no-store');
    return res.json(successResponse({ from, to, propertyId, days: result }));
  } catch (err) {
    return fail(res, err);
  }
});

export default router;
