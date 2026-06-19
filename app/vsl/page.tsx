import type { Metadata } from 'next'
import SalesPage from '@/components/sales-page/SalesPage'

export const metadata: Metadata = {
  title: 'Doble Labs — Sistema de Contenido con Clones de IA',
  description:
    'Doble Labs ayuda a negocios de servicios, infoproductos y suplementos a crear contenido con clones de IA, publicar de forma constante y generar más atención en redes.',
  openGraph: {
    title: 'Genera contenido constante con clones de IA | Doble Labs',
    description:
      'Guión, grabación, edición y publicación con un sistema de clones de IA diseñado para negocios que quieren crecer su presencia online.',
  },
}

export default function VslPage() {
  return <SalesPage />
}
