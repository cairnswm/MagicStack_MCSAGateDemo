import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function Header() {
  const { user, logout, isAdmin, canViewReports } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const fullName = user ? `${user.user.firstname} ${user.user.lastname}` : ''

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <header className="border-b border-blue-800 bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo to="/home" />
          {isAdmin && (
            <Link to="/properties" className="text-sm font-medium text-white hover:text-red-400 transition-colors">
              Properties
            </Link>
          )}
          {isAdmin && (
            <Link to="/members" className="text-sm font-medium text-white hover:text-red-400 transition-colors">
              Members
            </Link>
          )}
          {canViewReports && (
            <Link to="/permits" className="text-sm font-medium text-white hover:text-red-400 transition-colors">
              Permits
            </Link>
          )}
        </div>
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-800 transition-colors"
          >
            <User className="w-4 text-red-500" />
            {fullName}
            <ChevronDown className="w-4 text-red-500" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-blue-900 text-white rounded-xl border border-blue-800 shadow-lg animate-slide-down overflow-hidden z-10">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-blue-800 transition-colors"
              >
                <User className="w-4 text-red-500" /> Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-blue-800 transition-colors"
              >
                <LogOut className="w-4 text-red-500" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
