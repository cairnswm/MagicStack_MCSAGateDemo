import { useEffect } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  message: string | null
  type?: 'error' | 'success'
  onDismiss: () => void
}

/** Shows a message and auto-dismisses after 3 seconds. */
export default function Alert({ message, type = 'error', onDismiss }: Props) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null
  const styles =
    type === 'error'
      ? 'text-red-400 bg-red-900/20 border-red-800'
      : 'text-green-400 bg-green-900/20 border-green-800'
  const Icon = type === 'error' ? AlertCircle : CheckCircle2
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in ${styles}`}
    >
      <Icon className="mt-0.5 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
