import Link from 'next/link'
import { ArrowRight, BarChart3, Clock, DollarSign, TestTube2 } from 'lucide-react'

const roiDrivers = [
  {
    title: 'Más pruebas creativas',
    description: 'Convierte una grabación base en muchos hooks, ofertas, llamadas a la acción y ángulos.',
    icon: TestTube2,
  },
  {
    title: 'Menos fricción de grabación',
    description: 'Crea nuevas variaciones sin coordinar otra grabación para cada idea.',
    icon: Clock,
  },
  {
    title: 'Mejor feedback',
    description: 'El reporte manual muestra qué videos ganaron atención, guardados y leads.',
    icon: BarChart3,
  },
  {
    title: 'Menor costo de contenido',
    description: 'Genera contenido de venta repetible mientras las aprobaciones y publicación siguen en manos humanas.',
    icon: DollarSign,
  },
]

export default function RoiPage() {
  return (
    <main className="min-h-screen bg-background text-white">
      <nav className="border-b border-border bg-bg-secondary">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold">Doble Labs</Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#04120A] transition hover:bg-accent-hover"
          >
            Empezar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase text-accent">Caso de retorno</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight sm:text-6xl">
              La creación de video le da a los negocios más oportunidades de generar demanda.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
              El objetivo no es saturar plataformas. El objetivo es producir más piezas de venta de calidad, aprender qué mensajes funcionan e invertir tiempo de grabación solo donde importa.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roiDrivers.map((driver) => {
              const Icon = driver.icon
              return (
                <div key={driver.title} className="rounded-lg border border-border bg-bg-secondary p-5">
                  <Icon className="h-5 w-5 text-accent" />
                  <h2 className="mt-4 font-semibold text-white">{driver.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{driver.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-bg-secondary px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold text-white">Qué mejora con el tiempo</h2>
            <p className="mt-4 leading-7 text-text-secondary">
              Cada ganador reportado se convierte en aprendizaje estructurado: hook, formato, tema, llamada a la acción, audiencia y oferta. Los futuros guiones pueden inclinarse hacia los patrones que ya generaron atención.
            </p>
          </div>
          <div className="grid gap-3">
            {['Patrones de hook', 'Ángulos de oferta', 'Objeciones de audiencia', 'Rendimiento de llamadas a la acción', 'Señales de retención'].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-background p-4 text-sm text-text-secondary">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
