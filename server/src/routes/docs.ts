import { Router, Request, Response } from 'express';

const router = Router();
const basePath = (process.env.BASE_PATH || '').replace(/\/$/, '');
const docsPath = `${basePath}/docs`;

function renderPage(title: string, body: string) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="icon" type="image/svg+xml" href="${basePath}/logo.svg" />
        <link rel="stylesheet" href="https://cdn.runeworkz.com/styles.css" />
      </head>
      <body class="app-shell">
        ${body}
      </body>
    </html>
  `;
}

function endpointCard(method: string, path: string, title: string, description: string, request: string, response: unknown) {
  return `
      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method ${method}">${method}</span>
          <div>
            <div class="endpoint-path">${path}</div>
            <div class="doc-card-title">${title}</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">${description}</p>
          <div class="two-column">
            <section class="surface">
              <h3>Request</h3>
              ${request}
            </section>
            <section class="surface">
              <h3>Response</h3>
              <pre class="code-block">${JSON.stringify(response, null, 2)}</pre>
            </section>
          </div>
        </div>
      </section>`;
}

const authNote = 'Headers: <code>Authorization: Bearer &lt;token&gt;</code>, <code>X-Tenant-ID</code>.';
const propertyExample = { id: 1, name: 'Hilltop Club', active: 1, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
const gateExample = { id: 1, property_id: 1, name: 'Main gate', latitude: -33.9249, longitude: 18.4241, code: '1234', active: 1, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
const auditExample = { id: 1, gate_id: 1, property_id: 1, gate_name: 'Main gate', action: 'update', changed_by_user_id: 75, changed_by_name: 'Jane Doe', changed_by_role: 'Gate Controller', changed_at: '2026-01-01T00:00:00.000Z' };

router.get('/', (_req: Request, res: Response) => {
  const page = renderPage('MagicStack API Help', `
    <header class="site-header">
      <img src="${basePath}/logo.svg" alt="MagicStack logo" class="site-logo" />
      <span class="base-url">${basePath || '/'}</span>
      <h1>MagicStack API</h1>
      <p>Node.js and Express API template with tenant-aware routes and health checks.</p>
    </header>

    <main class="content-shell">

      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method GET">GET</span>
          <div>
            <div class="endpoint-path">${docsPath}/</div>
            <div class="doc-card-title">Help docs</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">This page. Lists all available routes, environment variables, and links to detailed docs for each area.</p>

          <section class="surface">
            <h3>Core routes</h3>
            <ul>
              <li><code>GET /health</code></li>
              <li><code>GET /db/health</code></li>
              <li><code>GET /tenant/*</code></li>
            </ul>
          </section>
        </div>
      </section>

      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method GET">GET</span>
          <div>
            <div class="endpoint-path">/health</div>
            <div class="doc-card-title">Service health</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">Returns the service status and deployment timestamp. No authentication required.</p>

          <div class="two-column">
            <section class="surface">
              <h3>Request</h3>
              <p class="muted">Nothing required. No headers, body, or query parameters.</p>
            </section>
            <section class="surface">
              <h3>Response</h3>
              <pre class="code-block">${JSON.stringify({ service: 'sample', status: 'ok', deployed_at: 'unknown' }, null, 2)}</pre>
            </section>
          </div>
        </div>
      </section>

      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method GET">GET</span>
          <div>
            <div class="endpoint-path">/db/health</div>
            <div class="doc-card-title">Database health</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">Verifies the API can acquire a connection from the MySQL pool and execute a query. Returns <code>503</code> if the connection fails.</p>

          <div class="two-column">
            <section class="surface">
              <h3>Request</h3>
              <p class="muted">Nothing required. No headers, body, or query parameters.</p>
            </section>
            <section class="surface">
              <h3>Response</h3>
              <pre class="code-block">${JSON.stringify({ service: 'sample', status: 'ok', deployed_at: null, message: 'Database connection successful', database: 'your_db' }, null, 2)}</pre>
              <p class="muted">Returns <code>503</code> with <code>"status": "error"</code> when the connection fails.</p>
            </section>
          </div>
        </div>
      </section>

      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method GET">GET</span>
          <div>
            <div class="endpoint-path">/properties, /gates, /gate-audit</div>
            <div class="doc-card-title">Properties, gates and gate code audit</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">Administration of properties and their gates, gate code updates by Gate Controllers, and the gate code change audit. All require a bearer token. <a href="${docsPath}/gates">Full details</a>.</p>
        </div>
      </section>

    </main>
  `);

  res.type('html').send(page);
});

router.get('/health', (_req: Request, res: Response) => {
  const page = renderPage('Health Docs', `
    <header class="site-header">
      <img src="${basePath}/logo.svg" alt="MagicStack logo" class="site-logo" />
      <span class="base-url">${docsPath}</span>
      <h1>Health check</h1>
      <p>Returns the service status and deployment timestamp.</p>
    </header>

    <nav class="site-nav">
      <a href="${docsPath}/">Home</a>
      <a href="${docsPath}/db-health">Database</a>
      <a href="${docsPath}/gates">Gates</a>
    </nav>

    <main class="content-shell">
      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method GET">GET</span>
          <div>
            <div class="endpoint-path">/health</div>
            <div class="doc-card-title">Service health</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">No authentication required. Returns service status and the deployment timestamp from the <code>DEPLOYED_AT</code> environment variable.</p>

          <section class="surface">
            <h3>Example response</h3>
            <pre class="code-block">${JSON.stringify({ service: 'sample', status: 'ok', deployed_at: 'unknown' }, null, 2)}</pre>
          </section>
        </div>
      </section>
    </main>
  `);

  res.type('html').send(page);
});

router.get('/db-health', (_req: Request, res: Response) => {
  const page = renderPage('Database Health Docs', `
    <header class="site-header">
      <img src="${basePath}/logo.svg" alt="MagicStack logo" class="site-logo" />
      <span class="base-url">${docsPath}</span>
      <h1>Database health check</h1>
      <p>Verifies that the API can acquire a connection from the MySQL pool and execute a query.</p>
    </header>

    <nav class="site-nav">
      <a href="${docsPath}/">Home</a>
      <a href="${docsPath}/health">Health</a>
      <a href="${docsPath}/gates">Gates</a>
    </nav>

    <main class="content-shell">
      <section class="doc-card">
        <div class="doc-card-header">
          <span class="http-method GET">GET</span>
          <div>
            <div class="endpoint-path">/db/health</div>
            <div class="doc-card-title">Database health</div>
          </div>
        </div>
        <div class="doc-card-body">
          <p class="doc-card-description">No authentication required. Runs <code>SELECT 1</code> against the configured database and returns the result. Returns <code>503</code> if the connection fails.</p>

          <section class="surface">
            <h3>Success response</h3>
            <pre class="code-block">${JSON.stringify({ service: 'sample', status: 'ok', deployed_at: null, message: 'Database connection successful', database: 'your_db' }, null, 2)}</pre>
          </section>

          <section class="surface">
            <h3>Failure response <span class="muted">(503)</span></h3>
            <pre class="code-block">${JSON.stringify({ service: 'sample', status: 'error', message: 'Database connection failed', error: 'reason' }, null, 2)}</pre>
          </section>
        </div>
      </section>
    </main>
  `);

  res.type('html').send(page);
});

router.get('/gates', (_req: Request, res: Response) => {
  const none = '<p class="muted">No body.</p>';
  const json = (body: unknown) => `<pre class="code-block">${JSON.stringify(body, null, 2)}</pre>`;
  const page = renderPage('Properties and Gates Docs', `
    <header class="site-header">
      <img src="${basePath}/logo.svg" alt="MagicStack logo" class="site-logo" />
      <span class="base-url">${docsPath}</span>
      <h1>Properties, gates and gate code audit</h1>
      <p>Administrators manage properties and gates. Gate Controllers may view them and change gate codes only. Every code change is audited.</p>
    </header>

    <nav class="site-nav">
      <a href="${docsPath}/">Home</a>
      <a href="${docsPath}/health">Health</a>
      <a href="${docsPath}/db-health">Database</a>
    </nav>

    <main class="content-shell">
      <section class="surface">
        <h3>Access</h3>
        <p>${authNote} Roles come from the auth service: <code>Administrator</code> (also <code>Admin</code> / <code>System Administrator</code>) has full access; <code>Gate Controller</code> may read the gates linked to them (see <code>/gate-controllers</code>) and call <code>PUT /gates/:id/code</code>. Other callers receive <code>403</code>; a missing or invalid token receives <code>401</code>. Records are deactivated, never deleted. The audit records who changed a code and when, never the code values.</p>
      </section>

      ${endpointCard('GET', '/properties', 'List properties', 'Administrator only. Active properties only unless <code>?includeInactive=true</code>.', `<p class="muted">${authNote}</p>`, { data: [propertyExample] })}
      ${endpointCard('GET', '/properties/:id', 'Get property', 'Administrator only. Returns <code>404</code> if not found.', none, { data: propertyExample })}
      ${endpointCard('POST', '/properties', 'Create property', 'Administrator only. <code>name</code> is required (<code>400</code> otherwise). Returns <code>201</code>.', json({ name: 'Hilltop Club' }), { data: propertyExample })}
      ${endpointCard('PUT', '/properties/:id', 'Update property', 'Administrator only. Optional <code>name</code> and <code>active</code>.', json({ name: 'Hilltop Club', active: true }), { data: propertyExample })}
      ${endpointCard('DELETE', '/properties/:id', 'Deactivate property', 'Administrator only. Deactivates the property and all its gates.', none, { data: { ...propertyExample, active: 0 } })}

      ${endpointCard('GET', '/gates', 'List gates', 'Administrator: all gates. Gate Controller: only the gates linked to them (none if unlinked). Filter with <code>?propertyId=</code>; inactive gates hidden unless <code>?includeInactive=true</code>. Includes the gate code.', `<p class="muted">${authNote}</p>`, { data: [gateExample] })}
      ${endpointCard('GET', '/gates/:id', 'Get gate', 'Administrator or Gate Controller. A Gate Controller receives <code>404</code> for gates not linked to them.', none, { data: gateExample })}
      ${endpointCard('POST', '/gates', 'Create gate', 'Administrator only. <code>propertyId</code> must be an existing property, <code>name</code> is required, latitude is -90 to 90 and longitude -180 to 180. A supplied <code>code</code> is audited.', json({ propertyId: 1, name: 'Main gate', latitude: -33.9249, longitude: 18.4241, code: '1234' }), { data: gateExample })}
      ${endpointCard('PUT', '/gates/:id', 'Update gate', 'Administrator only. Any of <code>propertyId, name, latitude, longitude, code, active</code>. A changed code is audited.', json({ name: 'Main gate', latitude: -33.9249, longitude: 18.4241 }), { data: gateExample })}
      ${endpointCard('PUT', '/gates/:id/code', 'Change gate code', 'Administrator or Gate Controller linked to the gate (<code>404</code> otherwise). The only write a Gate Controller can make. <code>code</code> is required. Always audited.', json({ code: '5678' }), { data: { ...gateExample, code: '5678' } })}
      ${endpointCard('GET', '/gates/:id/access-token', 'Get gate QR link', 'Administrator only. The long random access token for the gate and the public link plus <code>inUrl</code> / <code>outUrl</code>: each gate has two QR codes, one encoding the in link and one the out link. Created on first use if missing. Never cached.', none, { data: { accessToken: '<64-character token>', url: 'https://mcsagate.runeworkz.com/access/<64-character token>', inUrl: '<url>/in', outUrl: '<url>/out' } })}
      ${endpointCard('POST', '/gates/:id/access-token/regenerate', 'Regenerate gate QR link', 'Administrator only. Permanently invalidates every printed QR code for the gate. <code>confirmGateName</code> must equal the gate name exactly (<code>400</code> otherwise). Audited as <code>regenerate</code>.', json({ confirmGateName: 'Main gate' }), { data: { accessToken: '<new 64-character token>', url: 'https://mcsagate.runeworkz.com/access/<new 64-character token>', inUrl: '<url>/in', outUrl: '<url>/out' } })}
      ${endpointCard('GET', '/access/mine', 'My access history', 'Any signed-in user. The caller\'s own <code>property_access</code> records, newest first, for the last <code>?days=</code> days (default 30, maximum 3650). Ask for a larger window to load more; <code>hasMore</code> is true when older records exist. No gate codes. <code>no-store</code>.', `<p class="muted">${authNote}</p>`, { data: { days: 30, hasMore: false, records: [{ id: 1, property_id: 1, property_name: 'Hilltop Club', gate_id: 1, gate_name: 'Main gate', access_date: '2026-11-25', status: 'in', in_at: '2026-11-25T08:00:00', out_at: null }] } })}
      ${endpointCard('GET', '/access/:token', 'Resolve a QR link', 'Any signed-in user. Returns the gate behind a scanned QR token with its current code; <code>404</code> if the token is unknown, regenerated or the gate is inactive. Responses are <code>Cache-Control: no-store</code>.', `<p class="muted">${authNote}</p>`, { data: { gateId: 1, gateName: 'Main gate', propertyName: 'Hilltop Club', code: '1234' } })}
      ${endpointCard('POST', '/access/:token/in', 'Record a gate scan (in or out)', 'Any signed-in user. Also available as <code>/access/:token/out</code>. Records the caller in <code>property_access</code>: one row per user, gate and day, so the in and out scans of a day share one record. <code>in</code> keeps the first <code>in_at</code> of the day and clears <code>out_at</code> (re-entering means the person is in again), <code>out</code> sets <code>out_at</code> to the latest scan, and <code>status</code> is the most recent direction. Repeat scans are harmless (not idempotent by design). POST so link previews cannot create records. Returns the gate and its code; <code>404</code> if the token is unknown. <code>no-store</code>.', `<p class="muted">${authNote}</p>`, { data: { gateId: 1, gateName: 'Main gate', propertyName: 'Hilltop Club', code: '1234', direction: 'in', access: { id: 1, user_id: 7, user_name: 'Sam Member', property_id: 1, gate_id: 1, access_date: '2026-11-25', status: 'in', in_at: '2026-11-25T08:00:00', out_at: null } } })}
      ${endpointCard('GET', '/reports/property-access', 'Property access report', 'Administrator only. Access records for one property between <code>from</code> and <code>to</code> (<code>YYYY-MM-DD</code>, inclusive), newest first, optionally limited to one <code>gateId</code>. <code>propertyId</code>, <code>from</code> and <code>to</code> are required (<code>400</code> otherwise). At most 5000 records; <code>truncated</code> is true if there were more. No gate codes. <code>no-store</code>.', `<p class="muted">${authNote}</p>`, { data: { truncated: false, records: [{ id: 1, user_id: 7, user_name: 'Sam Member', property_id: 1, gate_id: 1, gate_name: 'Main gate', access_date: '2026-11-25', status: 'in', in_at: '2026-11-25T08:00:00', out_at: null }] } })}
      ${endpointCard('GET', '/reports/access-now', 'Access now report', 'Administrator only. One entry per active property with distinct-people counts (and the people) in five buckets: <code>todayIn</code> (entered today, still in), <code>todayOut</code> (entered today, has left), <code>yesterday</code> (entered yesterday, not out), <code>week</code> (entered 2 to 7 days ago, not out) and <code>overdue</code> (entered more than 7 days ago, not out). Each in scan is paired with the next out scan by the same person at the property (which may be on a later day); not out means no such out scan yet. <code>no-store</code>.', `<p class="muted">${authNote}</p>`, { data: [{ propertyId: 1, propertyName: 'Hilltop Club', todayIn: { count: 1, people: [{ userId: 7, userName: 'Sam Member', gateName: 'Main gate', inAt: '2026-11-25T08:00:00' }] }, todayOut: { count: 0, people: [] }, yesterday: { count: 0, people: [] }, week: { count: 0, people: [] }, overdue: { count: 0, people: [] } }] })}
      ${endpointCard('GET', '/reports/usage', 'Usage report', 'Administrator only. Distinct people on site per day between <code>from</code> and <code>to</code> (<code>YYYY-MM-DD</code>; default the last 30 days), for one <code>propertyId</code> or all properties. <code>count</code> is everyone on site at any point that day; <code>overnight</code> is people whose out scan is on a later date or who have not signed out; <code>dayVisitors</code> is <code>count</code> minus <code>overnight</code> (overnight people are never counted as day visitors). A stay runs from an in scan to the next out scan (any gate); stays with no out scan run to today. Maximum 366 days. <code>no-store</code>.', `<p class="muted">${authNote}</p>`, { data: { from: '2026-11-24', to: '2026-11-25', propertyId: null, days: [{ date: '2026-11-24', count: 5, dayVisitors: 3, overnight: 2 }, { date: '2026-11-25', count: 3, dayVisitors: 1, overnight: 2 }] } })}
      ${endpointCard('DELETE', '/gates/:id', 'Deactivate gate', 'Administrator only.', none, { data: { ...gateExample, active: 0 } })}

      ${endpointCard('GET', '/gate-audit', 'Gate code audit', 'Administrator only. Newest first. Filter with <code>?gateId=</code>; <code>?limit=</code> defaults to 100, maximum 500. <code>action</code> is <code>create</code>, <code>update</code> or <code>clear</code>.', `<p class="muted">${authNote}</p>`, { data: [auditExample] })}

      <section class="surface">
        <h3>Members and gate links</h3>
        <p>Administrator only, except <code>/members/me</code>. Members are identified by <code>member_number</code> and must have an email and phone. When a user signs in (validate-api succeeds), the member whose email matches (case-insensitive) is updated with the user's id, first name and last name. An administrator links members to gates; a member with the <code>Gate Controller</code> role then sees and edits only those gates. Records are deactivated, never deleted.</p>
      </section>

      ${endpointCard('GET', '/members/me', 'Get my member record', 'Any authenticated user. The member linked to the caller (matched by email at sign-in). <code>404</code> if none.', `<p class="muted">${authNote}</p>`, { data: { id: 1, member_number: 'M-1001', email: 'jane@example.com', phone: '0821234567', first_name: 'Jane', last_name: 'Doe', user_id: 42, active: 1 } })}
      ${endpointCard('PUT', '/members/me', 'Update my phone number', 'Any authenticated user. The only field a member may change is <code>phone</code>.', json({ phone: '0829999999' }), { data: { id: 1, member_number: 'M-1001', email: 'jane@example.com', phone: '0829999999', first_name: 'Jane', last_name: 'Doe', user_id: 42, active: 1 } })}
      ${endpointCard('GET', '/members', 'List members', 'Active only unless <code>?includeInactive=true</code>.', `<p class="muted">${authNote}</p>`, { data: [{ id: 1, member_number: 'M-1001', email: 'jane@example.com', phone: '0821234567', first_name: 'Jane', last_name: 'Doe', user_id: 42, active: 1 }] })}
      ${endpointCard('POST', '/members', 'Create member', '<code>memberNumber</code> (unique), <code>email</code> and <code>phone</code> are required. Returns <code>201</code>.', json({ memberNumber: 'M-1001', email: 'jane@example.com', phone: '0821234567' }), { data: { id: 1, member_number: 'M-1001', email: 'jane@example.com', phone: '0821234567', first_name: 'Jane', last_name: 'Doe', user_id: 42, active: 1 } })}
      ${endpointCard('PUT', '/members/:id', 'Update member', 'Any of <code>memberNumber, email, phone, active</code>. Changing the email unlinks the auth user until they next sign in.', json({ phone: '0829999999' }), { data: { id: 1, member_number: 'M-1001', email: 'jane@example.com', phone: '0821234567', first_name: 'Jane', last_name: 'Doe', user_id: 42, active: 1 } })}
      ${endpointCard('DELETE', '/members/:id', 'Deactivate member', 'Their gate links stop applying.', none, { data: { ...{ id: 1, member_number: 'M-1001', email: 'jane@example.com', phone: '0821234567', first_name: 'Jane', last_name: 'Doe', user_id: 42, active: 1 }, active: 0 } })}

      ${endpointCard('GET', '/gate-controllers', 'List gate controllers', 'Members linked to a gate. <code>?gateId=</code> is required.', `<p class="muted">${authNote}</p>`, { data: [{ id: 1, gate_id: 1, member_id: 1, active: 1, member_number: 'M-1001', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }] })}
      ${endpointCard('POST', '/gate-controllers', 'Link member to gate', '<code>gateId</code> and an active <code>memberId</code>. Idempotent. Returns <code>201</code> and the gate&rsquo;s links.', json({ gateId: 1, memberId: 1 }), { data: [{ id: 1, gate_id: 1, member_id: 1, active: 1, member_number: 'M-1001', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }] })}
      ${endpointCard('DELETE', '/gate-controllers/:id', 'Unlink member from gate', 'Deactivates the link and returns the gate&rsquo;s remaining links.', none, { data: [] })}
    </main>
  `);

  res.type('html').send(page);
});

export default router;
