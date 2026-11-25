import { request } from './gates'

export type PermitStatus = 'invited' | 'submitted' | 'approved' | 'rejected' | 'cancelled'

export interface Permit {
  id: number
  property_id: number
  property_name: string | null
  member_id: number
  member_number: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string
  valid_from: string
  valid_to: string
  status: PermitStatus
  created_by_name: string
  decided_by_name: string | null
  /** In-app path of the invite link, e.g. /permit/<token>. */
  linkPath: string
}

export interface PermitInvite {
  propertyName: string | null
  email: string
  validFrom: string
  validTo: string
  status: PermitStatus
}

export interface CreatePermitInput {
  propertyId: number
  email: string
  validFrom: string
  validTo: string
}

export interface SubmitPermitInput {
  firstName: string
  lastName: string
  phone: string
}

export const permitsApi = (token: string | null) => ({
  list: (status?: PermitStatus) =>
    request<Permit[]>(token, 'GET', `/permits${status ? `?status=${status}` : ''}`),
  create: (body: CreatePermitInput) => request<Permit>(token, 'POST', '/permits', body),
  approve: (id: number) => request<Permit>(token, 'POST', `/permits/${id}/approve`),
  reject: (id: number) => request<Permit>(token, 'POST', `/permits/${id}/reject`),
  cancel: (id: number) => request<Permit>(token, 'POST', `/permits/${id}/cancel`),
  getInvite: (inviteToken: string) =>
    request<PermitInvite>(token, 'GET', `/permits/invite/${encodeURIComponent(inviteToken)}`),
  submitInvite: (inviteToken: string, body: SubmitPermitInput) =>
    request<{ status: PermitStatus }>(token, 'POST', `/permits/invite/${encodeURIComponent(inviteToken)}/submit`, body),
})
