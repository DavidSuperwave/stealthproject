'use client'

import { useState } from 'react'
import { Plus, X, Type, Building2, Briefcase } from 'lucide-react'

interface Variable {
  id: string
  name: string
  type: 'text' | 'company' | 'industry'
  position: number
}

interface VariablesStepProps {
  transcript: string
  variables: Variable[]
  onAddVariable: (variable: Variable) => void
  onRemoveVariable: (id: string) => void
}

const variableTypes = [
  { id: 'text' as const, label: 'Text', icon: Type },
  { id: 'company' as const, label: 'Company', icon: Building2 },
  { id: 'industry' as const, label: 'Industry', icon: Briefcase },
]

export default function VariablesStep({ 
  transcript, 
  variables, 
  onAddVariable, 
  onRemoveVariable 
}: VariablesStepProps) {
  const [selectedText, setSelectedText] = useState('')
  const [showVariableMenu, setShowVariableMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setMenuPosition({ x: rect.left, y: rect.bottom + 8 })
      setShowVariableMenu(true)
    }
  }

  const handleAddVariable = (type: Variable['type']) => {
    const newVariable: Variable = {
      id: Date.now().toString(),
      name: selectedText.toLowerCase().replace(/\s+/g, '_'),
      type,
      position: 0,
    }
    onAddVariable(newVariable)
    setShowVariableMenu(false)
    window.getSelection()?.removeAllRanges()
  }

  // Highlight variables in transcript
  const renderTranscript = () => {
    let result = transcript
    variables.forEach((variable) => {
      result = result.replace(
        new RegExp(`\\b${variable.name.replace(/_/g, ' ')}\\b`, 'gi'),
        `{{${variable.name}}}`
      )
    })
    return result
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Add Variables</h2>
        <p className="text-text-secondary">
          Select words in your transcript to make them dynamic.
        </p>
      </div>

      {/* Transcript */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Transcript</h3>
        <div 
          className="text-lg text-white leading-relaxed cursor-text"
          onMouseUp={handleTextSelection}
        >
          {renderTranscript()}
        </div>
      </div>

      {/* Variable Menu Popup */}
      {showVariableMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowVariableMenu(false)}
          />
          <div 
            className="fixed z-50 bg-bg-elevated rounded-lg border border-border shadow-xl p-2"
            style={{ left: menuPosition.x, top: menuPosition.y }}
          >
            <p className="px-3 py-2 text-sm text-text-secondary">Make "{selectedText}" dynamic:</p>
            {variableTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => handleAddVariable(type.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 text-left text-white hover:bg-bg-secondary rounded transition-colors"
                >
                  <Icon className="w-4 h-4 text-accent" />
                  {type.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Variables List */}
      {variables.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Your Variables</h3>
          <div className="flex flex-wrap gap-3">
            {variables.map((variable) => (
              <div 
                key={variable.id}
                className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-lg"
              >
                <span className="text-accent font-mono">{'{{'}{variable.name}{'}}'}</span>
                <span className="text-text-secondary text-sm">{variable.type}</span>
                <button
                  onClick={() => onRemoveVariable(variable.id)}
                  className="ml-2 p-1 hover:bg-bg-elevated rounded transition-colors"
                >
                  <X className="w-3 h-3 text-text-muted" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Add */}
      <button className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors">
        <Plus className="w-4 h-4" />
        Add Custom Variable
      </button>
    </div>
  )
}
