/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../api/auth'
import type { AuthResponse, Profile, RegisterInput } from '../types/auth'

const TOKEN_KEY = 'token'
const REFRESH_KEY = 'refreshToken'

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

interface AuthValue {
  user: Profile | null
  token: string | null
  /** True while an existing token is being validated on startup. */
  initializing: boolean
  /** Set when a stored token turned out to be invalid/expired. */
  sessionError: string | null
  clearSessionError: () => void
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  /** Authenticate from any response with the login payload shape (e.g. reset). */
  applyAuth: (res: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken)
  const [user, setUser] = useState<Profile | null>(null)
  const [initializing, setInitializing] = useState<boolean>(() => readToken() !== null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
    } catch {
      /* ignore */
    }
    setToken(null)
    setUser(null)
  }, [])

  const applyAuth = useCallback((res: AuthResponse) => {
    try {
      localStorage.setItem(TOKEN_KEY, res.token)
      localStorage.setItem(REFRESH_KEY, res.refreshToken)
    } catch {
      /* ignore */
    }
    setToken(res.token)
    setUser(res.profile)
  }, [])

  // Validate a stored token once on startup.
  useEffect(() => {
    const stored = readToken()
    if (!stored) return
    let cancelled = false
    api
      .validateToken(stored)
      .then((res) => {
        if (cancelled) return
        applyAuth({ ...res, token: res.token || stored })
      })
      .catch((e: Error) => {
        if (cancelled) return
        clear()
        setSessionError(e.message || 'Token has expired, Please log in again')
      })
      .finally(() => !cancelled && setInitializing(false))
    return () => {
      cancelled = true
    }
  }, [applyAuth, clear])

  const login = useCallback(
    async (email: string, password: string) => applyAuth(await api.login(email, password)),
    [applyAuth],
  )
  const register = useCallback(
    async (input: RegisterInput) => applyAuth(await api.register(input)),
    [applyAuth],
  )
  const clearSessionError = useCallback(() => setSessionError(null), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        initializing,
        sessionError,
        clearSessionError,
        login,
        register,
        applyAuth,
        logout: clear,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const ADMIN_ROLES = ['administrator', 'admin', 'system administrator']

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  const roles = (ctx.user?.roles ?? []).map((r) => String(typeof r === 'string' ? r : r.name).toLowerCase())
  return {
    ...ctx,
    isAdmin: roles.some((r) => ADMIN_ROLES.includes(r)),
    isGateController: roles.includes('gate controller'),
  }
}
