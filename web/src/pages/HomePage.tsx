import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../api/client'
import { useData } from '../context/DataContext'
import { gatesApi, type Gate, type MyAccessHistory as MyAccessHistoryData } from '../api/gates'
import Alert from '../components/Alert'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import { primaryButton, secondaryButton } from '../components/buttonStyles'

/** The gates linked to the signed-in Gate Controller, each with a change-code action. */
function MyGates() {
  const { token } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const { myGates: gates, myGatesLoading: loading, loadMyGates } = useData()
  const [codeFor, setCodeFor] = useState<Gate | null>(null)
  const [newCode, setNewCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const clearNotice = useCallback(() => setNotice(null), [])

  const load = useCallback(() => {
    loadMyGates().catch((e: Error) => setError(e.message))
  }, [loadMyGates])
  useEffect(load, [load])

  const saveCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeFor) return
    try {
      await api.setGateCode(codeFor.id, newCode)
      setNotice(`Code updated for ${codeFor.name}`)
      setCodeFor(null)
      setNewCode('')
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">My gates</h2>
      <Alert message={error} onDismiss={clearError} />
      <Alert message={notice} type="success" onDismiss={clearNotice} />

      {codeFor && (
        <form onSubmit={saveCode} className="flex items-end gap-3 max-w-xl bg-blue-900 rounded-2xl border border-blue-800 p-4">
          <div className="flex-1">
            <Field label={`New code for ${codeFor.name}`} value={newCode} required onChange={(e) => setNewCode(e.target.value)} />
          </div>
          <button className={primaryButton}>Update code</button>
          <button type="button" className={secondaryButton} onClick={() => setCodeFor(null)}>Cancel</button>
        </form>
      )}

      {loading && <Spinner label="Loading gates…" />}
      <ul className="space-y-2">
        {gates?.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 rounded-xl border border-blue-800 px-4 py-3 text-white">
            <div>
              <div className="font-medium">{g.name}</div>
              <div className="text-xs text-blue-200">
                {g.latitude != null && g.longitude != null ? `${g.latitude}, ${g.longitude}` : 'No location'} · Code:{' '}
                <span className="font-mono">{g.code ?? '—'}</span>
              </div>
            </div>
            <button className={secondaryButton} onClick={() => { setCodeFor(g); setNewCode('') }}>
              <KeyRound className="w-4" /> Change code
            </button>
          </li>
        ))}
        {!loading && gates?.length === 0 && <li className="text-sm text-blue-200">No gates have been linked to you yet.</li>}
      </ul>
    </section>
  )
}

const PAGE_DAYS = 30

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—')

/** The signed-in user's own property access records, newest first. Last 30 days; "Load more" widens the window. */
function MyAccessHistory() {
  const { token } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const [days, setDays] = useState(PAGE_DAYS)
  const [history, setHistory] = useState<MyAccessHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getMyAccessHistory(days)
      .then((h) => !cancelled && setHistory(h))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [api, days])

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">My property access</h2>
      <Alert message={error} onDismiss={clearError} />
      {loading && <Spinner label="Loading access records…" />}
      <ul className="space-y-2">
        {history?.records.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 rounded-xl border border-blue-800 px-4 py-3 text-white">
            <div>
              <div className="font-medium">{r.property_name ?? 'Unknown property'}</div>
              <div className="text-xs text-blue-200">{r.gate_name ?? 'Unknown gate'}</div>
            </div>
            <div className="text-xs text-blue-200 text-right">
              <div>In: {formatDateTime(r.in_at)}</div>
              <div>Out: {formatDateTime(r.out_at)}</div>
            </div>
          </li>
        ))}
        {!loading && history && history.records.length === 0 && (
          <li className="text-sm text-blue-200">No property access in the last {history.days} days.</li>
        )}
      </ul>
      {history?.hasMore && !loading && (
        <button className={secondaryButton} onClick={() => setDays((d) => d + PAGE_DAYS)}>
          Load more
        </button>
      )}
    </section>
  )
}

/** Placeholder for administrator reports, to be populated later. */
function AdminReports() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Reports</h2>
      <div className="bg-blue-900 rounded-2xl border border-blue-800 px-4 py-6 text-sm text-blue-200">
        Reports will appear here.
      </div>
    </section>
  )
}

export default function HomePage() {
  const { user, isAdmin, isGateController } = useAuth()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-red-500">Welcome, {user?.user.firstname}</h1>
      <div className="bg-blue-900 rounded-2xl border border-blue-800 px-4 py-6 shadow-sm">
        <p className="text-sm text-white">
          You are signed in to {APP_NAME}. Gate check-in, occupancy and reports will appear here.
        </p>
      </div>
      {isAdmin && <AdminReports />}
      {isGateController && !isAdmin && <MyGates />}
      <MyAccessHistory />
    </div>
  )
}
