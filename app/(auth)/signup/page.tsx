'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, CheckCircle, User, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createCloseLead } from '@/lib/close-crm'

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Send lead to Close CRM (don't block signup if this fails)
    try {
      await createCloseLead({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        phone: phone.trim() || undefined,
        source: 'DobleLabs Signup',
        userId: data.user?.id,
      })
    } catch (closeError) {
      console.error('[Signup] Failed to send to Close CRM:', closeError)
      // Don't block signup if Close fails
    }

    // If email confirmation is disabled, the user is auto-confirmed
    if (data.session) {
      router.push('/app')
      router.refresh()
      return
    }

    // Email confirmation required
    setConfirmationSent(true)
    setLoading(false)
  }

  if (confirmationSent) {
    return (
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
        <h2 className="mb-2 text-xl font-semibold text-text-primary">Revisa tu correo</h2>
        <p className="mb-6 text-sm text-text-secondary">
          Enviamos un enlace de confirmación a{' '}
          <span className="font-medium text-text-primary">{email}</span>.
          Haz clic en el enlace para activar tu cuenta.
        </p>
        <Link
          href="/login"
          className="text-accent hover:underline text-sm"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="mb-1 text-xl font-semibold text-text-primary">Crear una cuenta</h2>
      <p className="mb-6 text-sm text-text-secondary">
        Comienza a usar DobleLabs
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-sm font-semibold text-text-secondary">
              Nombre
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="form-field w-full rounded-lg py-2.5 pl-10 pr-4 transition-colors focus:outline-none"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-sm font-semibold text-text-secondary">
              Apellido
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tu apellido"
                required
                className="form-field w-full rounded-lg py-2.5 pl-10 pr-4 transition-colors focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-text-secondary">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@ejemplo.com"
              required
              className="form-field w-full rounded-lg py-2.5 pl-10 pr-4 transition-colors focus:outline-none"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-text-secondary">
            Número de teléfono
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 1234 5678"
              className="form-field w-full rounded-lg py-2.5 pl-10 pr-4 transition-colors focus:outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-text-secondary">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="form-field w-full rounded-lg py-2.5 pl-10 pr-4 transition-colors focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-accent py-2.5 font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear cuenta
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  )
}
