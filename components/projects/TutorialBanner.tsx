'use client'

import { Play } from 'lucide-react'

export default function TutorialBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-border p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-text-secondary uppercase tracking-wider">Video Tutorials</p>
          <h2 className="text-2xl font-semibold text-white">5 Checks before you Upload</h2>
        </div>

        <div className="relative w-48 h-28 rounded-lg overflow-hidden bg-black/50">
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
