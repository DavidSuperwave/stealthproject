'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, MoreVertical, Play, ArrowRight } from 'lucide-react'
import TutorialBanner from './TutorialBanner'
import CreateProjectModal from './CreateProjectModal'
import { createClient } from '@/lib/supabase/client'
import { getProjects } from '@/lib/db/queries'

interface Project {
  id: string
  name: string
  type: 'personalization' | 'translation'
  status: 'draft' | 'processing' | 'completed' | 'failed'
  createdBy: string
  sourceLanguage: string
  createdAt: string
  updatedAt: string
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

  // Open create modal if redirected with ?openCreate=1, then clear param
  useEffect(() => {
    if (searchParams.get('openCreate') === '1') {
      setIsCreateModalOpen(true)
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }
      setUserEmail(user.email ?? '')
      const rows = await getProjects(supabase, user.id)
      setProjects(rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        createdBy: user.email ?? '',
        sourceLanguage: r.source_language,
        createdAt: formatDate(r.created_at),
        updatedAt: formatDate(r.updated_at),
      })))
      setLoading(false)
    })
  }, [])

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleProjectCreated = () => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const rows = await getProjects(supabase, user.id)
      setProjects(rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        status: r.status,
        createdBy: user.email ?? '',
        sourceLanguage: r.source_language,
        createdAt: formatDate(r.created_at),
        updatedAt: formatDate(r.updated_at),
      })))
    })
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
            {filteredProjects.map((project) => (
              <tr key={project.id} className="border-b border-border last:border-b-0 hover:bg-bg-elevated/50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/upload?project=${project.id}`} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded bg-bg-elevated flex items-center justify-center">
                      <Play className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white group-hover:text-accent transition-colors">{project.name}</span>
                      {project.status === 'draft' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/30">
                          <ArrowRight className="w-3 h-3" />
                          Continuar
                        </span>
                      )}
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
                  <button className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-text-muted" />
                  </button>
                </td>
              </tr>
            ))}
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
