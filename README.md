# Express Health API

A simple Node.js/Express API with TypeScript that provides a health check endpoint.

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

Use example.env for the correct format

BASE_PATH should match the path as deployed on the server

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

This will:
- Compile TypeScript files to `dist/js/`
- Copy `package.json` to `dist/`
- Copy `.env` as `.env` to `dist/`
## Run Production

```bash
npm start
```

## API Endpoints

These are the initial endpoints, add and modify as required

- `GET /<serverpath>/` - Returns `{ "status": "node js app running" }`
- `GET /<serverpath>/health` - Returns `{ "status": "ok" }`
- `GET /<serverpath>/db/health` - Database health check endpoint that validates database connection

## Caching

The template uses [`@runeworkz/cache`](https://npm.magicrunez.com/-/web/detail/@runeworkz/cache) to cache tenant data (and any other data you choose) against the shared Cachey service at `https://cachey.magicrunez.com`.

### Initialisation

The cache is initialised once at app startup in `src/index.ts` using the `TENANT_ID` from `.env`:

```typescript
cache.setTenantId(process.env.TENANT_ID!);
// Optional — override the default Cachey endpoint
if (process.env.MAGICSTACK_CACHEY_API) {
  cache.configure({ baseUrl: process.env.MAGICSTACK_CACHEY_API });
}
```

Set the following environment variable in `.env` if you need to override the endpoint:

- `MAGICSTACK_CACHEY_API` - Override for the Cachey base URL (defaults to `https://cachey.magicrunez.com`)

### Tenant caching

`fetchTenant` in `src/utils/authClient.ts` caches the tenant response for **5 minutes** using `cache.getSet()` with `shared: true` so other applications pointing at the same Cachey service can read the same entry without making additional requests to the auth API.

### Using the cache in routes

When adding cache calls to your own routes, always call `cache.setTenantId()` before every `get` or `set` operation. This scopes each cache request to the correct tenant in multi-tenant scenarios where the singleton would otherwise retain the last-set tenant ID:

```typescript
import cache from '@runeworkz/cache';

// inside a route handler — tenantId comes from res.locals.tenantId or the x-tenant-id header
cache.setTenantId(tenantId);
const result = await cache.getSet('articles', articleId, () => fetchArticle(articleId), { ttl: 300 });

// manual get + set pattern
cache.setTenantId(tenantId);
const cached = await cache.get<MyType>('namespace', id);
if (!cached) {
  const fresh = await fetchData(id);
  cache.setTenantId(tenantId); // set again before the write
  await cache.set('namespace', id, fresh, { ttl: 300 });
}
```

Use `shared: true` in `opts` when the cached data should be readable by other tenants or other services:

```typescript
await cache.set('namespace', id, value, { ttl: 300, shared: true });
// or via getSet:
await cache.getSet('namespace', id, loader, { ttl: 300, shared: true });
```

## Deployment

### SAetting up the server

1. Create the Directory 
2. Create an FTP user with the directory as their root 
3. <run deploy>
4. create a NodeJS application pointing to the above directory
- check the node version (20)
- run the npm start

### Deployment

``` bash
npm run deploy
```

This DOES NOT restart the app - this needs to be done manually