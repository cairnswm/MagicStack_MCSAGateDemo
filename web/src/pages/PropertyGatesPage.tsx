import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { gatesApi, type Gate } from '../api/gates'
import { useData } from '../context/DataContext'
import Alert from '../components/Alert'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import GateControllersPanel from '../components/GateControllersPanel'
import AccessLinkPanel from '../components/AccessLinkPanel'
import { primaryButton, secondaryButton, linkClass } from '../components/buttonStyles'

interface Form {
  name: string
  latitude: string
  longitude: string
  code: string
}
const EMPTY: Form = { name: '', latitude: '', longitude: '', code: '' }

export default function PropertyGatesPage() {
  const propertyId = Number(useParams().id)
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const { properties, gatesFor, gatesLoading, loadGates } = useData()
  const property = properties.find((p) => p.id === propertyId) ?? null
  const [showInactive, setShowInactive] = useState(false)
  const allGates = gatesFor(propertyId)
  const gates = useMemo(() => allGates.filter((g) => showInactive || g.active), [allGates, showInactive])
  const loading = gatesLoading(propertyId)
  const [form, setForm] = useState<Form>(EMPTY)
  const [editing, setEditing] = useState<Gate | null>(null)
  const [controllersFor, setControllersFor] = useState<Gate | null>(null)
  const [accessFor, setAccessFor] = useState<Gate | null>(null)
  const [codeFor, setCodeFor] = useState<Gate | null>(null)
  const [newCode, setNewCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const clearNotice = useCallback(() => setNotice(null), [])
  const reportError = useCallback((m: string) => setError(m), [])
  const reportNotice = useCallback((m: string) => setNotice(m), [])

  // Gates load only when this page is opened. Always refetched so gate codes are never stale.
  const load = useCallback(() => {
    loadGates(propertyId).catch((e: Error) => setError(e.message))
  }, [loadGates, propertyId])
  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return <p className="text-sm text-blue-200">You do not have access to gate administration.</p>
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const coord = (v: string) => (v.trim() === '' ? null : Number(v))

  const saveGate = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = { name: form.name, latitude: coord(form.latitude), longitude: coord(form.longitude), code: form.code || null }
    try {
      if (editing) await api.updateGate(editing.id, body)
      else await api.createGate({ ...body, propertyId })
      setForm(EMPTY)
      setEditing(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

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

  const toggleActive = async (g: Gate) => {
    try {
      await api.updateGate(g.id, { active: !g.active })
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const edit = (g: Gate) => {
    setEditing(g)
    setForm({ name: g.name, latitude: g.latitude?.toString() ?? '', longitude: g.longitude?.toString() ?? '', code: g.code ?? '' })
  }

  return (
    <div className="space-y-6">
      <Link to="/properties" className={`${linkClass} inline-flex items-center gap-1 text-sm`}>
        <ArrowLeft className="w-4" /> Properties
      </Link>
      <h1 className="text-2xl font-semibold text-red-500">{property?.name ?? 'Property'} gates</h1>
      <Alert message={error} onDismiss={clearError} />
      <Alert message={notice} type="success" onDismiss={clearNotice} />

      {isAdmin && (
        <form onSubmit={saveGate} className="grid sm:grid-cols-5 gap-3 items-end bg-blue-900 rounded-2xl border border-blue-800 p-4">
          <Field label="Gate name" value={form.name} required onChange={set('name')} />
          <Field label="Latitude" value={form.latitude} onChange={set('latitude')} inputMode="decimal" />
          <Field label="Longitude" value={form.longitude} onChange={set('longitude')} inputMode="decimal" />
          <Field label="Code" value={form.code} onChange={set('code')} />
          <div className="flex gap-2">
            <button className={primaryButton}>{editing ? 'Save' : 'Add gate'}</button>
            {editing && (
              <button type="button" className={secondaryButton} onClick={() => { setEditing(null); setForm(EMPTY) }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {codeFor && (
        <form onSubmit={saveCode} className="flex items-end gap-3 max-w-xl bg-blue-900 rounded-2xl border border-blue-800 p-4">
          <div className="flex-1">
            <Field label={`New code for ${codeFor.name}`} value={newCode} required onChange={(e) => setNewCode(e.target.value)} />
          </div>
          <button className={primaryButton}>Update code</button>
          <button type="button" className={secondaryButton} onClick={() => setCodeFor(null)}>Cancel</button>
        </form>
      )}

      {controllersFor && (
        <GateControllersPanel
          api={api}
          gateId={controllersFor.id}
          gateName={controllersFor.name}
          onClose={() => setControllersFor(null)}
          onError={reportError}
        />
      )}

      {accessFor && (
        <AccessLinkPanel
          api={api}
          gateId={accessFor.id}
          gateName={accessFor.name}
          onClose={() => setAccessFor(null)}
          onError={reportError}
          onNotice={reportNotice}
        />
      )}

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-blue-200">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      )}

      {loading && <Spinner label="Loading gates…" />}
      <ul className="space-y-2">
        {gates.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 rounded-xl border border-blue-800 px-4 py-3 text-white">
            <div>
              <div className={g.active ? 'font-medium' : 'font-medium line-through opacity-60'}>{g.name}</div>
              <div className="text-xs text-blue-200">
                {g.latitude != null && g.longitude != null ? `${g.latitude}, ${g.longitude}` : 'No location'} · Code:{' '}
                <span className="font-mono">{g.code ?? '—'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {g.active === 1 && (
                <button className={secondaryButton} onClick={() => { setCodeFor(g); setNewCode('') }}>
                  <KeyRound className="w-4" /> Change code
                </button>
              )}
              <button className={secondaryButton} onClick={() => setControllersFor(g)}>Controllers</button>
              <button className={secondaryButton} onClick={() => setAccessFor(g)}>QR link</button>
              {isAdmin && <button className={secondaryButton} onClick={() => edit(g)}>Edit</button>}
              {isAdmin && (
                <button className={secondaryButton} onClick={() => toggleActive(g)}>
                  {g.active ? 'Deactivate' : 'Reactivate'}
                </button>
              )}
            </div>
          </li>
        ))}
        {!loading && gates.length === 0 && <li className="text-sm text-blue-200">No gates for this property.</li>}
      </ul>
    </div>
  )
}
