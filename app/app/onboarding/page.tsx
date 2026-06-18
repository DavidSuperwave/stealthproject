'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const creatorTypes = ['Fundador / dueño', 'Equipo de marketing', 'Creador / influencer', 'Agencia', 'Equipo de ventas', 'Otro']
const businessTypes = ['Servicios locales', 'Marca ecommerce', 'Servicios B2B', 'Educación / coaching', 'Bienes raíces', 'Negocio de creador']
const useCases = ['Videos de venta', 'Anuncios pagados', 'Contenido orgánico corto', 'Prospección personalizada', 'Cursos / capacitación', 'Localización']
const channels = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook', 'LinkedIn', 'Email / SMS']
const services = ['Creación de videos', 'Estrategia de guiones', 'Pruebas de anuncios', 'Localización', 'Reportes de rendimiento', 'Aún no estoy seguro']
const volumeOptions = ['1-5 videos', '6-20 videos', '21-50 videos', '50+ videos']

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [creatorType, setCreatorType] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [primaryUseCase, setPrimaryUseCase] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentChannels, setContentChannels] = useState<string[]>([])
  const [monthlyVideoVolume, setMonthlyVideoVolume] = useState('')
  const [interestedServices, setInterestedServices] = useState<string[]>([])
  const [goals, setGoals] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, creator_type, business_type, primary_use_case, target_audience, content_channels, monthly_video_volume, interested_services, onboarding_goals')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.onboarding_completed) {
        router.push('/app')
        return
      }

      setCreatorType(profile?.creator_type ?? '')
      setBusinessType(profile?.business_type ?? '')
      setPrimaryUseCase(profile?.primary_use_case ?? '')
      setTargetAudience(profile?.target_audience ?? '')
      setContentChannels((profile?.content_channels as string[] | null) ?? [])
      setMonthlyVideoVolume(profile?.monthly_video_volume ?? '')
      setInterestedServices((profile?.interested_services as string[] | null) ?? [])
      setGoals(profile?.onboarding_goals ?? '')
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const steps = useMemo(
    () => [
      {
        title: 'Cuéntanos quién eres',
        description: 'Esto nos ayuda a adaptar tu espacio de trabajo desde el inicio.',
        isValid: Boolean(creatorType && businessType),
      },
      {
        title: 'Define el objetivo',
        description: 'Queremos entender qué tipo de contenido necesitas crear.',
        isValid: Boolean(primaryUseCase && targetAudience.trim()),
      },
      {
        title: 'Planea el volumen',
        description: 'Indica dónde publicarás y cuántos videos esperas producir.',
        isValid: Boolean(contentChannels.length > 0 && monthlyVideoVolume),
      },
      {
        title: 'Ajusta el soporte',
        description: 'Comparte en qué podríamos ayudarte y cualquier detalle importante.',
        isValid: true,
      },
    ],
    [businessType, contentChannels.length, creatorType, monthlyVideoVolume, primaryUseCase, targetAudience],
  )

  function nextStep() {
    setError(null)
    if (!steps[step].isValid) {
      setError('Completa los campos requeridos para continuar.')
      return
    }
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  async function handleSubmit() {
    setError(null)
    if (!creatorType || !businessType || !primaryUseCase || !targetAudience.trim() || !monthlyVideoVolume || contentChannels.length === 0) {
      setError('Completa los campos requeridos antes de entrar al espacio de trabajo.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        creator_type: creatorType,
        business_type: businessType,
        primary_use_case: primaryUseCase,
        target_audience: targetAudience.trim(),
        content_channels: contentChannels,
        monthly_video_volume: monthlyVideoVolume,
        interested_services: interestedServices,
        onboarding_goals: goals.trim() || null,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push('/app')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-text-secondary">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Cargando configuración...
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-text-primary">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="w-full rounded-xl border border-border bg-bg-secondary shadow-xl">
          <div className="border-b border-border p-6">
            <p className="text-lg font-bold">Doble Labs</p>
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-accent">Configuración inicial</p>
                <h1 className="mt-2 text-3xl font-semibold text-text-primary">{steps[step].title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{steps[step].description}</p>
              </div>
              <p className="text-sm font-medium text-text-muted">Paso {step + 1} de {steps.length}</p>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {steps.map((item, index) => (
                <div key={item.title} className={`h-2 rounded-full ${index <= step ? 'bg-accent' : 'bg-bg-elevated'}`} />
              ))}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 0 && (
              <div className="grid gap-5 lg:grid-cols-2">
                <FieldGroup title="¿Qué te describe mejor?" options={creatorTypes} value={creatorType} onChange={setCreatorType} />
                <FieldGroup title="¿Para qué tipo de negocio crearás contenido?" options={businessTypes} value={businessType} onChange={setBusinessType} />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 lg:grid-cols-2">
                <FieldGroup title="Uso principal de los videos" options={useCases} value={primaryUseCase} onChange={setPrimaryUseCase} />
                <label className="block rounded-xl border border-border bg-white p-5 text-sm font-semibold text-text-primary">
                  ¿A quién quieres llegar?
                  <textarea
                    value={targetAudience}
                    onChange={(event) => setTargetAudience(event.target.value)}
                    placeholder="Ejemplo: Dueños de casa en Monterrey que necesitan reparar su techo rápido."
                    className="mt-3 min-h-40 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5 lg:grid-cols-2">
                <MultiSelectGroup title="¿Dónde vas a publicar?" options={channels} values={contentChannels} onChange={setContentChannels} />
                <FieldGroup title="Volumen mensual esperado" options={volumeOptions} value={monthlyVideoVolume} onChange={setMonthlyVideoVolume} />
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5 lg:grid-cols-2">
                <MultiSelectGroup title="¿En qué podríamos apoyarte?" options={services} values={interestedServices} onChange={setInterestedServices} />
                <label className="block rounded-xl border border-border bg-white p-5 text-sm font-semibold text-text-primary">
                  ¿Algo más que debamos saber?
                  <textarea
                    value={goals}
                    onChange={(event) => setGoals(event.target.value)}
                    placeholder="Metas, ofertas, idiomas, ejemplos, fechas importantes o detalles de tu audiencia."
                    className="mt-3 min-h-40 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border p-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep((current) => Math.max(current - 1, 0))
              }}
              disabled={step === 0 || saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Entrar al espacio de trabajo
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function FieldGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
              value === option
                ? 'border-accent bg-accent/10 text-text-primary'
                : 'border-border bg-white text-text-secondary hover:border-accent hover:text-text-primary'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function MultiSelectGroup({
  title,
  options,
  values,
  onChange,
}: {
  title: string
  options: string[]
  values: string[]
  onChange: (value: string[]) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(toggleValue(values, option))}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                selected
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-border bg-white text-text-secondary hover:border-accent hover:text-text-primary'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
