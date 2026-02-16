'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { lipdubApi } from '@/lib/lipdub-api'

interface StatusTrackerProps {
  jobId: string
  shotId: number | null
  onComplete?: () => void
  onError?: (error: string) => void
}

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

interface JobState {
  status: JobStatus
  progress: number
  currentStep: string
  estimatedTimeRemaining?: string
  error?: string
}

const PROCESSING_STEPS = [
  { label: 'Upload Video', progress: 10 },
  { label: 'Extract Audio', progress: 25 },
  { label: 'Clone Voice', progress: 40 },
  { label: 'Generate Lip-sync', progress: 60 },
  { label: 'Render Video', progress: 80 },
  { label: 'Finalize', progress: 100 },
]

export default function StatusTracker({ jobId, shotId, onComplete, onError }: StatusTrackerProps) {
  const [job, setJob] = useState<JobState>({
    status: 'queued',
    progress: 0,
    currentStep: 'Waiting in queue...'
  })

  // Poll for generation status
  useEffect(() => {
    if (!shotId || !jobId) return

    let currentStepIndex = 0
    
    const pollStatus = async () => {
      try {
        // In real implementation, this would call:
        // const status = await lipdubApi.getGenerationStatus(shotId, jobId)
        
        // Mock progression for now
        if (currentStepIndex < PROCESSING_STEPS.length) {
          const step = PROCESSING_STEPS[currentStepIndex]
          setJob({
            status: step.progress < 100 ? 'processing' : 'completed',
            progress: step.progress,
            currentStep: step.label,
            estimatedTimeRemaining: step.progress < 100 
              ? `${Math.ceil((100 - step.progress) / 15)} minutes` 
              : undefined
          })
          
          if (step.progress >= 100) {
            onComplete?.()
            return true
          }
          
          currentStepIndex++
        }
        return false
      } catch (err) {
        setJob(prev => ({
          ...prev,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        }))
        onError?.(err instanceof Error ? err.message : 'Unknown error')
        return true
      }
    }

    // Initial poll
    pollStatus()
    
    // Continue polling every 3 seconds
    const interval = setInterval(async () => {
      const done = await pollStatus()
      if (done) clearInterval(interval)
    }, 3000)

    return () => clearInterval(interval)
  }, [jobId, shotId, onComplete, onError])

  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return <Clock className="w-6 h-6 text-amber-400" />
      case 'processing':
        return <Loader2 className="w-6 h-6 text-accent animate-spin" />
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-400" />
    }
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'queued':
        return 'bg-amber-500'
      case 'processing':
        return 'bg-accent'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
    }
  }

  const getStatusTitle = () => {
    switch (job.status) {
      case 'queued':
        return 'In Queue'
      case 'processing':
        return 'Processing...'
      case 'completed':
        return 'Complete!'
      case 'failed':
        return 'Failed'
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Status Card */}
      <div className="bg-bg-secondary rounded-xl border border-border p-8">
        <div className="flex items-center gap-4 mb-6">
          {getStatusIcon()}
          <div>
            <h3 className="text-xl font-semibold text-white">{getStatusTitle()}</h3>
            <p className="text-text-secondary">{job.currentStep}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Progress</span>
            <span className="text-white font-medium">{job.progress}%</span>
          </div>
          
          <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div 
              className={`h-full ${getStatusColor()} transition-all duration-500`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>

        {/* Time Estimate */}
        {job.estimatedTimeRemaining && (
          <p className="mt-4 text-sm text-text-secondary">
            Estimated time remaining: {job.estimatedTimeRemaining}
          </p>
        )}

        {/* Job ID */}
        <p className="mt-4 text-xs text-text-muted">Job ID: {jobId}</p>
      </div>

      {/* Processing Steps */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          Processing Steps
        </h4>
        
        <div className="space-y-3">
          {PROCESSING_STEPS.map((step, index) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center
                ${job.progress >= step.progress 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-bg-elevated text-text-muted'
                }
              `}>
                {job.progress >= step.progress ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs">{index + 1}</span>
                )}
              </div>
              <span className={job.progress >= step.progress ? 'text-white' : 'text-text-secondary'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {job.status === 'failed' && job.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <p className="text-red-400">Error: {job.error}</p>
        </div>
      )}

      {/* Actions */}
      {job.status === 'failed' && (
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
