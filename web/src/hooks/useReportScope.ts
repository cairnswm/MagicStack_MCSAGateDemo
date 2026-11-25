import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { gatesApi, type ReportScope } from '../api/gates'

/**
 * The properties and gates the signed-in user may report on, for the report dropdowns. Administrators get everything;
 * a Property Owner only the gates linked to them and those gates' properties.
 */
export function useReportScope() {
  const { token, canViewReports } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const [scope, setScope] = useState<ReportScope | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canViewReports) return
    let cancelled = false
    api
      .getReportScope()
      .then((s) => !cancelled && setScope(s))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [api, canViewReports])

  return { properties: scope?.properties ?? [], gates: scope?.gates ?? [], loading: !scope && !error, error }
}
