import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DobleLabs — Clonación de Video con IA | Nunca más vuelvas a grabarte',
  description: 'Clonate con IA sin perder el realismo, emoción o calidad de tu vídeo original. Ideal para crear contenido, hacer anuncios, o crear cursos.',
  keywords: ['clonación de video', 'ia', 'video con ia', 'doblaje', 'lip sync', 'creadores de contenido', 'cursos'],
  openGraph: {
    title: 'DobleLabs — Clonación de Video con IA',
    description: 'Clonate con IA sin perder el realismo, emoción o calidad de tu vídeo original.',
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
