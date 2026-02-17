'use client'

import { Suspense } from 'react'
import Layout from '@/components/layout/Layout'
import ProjectsDashboard from '@/components/projects/ProjectsDashboard'

export default function AppHome() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="p-12 text-center text-text-secondary">Cargando proyectos...</div>
      }>
        <ProjectsDashboard />
      </Suspense>
    </Layout>
  )
}
