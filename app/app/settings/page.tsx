'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Email form
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    if (!newEmail.trim()) return

    setEmailLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })

    if (error) {
      setEmailMsg({ type: 'error', text: error.message })
    } else {
      setEmailMsg({
        type: 'success',
        text: 'Se envió un correo de confirmación a tu nueva dirección. Revisa tu bandeja de entrada.',
      })
      setNewEmail('')
    }
    setEmailLoading(false)
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }

    setPasswordLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando...
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Configuración</h1>
            <p className="text-text-secondary text-sm">Administra tu cuenta</p>
          </div>
        </div>

        {/* Current email */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-lg font-medium text-white mb-1">Correo actual</h2>
          <p className="text-text-secondary text-sm mb-4">Este es el correo vinculado a tu cuenta.</p>
          <div className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg">
            <Mail className="w-4 h-4 text-text-muted" />
            <span className="text-white text-sm">{user?.email ?? '—'}</span>
          </div>
        </div>

        {/* Change email */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-lg font-medium text-white mb-1">Cambiar correo electrónico</h2>
          <p className="text-text-secondary text-sm mb-4">
            Recibirás un correo de confirmación en la nueva dirección.
          </p>

          {emailMsg && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                emailMsg.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {emailMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              {emailMsg.text}
            </div>
          )}

          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium text-text-secondary mb-1.5">
                Nuevo correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@ejemplo.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-white placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={emailLoading}
              className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Actualizar correo
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-lg font-medium text-white mb-1">Cambiar contraseña</h2>
          <p className="text-text-secondary text-sm mb-4">
            La nueva contraseña se aplica de inmediato.
          </p>

          {passwordMsg && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                passwordMsg.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-text-secondary mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-white placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-1.5">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-elevated border border-border text-white placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Actualizar contraseña
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
