'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { AlertTriangle, BarChart3, CheckCircle2, Loader2, Trash2, Trophy, Video } from 'lucide-react'

type ResultAsset = {
  id: string
  campaign_id: string | null
  render_job_id: string | null
  script_id: string | null
  title: string | null
  public_url: string | null
  source_url: string | null
  download_url?: string | null
  duration_sec: number | null
  status: string
  metadata: Record<string, unknown>
  created_at: string
}

type Metric = {
  id: string
  platform: string
  platform_url: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  leads: number | null
  conversions: number | null
  notes: string | null
  metadata: Record<string, unknown>
}

type ResultItem = {
  asset: ResultAsset
  metric: Metric | null
  campaign_name: string
  script_title: string | null
  script_excerpt: string | null
  tracking_status: 'pending' | 'winner' | 'discarded'
}

const numericFields = ['views', 'likes', 'comments', 'shares', 'saves', 'leads', 'conversions'] as const

function isPreviewableUrl(value?: string | null) {
  if (!value) return false
  if (value.includes('example.com/')) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function emptyDraft(result: ResultItem) {
  return {
    platform: result.metric?.platform ?? 'manual',
    platform_url: result.metric?.platform_url ?? '',
    views: result.metric?.views ?? 0,
    likes: result.metric?.likes ?? 0,
    comments: result.metric?.comments ?? 0,
    shares: result.metric?.shares ?? 0,
    saves: result.metric?.saves ?? 0,
    leads: result.metric?.leads ?? 0,
    conversions: result.metric?.conversions ?? 0,
    notes: result.metric?.notes ?? '',
    tracking_status: result.tracking_status ?? 'pending',
  }
}

export default function PerformancePage() {
  const [results, setResults] = useState<ResultItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, ReturnType<typeof emptyDraft>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadResults() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/performance/results', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los resultados')
      const nextResults = (data.results ?? []) as ResultItem[]
      setResults(nextResults)
      setDrafts(Object.fromEntries(nextResults.map((result) => [result.asset.id, emptyDraft(result)])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los resultados')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResults()
  }, [])

  const summary = useMemo(() => {
    const winners = results.filter((result) => drafts[result.asset.id]?.tracking_status === 'winner').length
    const totalViews = Object.values(drafts).reduce((sum, draft) => sum + Number(draft.views || 0), 0)
    const totalEngagement = Object.values(drafts).reduce((sum, draft) => sum + Number(draft.likes || 0) + Number(draft.comments || 0) + Number(draft.shares || 0) + Number(draft.saves || 0), 0)
    return { winners, totalViews, totalEngagement }
  }, [drafts, results])

  function updateDraft(assetId: string, field: keyof ReturnType<typeof emptyDraft>, value: string) {
    setDrafts((current) => ({
      ...current,
      [assetId]: {
        ...current[assetId],
        [field]: numericFields.includes(field as typeof numericFields[number]) ? Math.max(0, Number(value) || 0) : value,
      },
    }))
  }

  async function saveResult(assetId: string, status?: 'pending' | 'winner' | 'discarded') {
    const draft = drafts[assetId]
    if (!draft) return

    setSavingId(assetId)
    setError(null)
    try {
      const response = await fetch(`/api/performance/results/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, tracking_status: status ?? draft.tracking_status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el resultado')
      await loadResults()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el resultado')
    } finally {
      setSavingId(null)
    }
  }

  async function deleteTracking(assetId: string) {
    const confirmed = window.confirm('Eliminar este seguimiento puede afectar el historial de rendimiento y los reportes de la campana. El video generado no se eliminara, solo sus metricas. Deseas continuar?')
    if (!confirmed) return

    setSavingId(assetId)
    setError(null)
    try {
      const response = await fetch(`/api/performance/results/${assetId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'No se pudo eliminar el seguimiento')
      await loadResults()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el seguimiento')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase text-accent">Resultados</p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">Mide los videos generados</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Esta pagina empieza vacia. Cuando un video termina de generarse, aparece aqui para registrar vistas, interacciones y aprendizajes.
          </p>
        </div>

        {error && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Vistas reportadas', value: summary.totalViews.toLocaleString(), icon: BarChart3 },
            { label: 'Interacciones', value: summary.totalEngagement.toLocaleString(), icon: CheckCircle2 },
            { label: 'Videos ganadores', value: summary.winners.toString(), icon: Trophy },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-xl border border-border bg-bg-secondary p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-muted">{item.label}</p>
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-text-primary">{item.value}</p>
              </div>
            )
          })}
        </div>

        <section className="rounded-xl border border-border bg-bg-secondary shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold text-text-primary">Videos por medir</h2>
            <p className="mt-1 text-sm text-text-muted">Solo aparecen videos generados por el flujo de Crear video.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Cargando resultados...
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent/10">
                <Video className="h-7 w-7 text-accent" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">Todavia no hay resultados</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">Genera un video desde Crear video para empezar a registrar metricas.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((result) => {
                const draft = drafts[result.asset.id] ?? emptyDraft(result)
                const status = draft.tracking_status
                return (
                  <div key={result.asset.id} className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_560px]">
                    <div className="flex gap-4">
                      <div className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-accent/10">
                        <Video className="h-7 w-7 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-text-primary">{result.asset.title || 'Video generado'}</h3>
                          <span className="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">{result.campaign_name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === 'winner'
                              ? 'bg-accent/10 text-accent'
                              : status === 'discarded'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-bg-elevated text-text-muted'
                          }`}>
                            {status === 'pending' ? 'Pendiente' : status === 'winner' ? 'Ganador' : 'Descartado'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">{result.script_title || result.script_excerpt || 'Resultado generado listo para medir.'}</p>
                        {(isPreviewableUrl(result.asset.public_url) || result.asset.download_url) && (
                          <a href={isPreviewableUrl(result.asset.public_url) ? result.asset.public_url! : result.asset.download_url!} target="_blank" className="mt-3 inline-flex text-sm font-semibold text-accent hover:underline">
                            {isPreviewableUrl(result.asset.public_url) ? 'Ver video generado' : 'Descargar video'}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-4">
                        {numericFields.map((field) => (
                          <label key={field} className="text-xs font-medium uppercase text-text-muted">
                            {field === 'views' ? 'vistas' : field === 'likes' ? 'likes' : field === 'comments' ? 'comentarios' : field === 'shares' ? 'compartidos' : field === 'saves' ? 'guardados' : field === 'leads' ? 'leads' : 'ventas'}
                            <input
                              type="number"
                              min="0"
                              value={draft[field]}
                              onChange={(event) => updateDraft(result.asset.id, field, event.target.value)}
                              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                            />
                          </label>
                        ))}
                        <label className="text-xs font-medium uppercase text-text-muted sm:col-span-2">
                          plataforma / nota
                          <input
                            value={draft.platform}
                            onChange={(event) => updateDraft(result.asset.id, 'platform', event.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                          />
                        </label>
                        <label className="text-xs font-medium uppercase text-text-muted sm:col-span-2">
                          enlace publicado
                          <input
                            value={draft.platform_url}
                            onChange={(event) => updateDraft(result.asset.id, 'platform_url', event.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                          />
                        </label>
                      </div>

                      <textarea
                        value={draft.notes}
                        onChange={(event) => updateDraft(result.asset.id, 'notes', event.target.value)}
                        placeholder="Notas de rendimiento, audiencia o aprendizajes..."
                        className="min-h-20 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => saveResult(result.asset.id, 'winner')} disabled={savingId === result.asset.id} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
                          <Trophy className="h-4 w-4" />
                          Marcar ganador
                        </button>
                        <button onClick={() => saveResult(result.asset.id, 'discarded')} disabled={savingId === result.asset.id} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                          Descartar
                        </button>
                        <button onClick={() => saveResult(result.asset.id)} disabled={savingId === result.asset.id} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-text-primary disabled:opacity-50">
                          Guardar
                        </button>
                        <button onClick={() => deleteTracking(result.asset.id)} disabled={savingId === result.asset.id} className="grid w-10 place-items-center rounded-lg border border-border text-text-muted transition hover:border-red-300 hover:text-red-600 disabled:opacity-50" aria-label="Eliminar seguimiento">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
