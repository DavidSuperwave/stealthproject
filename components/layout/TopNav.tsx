'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Folder, Wand2, CreditCard, FileText, HelpCircle, LogOut, Plus, User, Bell, CheckCircle, XCircle, Info, AlertTriangle, Settings, Shield } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getUnreadNotifications, markNotificationRead, markAllNotificationsRead, type NotificationRow } from '@/lib/db/queries'
import { isAdminClient } from '@/lib/admin'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface TopNavProps {
  credits: number
}

type NavId = 'projects' | 'personalize' | 'scripts' | 'subscription'

const navItems: { id: NavId; label: string; icon: typeof Folder; href: string; disabled?: boolean }[] = [
  {
    id: 'projects',
    label: 'Proyectos',
    icon: Folder,
    href: '/app',
  },
  {
    id: 'personalize',
    label: 'Personalizar video',
    icon: Wand2,
    href: '/app/upload',
  },
  {
    id: 'scripts',
    label: 'Biblioteca de guiones',
    icon: FileText,
    href: '/app/scripts',
    disabled: true,
  },
  {
    id: 'subscription',
    label: 'Suscripción',
    icon: CreditCard,
    href: '/app/subscription',
  },
]

function getActiveItem(pathname: string): NavId {
  if (pathname === '/app') return 'projects'
  if (pathname.startsWith('/app/personalize') || pathname.startsWith('/app/upload')) return 'personalize'
  if (pathname.startsWith('/app/scripts')) return 'scripts'
  if (pathname.startsWith('/app/subscription')) return 'subscription'
  return 'projects'
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
    default:
      return <Info className="w-4 h-4 text-accent flex-shrink-0" />
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export default function TopNav({ credits }: TopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeItem = getActiveItem(pathname)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setIsUserAdmin(isAdminClient(data.user?.id))
      if (data.user) {
        loadNotifications(data.user.id)
      }
    })
  }, [])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => loadNotifications(user.id), 30_000)
    return () => clearInterval(interval)
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadNotifications(userId: string) {
    const supabase = createClient()
    const rows = await getUnreadNotifications(supabase, userId)
    setNotifications(rows)
  }

  async function handleMarkRead(notifId: string) {
    const supabase = createClient()
    await markNotificationRead(supabase, notifId)
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  async function handleMarkAllRead() {
    if (!user) return
    const supabase = createClient()
    await markAllNotificationsRead(supabase, user.id)
    setNotifications([])
  }

  function handleNotificationClick(notif: NotificationRow) {
    handleMarkRead(notif.id)
    setShowNotifications(false)
    if (notif.href) {
      router.push(notif.href)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')

    router.refresh()
  }

  return (
    <header className="h-16 bg-bg-secondary border-b border-border flex items-center px-6 shrink-0">
      {/* Left — Logo */}
      <Link href="/app" className="flex items-center gap-2 mr-8">
        <span className="text-xl font-bold gradient-text">DOBLELABS</span>
      </Link>

      {/* Center — Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id

          if (item.disabled) {
            return (
              <span
                key={item.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-text-muted cursor-not-allowed select-none"
              >
                <Icon className="w-4 h-4" />
                {item.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-text-muted leading-none">
                  Próximamente
                </span>
              </span>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${isActive
                  ? 'bg-bg-elevated text-white'
                  : 'text-text-secondary hover:text-white hover:bg-bg-elevated'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Right — Actions */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notifications bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className="relative w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-accent transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-white">Notificaciones</span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-accent hover:underline"
                  >
                    Marcar todo como leído
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-text-muted text-sm">
                    Sin notificaciones nuevas
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors text-left border-b border-border last:border-b-0"
                    >
                      <div className="mt-0.5">
                        <NotificationIcon type={notif.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                        {notif.body && (
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-xs text-text-muted mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-accent transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Credits — links to /app/subscription */}
        <Link
          href="/app/subscription"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-elevated border border-border hover:border-accent transition-colors"
        >
          <Plus className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">{credits.toFixed(2)} créditos</span>
        </Link>

        {/* Admin link — visible only to admins */}
        {isUserAdmin && (
          <Link
            href="/app/admin"
            title="Panel de administración"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent transition-colors"
          >
            <Shield className="w-4 h-4" />
          </Link>
        )}

        {/* Settings */}
        <Link
          href="/app/settings"
          title="Configuración"
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-accent transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User email */}
        {user && (
          <span className="text-sm text-text-secondary truncate max-w-[180px]">
            {user.email}
          </span>
        )}

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
          <User className="w-4 h-4 text-text-secondary" />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title="Cerrar sesión"
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
