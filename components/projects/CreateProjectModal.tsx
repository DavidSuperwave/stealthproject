'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Users, Sparkles, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createProject, getUserSubscription } from '@/lib/db/queries'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated?: () => void
}

interface ProjectType {
  id: string
  title: string
  description: string
  icon: typeof Users
  disabled?: boolean
  comingSoonLabel?: string
}

const projectTypes: ProjectType[] = [
  {
    id: 'personalization',
    title: 'Generar un video',
    description: 'Crea videos personalizados con variables dinámicas como nombres y empresas',
    icon: Users,
  },
  {
    id: 'translation',
    title: 'Traducir un video',
    description: 'Traduce y dobla tus videos a diferentes idiomas con IA lip-sync',
    icon: Sparkles,
    disabled: true,
    comingSoonLabel: 'Próximamente',
  },
]

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!isOpen) return null

  async function handleContinue() {
    if (!selectedType) return

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      setNameError(true)
      return
    }

    setIsCreating(true)
    setError(null)

    let projectId: string | null = null

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Debes iniciar sesión para crear un proyecto.')
        setIsCreating(false)
        return
      }

      // Credit gate: redirect to subscription if insufficient credits
      const sub = await getUserSubscription(supabase, user.id)
      const creditsRemaining = sub ? Number(sub.credits_remaining) : 0
      if (creditsRemaining < 5) {
        onClose()
        router.push('/app/subscription')
        setIsCreating(false)
        return
      }

      const { data, error: err } = await createProject(supabase, user.id, {
        name: trimmedName,
        type: selectedType as 'personalization' | 'translation',
      })

      if (err) {
        console.error('Project creation failed:', err)
        setError(err.message || 'No se pudo crear el proyecto. Intenta de nuevo.')
        setIsCreating(false)
        return
      }

      if (!data?.id) {
        setError('No se pudo crear el proyecto. Intenta de nuevo.')
        setIsCreating(false)
        return
      }

      projectId = data.id
    } catch (e) {
      console.error('Unexpected error creating project:', e)
      setError('Error inesperado. Verifica tu conexión e intenta de nuevo.')
      setIsCreating(false)
      return
    }

    onClose()
    setSelectedType(null)
    setProjectName('')
    setNameError(false)
    onProjectCreated?.()

    router.push(`/app/upload?project=${projectId}&name=${encodeURIComponent(trimmedName)}`)
    setIsCreating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-bg-secondary rounded-xl border border-border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Crear proyecto</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Project Types */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {projectTypes.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            const isDisabled = type.disabled === true

            return (
              <button
                key={type.id}
                onClick={() => {
                  if (!isDisabled) setSelectedType(type.id)
                }}
                disabled={isDisabled}
                className={`
                  relative p-6 rounded-xl border-2 text-left transition-all
                  ${isDisabled
                    ? 'border-border bg-bg-elevated opacity-50 cursor-not-allowed'
                    : isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg-elevated hover:border-text-muted'
                  }
                `}
              >
                {/* "Próximamente" badge for disabled items */}
                {isDisabled && type.comingSoonLabel && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-secondary border border-border text-xs text-text-muted font-medium">
                    <Lock className="w-3 h-3" />
                    {type.comingSoonLabel}
                  </span>
                )}

                <Icon className={`w-8 h-8 mb-4 ${isDisabled ? 'text-text-muted' : isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                <h3 className={`font-semibold mb-2 ${isDisabled ? 'text-text-muted' : 'text-white'}`}>{type.title}</h3>
                <p className={`text-sm ${isDisabled ? 'text-text-muted' : 'text-text-secondary'}`}>{type.description}</p>
              </button>
            )
          })}
        </div>

        {/* Campaign Name — required */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Nombre de la campaña <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value)
              if (nameError) setNameError(false)
            }}
            placeholder="Ej: Campaña Q1 2026"
            className={`w-full px-4 py-2.5 bg-bg-elevated border rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors ${
              nameError ? 'border-red-500' : 'border-border'
            }`}
          />
          {nameError && (
            <p className="mt-1.5 text-xs text-red-400">
              Ingresa un nombre para tu campaña antes de continuar.
            </p>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedType || isCreating}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isCreating ? 'Creando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
