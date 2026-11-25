import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { gatesApi, type AuditEntry } from '../api/gates'
import { linkClass } from '../components/buttonStyles'

const ACTIONS = { create: 'Code set on creation', update: 'Code changed', clear: 'Code cleared', regenerate: 'QR access link regenerated' }

export default function GateAuditPage() {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    api.listAudit().then(setRows).catch((e: Error) => setError(e.message))
  }, [api, isAdmin])

  if (!isAdmin) return <p className="text-sm text-blue-200">Only administrators can view the audit.</p>

  return (
    <div className="space-y-6">
      <Link to="/properties" className={`${linkClass} inline-flex items-center gap-1 text-sm`}>
        <ArrowLeft className="w-4" /> Properties
      </Link>
      <h1 className="text-2xl font-semibold text-red-500">Gate code audit</h1>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto bg-blue-900 rounded-2xl border border-blue-800">
        <table className="w-full text-sm text-white">
          <thead className="text-left text-xs uppercase text-blue-200">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Gate</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-blue-800">
                <td className="px-4 py-2">{new Date(r.changed_at).toLocaleString()}</td>
                <td className="px-4 py-2">{r.gate_name}</td>
                <td className="px-4 py-2">{ACTIONS[r.action]}</td>
                <td className="px-4 py-2">{r.changed_by_name} <span className="text-blue-300">({r.changed_by_role})</span></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-4 text-blue-200">No gate code changes recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
