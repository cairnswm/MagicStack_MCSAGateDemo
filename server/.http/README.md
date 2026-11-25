# HTTP Test Files — REST Client Setup

These `.http` files are designed for the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension by Mao.

All requests read their configuration from the project's `.env` file using `{{$dotenv VARIABLE}}` syntax.

## Setup

1. Copy `example.env` to `.env` in the project root (if not already done):
   ```
   cp example.env .env
   ```

2. Fill in the testing variables at the bottom of your `.env`:

   ```env
   PORT=3097
   TENANT_ID=your-tenant-uuid-here
   TEST_BEARER_TOKEN=eyJhbGci...your-jwt-here
   MAGICSTACK_KEYSTORE_API=http://localhost:3094
   ```

3. Open any `.http` file and click **Send Request** above a request block.

## Variable reference

| `.env` variable | Used for |
|-----------------|----------|
| `PORT` | Constructs `@baseUrl = http://localhost:{{$dotenv PORT}}` |
| `TENANT_ID` | `X-Tenant-ID` header and request bodies |
| `TEST_BEARER_TOKEN` | `Authorization: Bearer` header |
| `MAGICSTACK_KEYSTORE_API` | Keystore service base URL |

## Getting a bearer token

Run the request in [validate-token.http](validate-token.http) — the token used there comes from `TEST_BEARER_TOKEN`. To get a fresh one, authenticate via your auth service and paste the returned JWT into `.env`.

## Notes

- `.env` is git-ignored — never commit real tokens or credentials
- `example.env` is the committed template — add new variables there (with empty values) when introducing new `.http` files
- Production URLs (e.g. `https://auth.magicrunez.com`) are hardcoded and not env-driven
