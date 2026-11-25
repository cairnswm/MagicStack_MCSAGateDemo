import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { gatesApi, type PropertyAccessReport } from '../api/gates'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'
import { primaryButton, linkClass } from '../components/buttonStyles'

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDate(d)
}
const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—')

const inputClass =
  'w-full rounded-xl border border-blue-800 bg-blue-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500'
const labelClass = 'block text-xs text-blue-200 mb-1'

/** Administrator report: access records for one property (optionally one gate) over a date range. */
export default function PropertyAccessReportPage() {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const { properties, propertiesLoading, gatesFor, loadGates } = useData()
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [gateId, setGateId] = useState<number | null>(null)
  const [from, setFrom] = useState(daysAgo(7))
  const [to, setTo] = useState(localDate(new Date()))
  const [report, setReport] = useState<PropertyAccessReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  const activeProperties = useMemo(() => properties.filter((p) => p.active), [properties])
  const gates = propertyId ? gatesFor(propertyId).filter((g) => g.active) : []

  // Gates for the chosen property load only once a property is picked.
  useEffect(() => {
    if (isAdmin && propertyId) loadGates(propertyId).catch((e: Error) => setError(e.message))
  }, [isAdmin, propertyId, loadGates])

  if (!isAdmin) {
    return <p className="text-sm text-blue-200">You do not have access to reports.</p>
  }

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyId) return
    setLoading(true)
    setReport(null)
    try {
      setReport(await api.getPropertyAccessReport(propertyId, from, to, gateId))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/home" className={`${linkClass} inline-flex items-center gap-1 text-sm`}>
        <ArrowLeft className="w-4" /> Home
      </Link>
      <h1 className="text-2xl font-semibold text-red-500">Property access report</h1>
      <Alert message={error} onDismiss={clearError} />

      <form onSubmit={run} className="grid sm:grid-cols-5 gap-3 items-end bg-blue-900 rounded-2xl border border-blue-800 p-4">
        <div>
          <label className={labelClass} htmlFor="rpt-property">Property</label>
          <select
            id="rpt-property"
            className={inputClass}
            required
            value={propertyId ?? ''}
            onChange={(e) => {
              setPropertyId(e.target.value ? Number(e.target.value) : null)
              setGateId(null)
              setReport(null)
            }}
          >
            <option value="">{propertiesLoading ? 'Loading…' : 'Choose a property'}</option>
            {activeProperties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="rpt-gate">Gate (optional)</label>
          <select
            id="rpt-gate"
            className={inputClass}
            disabled={!propertyId}
            value={gateId ?? ''}
            onChange={(e) => setGateId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All gates</option>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="rpt-from">From</label>
          <input id="rpt-from" type="date" className={inputClass} required value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="rpt-to">To</label>
          <input id="rpt-to" type="date" className={inputClass} required value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className={primaryButton} disabled={!propertyId || loading}>Run report</button>
      </form>

      {loading && <Spinner label="Loading access records…" />}
      {report && (
        <section className="space-y-2">
          {report.truncated && (
            <p className="text-sm text-orange-300">Only the newest 5000 records are shown. Narrow the date range or choose a gate.</p>
          )}
          <p className="text-sm text-green-400 font-bold">
            {report.records.filter((r) => r.status === 'in').length} currently in the property
          </p>
          <ul className="space-y-2">
            {report.records.map((r) => {
              const inNow = r.status === 'in'
              return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 rounded-xl border border-blue-800 px-4 py-3 text-white">
                <div>
                  <div className="font-medium">{r.user_name}</div>
                  <div className="text-xs text-blue-200">{r.gate_name ?? 'Unknown gate'}</div>
                </div>
                <div className="text-xs text-blue-200 text-right">
                  <div className={inNow ? 'text-green-400 font-bold' : ''}>In: {formatDateTime(r.in_at)}</div>
                  <div className={inNow ? 'text-green-400 font-bold' : ''}>Out: {inNow ? 'Still in' : formatDateTime(r.out_at)}</div>
                </div>
              </li>
              )
            })}
            {report.records.length === 0 && (
              <li className="text-sm text-blue-200">No access records for this property in the chosen dates.</li>
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
