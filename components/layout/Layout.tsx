'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import TopNav from './TopNav'
import { createClient } from '@/lib/supabase/client'
import { getUserSubscription } from '@/lib/db/queries'
import { AlertTriangle } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const LOW_CREDITS_THRESHOLD = 10

export default function Layout({ children }: LayoutProps) {
  const [credits, setCredits] = useState(0)
  const [showLowCredits, setShowLowCredits] = useState(false)

  const fetchCredits = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sub = await getUserSubscription(supabase, user.id)
    if (sub) {
      const remaining = Number(sub.credits_remaining)
      setCredits(remaining)
      setShowLowCredits(remaining < LOW_CREDITS_THRESHOLD && remaining > 0)
    }
  }, [])

  useEffect(() => {
    fetchCredits()

    // Listen for credit updates from ShotCreator / Stripe return
    const handleCreditsUpdated = () => {
      fetchCredits()
    }
    window.addEventListener('credits-updated', handleCreditsUpdated)

    // Refresh credits when window regains focus (e.g., returning from Stripe)
    const handleFocus = () => {
      fetchCredits()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchCredits])

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNav
        credits={credits}
      />

      {/* Low credits warning banner */}
      {showLowCredits && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-300 text-sm">
              Te quedan pocos créditos ({credits.toFixed(2)}).
            </p>
          </div>
          <Link
            href="/subscription"
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Comprar más
          </Link>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
