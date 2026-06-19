'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, RefreshCw, X, XCircle } from 'lucide-react'

interface JobActivityDrawerProps {
  isOpen: boolean
  onClose: () => void
}

interface GenerationJob {
  id: string
  project_name: string
  campaign_name: string | null
  master_video_name: string | null
  audio_name: string | null
  is_mock: boolean
  status: string
  progress: number
  current_step: string | null
  error: string | null
  download_url: string | null
  created_at: string
  updated_at: string
}

interface GenerationJobsResponse {
  jobs?: GenerationJob[]
  error?: string
  setup_required?: boolean
}

function statusIcon(status: string) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-green-700" />
  if (status === 'failed' || status === 'cancelled') return <XCircle className="h-4 w-4 text-red-600" />
  if (status === 'queued') return <Clock3 className="h-4 w-4 text-amber-600" />
  return <Loader2 className="h-4 w-4 animate-spin text-accent" />
}

function formatAge(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.max(0, Math.floor(diff / 60_000))
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    queued: 'en cola',
    processing: 'procesando',
    in_progress: 'procesando',
    submitted: 'enviado',
    completed: 'completado',
    failed: 'falló',
    cancelled: 'cancelado',
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}

export default function JobActivityDrawer({ isOpen, onClose }: JobActivityDrawerProps) {
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)

  async function loadJobs() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/generation/jobs?limit=8', { cache: 'no-store' })
      const data = (await res.json().catch(() => null)) as GenerationJobsResponse | null
      setSetupRequired(Boolean(data?.setup_required))
      if (!res.ok) {
        setLoadError(data?.error || `No se pudieron cargar los videos en proceso (${res.status}).`)
        return
      }
      setJobs(data?.jobs ?? [])
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los videos en proceso.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    loadJobs()
    const interval = setInterval(loadJobs, 15_000)
    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 cursor-default bg-black/60" onClick={onClose} aria-label="Cerrar panel de estado" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-bg-secondary shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Actividad de video</h2>
            <p className="text-sm text-text-muted">Estado persistente de generación</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadJobs}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary"
              aria-label="Actualizar trabajos"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-accent hover:text-text-primary"
              aria-label="Cerrar trabajos"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loadError && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                setupRequired
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {setupRequired
                ? 'La configuración de estado aún no está lista. Aplica las migraciones y actualiza los trabajos.'
                : loadError}
            </div>
          )}

          {jobs.length === 0 && !loadError ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-elevated/60 p-6 text-center">
              <p className="font-medium text-text-primary">Todavía no hay videos en proceso</p>
              <p className="mt-2 text-sm text-text-muted">
                Los videos enviados permanecerán visibles aquí aunque salgas de la página.
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-border bg-bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {statusIcon(job.status)}
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {job.project_name}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{job.campaign_name ?? (job.is_mock ? 'Prueba' : 'Generacion')} - Actualizado {formatAge(job.updated_at || job.created_at)}</p>
                    {(job.master_video_name || job.audio_name) && (
                      <p className="mt-1 truncate text-xs text-text-muted">
                        {job.master_video_name ?? 'Video'} + {job.audio_name ?? 'Audio'}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium capitalize text-text-secondary">
                    {statusLabel(job.status)}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all"
                    style={{ width: `${Math.min(Math.max(job.progress ?? 0, 0), 100)}%` }}
                  />
                </div>

                {job.download_url && job.status === 'completed' && (
                  <a href={job.download_url} target="_blank" className="mt-3 inline-flex text-xs font-semibold text-accent hover:underline">
                    Ver resultado
                  </a>
                )}

                {job.error && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {job.error}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
