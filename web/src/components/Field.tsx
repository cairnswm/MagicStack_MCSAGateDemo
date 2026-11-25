import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export default function Field({ label, id, ...rest }: Props) {
  const inputId = id ?? rest.name
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wide text-blue-200 mb-1">
        {label}
      </label>
      <input
        id={inputId}
        {...rest}
        className="w-full rounded-lg border border-blue-800 bg-blue-950 px-3 py-2 text-sm text-white placeholder-blue-300/50 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
      />
    </div>
  )
}
