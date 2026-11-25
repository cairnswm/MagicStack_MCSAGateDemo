# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo (no npm workspaces; each package has its own `package.json`/lockfile):

- `server/` – the Express/TypeScript API (everything below about `src/`, `.http/`, `scripts/`, `.env` is relative to `server/`)
- `web/` – React + Vite + TypeScript front end; calls the API directly: `VITE_LOCAL_API_URL` (localhost:3040) in `npm run dev`, `VITE_API_URL` (mcsagate.magicrunez.com) in builds; set `VITE_USE_LOCAL_API=false` to point dev at the deployed API (see `web/example.env`); `npm run dev` at the root starts both
- `.github/` – specs, Copilot instructions, CI workflow (runs build/deploy in `server/`)
- root `package.json` – convenience scripts only (`npm run dev:server`, `dev:web`, `build`, `install:all`, ...)

## Project state

Node/Express/TypeScript API (in `server/`) built from the MagicStack API template (`@magicstack/api-template`). `src/` has the template routes (health, db, tenant, sample, docs) plus the first feature slice: properties, gates and the gate code audit (see "Adding endpoints and UI pages"). The intended product is a **Club Property Access Management** system (QR-scanned gate check-in/out, monthly gate combinations, occupancy/overdue/history reports), specified in `.github/`:

- `user-specification.md`, `technical-specification.md` – requirements and architecture
- `api-specification.md` (large), `database.sql`, `ui-specification.md` – API contract, schema, UI

Key architectural intent from the spec: business logic lives in a service layer; REST (JWT auth) and MCP (scoped API-key auth) are independent transports that resolve identity into a shared `ServiceContext` and call the same service methods. Gate combinations must never be cached or logged. The repo has `add-api-keys` and `add-mcp` skills for the MCP/API-key pieces. Consult the spec files before implementing features.

Decisions that differ from what you might assume:
- Four user types only: system administrator, gate controller, member, permit holder (rescue = member with Auth rapid-access permission). There is no property administrator. Gate controllers are scoped per gate via the `gate_controllers` table and `ctx.assignedGateIds`.
- No foreign keys anywhere; the service layer owns referential integrity. Records are deactivated, not deleted.
- Check-in/check-out are deliberately not idempotent (duplicates are harmless). Permit creation is idempotent because it calls an external system.
- Every MCP call is logged to `mcp_call_log` against its API key, and audit rows from MCP calls carry `api_key_id`/`agent_id`.
- QR tokens are permanent and no presence check is done (accepted risk).

## Commands

Run from `server/` (or use the root `npm run <x>:server` wrappers). Web: `npm --prefix web run dev|build`.

- `npm install`
- `npm run dev` – nodemon + tsx on `src/index.ts`. `predev` kills whatever is listening on `PORT` from `.env` (Windows-only: uses `netstat`/`taskkill`).
- `npm run build` – typechecks (`tsc --noEmit`), then `scripts/build.js` bundles `src/` with esbuild into a single `dist/index.js` (npm packages stay external; the host installs them from `dist/package.json`) and copies `package.json` and `.env` into `dist/` (requires a `.env`)
- `npm start` – runs `dist/index.js`
- `npm run deploy` – FTP upload of `dist/` (now just `index.js`, `package.json`, `.env`) via `scripts/deploy.js`; does not restart the app. `npm run publish` = build + deploy.

No test runner or linter is configured. API tests are REST Client (`.http`) files in `.http/`.

Config: copy `example.env` to `.env`. `BASE_PATH` must match the deployed path; all routes are mounted under it. Default port 3097.

## Architecture

- `src/index.ts` wires everything: cache init (`@runeworkz/cache`, tenant from `TENANT_ID`), static `public/`, **public** `/health` router, then `tenantMiddleware`, then CORS, then `/db`, `/tenant`, `/sample`, and the HTML `/docs` router. Order matters: health is mounted before tenant middleware so it needs no tenant.
- Multi-tenant: tenant id comes from `x-tenant-id` header or `tenantId` query. Tenant data is fetched from the auth API (`MAGICSTACK_AUTH_API`) via `src/utils/authClient.ts` and cached 5 min in the shared Cachey service. Call `cache.setTenantId(tenantId)` before every cache get/set in routes.
- Auth: Bearer token (or cookie) validated against the auth API (`validateToken`, `getUserJwt` in `authClient.ts`).
- Database: MySQL via `mysql2` pool (`src/config/database.ts`), accessed through `src/utils/db.ts`.

## Adding endpoints and UI pages

