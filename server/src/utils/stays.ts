/**
 * Turns property_access rows into stays. property_access holds one row per user, gate and day, so an overnight stay
 * is an 'in' on one row and an 'out' on a later row (which has no in_at). A stay runs from a person's 'in' scan to
 * their next 'out' scan at the same property (any gate); an 'in' while already in, or an 'out' while not in, is ignored.
 * A stay with no out scan is still open. The row `status` is deliberately not used: only in_at / out_at are.
 */
export interface ScanRow {
  user_id: number;
  property_id: number;
  in_at: string | null; // 'YYYY-MM-DD HH:mm:ss'
  out_at: string | null;
}

export interface Stay<T extends ScanRow> {
  userId: number;
  propertyId: number;
  start: string;
  end: string | null; // null = not signed out
  startRow: T; // the row holding the in scan
}

export function buildStays<T extends ScanRow>(rows: T[]): Stay<T>[] {
  const scans = new Map<string, { at: string; kind: 'in' | 'out'; row: T }[]>();
  for (const row of rows) {
    const key = `${row.property_id}:${row.user_id}`;
    const list = scans.get(key) ?? scans.set(key, []).get(key)!;
    if (row.in_at) list.push({ at: row.in_at, kind: 'in', row });
    if (row.out_at) list.push({ at: row.out_at, kind: 'out', row });
  }
  const stays: Stay<T>[] = [];
  for (const list of scans.values()) {
    let open: { at: string; row: T } | null = null;
    for (const s of list.sort((a, b) => a.at.localeCompare(b.at))) {
      if (s.kind === 'in') {
        open = open ?? { at: s.at, row: s.row };
      } else if (open) {
        stays.push({ userId: open.row.user_id, propertyId: open.row.property_id, start: open.at, end: s.at, startRow: open.row });
        open = null;
      }
    }
    if (open) stays.push({ userId: open.row.user_id, propertyId: open.row.property_id, start: open.at, end: null, startRow: open.row });
  }
  return stays;
}
