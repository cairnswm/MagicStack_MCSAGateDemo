import type { ReactNode } from 'react'
import Logo from './Logo'

export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md bg-blue-900 rounded-2xl border border-blue-800 shadow-sm px-4 py-6 sm:px-8 animate-slide-up">
        <h1 className="text-2xl font-semibold text-red-500 mb-6">{title}</h1>
        {children}
      </div>
    </div>
  )
}
