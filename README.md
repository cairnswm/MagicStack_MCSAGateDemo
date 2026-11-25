# MCSA Gate Demo

Club Property Access Management — monorepo.

| Folder    | What                                                    |
|-----------|---------------------------------------------------------|
| `server/` | Express/TypeScript API (see `server/README.md`)         |
| `web/`    | React + Vite + TypeScript front end                     |
| `.github/`| Specifications, CI workflow                             |

## Setup

```bash
npm run install:all
cp server/example.env server/.env   # fill in values
cp web/example.env web/.env         # optional, dev proxy settings
```

## Develop

```bash
npm run dev:server   # API on PORT from server/.env (default 3097)
npm run dev:web      # Vite on :5173, /api/* proxied to the API
```

## Build / deploy

```bash
npm run build           # server (single-file bundle) + web
npm run publish         # build + FTP deploy of BOTH server and web
npm run publish:server  # API only
npm run publish:web     # front end only (uploads web/dist using FTP_* from web/.env)
```

The server build bundles all of `src/` into one `dist/index.js`, so the FTP
deploy uploads three files (`index.js`, `package.json`, `.env`).
