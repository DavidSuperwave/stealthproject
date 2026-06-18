'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Brain,
  CreditCard,
  FolderKanban,
  Home,
  Library,
  LogOut,
  Settings,
  Shield,
  Video,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUserSubscription } from '@/lib/db/queries'
import { isAdminClient } from '@/lib/admin'
import AppTopbar from './AppTopbar'
import JobActivityDrawer from './JobActivityDrawer'

interface AppShellProps {
  children: React.ReactNode
}

const LOW_CREDITS_THRESHOLD = 10

const navItems = [
  { label: 'Inicio', href: '/app', icon: Home },
  { label: 'Campañas', href: '/app/content', icon: FolderKanban },
  { label: 'Guiones', href: '/app/scripts', icon: Brain },
  { label: 'Biblioteca', href: '/app/library', icon: Library },
  { label: 'Resultados', href: '/app/performance', icon: BarChart3 },
  { label: 'Crear video', href: '/app/upload', icon: Video },
  { label: 'Créditos', href: '/app/subscription', icon: CreditCard },
  { label: 'Configuración', href: '/app/settings', icon: Settings },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/app') return pathname === '/app' || pathname === '/app/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [credits, setCredits] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const showLowCredits = credits < LOW_CREDITS_THRESHOLD && credits > 0

  const fetchAccount = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserEmail(user.email ?? null)
    setIsAdmin(isAdminClient(user.id))
    const sub = await getUserSubscription(supabase, user.id)
    if (sub) setCredits(Number(sub.credits_remaining))
  }, [])

  useEffect(() => {
    fetchAccount()
    const refresh = () => fetchAccount()
    window.addEventListener('credits-updated', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('credits-updated', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [fetchAccount])

  const allNavItems = useMemo(() => {
    if (!isAdmin) return navItems
    return [...navItems, { label: 'Admin', href: '/app/admin', icon: Shield }]
  }, [isAdmin])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="app-shell-light flex h-screen overflow-hidden bg-background text-text-primary">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-bg-secondary shadow-sm lg:flex lg:flex-col">
        <div className="border-b border-border p-5">
          <Link href="/app" className="flex items-center gap-3">
            <p className="text-lg font-bold leading-tight">Doble Labs</p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {allNavItems.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'border border-accent/25 bg-accent/10 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-accent' : 'text-text-muted'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
          >
            <LogOut className="h-4 w-4 text-text-muted" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar credits={credits} isAdmin={isAdmin} userEmail={userEmail} onOpenJobs={() => setIsDrawerOpen(true)} />

        {showLowCredits && (
          <div className="border-b border-yellow-200 bg-yellow-50 px-5 py-2 text-sm text-yellow-800">
            Créditos bajos: quedan {credits.toFixed(2)}.{' '}
            <Link href="/app/subscription" className="font-semibold text-accent hover:underline">
              Agregar créditos
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>

      <JobActivityDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  )
}
