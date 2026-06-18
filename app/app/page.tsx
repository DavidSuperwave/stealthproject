'use client'

import Link from 'next/link'
import Layout from '@/components/layout/Layout'
import RenderQueue from '@/components/jobs/RenderQueue'
import RecentVideoProjects from '@/components/projects/RecentVideoProjects'
import { BarChart3, FolderOpen, MessageSquareText, Sparkles, Upload, Video } from 'lucide-react'

const metrics = [
  {
    label: 'Videos creados',
    value: '0',
    detail: 'Los nuevos resultados aparecerán cuando se generen.',
    icon: Video,
  },
  {
    label: 'Guiones guardados',
    value: '3',
    detail: 'Guarda hooks, escenas e ideas desde el chat de guiones.',
    icon: MessageSquareText,
  },
  {
    label: 'Ganadores medidos',
    value: '0',
    detail: 'Marca manualmente qué videos publicados funcionaron mejor.',
    icon: BarChart3,
  },
  {
    label: 'Siguiente paso',
    value: 'Planear',
    detail: 'Empieza con una idea de guion o sube un video base.',
    icon: Sparkles,
  },
]

const workflow = [
  {
    title: 'Escribe un guion de venta',
    detail: 'Convierte una oferta, producto o promo en guiones cortos para video.',
    href: '/app/scripts',
    icon: MessageSquareText,
    action: 'Abrir guiones',
  },
  {
    title: 'Organiza videos base',
    detail: 'Sube videos principales y organiza clips útiles por carpeta antes de generar.',
    href: '/app/library',
    icon: FolderOpen,
    action: 'Abrir biblioteca',
  },
  {
    title: 'Crea un video final',
    detail: 'Sube el video base y el audio, luego genera el resultado final.',
    href: '/app/upload',
    icon: Upload,
    action: 'Crear video',
  },
  {
    title: 'Registra lo que funcionó',
    detail: 'Después de publicar, captura vistas e interacción para identificar ganadores.',
    href: '/app/performance',
    icon: BarChart3,
    action: 'Medir resultados',
  },
]

export default function AppHome() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase text-accent">Espacio de video</p>
          <h1 className="text-3xl font-semibold text-text-primary">Crea videos de venta desde guiones, clips base y feedback de rendimiento.</h1>
          <p className="max-w-3xl text-sm text-text-secondary">
            Doble Labs te ayuda a escribir conceptos, organizar activos, generar videos y registrar manualmente qué publicaciones se vuelven ganadoras.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="rounded-xl border border-border bg-bg-secondary p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-text-muted">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{metric.value}</p>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/20 bg-accent/10">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-text-secondary">{metric.detail}</p>
              </div>
            )
          })}
        </div>

        <section className="grid gap-4 lg:grid-cols-4">
          {workflow.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-xl border border-border bg-bg-secondary p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/20 bg-accent/10">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-text-primary">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.detail}</p>
                <p className="mt-4 text-sm font-semibold text-accent">{item.action}</p>
              </Link>
            )
          })}
        </section>

        <RecentVideoProjects />

        <RenderQueue />
      </div>
    </Layout>
  )
}
