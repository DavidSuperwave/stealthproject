'use client'

import Link from 'next/link'
import { CreditCard, Plus, Settings, Shield, User, Wand2 } from 'lucide-react'

interface AppTopbarProps {
  credits: number
  isAdmin?: boolean
  userEmail?: string | null
  onOpenJobs: () => void
}

export default function AppTopbar({ credits, isAdmin = false, userEmail, onOpenJobs }: AppTopbarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-border bg-bg-secondary/95 backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-5">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-text-primary">Doble Labs</p>
        </div>

        <Link
          href="/app/content/new"
          className="ml-auto hidden items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover md:inline-flex"
        >
          <Plus className="h-4 w-4" />
          Nueva campaña
        </Link>

        <button
          onClick={onOpenJobs}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-text-secondary shadow-sm transition hover:border-accent hover:text-text-primary"
        >
          <Wand2 className="h-4 w-4 text-accent" />
          Estado
        </button>

        <Link
          href="/app/subscription"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-text-primary shadow-sm transition hover:border-accent"
        >
          <CreditCard className="h-4 w-4 text-accent" />
          {credits.toFixed(2)}
        </Link>

        {isAdmin && (
          <Link
            href="/app/admin"
            title="Admin"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white text-text-secondary shadow-sm transition hover:border-accent hover:text-accent"
          >
            <Shield className="h-4 w-4" />
          </Link>
        )}

        <Link
          href="/app/settings"
          title="Configuración"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white text-text-secondary shadow-sm transition hover:border-accent hover:text-text-primary"
        >
          <Settings className="h-4 w-4" />
        </Link>

        <div className="hidden max-w-[180px] items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-secondary shadow-sm lg:flex">
          <User className="h-4 w-4" />
          <span className="truncate">{userEmail || 'Cuenta'}</span>
        </div>
      </div>
    </header>
  )
}
