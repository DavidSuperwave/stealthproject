'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  CreditCard,
  Coins,
  Loader2,
  ArrowLeft,
  Ban,
  Trash2,
  Plus,
  X,
  Shield,
  ShieldOff,
  AlertTriangle,
} from 'lucide-react'

type Tab = 'users' | 'payments' | 'credits'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  created_at: string
  credits_remaining: number
  banned: boolean
  banned_until: string | null
}

interface Payment {
  id: string
  user_id: string
  user_email: string
  amount: number
  type: string
  description: string | null
  package_name: string | null
  price_mxn: number | null
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Give credits modal
  const [creditsModal, setCreditsModal] = useState<{ user: AdminUser } | null>(null)
  const [creditsAmount, setCreditsAmount] = useState('')
  const [creditsLoading, setCreditsLoading] = useState(false)

  // Confirm action modal
  const [confirmModal, setConfirmModal] = useState<{
    user: AdminUser
    action: 'ban' | 'unban' | 'delete'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (!res.ok) {
      if (res.status === 403) {
        router.push('/app')
        return
      }
      throw new Error('Failed to load users')
    }
    const data = await res.json()
    setUsers(data.users)
  }, [router])

  const loadPayments = useCallback(async () => {
    const res = await fetch('/api/admin/payments')
    if (!res.ok) throw new Error('Failed to load payments')
    const data = await res.json()
    setPayments(data.payments)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadUsers(), loadPayments()])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      }
      setLoading(false)
    }
    load()
  }, [loadUsers, loadPayments])

  async function handleGiveCredits() {
    if (!creditsModal) return
    const amount = parseFloat(creditsAmount)
    if (!amount || amount <= 0) return

    setCreditsLoading(true)
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creditsModal.user.id, amount }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      setCreditsModal(null)
      setCreditsAmount('')
      await loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    }
    setCreditsLoading(false)
  }

  async function handleAction() {
    if (!confirmModal) return

    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: confirmModal.user.id,
          action: confirmModal.action,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      setConfirmModal(null)
      await loadUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    }
    setActionLoading(false)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatMXN(amount: number) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'payments', label: 'Pagos', icon: CreditCard },
    { id: 'credits', label: 'Créditos', icon: Coins },
  ]

  const totalCredits = users.reduce((sum, u) => sum + u.credits_remaining, 0)
  const totalRevenue = payments
    .filter((p) => p.type === 'purchase' && p.price_mxn)
    .reduce((sum, p) => sum + (p.price_mxn ?? 0), 0)

  const actionLabels = {
    ban: { label: 'Banear', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    unban: { label: 'Desbanear', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    delete: { label: 'Eliminar', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/app" className="text-accent hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-bg-secondary border-b border-border flex items-center px-6">
        <Link href="/app" className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors mr-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-white">Panel de Administración</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-accent" />
              <span className="text-text-secondary text-sm">Total Usuarios</span>
            </div>
            <p className="text-3xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-accent" />
              <span className="text-text-secondary text-sm">Créditos en Sistema</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalCredits.toFixed(2)}</p>
          </div>
          <div className="bg-bg-secondary rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-accent" />
              <span className="text-text-secondary text-sm">Ingresos Totales</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatMXN(totalRevenue)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-white'
                    : 'border-transparent text-text-secondary hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Users tab */}
        {activeTab === 'users' && (
          <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Nombre</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Registro</th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Créditos</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{u.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-white text-right font-medium">{u.credits_remaining.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {u.banned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            Baneado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setCreditsModal({ user: u })}
                            title="Dar créditos"
                            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-accent transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {u.banned ? (
                            <button
                              onClick={() => setConfirmModal({ user: u, action: 'unban' })}
                              title="Desbanear"
                              className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-green-400 transition-colors"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmModal({ user: u, action: 'ban' })}
                              title="Banear"
                              className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-yellow-400 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmModal({ user: u, action: 'delete' })}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments tab */}
        {activeTab === 'payments' && (
          <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Usuario</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Tipo</th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Créditos</th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Monto MXN</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Descripción</th>
                    <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{p.user_email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.type === 'purchase'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : p.type === 'deduction'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : p.type === 'admin_grant'
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {p.type === 'purchase' ? 'Compra' : p.type === 'deduction' ? 'Deducción' : p.type === 'admin_grant' ? 'Admin' : p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right font-medium">{p.amount}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary text-right">
                        {p.price_mxn ? formatMXN(p.price_mxn) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-[200px]">
                        {p.description ?? p.package_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">
                        No hay transacciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Credits tab */}
        {activeTab === 'credits' && (
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-1">Total de créditos en el sistema</h3>
              <p className="text-4xl font-bold text-white">{totalCredits.toFixed(2)}</p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Nombre</th>
                      <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Créditos</th>
                      <th className="text-right text-xs font-medium text-text-muted uppercase tracking-wider px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .slice()
                      .sort((a, b) => b.credits_remaining - a.credits_remaining)
                      .map((u) => (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-white">{u.email}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{u.full_name ?? '—'}</td>
                          <td className="px-4 py-3 text-sm text-white text-right font-medium">{u.credits_remaining.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setCreditsModal({ user: u })}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Dar créditos
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Give credits modal */}
      {creditsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Dar créditos</h3>
              <button onClick={() => { setCreditsModal(null); setCreditsAmount('') }} className="text-text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-text-secondary text-sm mb-4">
              Usuario: <span className="text-white">{creditsModal.user.email}</span>
              <br />
              Balance actual: <span className="text-white">{creditsModal.user.credits_remaining.toFixed(2)} créditos</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Cantidad de créditos
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                placeholder="Ej. 100"
                className="w-full px-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-white placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCreditsModal(null); setCreditsAmount('') }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-white hover:border-border/80 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleGiveCredits}
                disabled={creditsLoading || !creditsAmount || parseFloat(creditsAmount) <= 0}
                className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creditsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm action modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${actionLabels[confirmModal.action].color}`} />
                {actionLabels[confirmModal.action].label} usuario
              </h3>
              <button onClick={() => setConfirmModal(null)} className="text-text-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 rounded-lg border mb-4 ${actionLabels[confirmModal.action].bg}`}>
              <p className="text-sm text-text-secondary">
                {confirmModal.action === 'ban' && (
                  <>Estás a punto de <span className="text-yellow-400 font-medium">banear</span> a este usuario. No podrá iniciar sesión.</>
                )}
                {confirmModal.action === 'unban' && (
                  <>Estás a punto de <span className="text-green-400 font-medium">desbanear</span> a este usuario. Podrá volver a iniciar sesión.</>
                )}
                {confirmModal.action === 'delete' && (
                  <>Estás a punto de <span className="text-red-400 font-medium">eliminar permanentemente</span> a este usuario y todos sus datos. Esta acción no se puede deshacer.</>
                )}
              </p>
            </div>

            <p className="text-text-secondary text-sm mb-4">
              Usuario: <span className="text-white">{confirmModal.user.email}</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:text-white hover:border-border/80 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  confirmModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.action === 'ban'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionLabels[confirmModal.action].label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
