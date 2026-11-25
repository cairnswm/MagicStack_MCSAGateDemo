import { Link } from 'react-router-dom'
import { KeyRound, QrCode, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import landing from '../config/landing.json'
import Logo from '../components/Logo'
import Footer from '../components/Footer'
import { primaryButton, secondaryButton } from '../components/buttonStyles'

interface Cta {
  label: string
  to: string
}
interface Item {
  icon?: string
  title: string
  text: string
}
interface Section {
  type: string
  title: string
  subtitle?: string
  text?: string
  items?: Item[]
  primaryCta?: Cta
  secondaryCta?: Cta
}

const icons: Record<string, LucideIcon> = { QrCode, KeyRound, Users, ShieldCheck }

function Ctas({ section }: { section: Section }) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
      {section.primaryCta && (
        <Link to={section.primaryCta.to} className={primaryButton}>
          {section.primaryCta.label}
        </Link>
      )}
      {section.secondaryCta && (
        <Link to={section.secondaryCta.to} className={secondaryButton}>
          {section.secondaryCta.label}
        </Link>
      )}
    </div>
  )
}

function SectionView({ section }: { section: Section }) {
  switch (section.type) {
    case 'hero':
      return (
        <section className="px-4 py-16 sm:py-24 text-center max-w-3xl mx-auto animate-fade-in">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-red-500">{section.title}</h1>
          <p className="mt-6 text-base sm:text-xl text-white">{section.subtitle}</p>
          <Ctas section={section} />
        </section>
      )
    case 'benefits':
      return (
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-red-500 text-center mb-8">{section.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {section.items?.map((item) => {
              const Icon = icons[item.icon ?? ''] ?? ShieldCheck
              return (
                <div
                  key={item.title}
                  className="bg-blue-900 rounded-2xl border border-blue-800 px-4 py-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <Icon className="w-6 text-red-500 mb-3" />
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-blue-200">{item.text}</p>
                </div>
              )
            })}
          </div>
        </section>
      )
    case 'steps':
      return (
        <section className="px-4 sm:px-6 lg:px-8 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-red-500 text-center mb-8">{section.title}</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {section.items?.map((item, i) => (
              <li key={item.title} className="bg-blue-900 rounded-2xl border border-blue-800 px-4 py-6">
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-blue-200">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )
    case 'cta':
      return (
        <section className="px-4 py-16 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-red-500">{section.title}</h2>
          <p className="mt-2 text-white">{section.text}</p>
          <Ctas section={section} />
        </section>
      )
    default:
      return null
  }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-blue-800 bg-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex gap-2">
            <Link to="/login" className="px-2.5 py-1.5 text-sm font-medium text-red-400 hover:text-red-300">
              Login
            </Link>
            <Link to="/register" className="px-2.5 py-1.5 text-sm font-medium text-red-400 hover:text-red-300">
              Register
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {(landing.sections as Section[]).map((s, i) => (
          <SectionView key={i} section={s} />
        ))}
      </main>
      <Footer />
    </div>
  )
}
