'use client'

import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeItem="projects" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          credits={20.00}
          trialDaysRemaining={14}
          user={{ name: 'David', avatar: undefined }}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
