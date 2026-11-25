import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { gatesApi, type AccessNowBucket, type AccessNowProperty } from '../api/gates'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'
import { linkClass } from '../components/buttonStyles'

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : '—')

interface Row {
  key: 'todayIn' | 'todayOut' | 'yesterday' | 'week' | 'overdue'
  label: string
  count: string
  names: string
}

// Static class names so Tailwind can see them: green = today, yellow = yesterday, orange = 2-7 days, red = older.
const ROWS: Row[] = [
  { key: 'todayIn', label: 'Entered today, still in', count: 'text-green-400 font-bold', names: 'text-green-200' },
  { key: 'todayOut', label: 'Entered today, has left', count: 'text-blue-200', names: 'text-blue-200' },
  { key: 'yesterday', label: 'Entered yesterday, not out', count: 'text-yellow-400 font-bold', names: 'text-yellow-200' },
  { key: 'week', label: 'In 2–7 days ago, not out', count: 'text-orange-400 font-bold', names: 'text-orange-200' },
  { key: 'overdue', label: 'In over 7 days ago, not out', count: 'text-red-500 font-bold', names: 'text-red-300' },
]

function People({ bucket, className }: { bucket: AccessNowBucket; className: string }) {
  if (bucket.people.length === 0) return null
  return (
    <ul className={`mt-1 text-xs space-y-0.5 ${className}`}>
      {bucket.people.map((p, i) => (
        <li key={`${p.userId}-${i}`}>
          {p.userName} · {p.gateName ?? 'Unknown gate'} · {formatDateTime(p.inAt)}
        </li>
      ))}
    </ul>
  )
}

/** Administrator report: per property, how many people are on site, by how long ago they went in without going out. */
export default function AccessNowPage() {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const [data, setData] = useState<AccessNowProperty[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoading(true)
    api
      .getAccessNowReport()
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [api, isAdmin])

  if (!isAdmin) {
    return <p className="text-sm text-blue-200">You do not have access to reports.</p>
  }

  return (
    <div className="space-y-6">
      <Link to="/home" className={`${linkClass} inline-flex items-center gap-1 text-sm`}>
        <ArrowLeft className="w-4" /> Home
      </Link>
      <h1 className="text-2xl font-semibold text-red-500">Access now</h1>
      <Alert message={error} onDismiss={clearError} />
      {loading && <Spinner label="Loading access now…" />}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((p) => (
          <section key={p.propertyId} className="bg-blue-900 rounded-2xl border border-blue-800 p-4 space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Building2 className="w-4 text-red-500" /> {p.propertyName}
            </h2>
            {ROWS.map((r) => (
              <div key={r.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-blue-200">{r.label}</span>
                  <span className={`text-2xl ${r.count}`}>{p[r.key].count}</span>
                </div>
                {r.key !== 'todayOut' && <People bucket={p[r.key]} className={r.names} />}
              </div>
            ))}
          </section>
        ))}
      </div>
      {!loading && data?.length === 0 && <p className="text-sm text-blue-200">No active properties.</p>}
    </div>
  )
}
