import { APP_NAME } from '../api/client'

export default function Footer() {
  return (
    <footer className="border-t border-blue-800 bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-blue-200">
        © {new Date().getFullYear()} {APP_NAME}
      </div>
    </footer>
  )
}
