---
name: docs-endpoints
description: Structure the /docs HTML documentation pages for API endpoints in this MagicStack Express service (src/routes/docs.ts). Defines the page shell, the endpoint card layout, and the Request and Response panels. Use when adding, changing or reviewing documentation for any endpoint, or when a new route is added that needs documenting.
---

# Documenting endpoints under `/docs`

Documentation is server-rendered HTML served by `src/routes/docs.ts` (mounted at `${BASE_PATH}/docs`). Styling comes from the shared stylesheet `https://cdn.runeworkz.com/styles.css`. Do not add inline `<style>` blocks or new CSS; use only the classes listed here.

## Rules

- Every endpoint a client can call must be documented. Add or update docs in the same change as the route.
- Document the real contract: actual paths, headers, status codes and JSON shapes from the route code. Never invent fields.
- Use `basePath` / `docsPath` for links and the logo; never hard-code `/docs`.
- Escape nothing by hand for JSON: build example bodies with `JSON.stringify(obj, null, 2)` inside the `code-block`.
- Use placeholder values in examples (`your_db`, `<token>`, `123`). Never real secrets, tokens or tenant data.

## Page structure

Two kinds of pages, both built with `renderPage(title, body)`:

1. **Home** (`GET /docs/`): overview and one summary card per endpoint (a quick reference).
2. **Detail page** (`GET /docs/<area>`): one page per area/feature (e.g. `/docs/health`, `/docs/db-health`) with full detail, including all error responses.

Every new area needs: a detail route, a card on the Home page, and a link in the `site-nav` of every detail page.

### Page shell

```html
<header class="site-header">
  <img src="${basePath}/logo.svg" alt="MagicStack logo" class="site-logo" />
  <span class="base-url">${docsPath}</span>      <!-- Home uses ${basePath || '/'} -->
  <h1>Area title</h1>
  <p>One sentence describing the area.</p>
</header>

<nav class="site-nav">                            <!-- detail pages only -->
  <a href="${docsPath}/">Home</a>
  <a href="${docsPath}/other-area">Other area</a>
</nav>

<main class="content-shell">
  <!-- one doc-card per endpoint -->
</main>
```

The `<body>` always has `class="app-shell"`.

## Endpoint card

One `doc-card` per endpoint, in this exact structure:

```html
<section class="doc-card">
  <div class="doc-card-header">
    <span class="http-method GET">GET</span>
    <div>
      <div class="endpoint-path">/resource/:id</div>
      <div class="doc-card-title">Short human title</div>
    </div>
  </div>
  <div class="doc-card-body">
    <p class="doc-card-description">What it does, auth requirement, notable behaviour.</p>

    <!-- Request / Response panels -->
  </div>
</section>
```

- `http-method` gets the verb as both class and text: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- `endpoint-path` is the path as the client calls it, with `:param` placeholders. Use `<code>` for inline names in the description.
- The description's first sentence says what the endpoint does; state authentication explicitly (e.g. "No authentication required." or "Requires a Bearer token.") and mention non-obvious status codes with `<code>503</code>`.
- Order cards on a page by area, then GET, POST, PUT/PATCH, DELETE.

## Request and Response panels

Always render Request and Response side by side inside a `two-column` div, each as a `surface` section with an `<h3>` heading titled exactly `Request` and `Response`:

```html
<div class="two-column">
  <section class="surface">
    <h3>Request</h3>
    <!-- request content -->
  </section>
  <section class="surface">
    <h3>Response</h3>
    <!-- response content -->
  </section>
</div>
```

### Request panel contents (in this order, omit parts that don't apply)

1. **Headers**: list required headers (`Authorization: Bearer <token>`, `Content-Type: application/json`).
2. **Path / query parameters**: a `<ul>` with `<code>name</code>` plus type, whether required, and meaning.
3. **Body**: a `<pre class="code-block">` containing example JSON, followed by a `<ul>` of field notes if types or constraints aren't obvious.

If nothing is required, use exactly:

```html
<p class="muted">Nothing required. No headers, body, or query parameters.</p>
```

### Response panel contents

1. **Success**: a `<pre class="code-block">` with the example JSON of the success response. Add `<p class="muted">Status <code>200</code>.</p>` when it isn't 200.
2. **Errors**: one `<p class="muted">` line per error status, e.g. `Returns <code>503</code> with <code>"status": "error"</code> when the connection fails.` Keep these brief on the Home page.
3. Non-JSON responses (HTML, files, empty `204`): describe in a `muted` paragraph instead of a code block.

### Detail pages: stacked responses

When an endpoint has several distinct responses, the detail page does not use `two-column`. Instead stack one `surface` per response, headed with the outcome and status:

```html
<section class="surface">
  <h3>Success response</h3>
  <pre class="code-block">…</pre>
</section>

<section class="surface">
  <h3>Failure response <span class="muted">(503)</span></h3>
  <pre class="code-block">…</pre>
</section>
```

Use `Example request` / `Example response` as headings when a detail page has only a single panel.

## Home page summary

The Home page also lists core routes in a `surface` inside the first card:

```html
<section class="surface">
  <h3>Core routes</h3>
  <ul><li><code>GET /health</code></li></ul>
</section>
```

Keep this list in sync when routes are added or removed.

## Checklist when adding an endpoint

1. Add the detail route in `src/routes/docs.ts` using `renderPage`.
2. Build the endpoint card with method, path, title, description.
3. Add Request and Response panels per the rules above, with example JSON generated from the real response shape.
4. Add the summary card to the Home page and update the "Core routes" list.
5. Add the page to `site-nav` on all detail pages.
6. Run the app and open `${docsPath}/` and the new page to confirm they render.
