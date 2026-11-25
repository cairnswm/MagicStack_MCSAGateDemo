import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { safeNext } from '../utils/safeNext'
import { Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-10 text-red-500 animate-spin" />
    </div>
  )
}

/** Requires an authenticated user; an invalid token goes to Login (with error), otherwise Landing. */
export function ProtectedRoute() {
  const { user, initializing, sessionError } = useAuth()
  if (initializing) return <Spinner />
  if (!user) return <Navigate to={sessionError ? '/login' : '/'} replace />
  return <Outlet />
}

/** Public-only routes: authenticated users go straight to Home. */
export function PublicRoute() {
  const { user, initializing } = useAuth()
  const [params] = useSearchParams()
  if (initializing) return <Spinner />
  if (user) return <Navigate to={safeNext(params.get('next')) ?? '/home'} replace />
  return <Outlet />
}
