import type { AuthResponse, RegisterInput, TenantResponse } from '../types/auth'
import { authRequest } from './client'

export const fetchTenant = () => authRequest<TenantResponse>('/tenant/')

export const validateToken = (token: string) =>
  authRequest<AuthResponse>('/validate', { token })

export const login = (email: string, password: string) =>
  authRequest<AuthResponse>('/login', { method: 'POST', body: { email, password } })

export const register = (input: RegisterInput) =>
  authRequest<AuthResponse>('/register', {
    method: 'POST',
    body: { ...input, avatar: null, active: 1 },
  })

export const forgotPassword = (email: string) =>
  authRequest<{ message: string }>('/forgot', { method: 'POST', body: { email } })

export const checkResetCode = (code: string) =>
  authRequest<{ used: number }>(`/forgot?code=${encodeURIComponent(code)}`)

export const resetPassword = (forcekey: string, newPassword: string) =>
  authRequest<AuthResponse>('/forgot/reset', {
    method: 'POST',
    body: { forcekey, new_password: newPassword },
  })
