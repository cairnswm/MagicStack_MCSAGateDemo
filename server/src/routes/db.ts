import { Router, Request, Response, RequestHandler } from 'express';
import { withConnection } from '../utils/db';

const router = Router();

const dbHealthHandler: RequestHandler = async (req: Request, res: Response) => {
  const dbName = process.env.DB_NAME || '';
  const serviceName = process.env.SERVICE_NAME || 'unknown';

  try {
    let databaseServerTime: string | null = null;
    let databaseResponseMs: number | null = null;
    let databaseSizeBytes: number | null = null;
    let dbConnections: number | null = null;
    let serverThreadsConnected: number | null = null;
    let maxConnections: number | null = null;
    let slowQueries: number | null = null;
    let bufferPoolHitRatioPct: number | null = null;
    let uptimeSeconds: number | null = null;
    let connections: Array<any> = [];

    // Response time baseline — sequential so the timer is accurate
    await withConnection(async (conn) => {
      const dbStart = Date.now();
      const [nowRows]: any = await conn.query('SELECT NOW() AS server_time');
      databaseResponseMs = Date.now() - dbStart;
      databaseServerTime = nowRows[0]?.server_time
        ? new Date(nowRows[0].server_time).toISOString()
        : null;

      const [sizeRows]: any = await conn.query(
        'SELECT SUM(data_length + index_length) AS size_bytes FROM information_schema.tables WHERE table_schema = ?',
        [dbName]
      );
      databaseSizeBytes = sizeRows[0]?.size_bytes != null ? Number(sizeRows[0].size_bytes) : null;

      const [statusRows]: any = await conn.query(
        `SELECT variable_name, variable_value
         FROM performance_schema.global_status
         WHERE variable_name IN (
           'Threads_connected', 'Slow_queries', 'Uptime',
           'Innodb_buffer_pool_reads', 'Innodb_buffer_pool_read_requests'
         )`
      );
      const statusMap: Record<string, string> = {};
      for (const row of statusRows) statusMap[row.variable_name] = row.variable_value;

      serverThreadsConnected = statusMap['Threads_connected'] != null ? Number(statusMap['Threads_connected']) : null;
      slowQueries = statusMap['Slow_queries'] != null ? Number(statusMap['Slow_queries']) : null;
      uptimeSeconds = statusMap['Uptime'] != null ? Number(statusMap['Uptime']) : null;

      const reads = Number(statusMap['Innodb_buffer_pool_reads'] ?? 0);
      const readRequests = Number(statusMap['Innodb_buffer_pool_read_requests'] ?? 0);
      bufferPoolHitRatioPct = readRequests > 0
        ? Number((((readRequests - reads) / readRequests) * 100).toFixed(2))
        : null;

      const [maxConnRows]: any = await conn.query(
        `SELECT variable_value FROM performance_schema.global_variables WHERE variable_name = 'max_connections'`
      );
      maxConnections = maxConnRows[0]?.variable_value != null ? Number(maxConnRows[0].variable_value) : null;

      const [countRows]: any = await conn.query(
        'SELECT COUNT(*) AS cnt FROM information_schema.processlist WHERE db = ?',
        [dbName]
      );
      dbConnections = countRows[0]?.cnt != null ? Number(countRows[0].cnt) : null;

      const [connRows]: any = await conn.query(
        'SELECT id, user, host, command, time, state, info FROM information_schema.processlist WHERE db = ? ORDER BY time DESC',
        [dbName]
      );
      connections = connRows.map((r: any) => ({
        id: r.id,
        user: r.user,
        host: r.host,
        command: r.command,
        time_seconds: r.time,
        state: r.state ?? null,
        query: r.info ?? null,
      }));
    });

    // Remaining queries are independent — run in parallel across separate connections
    const [sizeRows, statusRows, maxConnRows, cntRows, connRows] = await Promise.all([
      withConnection(async (conn) => {
        const [rows]: any = await conn.query(
          'SELECT SUM(data_length + index_length) AS size_bytes FROM information_schema.tables WHERE table_schema = ?',
          [dbName]
        );
        return rows;
      }),
      withConnection(async (conn) => {
        const [rows]: any = await conn.query(
          `SELECT variable_name, variable_value
           FROM performance_schema.global_status
           WHERE variable_name IN (
             'Threads_connected',
             'Slow_queries',
             'Uptime',
             'Innodb_buffer_pool_reads',
             'Innodb_buffer_pool_read_requests'
           )`
        );
        return rows;
      }),
      withConnection(async (conn) => {
        const [rows]: any = await conn.query(
          `SELECT variable_value FROM performance_schema.global_variables WHERE variable_name = 'max_connections'`
        );
        return rows;
      }),
      withConnection(async (conn) => {
        const [rows]: any = await conn.query(
          'SELECT COUNT(*) AS cnt FROM information_schema.processlist WHERE db = ?',
          [dbName]
        );
        return rows;
      }),
      withConnection(async (conn) => {
        const [rows]: any = await conn.query(
          'SELECT id, user, host, command, time, state, info FROM information_schema.processlist WHERE db = ? ORDER BY time DESC',
          [dbName]
        );
        return rows;
      }),
    ]);

    databaseSizeBytes = sizeRows[0]?.size_bytes != null ? Number(sizeRows[0].size_bytes) : null;

    const statusMap: Record<string, string> = {};
    for (const row of statusRows) {
      statusMap[row.variable_name] = row.variable_value;
    }
    serverThreadsConnected = statusMap['Threads_connected'] != null ? Number(statusMap['Threads_connected']) : null;
    slowQueries = statusMap['Slow_queries'] != null ? Number(statusMap['Slow_queries']) : null;
    uptimeSeconds = statusMap['Uptime'] != null ? Number(statusMap['Uptime']) : null;

    const bufferReads = statusMap['Innodb_buffer_pool_reads'] != null ? Number(statusMap['Innodb_buffer_pool_reads']) : null;
    const bufferReadRequests = statusMap['Innodb_buffer_pool_read_requests'] != null ? Number(statusMap['Innodb_buffer_pool_read_requests']) : null;
    if (bufferReadRequests != null && bufferReadRequests > 0 && bufferReads != null) {
      bufferPoolHitRatioPct = Number((((bufferReadRequests - bufferReads) / bufferReadRequests) * 100).toFixed(2));
    }

    maxConnections = maxConnRows[0]?.variable_value != null ? Number(maxConnRows[0].variable_value) : null;
    dbConnections = cntRows[0]?.cnt != null ? Number(cntRows[0].cnt) : null;

    connections = connRows.map((row: any) => ({
      id: row.id,
      user: row.user,
      host: row.host,
      command: row.command,
      time_seconds: row.time,
      state: row.state ?? null,
      query: row.info ?? null,
    }));

    res.json({
      service: serviceName,
      status: 'ok',
      deployed_at: process.env.DEPLOYED_AT || null,
      message: 'Database connection successful',
      database: dbName,
      database_server_time: databaseServerTime,
      database_response_ms: databaseResponseMs,
      database_size_bytes: databaseSizeBytes,
      db_connections: dbConnections,
      server_threads_connected: serverThreadsConnected,
      max_connections: maxConnections,
      slow_queries: slowQueries,
      buffer_pool_hit_ratio_pct: bufferPoolHitRatioPct,
      uptime_seconds: uptimeSeconds,
      connections,
      time_now: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      service: serviceName,
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

router.get('/health', dbHealthHandler);

export { dbHealthHandler };
export default router;
