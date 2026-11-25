import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useReportScope } from '../hooks/useReportScope'
import { permitsApi, type Permit, type PermitStatus } from '../api/permits'
import Alert from '../components/Alert'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import { primaryButton, secondaryButton } from '../components/buttonStyles'

const inputClass =
  'w-full rounded-xl border border-blue-800 bg-blue-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500'
const labelClass = 'block text-xs font-medium uppercase tracking-wide text-blue-200 mb-1'

const STATUS_LABEL: Record<PermitStatus, string> = {
  invited: 'Waiting for applicant',
  submitted: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}
const STATUS_COLOUR: Record<PermitStatus, string> = {
  invited: 'text-blue-200',
  submitted: 'text-yellow-300',
  approved: 'text-green-400',
  rejected: 'text-red-400',
  cancelled: 'text-blue-300 line-through',
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Permits (administrators, and Property Owners for their own properties): invite a visitor to a property for a date
 * range, send them the link, then approve their application. The server enforces who may act on which property.
 */
export default function PermitsPage() {
  const { token, isAdmin, canViewReports } = useAuth()
  const api = useMemo(() => permitsApi(token), [token])
  const { properties, loading: propertiesLoading, error: scopeError } = useReportScope()
  const [items, setItems] = useState<Permit[] | null>(null)
  const [filter, setFilter] = useState<PermitStatus | ''>('')
  const [form, setForm] = useState({ propertyId: '', email: '', validFrom: today(), validTo: today() })
  const [created, setCreated] = useState<Permit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const clearMessage = useCallback(() => setMessage(null), [])

  const load = useCallback(() => {
    if (!canViewReports) return
    api.list(filter || undefined).then(setItems).catch((e: Error) => setError(e.message))
  }, [api, canViewReports, filter])
  useEffect(() => {
    load()
    return () => setItems(null) // invite links are private: dropped on leaving the page
  }, [load])

  if (!isAdmin && !canViewReports) {
    return <p className="text-sm text-blue-200">You do not have access to permits.</p>
  }

  const linkFor = (p: Permit) => `${window.location.origin}${p.linkPath}`

  const copy = async (p: Permit) => {
    try {
      await navigator.clipboard.writeText(linkFor(p))
      setMessage('Link copied')
    } catch {
      setError('Could not copy the link; select and copy it manually.')
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const permit = await api.create({ ...form, propertyId: Number(form.propertyId) })
      setCreated(permit)
      setForm((f) => ({ ...f, email: '' }))
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const act = async (action: 'approve' | 'reject' | 'cancel', p: Permit) => {
    try {
      await api[action](p.id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-red-500">Permits</h1>
      <Alert message={error ?? scopeError} onDismiss={clearError} />
      <Alert message={message} type="success" onDismiss={clearMessage} />

      <form onSubmit={create} className="grid sm:grid-cols-5 gap-3 items-end bg-blue-900 rounded-2xl border border-blue-800 p-4">
        <div>
          <label className={labelClass} htmlFor="permit-property">Property</label>
          <select
            id="permit-property"
            className={inputClass}
            required
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          >
            <option value="">{propertiesLoading ? 'Loading…' : 'Choose a property'}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <Field label="Applicant email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label="From" type="date" required min={today()} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value, validTo: form.validTo < e.target.value ? e.target.value : form.validTo })} />
        <Field label="To" type="date" required min={form.validFrom} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
        <button className={primaryButton} disabled={busy}>Create permit</button>
      </form>

      {created && (
        <div className="bg-blue-900 rounded-2xl border border-green-700 p-4 space-y-2 text-white">
          <p className="text-sm font-medium text-green-400">
            Permit {created.member_number} created for {created.email}. Send them this link:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-lg bg-blue-950 px-3 py-2 text-xs">{linkFor(created)}</code>
            <button className={secondaryButton} onClick={() => copy(created)}><Copy className="w-4" /> Copy</button>
            <button className={secondaryButton} onClick={() => setCreated(null)}>Done</button>
          </div>
        </div>
      )}

      <div className="max-w-xs">
        <label className={labelClass} htmlFor="permit-filter">Show</label>
        <select id="permit-filter" className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value as PermitStatus | '')}>
          <option value="">All permits</option>
          {(Object.keys(STATUS_LABEL) as PermitStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {items === null ? (
        <Spinner />
      ) : (
        <ul className="space-y-2">
          {items.map((p) => {
            const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 rounded-xl border border-blue-800 px-4 py-3 text-white">
                <div>
                  <div className="font-medium">
                    {p.member_number} · {name || p.email} · {p.property_name ?? 'Unknown property'}
                  </div>
                  <div className="text-xs text-blue-200">
                    {p.valid_from} to {p.valid_to} · {p.email}{p.phone ? ` · ${p.phone}` : ''} ·{' '}
                    <span className={STATUS_COLOUR[p.status]}>{STATUS_LABEL[p.status]}</span>
                    {p.decided_by_name ? ` by ${p.decided_by_name}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === 'invited' && (
                    <button className={secondaryButton} onClick={() => copy(p)}><Copy className="w-4" /> Copy link</button>
                  )}
                  {p.status === 'submitted' && (
                    <button className={primaryButton} onClick={() => act('approve', p)}><Check className="w-4" /> Approve</button>
                  )}
                  {(p.status === 'invited' || p.status === 'submitted') && (
                    <button className={secondaryButton} onClick={() => act('reject', p)}>Reject</button>
                  )}
                  {(p.status === 'invited' || p.status === 'submitted' || p.status === 'approved') && (
                    <button className={secondaryButton} onClick={() => act('cancel', p)}><X className="w-4" /> Cancel</button>
                  )}
                </div>
              </li>
            )
          })}
          {items.length === 0 && <li className="text-sm text-blue-200">No permits yet.</li>}
        </ul>
      )}
    </div>
  )
}
