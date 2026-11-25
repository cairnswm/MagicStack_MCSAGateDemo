export const AUTH_API: string = (
  import.meta.env.VITE_MAGICSTACK_AUTH_API || 'https://auth.magicrunez.com'
).replace(/\/$/, '')

const LOCAL_API_URL = (import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3040').replace(/\/$/, '')
const DEPLOYED_API_URL = (import.meta.env.VITE_API_URL || 'https://mcsagate.magicrunez.com').replace(/\/$/, '')

/**
 * Backend (MCSA Gate) API base URL. Production builds always use the deployed
 * API; `npm run dev` uses the local API unless VITE_USE_LOCAL_API=false.
 */
export const API_BASE: string =
  import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_API !== 'false' ? LOCAL_API_URL : DEPLOYED_API_URL

export const TENANT_ID: string = import.meta.env.VITE_TENANT_ID || ''
export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'Club Gate Access'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string | null
}

export async function authRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Tenant-ID': TENANT_ID }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  let res: Response
  try {
    res = await fetch(`${AUTH_API}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed (${res.status})`
    throw new ApiError(String(message), res.status)
  }
  return data as T
}
