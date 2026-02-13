'use client'

import { useState } from 'react'
import { X, Upload, Users, Video, Sparkles } from 'lucide-react'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

const projectTypes = [
  {
    id: 'personalize',
    title: 'Personalize a Video',
    description: 'Create personalized videos with dynamic variables like names and companies',
    icon: Users,
  },
  {
    id: 'translate',
    title: 'Translate a Video',
    description: 'Translate and dub your videos into different languages with AI lip-sync',
    icon: Sparkles,
  },
]

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-bg-secondary rounded-xl border border-border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create New Project</h2>
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
            
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`
                  p-6 rounded-xl border-2 text-left transition-all
                  ${isSelected 
                    ? 'border-accent bg-accent/10' 
                    : 'border-border bg-bg-elevated hover:border-text-muted'
                  }
                `}
              >
                <Icon className={`w-8 h-8 mb-4 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                <h3 className="font-semibold text-white mb-2">{type.title}</h3>
                <p className="text-sm text-text-secondary">{type.description}</p>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!selectedType}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
