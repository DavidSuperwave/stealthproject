'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HelpCircle, LogOut, Plus, User } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface HeaderProps {
  credits: number
  trialDaysRemaining: number
}

export default function Header({ credits, trialDaysRemaining }: HeaderProps) {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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

        {/* User email */}
        {user && (
          <span className="text-sm text-text-secondary truncate max-w-[180px]">
            {user.email}
          </span>
        )}

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
          <User className="w-4 h-4 text-text-secondary" />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-white hover:border-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
