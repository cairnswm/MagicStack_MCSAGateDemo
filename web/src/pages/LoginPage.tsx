import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { safeNext } from '../utils/safeNext'
import { Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { linkClass, primaryButton } from '../components/buttonStyles'

export default function LoginPage() {
  const { login, sessionError, clearSessionError } = useAuth()
  const navigate = useNavigate()
  const next = safeNext(useSearchParams()[0].get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
      navigate(next ?? '/home', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Login">
      <div className="space-y-4">
        <Alert message={sessionError} onDismiss={clearSessionError} />
        <Alert message={error} onDismiss={() => setError(null)} />
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy && <Loader className="w-4 animate-spin" />} Login
          </button>
        </form>
        <div className="flex justify-between text-sm">
          <Link to="/forgot" className={linkClass}>Forgot password?</Link>
          <Link to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className={linkClass}>Create an account</Link>
        </div>
      </div>
    </AuthCard>
  )
}
