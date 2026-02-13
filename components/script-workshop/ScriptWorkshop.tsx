'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, FileText, Clock, Tag, MoreVertical, Trash2, Copy, Wand2 } from 'lucide-react'
import { searchScripts, storeScript, deleteScript, type Script } from '@/lib/script-knowledge'

interface ScriptWorkshopProps {
  supermemoryApiKey: string
  onUseScript?: (script: Script) => void
}

const mockScripts: Script[] = [
  {
    id: '1',
    title: 'CEO Outreach - Infrastructure Pain',
    content: 'Hey {{first_name}},\n\nSaw {{company}} just raised Series B — congrats!\n\nQuick question: Are you still managing outbound infrastructure in-house? Most {{industry}} CEOs I talk to are burning 2-3 domains per month before they hit scale.\n\nWe built Superwave to fix that — managed infrastructure with 95%+ deliverability. No more domain burnout.\n\nWorth a 10-min chat?\n\nBest,\nJaime',
    category: 'outreach',
    tags: ['ceo', 'infrastructure', 'series-b', 'personalized'],
    usageCount: 47,
    lastUsed: '2026-02-10',
    createdAt: '2026-01-15',
    performance: {
      replyRate: 12.5,
      positiveRate: 8.3
    }
  },
  {
    id: '2',
    title: 'VP Sales - Data Quality Angle',
    content: 'Hi {{first_name}},\n\nYour SDRs are probably spending 60% of their time on data research, 40% on actual selling.\n\nWhat if that was flipped?\n\nWe provide human-verified lead data + AI personalization so your team can focus on conversations, not scraping.\n\n{{company}} is in a similar growth stage to {{reference_company}} — they saw 3x pipeline in 60 days.\n\nOpen to seeing how?\n\nCheers,\nJaime',
    category: 'outreach',
    tags: ['vp-sales', 'data-quality', 'sdr', 'case-study'],
    usageCount: 32,
    lastUsed: '2026-02-08',
    createdAt: '2026-01-20',
    performance: {
      replyRate: 9.2,
      positiveRate: 5.1
    }
  },
  {
    id: '3',
    title: 'Founder Introduction - Warm',
    content: '{{first_name}},\n\nConnecting with founders in {{industry}} who are scaling outbound.\n\nNoticed {{company}} on LinkedIn — solid growth trajectory.\n\nI help teams like yours build outbound engines that actually convert. No vanity metrics, just booked meetings.\n\nWorth a brief intro call?\n\nBest,\nJaime',
    category: 'introduction',
    tags: ['founder', 'warm', 'linkedin', 'intro'],
    usageCount: 23,
    lastUsed: '2026-02-05',
    createdAt: '2026-01-25',
    performance: {
      replyRate: 15.1,
      positiveRate: 10.2
    }
  }
]

export default function ScriptWorkshop({ supermemoryApiKey, onUseScript }: ScriptWorkshopProps) {
  const [scripts, setScripts] = useState<Script[]>(mockScripts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         script.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         script.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || script.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(scripts.map(s => s.category)))]

  const handleUseScript = (script: Script) => {
    onUseScript?.(script)
  }

  const handleDeleteScript = (id: string) => {
    setScripts(scripts.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Script Workshop</h2>
          <p className="text-text-secondary">Manage and reuse your best-performing scripts</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          New Script
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search scripts by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-white focus:outline-none focus:border-accent"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScripts.map(script => (
          <div
            key={script.id}
            onClick={() => setSelectedScript(script)}
            className="bg-bg-secondary border border-border rounded-xl p-5 hover:border-accent/50 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <h3 className="font-medium text-white line-clamp-1">{script.title}</h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteScript(script.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>

            <p className="text-sm text-text-secondary line-clamp-3 mb-4">
              {script.content}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {script.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-bg-elevated text-text-secondary"
                >
                  {tag}
                </span>
              ))}
              {script.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-bg-elevated text-text-secondary">
                  +{script.tags.length - 3}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {script.lastUsed}
                </span>
                <span>{script.usageCount} uses</span>
              </div>
              {script.performance && (
                <span className="text-green-400">
                  {script.performance.replyRate}% reply
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Script Detail Modal */}
      {selectedScript && (
        <ScriptDetailModal
          script={selectedScript}
          onClose={() => setSelectedScript(null)}
          onUse={() => handleUseScript(selectedScript)}
        />
      )}
    </div>
  )
}

function ScriptDetailModal({ script, onClose, onUse }: { 
  script: Script
  onClose: () => void
  onUse: () => void 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-bg-secondary rounded-xl border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-semibold text-white">{script.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-lg">
            <span className="text-text-muted">✕</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Content */}
          <div className="bg-bg-elevated rounded-lg p-4">
            <pre className="text-sm text-white whitespace-pre-wrap font-sans">
              {script.content}
            </pre>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {script.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 text-sm rounded-full bg-accent/20 text-accent"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-elevated rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{script.usageCount}</p>
              <p className="text-sm text-text-secondary">Times Used</p>
            </div>
            {script.performance && (
              <>
                <div className="bg-bg-elevated rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{script.performance.replyRate}%</p>
                  <p className="text-sm text-text-secondary">Reply Rate</p>
                </div>
                <div className="bg-bg-elevated rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{script.performance.positiveRate}%</p>
                  <p className="text-sm text-text-secondary">Positive Rate</p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onUse}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium"
            >
              <Wand2 className="w-4 h-4" />
              Use This Script
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(script.content)}
              className="px-4 py-3 bg-bg-elevated hover:bg-border text-white rounded-lg font-medium"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
