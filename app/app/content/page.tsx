'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ClipboardList, FileText, Loader2, Plus, Search, Video } from 'lucide-react'

type Campaign = {
  id: string
  name: string
  objective: string | null
  platform: string
  target_video_count: number | null
  target_duration_sec: number
  status: string
  brief: Record<string, unknown>
  script_count: number
  asset_count: number
  created_at: string
  updated_at: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    ideation: 'Ideas',
    scripting: 'Guiones',
    rendering: 'Generando',
    review: 'Revision',
    completed: 'Lista',
    archived: 'Archivada',
  }
  return labels[status] ?? status
}

export default function ContentEnginePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadCampaigns() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/content/campaigns', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las campanas')
      setCampaigns(data.campaigns ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las campanas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const filteredCampaigns = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return campaigns
    return campaigns.filter((campaign) =>
      [campaign.name, campaign.objective, campaign.platform, String(campaign.brief?.audience ?? '')]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    )
  }, [campaigns, query])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-accent">Campanas</p>
            <h1 className="mt-2 text-3xl font-semibold text-text-primary">Planea videos antes de generarlos</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              Organiza ofertas, guiones, videos base y resultados finales por campana.
            </p>
          </div>
          <Link href="/app/content/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover">
            <Plus className="h-4 w-4" />
            Nueva campana
          </Link>
        </div>

        <section className="rounded-xl border border-border bg-bg-secondary shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, objetivo, plataforma o audiencia"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </div>
            <p className="text-sm text-text-muted">{filteredCampaigns.length} campanas</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Cargando campanas...
            </div>
          ) : error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent/10">
                <ClipboardList className="h-7 w-7 text-accent" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-text-primary">Aun no hay campanas</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
                Crea una campana para guardar guiones, videos y resultados bajo una misma oferta.
              </p>
              <Link href="/app/content/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover">
                Crear campana
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
                <article key={campaign.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-accent">{campaign.platform}</p>
                      <h2 className="mt-1 truncate text-lg font-semibold text-text-primary">{campaign.name}</h2>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-xs font-semibold text-text-secondary">
                      {statusLabel(campaign.status)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-text-secondary">
                    {campaign.objective || String(campaign.brief?.cta ?? campaign.brief?.audience ?? 'Campana lista para guiones y videos.')}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-bg-elevated px-2 py-2">
                      <FileText className="h-3.5 w-3.5 text-accent" />
                      {campaign.script_count} guiones
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-bg-elevated px-2 py-2">
                      <Video className="h-3.5 w-3.5 text-accent" />
                      {campaign.asset_count} recursos
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-bg-elevated px-2 py-2">
                      <CalendarDays className="h-3.5 w-3.5 text-accent" />
                      {formatDate(campaign.updated_at)}
                    </span>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Link href={`/app/scripts?campaign=${campaign.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text-primary">
                      Guion
                    </Link>
                    <Link href={`/app/upload?campaign=${campaign.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover">
                      Crear video
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
