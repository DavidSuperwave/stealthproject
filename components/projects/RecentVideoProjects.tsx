'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProjectsWithGeneration, type ProjectWithGeneration } from '@/lib/db/queries'
import { uploadCardPadded, uploadPanel, uploadPrimaryButton } from '@/components/upload/uploadStyles'

const statusLabels: Record<string, string> = {
  draft: 'borrador',
  processing: 'procesando',
  completed: 'completado',
  failed: 'falló',
}

export default function RecentVideoProjects() {
  const [projects, setProjects] = useState<ProjectWithGeneration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProjects() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const rows = await getProjectsWithGeneration(supabase, user.id)
        setProjects(rows.slice(0, 4))
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  return (
    <section className={uploadCardPadded}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Continúa videos recientes</h2>
          <p className="mt-1 text-sm text-text-muted">Retoma borradores y revisa proyectos generados recientemente.</p>
        </div>
        <Link href="/app/upload" className={uploadPrimaryButton}>
          Nuevo video
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className={`${uploadPanel} mt-5 p-5 text-sm text-text-muted`}>Cargando videos recientes...</div>
      ) : projects.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-border bg-bg-elevated/70 p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-accent/15 bg-accent/10">
            <Video className="h-6 w-6 text-accent" />
          </div>
          <p className="mt-2 text-sm font-medium text-text-primary">Aún no hay proyectos de video</p>
          <p className="mt-1 text-sm text-text-muted">Crea un video para guardar tu primer borrador.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/upload?project=${project.id}&name=${encodeURIComponent(project.name)}`}
              className="rounded-[22px] border border-border/80 bg-bg-elevated/60 p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white hover:shadow-[0_14px_35px_rgba(13,31,23,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-accent/15 bg-accent/10">
                  <Video className="h-4 w-4 text-accent" />
                </div>
                <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs capitalize text-text-muted">{statusLabels[project.status] ?? project.status}</span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-text-primary">{project.name}</h3>
              <p className="mt-2 flex items-center gap-1 text-xs text-text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
