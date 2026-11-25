import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { safeNext } from '../utils/safeNext'
import { Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'
import Alert from '../components/Alert'
import Field from '../components/Field'
import { linkClass, primaryButton } from '../components/buttonStyles'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const next = safeNext(useSearchParams()[0].get('next'))
  const [form, setForm] = useState({ firstname: '', lastname: '', username: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await register(form)
      navigate(next ?? '/home', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Register">
      <div className="space-y-4">
        <Alert message={error} onDismiss={() => setError(null)} />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstname" autoComplete="given-name" required value={form.firstname} onChange={set('firstname')} />
            <Field label="Last name" name="lastname" autoComplete="family-name" required value={form.lastname} onChange={set('lastname')} />
          </div>
          <Field label="Username" name="username" autoComplete="username" required value={form.username} onChange={set('username')} />
          <Field label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
          <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy && <Loader className="w-4 animate-spin" />} Register
          </button>
        </form>
        <div className="flex justify-between text-sm">
          <Link to="/forgot" className={linkClass}>Forgot password?</Link>
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className={linkClass}>Already have an account?</Link>
        </div>
      </div>
    </AuthCard>
  )
}
