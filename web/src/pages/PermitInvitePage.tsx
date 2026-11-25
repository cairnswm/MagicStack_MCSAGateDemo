import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { permitsApi, type PermitInvite } from '../api/permits'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { linkClass, primaryButton, secondaryButton } from '../components/buttonStyles'

const STATUS_TEXT: Record<string, string> = {
  submitted: 'Your details have been submitted. You will be able to see the gate code once an administrator or the property owner approves your permit.',
  approved: 'Your permit is approved. Scan the gate QR code during the permit dates to see the gate code.',
  rejected: 'This permit application was rejected.',
  cancelled: 'This permit has been cancelled.',
}

/**
 * Target of a permit invite link. Visible before sign-in so the applicant sees which email to use; once signed in
 * (with that email) they complete their details, which sends the permit to be approved.
 */
export default function PermitInvitePage() {
  const { token: inviteToken = '' } = useParams()
  const { user, token, initializing } = useAuth()
  const api = useMemo(() => permitsApi(token), [token])
  const [invite, setInvite] = useState<PermitInvite | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let cancelled = false
    api
      .getInvite(inviteToken)
      .then((i) => !cancelled && setInvite(i))
      .catch((e: Error) => !cancelled && setLoadError(e.message))
    return () => {
      cancelled = true
    }
  }, [api, inviteToken])

  // Pre-fill the names from the signed-in account; the applicant adds their phone number.
  const accountFirst = user?.user.firstname ?? ''
  const accountLast = user?.user.lastname ?? ''
  useEffect(() => {
    setForm((f) => ({ ...f, firstName: f.firstName || accountFirst, lastName: f.lastName || accountLast }))
  }, [accountFirst, accountLast])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.submitInvite(inviteToken, form)
      setInvite((i) => (i ? { ...i, status: 'submitted' } : i))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <p className="text-center text-sm text-red-400">{loadError}</p>
  if (initializing || !invite) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="w-10 text-red-500 animate-spin" />
      </div>
    )
  }

  const next = encodeURIComponent(`/permit/${inviteToken}`)
  const email = encodeURIComponent(invite.email)

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-blue-900 rounded-2xl border border-blue-800 px-6 py-6 shadow-sm space-y-2 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-200">Permit application</p>
        <h1 className="text-2xl font-semibold text-red-500">{invite.propertyName ?? 'Property'}</h1>
        <p className="text-sm">
          Valid {invite.validFrom} to {invite.validTo}
        </p>
        <p className="text-sm text-blue-200">
          Register or sign in with <span className="font-medium text-white">{invite.email}</span>.
        </p>
      </div>

      {invite.status !== 'invited' ? (
        <p className="text-sm text-center text-blue-200">{STATUS_TEXT[invite.status]}</p>
      ) : !user ? (
        <div className="flex flex-col gap-3">
          <Link to={`/register?next=${next}&email=${email}`} className={`${primaryButton} w-full`}>Register</Link>
          <Link to={`/login?next=${next}`} className={`${secondaryButton} w-full`}>I already have an account</Link>
          <p className="text-xs text-center text-blue-200">
            <Link to="/forgot" className={linkClass}>Forgot password?</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 bg-blue-900 rounded-2xl border border-blue-800 p-4">
          <Alert message={error} onDismiss={clearError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={set('firstName')} />
            <Field label="Last name" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={set('lastName')} />
          </div>
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={set('phone')} />
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy && <Loader className="w-4 animate-spin" />} Submit for approval
          </button>
        </form>
      )}
    </div>
  )
}
