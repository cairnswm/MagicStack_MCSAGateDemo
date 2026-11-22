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

export default router;
