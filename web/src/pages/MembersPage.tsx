import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { gatesApi, type Member } from '../api/gates'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { primaryButton, secondaryButton } from '../components/buttonStyles'

interface Form {
  memberNumber: string
  email: string
  phone: string
}
const EMPTY: Form = { memberNumber: '', email: '', phone: '' }

export default function MembersPage() {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const [items, setItems] = useState<Member[]>([])
  const [form, setForm] = useState<Form>(EMPTY)
  const [editing, setEditing] = useState<Member | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  // Member data is private: fetched only for administrators, only while this page is open, and dropped on leaving.
  const load = useCallback(() => {
    if (!isAdmin) return
    api.listMembers(showInactive).then(setItems).catch((e: Error) => setError(e.message))
  }, [api, isAdmin, showInactive])
  useEffect(() => {
    load()
    return () => setItems([])
  }, [load])

  if (!isAdmin) {
    return <p className="text-sm text-blue-200">You do not have access to member administration.</p>
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) await api.updateMember(editing.id, form)
      else await api.createMember(form)
      setForm(EMPTY)
      setEditing(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const toggleActive = async (m: Member) => {
    try {
      await api.updateMember(m.id, { active: !m.active })
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const edit = (m: Member) => {
    setEditing(m)
    setForm({ memberNumber: m.member_number, email: m.email, phone: m.phone })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-red-500">Members</h1>
      <Alert message={error} onDismiss={clearError} />

      <form onSubmit={save} className="grid sm:grid-cols-4 gap-3 items-end bg-blue-900 rounded-2xl border border-blue-800 p-4">
        <Field label="Member number" value={form.memberNumber} required onChange={set('memberNumber')} />
        <Field label="Email" type="email" value={form.email} required onChange={set('email')} />
        <Field label="Phone" type="tel" value={form.phone} required onChange={set('phone')} />
        <div className="flex gap-2">
          <button className={primaryButton}>{editing ? 'Save' : 'Add member'}</button>
          {editing && (
            <button type="button" className={secondaryButton} onClick={() => { setEditing(null); setForm(EMPTY) }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <label className="flex items-center gap-2 text-sm text-blue-200">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Show inactive
      </label>

      <ul className="space-y-2">
        {items.map((m) => {
          const name = [m.first_name, m.last_name].filter(Boolean).join(' ')
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 rounded-xl border border-blue-800 px-4 py-3 text-white">
              <div>
                <div className={m.active ? 'font-medium' : 'font-medium line-through opacity-60'}>
                  {m.member_number} · {name || 'Not signed in yet'}
                  {m.member_type === 'permit' && (
                    <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Permit</span>
                  )}
                </div>
                <div className="text-xs text-blue-200">{m.email} · {m.phone}</div>
              </div>
              <div className="flex gap-2">
                <button className={secondaryButton} onClick={() => edit(m)}>Edit</button>
                <button className={secondaryButton} onClick={() => toggleActive(m)}>
                  {m.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </li>
          )
        })}
        {items.length === 0 && <li className="text-sm text-blue-200">No members yet.</li>}
      </ul>
    </div>
  )
}
