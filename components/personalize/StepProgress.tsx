'use client'

import { Upload, Pencil, Database, Video, Check } from 'lucide-react'
import { uploadPanelPadded } from '@/components/upload/uploadStyles'

interface Step {
  number: number
  label: string
  icon: React.ElementType
}

interface StepProgressProps {
  currentStep: number
  steps?: Step[]
  reachableSteps?: number[]
  onStepClick?: (step: number) => void
}

const defaultSteps: Step[] = [
  { number: 1, label: 'Subir video', icon: Upload },
  { number: 2, label: 'Agregar variables', icon: Pencil },
  { number: 3, label: 'Subir destinatarios', icon: Database },
  { number: 4, label: 'Generar resultados', icon: Video },
]

export default function StepProgress({
  currentStep,
  steps = defaultSteps,
  reachableSteps,
  onStepClick,
}: StepProgressProps) {
  return (
    <div className={uploadPanelPadded}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Progreso del flujo</p>
          <p className="mt-1 text-xs text-text-muted">Vuelve a pasos completados sin perder tu borrador.</p>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-text-primary">
          Paso {currentStep} de {steps.length}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          const canNavigate = onStepClick && reachableSteps
            ? reachableSteps.includes(step.number) && step.number !== currentStep
            : false

          return (
            <button
              key={step.number}
              type="button"
              disabled={!canNavigate}
              onClick={() => canNavigate && onStepClick?.(step.number)}
              className={`
                group rounded-2xl border p-4 text-left transition
                ${isActive
                  ? 'border-accent/30 bg-white shadow-sm ring-4 ring-accent/10'
                  : isCompleted
                    ? 'border-accent/20 bg-accent/10'
                    : 'border-border bg-white/60'
                }
                ${canNavigate ? 'cursor-pointer hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white hover:shadow-sm' : 'cursor-default'}
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                  flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all
                  ${isCompleted 
                    ? 'border-accent bg-accent text-white' 
                    : isActive 
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-bg-elevated text-text-muted'
                  }
                `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                <p className={`
                  text-xs font-semibold uppercase
                  ${isActive || isCompleted ? 'text-accent' : 'text-text-muted'}
                `}>
                  Paso {step.number}
                </p>
                <p className={`
                  mt-0.5 truncate text-sm font-semibold
                  ${isActive ? 'text-text-primary' : isCompleted ? 'text-text-primary' : 'text-text-muted'}
                  ${canNavigate ? 'group-hover:text-text-primary' : ''}
                `}>
                  {step.label}
                </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
