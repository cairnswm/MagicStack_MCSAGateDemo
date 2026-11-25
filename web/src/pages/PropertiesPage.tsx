import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronRight, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { gatesApi, type Property } from '../api/gates'
import { useData } from '../context/DataContext'
import Alert from '../components/Alert'
import Field from '../components/Field'
import Spinner from '../components/Spinner'
import { primaryButton, secondaryButton, linkClass } from '../components/buttonStyles'

export default function PropertiesPage() {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const { properties, propertiesLoading: loading, propertiesError, refreshProperties: load } = useData()
  const [showInactive, setShowInactive] = useState(false)
  const items = useMemo(() => properties.filter((p) => showInactive || p.active), [properties, showInactive])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Property | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    if (propertiesError) setError(propertiesError)
  }, [propertiesError])

  if (!isAdmin) {
    return <p className="text-sm text-blue-200">You do not have access to property administration.</p>
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) await api.updateProperty(editing.id, { name })
      else await api.createProperty(name)
      setName('')
      setEditing(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const toggleActive = async (p: Property) => {
    try {
      await api.updateProperty(p.id, { active: !p.active })
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-red-500">Properties</h1>
        {isAdmin && (
          <Link to="/audit" className={`${linkClass} inline-flex items-center gap-1 text-sm`}>
            <History className="w-4" /> Gate code audit
          </Link>
        )}
      </div>
      <Alert message={error} onDismiss={clearError} />

      {isAdmin && (
        <form onSubmit={save} className="flex items-end gap-3 max-w-xl">
          <div className="flex-1">
            <Field label={editing ? 'Rename property' : 'New property'} value={name} required
              onChange={(e) => setName(e.target.value)} />
          </div>
          <button className={primaryButton}>{editing ? 'Save' : 'Add'}</button>
          {editing && (
            <button type="button" className={secondaryButton} onClick={() => { setEditing(null); setName('') }}>
              Cancel
            </button>
          )}
        </form>
      )}

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-blue-200">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      )}

      {loading && <Spinner label="Loading properties…" />}
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="flex items-center justify-between bg-blue-900 rounded-xl border border-blue-800 px-4 py-3">
            <Link to={`/properties/${p.id}`} className="flex items-center gap-2 text-white flex-1">
              <Building2 className="w-4 text-red-500" />
              <span className={p.active ? '' : 'line-through opacity-60'}>{p.name}</span>
              <ChevronRight className="w-4 text-blue-300" />
            </Link>
            {isAdmin && (
              <div className="flex gap-2">
                <button className={secondaryButton} onClick={() => { setEditing(p); setName(p.name) }}>Rename</button>
                <button className={secondaryButton} onClick={() => toggleActive(p)}>
                  {p.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            )}
          </li>
        ))}
        {!loading && items.length === 0 && <li className="text-sm text-blue-200">No properties yet.</li>}
      </ul>
    </div>
  )
}
