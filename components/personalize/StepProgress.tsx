'use client'

import { Upload, Pencil, Database, Video, Check } from 'lucide-react'

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
  { number: 1, label: 'Upload Video', icon: Upload },
  { number: 2, label: 'Add Variables', icon: Pencil },
  { number: 3, label: 'Upload Recipients', icon: Database },
  { number: 4, label: 'Generate Results', icon: Video },
]

export default function StepProgress({
  currentStep,
  steps = defaultSteps,
  reachableSteps,
  onStepClick,
}: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-bg-elevated">
          <div 
            className="h-full bg-accent transition-all duration-500"
            style={{ 
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
            }}
          />
        </div>

        {/* Steps */}
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
                relative flex flex-col items-center z-10 bg-transparent border-none outline-none
                ${canNavigate ? 'cursor-pointer group' : 'cursor-default'}
              `}
            >
              {/* Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all
                  ${isCompleted 
                    ? 'bg-accent text-white' 
                    : isActive 
                      ? 'bg-accent text-white ring-4 ring-accent/20'
                      : 'bg-bg-elevated text-text-muted border-2 border-bg-elevated'
                  }
                  ${canNavigate ? 'group-hover:ring-2 group-hover:ring-accent/40' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <div className="mt-3 text-center">
                <p className={`
                  text-xs uppercase tracking-wider font-medium
                  ${isActive || isCompleted ? 'text-accent' : 'text-text-muted'}
                `}>
                  Paso {step.number}
                </p>
                <p className={`
                  text-sm font-medium mt-0.5
                  ${isActive ? 'text-white' : isCompleted ? 'text-text-secondary' : 'text-text-muted'}
                  ${canNavigate ? 'group-hover:text-white' : ''}
                `}>
                  {step.label}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
