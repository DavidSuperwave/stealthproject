'use client'

import { useState } from 'react'
import { Play, Download, Mail, CheckCircle, Loader2 } from 'lucide-react'

interface GenerateStepProps {
  campaign: {
    name: string
    videoUrl: string
    variables: { name: string }[]
    recipients: { id: string; first_name: string; company: string }[]
  }
  onGenerate: () => void
  isGenerating?: boolean
  progress?: {
    completed: number
    total: number
  }
}

export default function GenerateStep({ 
  campaign, 
  onGenerate, 
  isGenerating = false,
  progress = { completed: 0, total: 0 }
}: GenerateStepProps) {
  const [isComplete, setIsComplete] = useState(false)

  const handleGenerate = () => {
    onGenerate()
    // Simulate completion after 3 seconds for demo
    setTimeout(() => setIsComplete(true), 3000)
  }

  if (isComplete) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        <h2 className="text-2xl font-semibold text-white">All Videos Generated!</h2>

        <div className="bg-bg-secondary rounded-lg border border-border p-4 max-w-md mx-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Completed:</span>
              <span className="text-white">{campaign.recipients.length} / {campaign.recipients.length} videos</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Credits used:</span>
              <span className="text-white">{campaign.recipients.length}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium">
            <Download className="w-4 h-4" />
            Download All (ZIP)
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium">
            <Mail className="w-4 h-4" />
            Send via Email
          </button>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    const percentage = Math.round((progress.completed / progress.total) * 100)
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Generating Your Videos...</h2>

        <div className="bg-bg-secondary rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-text-secondary">Processing: {progress.completed} / {progress.total}</span>
            <span className="text-white font-semibold">{percentage}%</span>
          </div>

          <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-4 text-sm text-text-muted">This may take a few minutes. You can leave this page and come back later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Generate Results</h2>
        <p className="text-text-secondary">Review your campaign before generating personalized videos.</p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-bg-secondary rounded-lg border border-border p-6 space-y-4">
        <h3 className="font-medium text-white">Campaign Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-secondary">Name:</span>
            <p className="text-white">{campaign.name}</p>
          </div>
          <div>
            <span className="text-text-secondary">Variables:</span>
            <p className="text-white">{campaign.variables.map(v => '{{' + v.name + '}}').join(', ')}</p>
          </div>
          <div>
            <span className="text-text-secondary">Recipients:</span>
            <p className="text-white">{campaign.recipients.length}</p>
          </div>
          <div>
            <span className="text-text-secondary">Estimated Cost:</span>
            <p className="text-white">{campaign.recipients.length} credits</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-bg-secondary rounded-lg border border-border p-6">
        <h3 className="font-medium text-white mb-4">Sample Preview</h3>
        
        <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
          <button className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center hover:bg-accent/30 transition-colors">
            <Play className="w-6 h-6 text-accent ml-1" />
          </button>
        </div>

        <p className="mt-3 text-sm text-text-secondary">
          Sample: "Hey {campaign.recipients[0]?.first_name}, welcome to {campaign.recipients[0]?.company}!"
        </p>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
        >
          Generate {campaign.recipients.length} Videos
        </button>
      </div>
    </div>
  )
}
