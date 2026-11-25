import { Loader2 } from 'lucide-react'

interface Props {
  label?: string
}

/** Inline loading indicator. Render it only while a request is in flight. */
export default function Spinner({ label = 'Loading…' }: Props) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-blue-200 py-2">
      <Loader2 className="w-5 h-5 animate-spin text-red-500" />
      <span>{label}</span>
    </div>
  )
}
