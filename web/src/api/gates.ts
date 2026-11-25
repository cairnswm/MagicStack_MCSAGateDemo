import { API_BASE, ApiError, TENANT_ID } from './client'

export interface Property {
  id: number
  name: string
  active: number
}

export interface Gate {
  id: number
  property_id: number
  name: string
  latitude: number | null
  longitude: number | null
  code: string | null
  active: number
}

export interface Member {
  id: number
  member_number: string
  email: string
  phone: string
  first_name: string | null
  last_name: string | null
  user_id: number | null
  active: number
}

export interface GateController {
  id: number
  gate_id: number
  member_id: number
  member_number: string
  first_name: string | null
  last_name: string | null
  email: string
}

export interface AccessToken {
  accessToken: string
  url: string
  inUrl: string
  outUrl: string
}

export type AccessDirection = 'in' | 'out'

export interface PropertyAccess {
  id: number
  status: AccessDirection
  in_at: string | null
  out_at: string | null
}

export interface MyAccessRecord extends PropertyAccess {
  property_id: number
  property_name: string | null
  gate_id: number
  gate_name: string | null
  access_date: string
}

export interface MyAccessHistory {
  days: number
  hasMore: boolean
  records: MyAccessRecord[]
}

export interface GateAccess {
  gateId: number
  gateName: string
  propertyName: string | null
  code: string | null
}

export interface AuditEntry {
  id: number
  gate_id: number
  gate_name: string
  action: 'create' | 'update' | 'clear' | 'regenerate'
  changed_by_name: string
  changed_by_role: string
  changed_at: string
}

async function request<T>(token: string | null, method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-Tenant-ID': TENANT_ID }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status)
  return json.data as T
}

export interface PropertyAccessReportRecord extends PropertyAccess {
  user_id: number
  user_name: string
  property_id: number
  gate_id: number
  gate_name: string | null
  access_date: string
}

export interface PropertyAccessReport {
  truncated: boolean
  records: PropertyAccessReportRecord[]
}

export interface AccessNowPerson {
  userId: number
  userName: string
  gateName: string | null
  inAt: string | null
}

export interface AccessNowBucket {
  count: number
  people: AccessNowPerson[]
}

export interface AccessNowProperty {
  propertyId: number
  propertyName: string
  todayIn: AccessNowBucket
  todayOut: AccessNowBucket
  yesterday: AccessNowBucket
  week: AccessNowBucket
  overdue: AccessNowBucket
}

export const gatesApi = (token: string | null) => ({
  getPropertyAccessReport: (propertyId: number, from: string, to: string, gateId: number | null) =>
    request<PropertyAccessReport>(
      token,
      'GET',
      `/reports/property-access?propertyId=${propertyId}&from=${from}&to=${to}${gateId ? `&gateId=${gateId}` : ''}`,
    ),
  getAccessNowReport: () => request<AccessNowProperty[]>(token, 'GET', '/reports/access-now'),
  listProperties: (includeInactive: boolean) =>
    request<Property[]>(token, 'GET', `/properties?includeInactive=${includeInactive}`),
  getProperty: (id: number) => request<Property>(token, 'GET', `/properties/${id}`),
  createProperty: (name: string) => request<Property>(token, 'POST', '/properties', { name }),
  updateProperty: (id: number, body: Partial<Pick<Property, 'name'> & { active: boolean }>) =>
    request<Property>(token, 'PUT', `/properties/${id}`, body),
  listGates: (propertyId: number, includeInactive: boolean) =>
    request<Gate[]>(token, 'GET', `/gates?propertyId=${propertyId}&includeInactive=${includeInactive}`),
  createGate: (body: Omit<Gate, 'id' | 'active' | 'property_id'> & { propertyId: number }) =>
    request<Gate>(token, 'POST', '/gates', body),
  updateGate: (id: number, body: Partial<Omit<Gate, 'id' | 'property_id' | 'active'>> & { active?: boolean }) =>
    request<Gate>(token, 'PUT', `/gates/${id}`, body),
  setGateCode: (id: number, code: string) => request<Gate>(token, 'PUT', `/gates/${id}/code`, { code }),
  listMyGates: () => request<Gate[]>(token, 'GET', '/gates'),
  getMyMember: () => request<Member>(token, 'GET', '/members/me'),
  updateMyPhone: (phone: string) => request<Member>(token, 'PUT', '/members/me', { phone }),
  listMembers: (includeInactive: boolean) =>
    request<Member[]>(token, 'GET', `/members?includeInactive=${includeInactive}`),
  createMember: (body: { memberNumber: string; email: string; phone: string }) =>
    request<Member>(token, 'POST', '/members', body),
  updateMember: (id: number, body: Partial<{ memberNumber: string; email: string; phone: string; active: boolean }>) =>
    request<Member>(token, 'PUT', `/members/${id}`, body),
  listGateControllers: (gateId: number) =>
    request<GateController[]>(token, 'GET', `/gate-controllers?gateId=${gateId}`),
  linkGateController: (gateId: number, memberId: number) =>
    request<GateController[]>(token, 'POST', '/gate-controllers', { gateId, memberId }),
  unlinkGateController: (id: number) => request<GateController[]>(token, 'DELETE', `/gate-controllers/${id}`),
  getAccessToken: (gateId: number) => request<AccessToken>(token, 'GET', `/gates/${gateId}/access-token`),
  regenerateAccessToken: (gateId: number, confirmGateName: string) =>
    request<AccessToken>(token, 'POST', `/gates/${gateId}/access-token/regenerate`, { confirmGateName }),
  getMyAccessHistory: (days: number) => request<MyAccessHistory>(token, 'GET', `/access/mine?days=${days}`),
  getGateAccess: (accessToken: string) =>
    request<GateAccess>(token, 'GET', `/access/${encodeURIComponent(accessToken)}`),
  recordGateAccess: (accessToken: string, direction: AccessDirection) =>
    request<GateAccess & { direction: AccessDirection; access: PropertyAccess }>(
      token,
      'POST',
      `/access/${encodeURIComponent(accessToken)}/${direction}`,
    ),
  listAudit: (gateId?: number) =>
    request<AuditEntry[]>(token, 'GET', `/gate-audit${gateId ? `?gateId=${gateId}` : ''}`),
})
