import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { forgotPassword } from '../api/auth'
import AuthCard from '../components/AuthCard'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { linkClass, primaryButton } from '../components/buttonStyles'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await forgotPassword(email)
      setMessage(res.message)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Forgot password">
      <div className="space-y-4">
        <Alert message={error} onDismiss={() => setError(null)} />
        {/* The confirmation stays visible (not auto-dismissed) so the user can read it. */}
        {message && (
          <p className="rounded-xl border border-green-800 bg-green-900/20 px-4 py-3 text-sm text-green-400">
            {message}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy && <Loader className="w-4 animate-spin" />} Send reset link
          </button>
        </form>
        <div className="flex justify-between text-sm">
          <Link to="/login" className={linkClass}>Back to login</Link>
          <Link to="/register" className={linkClass}>Create an account</Link>
        </div>
      </div>
    </AuthCard>
  )
}
