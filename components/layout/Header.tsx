'use client'

import { HelpCircle, Plus, User } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  credits: number
  trialDaysRemaining: number
  user: {
    name: string
    avatar?: string
  }
}

export default function Header({ credits, trialDaysRemaining, user }: HeaderProps) {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      {/* Left - Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link href="/" className="text-text-secondary hover:text-white transition-colors">
          Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-white">Projects</span>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-4">
        {/* Help */}
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-accent transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Credits */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-elevated border border-border hover:border-accent transition-colors">
          <Plus className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">{credits.toFixed(2)} credits</span>
        </button>

        {/* Trial Badge */}
        <div className="px-3 py-1.5 rounded-full bg-pink-600 text-white text-sm font-medium">
          {trialDaysRemaining} days remaining
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
          ) : (
            <User className="w-4 h-4 text-text-secondary" />
          )}
        </div>
      </div>
    </header>
  )
}
