'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
import { getUserSubscription } from '@/lib/db/queries'
import { Check, CreditCard, Sparkles, Star, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface CreditPackage {
  id: string
  name: string
  price_cents_mxn: number
  credits: number
  minutes_equivalent: number
  features: string[]
  is_best_value: boolean
  includes_scripts: boolean
}

function SubscriptionContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const [credits, setCredits] = useState<number | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(success)
  const [showCanceled, setShowCanceled] = useState(canceled)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (showSuccess || showCanceled) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
        setShowCanceled(false)
        window.history.replaceState({}, '', '/subscription')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess, showCanceled])

  const loadData = async () => {
    const supabase = createClient()

    // Fetch user subscription
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const sub = await getUserSubscription(supabase, user.id)
      if (sub) {
        setCredits(Number(sub.credits_remaining))
      }
    }

    // Fetch credit packages
    const { data: pkgs } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (pkgs) {
      setPackages(pkgs as CreditPackage[])
    }

    setLoading(false)

    // If returning from successful purchase, refresh credits
    if (success) {
      window.dispatchEvent(new Event('credits-updated'))
    }
  }

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned:', data)
        setPurchasing(null)
      }
    } catch (err) {
      console.error('Purchase failed:', err)
      setPurchasing(null)
    }
  }

  const formatPrice = (cents: number) => {
    const pesos = cents / 100
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(pesos)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Suscripción y Créditos</h1>
        <p className="text-text-secondary mt-1">Compra créditos para generar videos personalizados con IA</p>
      </div>

      {/* Success / Cancel banners */}
      {showSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-300 font-medium">Compra exitosa</p>
            <p className="text-green-300/70 text-sm">Tus créditos se han agregado a tu cuenta.</p>
          </div>
        </div>
      )}

      {showCanceled && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <XCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 font-medium">Compra cancelada</p>
            <p className="text-yellow-300/70 text-sm">No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras.</p>
          </div>
        </div>
      )}

      {/* Current Credits */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-lg font-medium text-white mb-4">Tu Balance</h2>

        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-white font-medium">Créditos Disponibles</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{credits !== null ? credits.toFixed(2) : '—'}</p>
            <p className="text-text-secondary text-sm">créditos</p>
          </div>
        </div>

        <div className="mt-3 p-3 bg-accent/5 border border-accent/10 rounded-lg">
          <p className="text-xs text-text-secondary">
            <span className="text-accent font-medium">5 créditos = 1 minuto</span> de video generado.
            Los créditos se deducen al iniciar la generación de cada video.
          </p>
        </div>
      </div>

      {/* Credit Packages */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4">Comprar Créditos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-bg-secondary rounded-xl border-2 p-6 transition-all ${
                pkg.is_best_value
                  ? 'border-accent shadow-lg shadow-accent/10'
                  : 'border-border hover:border-border/80'
              }`}
            >
              {/* Best value badge */}
              {pkg.is_best_value && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-accent to-accent-secondary text-white text-xs font-bold rounded-full shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Mejor valor por precio
                  </span>
                </div>
              )}

              {/* Package header */}
              <div className={pkg.is_best_value ? 'mt-2' : ''}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-white">{pkg.name}</h3>
                  {pkg.includes_scripts && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Guiones AI
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{formatPrice(pkg.price_cents_mxn)}</span>
                  <span className="text-text-secondary text-sm">MXN</span>
                </div>

                <p className="text-text-secondary mt-1">
                  {pkg.credits} créditos — {pkg.minutes_equivalent} minutos de contenido
                </p>
              </div>

              {/* Features */}
              <ul className="mt-5 space-y-2.5">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Check className={`w-4 h-4 flex-shrink-0 ${pkg.is_best_value ? 'text-accent' : 'text-green-400'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Purchase button */}
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing !== null}
                className={`w-full mt-6 px-4 py-3 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2 ${
                  pkg.is_best_value
                    ? 'bg-gradient-to-r from-accent to-accent-secondary hover:opacity-90 text-white shadow-lg shadow-accent/20'
                    : 'bg-accent hover:bg-accent-hover text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {purchasing === pkg.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Comprar {pkg.credits} créditos
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* How credits work */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-lg font-medium text-white mb-4">¿Cómo funcionan los créditos?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Compra créditos',
              description: 'Elige un paquete y paga de forma segura con Stripe.',
            },
            {
              step: '2',
              title: 'Genera videos',
              description: 'Se deducen 5 créditos por cada minuto de video generado.',
            },
            {
              step: '3',
              title: 'Sin expiración',
              description: 'Tus créditos no tienen fecha de vencimiento. Úsalos cuando quieras.',
            },
          ].map((item) => (
            <div key={item.step} className="text-center p-4">
              <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-bold text-sm">{item.step}</span>
              </div>
              <h3 className="text-white font-medium text-sm mb-1">{item.title}</h3>
              <p className="text-text-muted text-xs">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando...
        </div>
      }>
        <SubscriptionContent />
      </Suspense>
    </Layout>
  )
}
