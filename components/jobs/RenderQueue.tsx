'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, Play, RefreshCw, XCircle } from 'lucide-react'

interface GenerationJob {
  id: string
  project_name: string
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

function stepLabel(step: string | null) {
  if (!step) return 'Pendiente'
  if (step === 'mock') return 'Prueba en curso'
  return step
}

export default function RenderQueue() {
  const [jobs, setJobs] = useState<GenerationJob[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await fetch('/api/generation/jobs?limit=10', { cache: 'no-store' })
      const data = (await res.json()) as GenerationJobsResponse
      setSetupRequired(Boolean(data.setup_required))
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los videos en proceso')
      setJobs(data.jobs ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los videos en proceso')
    } finally {
      setLoading(false)
    }
  }

  async function createMockJob() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/generation/jobs', {
        method: 'POST',
      })
      const data = (await res.json()) as GenerationJobsResponse
      setSetupRequired(Boolean(data.setup_required))
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la prueba de estado')
      await loadJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la prueba de estado')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 15_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="rounded-xl border border-border bg-bg-secondary shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Estado de videos</h2>
          <p className="text-sm text-text-muted">Da seguimiento a los videos mientras se crean. Los trabajos largos permanecen visibles aunque salgas y regreses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadJobs}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-text-primary"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={createMockJob}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Probar flujo de estado
          </button>
        </div>
      </div>

      {error && (
        <div
          className={`border-b px-5 py-3 text-sm ${
            setupRequired
              ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {setupRequired ? 'La configuración de estado aún no está lista. Aplica las migraciones y actualiza esta sección.' : error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-5 py-3 font-medium">Trabajo</th>
              <th className="px-5 py-3 font-medium">Origen</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Progreso</th>
              <th className="px-5 py-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-muted">
                  No hay videos en proceso ahora. Crea un video o prueba el flujo de estado.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs text-text-secondary">{job.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-text-primary">{job.project_name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-secondary">
                    {job.is_mock ? 'Prueba' : 'Generación'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium capitalize text-text-secondary">
                      {statusIcon(job.status)}
                      {statusLabel(job.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${job.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{job.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-secondary">
                    {job.status === 'completed' && job.download_url ? (
                      <a href={job.download_url} className="text-accent hover:underline" target="_blank">
                        Ver resultado
                      </a>
                    ) : job.error ? (
                      <span className="text-red-600">{job.error}</span>
                    ) : (
                      stepLabel(job.current_step)
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
