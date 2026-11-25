import { Link } from 'react-router-dom'
import { DoorClosed } from 'lucide-react'
import { APP_NAME } from '../api/client'

export default function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors">
      <DoorClosed className="w-6" />
      <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
    </Link>
  )
}
