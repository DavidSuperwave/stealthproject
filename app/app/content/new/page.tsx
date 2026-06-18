'use client'

import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Megaphone, Target, Video } from 'lucide-react'

export default function NewCampaignPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')
  const [audience, setAudience] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [objective, setObjective] = useState('')
  const [cta, setCta] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveCampaign() {
    setError(null)
    if (!name.trim()) {
      setError('Agrega un nombre para la campana.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/content/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          business,
          audience,
          platform,
          objective,
          cta,
          target_video_count: 1,
          target_duration_sec: 45,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la campana')
      router.push(`/app/scripts?campaign=${data.campaign.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la campana')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-medium uppercase text-accent">Nueva campana</p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">Empieza con la oferta y el resultado</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Captura la direccion de la campana antes de escribir guiones y generar videos.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary p-6 shadow-sm">
          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-text-secondary">
              Nombre de campana
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Promo de junio: consulta gratis"
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <label className="text-sm font-medium text-text-secondary">
              Negocio / oferta
              <input
                value={business}
                onChange={(event) => setBusiness(event.target.value)}
                placeholder="Videos de venta para negocios locales"
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <label className="text-sm font-medium text-text-secondary">
              Cliente ideal
              <input
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Duenos que necesitan mas llamadas agendadas"
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <label className="text-sm font-medium text-text-secondary">
              Plataforma principal
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              >
                <option value="instagram">Instagram Reels</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube Shorts</option>
                <option value="ads">Anuncios pagados</option>
                <option value="video">Video general</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-text-secondary">
            Objetivo de la campana
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Explica que resultado debe lograr la pieza: citas, compras, registros, mensajes..."
              className="mt-1 min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-text-secondary">
            Accion esperada
            <textarea
              value={cta}
              onChange={(event) => setCta(event.target.value)}
              placeholder="Agendar una llamada, reclamar una oferta, visitar una pagina, enviar un mensaje..."
              className="mt-1 min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { title: 'Brief guardado', icon: Megaphone },
              { title: 'Guiones conectados', icon: Target },
              { title: 'Videos en biblioteca', icon: Video },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-lg border border-border bg-bg-elevated p-4">
                  <Icon className="h-5 w-5 text-accent" />
                  <p className="mt-2 text-sm font-semibold text-text-primary">{item.title}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={saveCampaign}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Guardar y escribir guion
            </button>
            <Link href="/app/content" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-text-primary">
              <ArrowLeft className="h-4 w-4" />
              Volver a campanas
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
