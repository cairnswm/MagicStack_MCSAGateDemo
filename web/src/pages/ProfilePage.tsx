import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import { gatesApi, type Member } from '../api/gates'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { primaryButton, secondaryButton } from '../components/buttonStyles'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-blue-200">{label}</dt>
      <dd className="mt-1 text-sm text-white sm:col-span-2 sm:mt-0">{value || '—'}</dd>
    </div>
  )
}

export default function ProfilePage() {
  const { user, token } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const [member, setMember] = useState<Member | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const clearNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    api
      .getMyMember()
      .then(setMember)
      .catch((e: Error) => {
        if (!(e instanceof ApiError && e.status === 404)) setError(e.message)
      })
      .finally(() => setLoaded(true))
  }, [api])

  if (!user) return null
  const u = user.user
  const roles = user.roles.map((r) => r.name).join(', ')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setMember(await api.updateMyPhone(phone))
      setEditing(false)
      setNotice('Phone number updated')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold text-red-500">Profile</h1>
      <Alert message={error} onDismiss={clearError} />
      <Alert message={notice} type="success" onDismiss={clearNotice} />
      {member ? (
        <dl className="bg-blue-900 rounded-2xl border border-blue-800 shadow-sm divide-y divide-blue-800">
          <Row label="Member number" value={member.member_number} />
          <Row label="First name" value={member.first_name ?? u.firstname} />
          <Row label="Last name" value={member.last_name ?? u.lastname} />
          <Row label="Email" value={member.email} />
          {editing ? (
            <form onSubmit={save} className="flex items-end gap-3 px-4 py-3">
              <div className="flex-1">
                <Field label="Phone" type="tel" value={phone} required onChange={(e) => setPhone(e.target.value)} />
              </div>
              <button className={primaryButton}>Save</button>
              <button type="button" className={secondaryButton} onClick={() => setEditing(false)}>Cancel</button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="sm:grid sm:grid-cols-3 sm:gap-4 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-blue-200">Phone</dt>
                <dd className="mt-1 text-sm text-white sm:col-span-2 sm:mt-0">{member.phone || '—'}</dd>
              </div>
              <button className={secondaryButton} onClick={() => { setPhone(member.phone); setEditing(true) }}>
                Change
              </button>
            </div>
          )}
          <Row label="Roles" value={roles} />
        </dl>
      ) : (
        loaded && (
          <>
            <p className="text-sm text-blue-200">No member record is linked to your account yet.</p>
            <dl className="bg-blue-900 rounded-2xl border border-blue-800 shadow-sm divide-y divide-blue-800">
              <Row label="First name" value={u.firstname} />
              <Row label="Last name" value={u.lastname} />
              <Row label="Email" value={u.email} />
              <Row label="Roles" value={roles} />
            </dl>
          </>
        )
      )}
    </div>
  )
}
