import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { gatesApi, type UsageDay, type UsageReport } from '../api/gates'
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
// Dates are plain YYYY-MM-DD strings; parse at noon so time zones cannot shift the day.
const parse = (date: string) => new Date(`${date}T12:00:00`)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const inputClass =
  'w-full rounded-xl border border-blue-800 bg-blue-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500'
const labelClass = 'block text-xs text-blue-200 mb-1'

/** Group the report's days by month, with the blank cells needed to start each month on its weekday (Monday first). */
function groupByMonth(days: UsageDay[]) {
  const months: { key: string; title: string; lead: number; days: UsageDay[] }[] = []
  for (const day of days) {
    const key = day.date.slice(0, 7)
    let month = months.find((m) => m.key === key)
    if (!month) {
      const d = parse(day.date)
      month = {
        key,
        title: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        lead: (d.getDay() + 6) % 7,
        days: [],
      }
      months.push(month)
    }
    month.days.push(day)
  }
  return months
}

/** Administrator report: how many people were on site each day, and how many stayed overnight. */
export default function UsageReportPage() {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const { properties, propertiesLoading } = useData()
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(localDate(new Date()))
  const [report, setReport] = useState<UsageReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  const activeProperties = useMemo(() => properties.filter((p) => p.active), [properties])

  const load = useCallback(
    async (f: string, t: string, p: number | null) => {
      setLoading(true)
      setReport(null)
      try {
        setReport(await api.getUsageReport(f, t, p))
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [api],
  )

  // Show the last 30 days for all properties as soon as the page opens.
  useEffect(() => {
    if (isAdmin) void load(daysAgo(29), localDate(new Date()), null)
  }, [isAdmin, load])

  const months = useMemo(() => (report ? groupByMonth(report.days) : []), [report])

  if (!isAdmin) {
    return <p className="text-sm text-blue-200">You do not have access to reports.</p>
  }

  const run = (e: React.FormEvent) => {
    e.preventDefault()
    void load(from, to, propertyId)
  }

  return (
    <div className="space-y-6">
      <Link to="/home" className={`${linkClass} inline-flex items-center gap-1 text-sm`}>
        <ArrowLeft className="w-4" /> Home
      </Link>
      <h1 className="text-2xl font-semibold text-red-500">Usage report</h1>
      <Alert message={error} onDismiss={clearError} />

      <form onSubmit={run} className="grid sm:grid-cols-4 gap-3 items-end bg-blue-900 rounded-2xl border border-blue-800 p-4">
        <div>
          <label className={labelClass} htmlFor="use-property">Property</label>
          <select
            id="use-property"
            className={inputClass}
            value={propertyId ?? ''}
            onChange={(e) => setPropertyId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{propertiesLoading ? 'Loading…' : 'All properties'}</option>
            {activeProperties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="use-from">From</label>
          <input id="use-from" type="date" className={inputClass} required value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="use-to">To</label>
          <input id="use-to" type="date" className={inputClass} required value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className={primaryButton} disabled={loading}>Run report</button>
      </form>

      {loading && <Spinner label="Loading usage…" />}
      {report && (
        <section className="space-y-6">
          <p className="text-xs text-blue-200">
            Each day shows the people on site that day. Overnight is people whose out scan is on a later date, or who have not signed out.
          </p>
          {months.map((m) => {
            const trail = (7 - ((m.lead + m.days.length) % 7)) % 7
            const blank = (key: string) => <div key={key} className="hidden sm:block aspect-square border-r border-b border-blue-800 bg-blue-950/60" />
            return (
              <div key={m.key} className="space-y-2">
                <h2 className="text-lg font-semibold text-white">{m.title}</h2>
                <div className="flex flex-col sm:grid sm:grid-cols-7 rounded-2xl border-l border-t border-blue-800 overflow-hidden">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="hidden sm:block border-r border-b border-blue-800 bg-blue-900 py-1 text-center text-xs font-semibold text-blue-200">{w}</div>
                  ))}
                  {Array.from({ length: m.lead }, (_, i) => blank(`lead-${i}`))}
                  {m.days.map((d) => {
                    const isToday = d.date === localDate(new Date())
                    return (
                      <div
                        key={d.date}
                        className={`flex items-center justify-between gap-3 px-4 py-3 sm:block sm:aspect-square sm:overflow-hidden sm:p-2 border-r border-b border-blue-800 text-white ${
                          d.count > 0 ? 'bg-blue-900' : 'bg-blue-950'
                        }`}
                        title={`${parse(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}: ${d.count} on site, ${d.overnight} overnight`}
                      >
                        <div className={`text-sm sm:text-xs font-semibold ${isToday ? 'inline-block rounded-full bg-red-500 px-1.5 text-white' : 'text-blue-200'}`}>
                          <span className="sm:hidden">{parse(d.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className="hidden sm:inline">{parse(d.date).getDate()}</span>
                        </div>
                        {d.count > 0 && (
                          <div className="space-y-0.5 text-right sm:text-left sm:mt-1 text-xs leading-tight">
                            <div className="font-bold">{d.count} day {d.count === 1 ? 'visitor' : 'visitors'}</div>
                            {d.overnight > 0 && <div className="text-orange-300">{d.overnight} overnight</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {Array.from({ length: trail }, (_, i) => blank(`trail-${i}`))}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
