import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jaime AI — Videos Personalizados con IA | Escala sin perder autenticidad',
  description: 'Crea videos personalizados a escala con tu rostro, tu voz y tu mensaje. Sin avatares, sin voces sintéticas. Diseñado para equipos de ventas en México.',
  keywords: ['video personalizado', 'ia', 'ventas', 'marketing', 'lip sync', 'méxico', 'outreach'],
  openGraph: {
    title: 'Jaime AI — Videos Personalizados con IA',
    description: 'Crea videos personalizados a escala con tu rostro, tu voz y tu mensaje.',
    type: 'website',
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
