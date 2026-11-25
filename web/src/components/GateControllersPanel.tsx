import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { gatesApi, GateController, Member } from '../api/gates'
import { primaryButton, secondaryButton } from './buttonStyles'

interface Props {
  api: ReturnType<typeof gatesApi>
  gateId: number
  gateName: string
  onClose: () => void
  onError: (message: string) => void
}

const label = (m: { member_number: string; first_name: string | null; last_name: string | null; email: string }) =>
  `${m.member_number} · ${[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email}`

/** Admin panel: link members to a gate so they can see and change its code as a Gate Controller. */
export default function GateControllersPanel({ api, gateId, gateName, onClose, onError }: Props) {
  const [linked, setLinked] = useState<GateController[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [pick, setPick] = useState('')

  const load = useCallback(() => {
    api.listGateControllers(gateId).then(setLinked).catch((e: Error) => onError(e.message))
  }, [api, gateId, onError])
  useEffect(load, [load])
  useEffect(() => {
    api.listMembers(false).then(setMembers).catch((e: Error) => onError(e.message))
  }, [api, onError])

  const available = members.filter((m) => !linked.some((l) => l.member_id === m.id))

  const link = async () => {
    if (!pick) return
    try {
      setLinked(await api.linkGateController(gateId, Number(pick)))
      setPick('')
    } catch (err) {
      onError((err as Error).message)
    }
  }

  const unlink = async (id: number) => {
    try {
      setLinked(await api.unlinkGateController(id))
    } catch (err) {
      onError((err as Error).message)
    }
  }

  return (
    <div className="space-y-3 bg-blue-900 rounded-2xl border border-blue-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-white">Gate controllers for {gateName}</h2>
        <button className={secondaryButton} onClick={onClose}>Close</button>
      </div>
      <ul className="space-y-1">
        {linked.map((l) => (
          <li key={l.id} className="flex items-center justify-between text-sm text-white">
            {label(l)}
            <button aria-label="Remove" className="text-red-400 hover:text-red-300" onClick={() => unlink(l.id)}>
              <X className="w-4" />
            </button>
          </li>
        ))}
        {linked.length === 0 && <li className="text-sm text-blue-200">No one is linked to this gate yet.</li>}
      </ul>
      <div className="flex gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="flex-1 rounded-lg border border-blue-800 bg-blue-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        >
          <option value="">Select a member…</option>
          {available.map((m) => (
            <option key={m.id} value={m.id}>{label(m)}</option>
          ))}
        </select>
        <button className={primaryButton} disabled={!pick} onClick={link}>Link</button>
      </div>
    </div>
  )
}
