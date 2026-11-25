import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { checkResetCode, resetPassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { linkClass, primaryButton } from '../components/buttonStyles'

type Status = 'checking' | 'valid' | 'invalid'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const { applyAuth } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>(code ? 'checking' : 'invalid')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!code) return
    let cancelled = false
    checkResetCode(code)
      .then((r) => !cancelled && setStatus(r.used === 0 ? 'valid' : 'invalid'))
      .catch(() => !cancelled && setStatus('invalid'))
    return () => {
      cancelled = true
    }
  }, [code])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code || status !== 'valid') return
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      const res = await resetPassword(code, password)
      // The code is single-use: block any further submission before navigating.
      setStatus('invalid')
      applyAuth(res)
      navigate('/home', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Reset password">
      <div className="space-y-4">
        <Alert message={error} onDismiss={() => setError(null)} />
        {status === 'checking' && (
          <div className="flex justify-center py-4">
            <Loader className="w-6 text-red-500 animate-spin" />
          </div>
        )}
        {status === 'invalid' && (
          <>
            <p className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              This reset link is invalid, has expired or has already been used.
            </p>
            <Link to="/forgot" className={`${linkClass} text-sm`}>Request a new link</Link>
          </>
        )}
        {status === 'valid' && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
              {busy && <Loader className="w-4 animate-spin" />} Reset password
            </button>
          </form>
        )}
      </div>
    </AuthCard>
  )
}
