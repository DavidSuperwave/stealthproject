'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, MoreVertical, Play, ArrowRight, Download, CheckCircle } from 'lucide-react'
import TutorialBanner from './TutorialBanner'
import CreateProjectModal from './CreateProjectModal'
import { createClient } from '@/lib/supabase/client'
import { getProjectsWithGeneration } from '@/lib/db/queries'

interface Project {
  id: string
  name: string
  type: 'personalization' | 'translation'
  status: 'draft' | 'processing' | 'completed' | 'failed'
  createdBy: string
  sourceLanguage: string
  createdAt: string
  updatedAt: string
  generationStatus: string | null
  shotId: number | null
  generateId: string | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  }).replace(/\//g, '-')
}

export default function ProjectsDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Open create modal if redirected with ?openCreate=1, then clear param
  useEffect(() => {
    if (searchParams.get('openCreate') === '1') {
      setIsCreateModalOpen(true)
      router.replace('/app', { scroll: false })
    }
  }, [searchParams, router])

  const loadProjects = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserEmail(user.email ?? '')
    const rows = await getProjectsWithGeneration(supabase, user.id)
    setProjects(rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      createdBy: user.email ?? '',
      sourceLanguage: r.source_language,
      createdAt: formatDate(r.created_at),
      updatedAt: formatDate(r.updated_at),
      generationStatus: r.generation_status,
      shotId: r.shot_id,
      generateId: r.generate_id,
    })))
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleProjectCreated = () => {
    loadProjects()
  }

  const isProjectComplete = (project: Project) => {
    return (
      project.status === 'completed' ||
      project.generationStatus === 'completed'
    ) && project.shotId && project.generateId
  }

  const handleDownload = async (project: Project) => {
    setDownloadingId(project.id)
    try {
      window.open(`/api/projects/${project.id}/download`, '_blank')
    } finally {
      setTimeout(() => setDownloadingId(null), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <TutorialBanner />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Mis Proyectos</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Proyecto
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar un proyecto"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-secondary">
            Cargando proyectos...
          </div>
        ) : (
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-4 text-left">Nombre del Proyecto</th>
              <th className="px-6 py-4 text-left">Tipo</th>
              <th className="px-6 py-4 text-left">Creado por</th>
              <th className="px-6 py-4 text-left">Idioma</th>
              <th className="px-6 py-4 text-left">Fecha de Creación</th>
              <th className="px-6 py-4 text-left">Última Actualización</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project) => {
              const completed = isProjectComplete(project)

              return (
                <tr key={project.id} className="border-b border-border last:border-b-0 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/app/upload?project=${project.id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded bg-bg-elevated flex items-center justify-center">
                        <Play className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white group-hover:text-accent transition-colors">{project.name}</span>
                        {completed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                            <CheckCircle className="w-3 h-3" />
                            Activo
                          </span>
                        ) : project.status === 'draft' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/30">
                            <ArrowRight className="w-3 h-3" />
                            Continuar
                          </span>
                        ) : project.status === 'processing' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                            Procesando
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg-elevated text-text-secondary">
                      {project.type === 'personalization' ? 'Un Actor' : 'Traducción'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{project.createdBy}</td>
                  <td className="px-6 py-4 text-text-secondary">{project.sourceLanguage}</td>
                  <td className="px-6 py-4 text-text-secondary">{project.createdAt}</td>
                  <td className="px-6 py-4 text-text-secondary">{project.updatedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {completed && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleDownload(project)
                          }}
                          disabled={downloadingId === project.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar
                        </button>
                      )}
                      <button className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button className="p-2 text-text-muted hover:text-white disabled:opacity-50">{'<<'}</button>
        <button className="p-2 text-text-muted hover:text-white disabled:opacity-50">{'<'}</button>
        <button className="w-8 h-8 rounded bg-accent text-white text-sm font-medium">1</button>
        <button className="w-8 h-8 rounded hover:bg-bg-elevated text-text-secondary text-sm">2</button>
        <button className="w-8 h-8 rounded hover:bg-bg-elevated text-text-secondary text-sm">3</button>
        <button className="p-2 text-text-muted hover:text-white">{'>'}</button>
        <button className="p-2 text-text-muted hover:text-white">{'>>'}</button>
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}
