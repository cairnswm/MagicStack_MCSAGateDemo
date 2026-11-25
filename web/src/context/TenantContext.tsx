/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchTenant } from '../api/auth'
import type { TenantResponse } from '../types/auth'

interface TenantValue {
  tenant: TenantResponse | null
  loading: boolean
  error: string | null
  getProperty: (name: string) => string | undefined
}

const TenantContext = createContext<TenantValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTenant()
      .then((t) => !cancelled && setTenant(t))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const getProperty = (name: string) => tenant?.properties.find((p) => p.name === name)?.value

  return (
    <TenantContext.Provider value={{ tenant, loading, error, getProperty }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
