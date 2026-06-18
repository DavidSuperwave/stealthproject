'use client'

import AppShell from './AppShell'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return <AppShell>{children}</AppShell>
}