Reference implementation: `properties`, `gates` and `gate-audit` (routes in `server/src/routes/`, pages in `web/src/pages/`). Copy their patterns.

**Database** (the dev DB in `server/.env` is directly usable; apply schema changes there yourself)
- Add the DDL to `.github/database.sql` (use `CREATE TABLE IF NOT EXISTS`) and run it against the DB. No foreign keys; `active` flag instead of deletes; every table has `tenant_id` and every query filters by it.
- No SQL CLI is installed. Run SQL with a small node script that requires `server/node_modules/mysql2/promise` and `dotenv` by absolute path (keep it in the scratchpad, not the repo). Heredocs containing large TS/SQL can break the Bash tool: use the Write/Edit tools for files.

**Server endpoint checklist**
1. Route file in `src/routes/<area>.ts`; mount it in `src/index.ts` as `${BASE_PATH}/<area>` (after tenant middleware and CORS).
2. Auth: `router.use(requireAuth as any)` from `src/middleware/auth.ts`, then per route `adminOnly` / `adminOrGateController` (or `requireAccess(fn)` for a new rule). Read the caller with `getAuth(res)` (`tenantId`, `userId`, `userName`, `isAdmin`, `isGateController`). Never read tenant from the request again inside handlers.
3. Roles come from the auth service and are matched by name in `src/utils/roles.ts` (`Gate Controller`; admin = `Administrator`/`Admin`/`System Administrator`). The auth API returns roles as objects (`{id, name}`); use `normaliseRoles`. Add new role names there, and mirror them in `web/src/context/AuthContext.tsx`.
4. `requireAuth` caches validated tokens in Cachey for 100 s (key = SHA-256 of the token, value = id/name/roles only), so role changes take up to 100 s to apply. Never cache gate codes.
5. Gate code changes must call `recordGateCodeChange` (`src/utils/gateAudit.ts`). The audit stores who/when/gate, never code values.
6. Validate and trim input in the route; return `successResponse`/`errorResponse`; 404 for missing, 400 for bad input, 403/401 from the middleware.
7. Add `server/.http/<area>/<area>.http` and document in `src/routes/docs.ts` (use the `endpointCard` helper and the `authNote`/example constants on a `/docs/<area>` page, plus a home card and `site-nav` links on every detail page). Then run `npx tsc --noEmit` in `server/`.

**Web page checklist**
1. API calls go through a small typed client in `web/src/api/` (see `gates.ts`): sends `X-Tenant-ID` and the bearer token, unwraps `{ data }`, throws `ApiError` with `error.message`. Use `API_BASE` from `client.ts`.
2. Page in `web/src/pages/`, route added inside the `ProtectedRoute`/`AppLayout` block in `App.tsx`, nav link in `components/Header.tsx`.
3. Gate on role with `isAdmin` / `isGateController` from `useAuth()`. The UI check is only for display; the server enforces access. Call hooks before any early return for no-access.
4. Reuse `Field`, `Alert`, and the button classes in `buttonStyles.ts`; follow `web/specifications/design-system.md` (blue-900 cards, red-500 accents, Tailwind only).
5. Verify with `npm run build` in `web/` (runs `tsc -b`). `useAuth` shares a file with `AuthProvider`, so Vite logs a harmless Fast Refresh warning for that file.

## Conventions (enforced in code review; also in `.github/copilot-instructions.md`)

- One route per file in `src/routes/`; TypeScript only; camelCase; do not install new libraries unless asked; suggest refactoring if a file exceeds 300 lines.
- Import `getTenantId` / `requireTenant` from `src/utils/tenant.ts` (or `src/middleware/tenantMiddleware.ts`); never redefine locally.
- Never call `pool.getConnection()` in routes; use `withConnection(fn)` or `query(sql, params)` from `src/utils/db.ts`.
- Never build `{ data }` / `{ error: { message } }` inline; use `successResponse` / `errorResponse` from `src/utils/formatters.ts`. Use `parseJsonFields` on DB rows with JSON text columns.
- `tenantUtils.getProperty` / `getSetting` must read cached values only (no network calls); only `refresh()` calls `fetchTenant`.
- Use `getFetch()` from `authClient.ts` instead of re-checking `globalThis.fetch`.
- Every API needs a matching `.http/<area>/*.http` test file.
- Every endpoint must be documented in `src/routes/docs.ts` in the same change, following `.github/skills/docs-endpoints/SKILL.md` (home card + detail page + `site-nav` link, shared stylesheet classes only, no inline CSS).
