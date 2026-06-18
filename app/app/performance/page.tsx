'use client'

import { useMemo, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { BarChart3, CheckCircle2, Trash2, Trophy, Video } from 'lucide-react'

type VideoResult = {
  id: string
  title: string
  script: string
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  status: 'unreviewed' | 'winner' | 'loser'
}

const initialResults: VideoResult[] = [
  {
    id: 'video-1',
    title: 'Oferta del fundador de Doble Labs',
    script: 'No necesitas más contenido al azar. Necesitas más piezas de venta.',
    platform: 'TikTok',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    status: 'unreviewed',
  },
  {
    id: 'video-2',
    title: 'Hook para consultas de clínica estética',
    script: 'Si tu calendario tiene espacios vacíos, tu contenido debería estar trabajando más.',
    platform: 'Instagram',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    status: 'unreviewed',
  },
]

export default function PerformancePage() {
  const [videos, setVideos] = useState<VideoResult[]>(initialResults)

  const summary = useMemo(() => {
    const winners = videos.filter((video) => video.status === 'winner').length
    const totalViews = videos.reduce((sum, video) => sum + video.views, 0)
    const totalEngagement = videos.reduce((sum, video) => sum + video.likes + video.comments + video.shares, 0)
    return { winners, totalViews, totalEngagement }
  }, [videos])

  function updateMetric(id: string, field: keyof Pick<VideoResult, 'views' | 'likes' | 'comments' | 'shares'>, value: string) {
    const amount = Math.max(0, Number(value) || 0)
    setVideos((current) => current.map((video) => (video.id === id ? { ...video, [field]: amount } : video)))
  }

  function setStatus(id: string, status: VideoResult['status']) {
    setVideos((current) => current.map((video) => (video.id === id ? { ...video, status } : video)))
  }

  function deleteVideo(id: string) {
    setVideos((current) => current.filter((video) => video.id !== id))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase text-accent">Resultados</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Mide manualmente los videos publicados</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Doble Labs no publica por ti. Después de publicar un video, captura los números de rendimiento, marca ganadores y elimina piezas que ya no quieras revisar.
          </p>
        </div>

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
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            )
          })}
        </div>

        <section className="rounded-xl border border-border bg-bg-secondary shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold text-white">Videos por revisar</h2>
            <p className="mt-1 text-sm text-text-muted">Usa esta lista para registrar resultados y detectar qué piezas merecen repetirse.</p>
          </div>

          <div className="divide-y divide-border">
            {videos.map((video) => (
              <div key={video.id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_520px]">
                <div className="flex gap-4">
                  <div className="grid h-20 w-28 shrink-0 place-items-center rounded-xl bg-accent/10">
                    <Video className="h-7 w-7 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{video.title}</h3>
                      <span className="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">{video.platform}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        video.status === 'winner'
                          ? 'bg-accent/10 text-accent'
                          : video.status === 'loser'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-bg-elevated text-text-muted'
                      }`}>
                        {video.status === 'unreviewed' ? 'Pendiente' : video.status === 'winner' ? 'Ganador' : 'Descartado'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{video.script}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {(['views', 'likes', 'comments', 'shares'] as const).map((field) => (
                    <label key={field} className="text-xs font-medium uppercase text-text-muted">
                      {field === 'views' ? 'vistas' : field === 'likes' ? 'likes' : field === 'comments' ? 'comentarios' : 'compartidos'}
                      <input
                        type="number"
                        min="0"
                        value={video[field]}
                        onChange={(event) => updateMetric(video.id, field, event.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                      />
                    </label>
                  ))}
                  <div className="flex gap-2 sm:col-span-4">
                    <button onClick={() => setStatus(video.id, 'winner')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover">
                      <Trophy className="h-4 w-4" />
                      Marcar ganador
                    </button>
                    <button onClick={() => setStatus(video.id, 'loser')} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-red-300 hover:text-red-600">
                      Descartar
                    </button>
                    <button onClick={() => deleteVideo(video.id)} className="grid w-10 place-items-center rounded-lg border border-border text-text-muted transition hover:border-red-300 hover:text-red-600" aria-label="Eliminar video">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {videos.length === 0 && (
              <div className="p-12 text-center text-sm text-text-muted">
                No hay videos pendientes de revisión.
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}
