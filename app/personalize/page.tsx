'use client'

import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import StepProgress from '@/components/personalize/StepProgress'
import UploadStep from '@/components/personalize/UploadStep'
import VariablesStep from '@/components/personalize/VariablesStep'
import RecipientsStep from '@/components/personalize/RecipientsStep'
import GenerateStep from '@/components/personalize/GenerateStep'

interface Variable {
  id: string
  name: string
  type: 'text' | 'company' | 'industry'
  position: number
}

export default function PersonalizePage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState('Hey there, welcome to our platform! We are excited to help you grow your business and achieve your goals.')
  const [variables, setVariables] = useState<Variable[]>([])

  const handleUpload = (file: File) => {
    setVideoFile(file)
    // In real app, upload to server and get transcript
    setTimeout(() => setCurrentStep(2), 1000)
  }

  const handleAddVariable = (variable: Variable) => {
    setVariables([...variables, variable])
  }

  const handleRemoveVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id))
  }

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <UploadStep 
            onUpload={handleUpload}
            isUploading={!!videoFile && currentStep === 1}
            uploadProgress={50}
          />
        )
      case 2:
        return (
          <VariablesStep
            transcript={transcript}
            variables={variables}
            onAddVariable={handleAddVariable}
            onRemoveVariable={handleRemoveVariable}
          />
        )
      case 3:
        return (
          <RecipientsStep
            variables={variables}
            recipients={[]}
            onUploadCSV={() => {}}
            onRemoveRecipient={() => {}}
          />
        )
      case 4:
        return (
          <GenerateStep
            campaign={{
              name: 'Q1 Outreach Campaign',
              videoUrl: '',
              variables,
              recipients: [
                { id: '1', first_name: 'John', company: 'Acme Inc' },
                { id: '2', first_name: 'Sarah', company: 'TechFlow' },
                { id: '3', first_name: 'Mike', company: 'StartupXYZ' },
              ]
            }}
            onGenerate={() => {}}
          />
        )
      default:
        return null
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <StepProgress currentStep={currentStep} />

        <div className="mt-8 bg-bg-secondary rounded-xl border border-border p-8">
          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-4 py-2 text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>

            {currentStep < 4 && (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
