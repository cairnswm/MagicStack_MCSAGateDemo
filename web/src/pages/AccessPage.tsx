import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { gatesApi, type AccessDirection, type GateAccess } from '../api/gates'

/**
 * Target of a gate's QR codes: signed-in users see the gate code, everyone else registers first.
 * The "in" and "out" codes (direction) also record the scan as a property access.
 */
export default function AccessPage({ direction }: { direction?: AccessDirection }) {
  const { token: accessToken = '' } = useParams()
  const { user, token, initializing } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const { refreshMyAccess } = useData()
  const [gate, setGate] = useState<GateAccess | null>(null)
  const [error, setError] = useState<string | null>(null)
  const handled = useRef('') // one request per page visit, even if the effect re-runs (e.g. StrictMode)
  // Latest values, read inside the effect without making it re-run: the data context reloads in the background
  // (e.g. my access finishing its first load) and must never reset the gate code that is already on screen.
  const latest = useRef({ api, refreshMyAccess })
  latest.current = { api, refreshMyAccess }
  const userId = user?.user.id

  useEffect(() => {
    if (userId === undefined) return
    const key = `${userId}:${accessToken}:${direction ?? 'view'}`
    if (handled.current === key) return
    handled.current = key
    setGate(null)
    setError(null)
    const { api: client } = latest.current
    const request = direction ? client.recordGateAccess(accessToken, direction) : client.getGateAccess(accessToken)
    request.then((g) => {
      setGate(g)
      if (direction) void latest.current.refreshMyAccess() // the scan changed the user's own access records
    }).catch((e: Error) => {
      handled.current = ''
      setError(e.message)
    })
  }, [userId, accessToken, direction])

  if (initializing) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="w-10 text-red-500 animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to={`/register?next=${encodeURIComponent(`/access/${accessToken}${direction ? `/${direction}` : ''}`)}`} replace />

  return (
    <div className="max-w-md mx-auto space-y-4 text-center">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && !gate && <Loader className="w-8 mx-auto text-red-500 animate-spin" />}
      {gate && (
        <div className="bg-blue-900 rounded-2xl border border-blue-800 px-6 py-8 shadow-sm space-y-3">
          {direction && (
            <p className="text-sm font-medium text-green-400">Checked {direction === 'in' ? 'in' : 'out'}</p>
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-blue-200">{gate.propertyName ?? 'Gate'}</p>
          <h1 className="text-2xl font-semibold text-red-500">{gate.gateName}</h1>
          <p className="text-xs uppercase tracking-wide text-blue-200">Gate code</p>
          <p className="font-mono text-4xl tracking-widest text-white">{gate.code ?? '—'}</p>
        </div>
      )}
    </div>
  )
}
