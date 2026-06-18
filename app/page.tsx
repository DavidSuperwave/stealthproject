import Link from 'next/link'
import { ArrowRight, BarChart3, Brain, CheckCircle2, DollarSign, Layers3, Play, Shield, Sparkles, Video } from 'lucide-react'

const capabilities = [
  {
    title: 'Genera videos listos para vender',
    description: 'Sube un video base y el audio que quieres usar. Doble lo convierte en contenido corto pulido sin otro día de grabación.',
    icon: Video,
  },
  {
    title: 'Escribe mejores escenas y anuncios',
    description: 'Usa contexto de marca, hooks ganadores, objeciones y ofertas para producir guiones que suenen como tu negocio.',
    icon: Brain,
  },
  {
    title: 'Mide lo que gana',
    description: 'Registra vistas, interacción, retención y leads para mejorar los siguientes guiones con datos reales.',
    icon: BarChart3,
  },
  {
    title: 'Opera como un equipo de contenido',
    description: 'Campañas, estados, aprobaciones, activos y aprendizajes viven en un solo flujo pensado para resultados de negocio.',
    icon: Layers3,
  },
]

const proofPoints = [
  'Sin publicación automática',
  'Feedback manual de rendimiento',
  'Estado persistente de generación',
  'Creado para equipos de video en TikTok e Instagram',
]

const roiCards = [
  {
    title: 'Tiempo de grabación',
    description: 'Reduce sesiones repetidas para nuevos hooks y ofertas.',
    icon: DollarSign,
  },
  {
    title: 'Pruebas creativas',
    description: 'Produce más variaciones para TikTok, Instagram y anuncios pagados.',
    icon: Sparkles,
  },
  {
    title: 'Contenido de venta',
    description: 'Convierte clips de fundadores, expertos o voceros en activos repetibles.',
    icon: Video,
  },
  {
    title: 'Control',
    description: 'Mantén aprobaciones, descargas y decisiones de publicación en manos humanas.',
    icon: Shield,
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <nav className="fixed left-0 right-0 top-0 z-40 border-b border-border bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-accent/25 bg-accent/10">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <span className="text-lg font-semibold">Doble Labs</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            <a href="#capabilities" className="transition hover:text-text-primary">Capabilities</a>
            <a href="#workflow" className="transition hover:text-text-primary">Workflow</a>
            <a href="#roi" className="transition hover:text-text-primary">ROI</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-text-secondary transition hover:text-text-primary sm:inline">
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
            >
              Start creating
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[92vh] overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          src="/videos/vsl.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(5,15,11,0.96)_0%,_rgba(8,21,16,0.80)_48%,_rgba(8,21,16,0.50)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-emerald-200 backdrop-blur">
              <Play className="h-4 w-4 text-emerald-300" />
              Generación de video para crecer tu negocio
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Produce videos de alta calidad que ayuden a vender tu oferta.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Doble Labs le da a los negocios una plataforma para crear contenido corto, anuncios, escenas, aprobaciones y aprendizaje de rendimiento sin convertirlo en una herramienta de publicación automática.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
              >
                Genera tu primer video
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#capabilities"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-emerald-300/70 hover:bg-white/15"
              >
                Ver capacidades
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 rounded-lg border border-white/80 bg-white/90 px-3 py-3 text-sm font-medium text-text-secondary shadow-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-accent">Capacidades</p>
            <h2 className="mt-3 text-3xl font-semibold text-text-primary sm:text-4xl">
              De un video base a una línea de contenido de venta utilizable.
            </h2>
            <p className="mt-4 text-text-secondary">
              La plataforma está construida alrededor de generación, revisión, entrega y aprendizaje. Tú aportas los materiales base; Doble mantiene el flujo ordenado.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {capabilities.map((capability) => {
              const Icon = capability.icon
              return (
                <div key={capability.title} className="rounded-lg border border-border bg-bg-secondary p-6 shadow-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-lg border border-accent/25 bg-accent/10">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-text-primary">{capability.title}</h3>
                  <p className="mt-3 leading-7 text-text-secondary">{capability.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-border bg-bg-secondary px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">Flujo</p>
            <h2 className="mt-3 text-3xl font-semibold text-text-primary sm:text-4xl">
              Un flujo de estudio de video, no otro calendario.
            </h2>
            <p className="mt-4 leading-7 text-text-secondary">
              Doble Labs se enfoca en generar y mejorar el activo. La publicación sigue siendo manual para mantener control de canales, tiempos, comentarios y aprobaciones.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              ['1', 'Sube materiales base', 'Video principal, audio, contexto de marca y brief de campaña.'],
              ['2', 'Genera y monitorea', 'Los trabajos largos permanecen visibles en una cola persistente.'],
              ['3', 'Aprueba y descarga', 'Revisa el video generado, pide cambios o expórtalo para publicación manual.'],
              ['4', 'Reporta rendimiento', 'Captura vistas, interacción, retención y leads para decidir qué probar después.'],
            ].map(([number, title, description]) => (
              <div key={number} className="grid gap-4 rounded-lg border border-border bg-background p-5 shadow-sm sm:grid-cols-[44px_1fr]">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-sm font-bold text-white">{number}</div>
                <div>
                  <h3 className="font-semibold text-text-primary">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roi" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">Retorno</p>
            <h2 className="mt-3 text-3xl font-semibold text-text-primary sm:text-4xl">
              Prueba más ángulos de venta sin multiplicar días de producción.
            </h2>
            <p className="mt-4 leading-7 text-text-secondary">
              El caso de negocio es simple: más intentos de video de alta calidad, menos tiempo grabando, feedback más claro y ciclos más rápidos hacia los hooks que generan atención y demanda.
            </p>
            <Link
              href="/roi"
              className="mt-8 inline-flex items-center gap-2 rounded-lg border border-accent/40 px-5 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Explorar retorno
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {roiCards.map((card) => {
              const Icon = card.icon
              return (
              <div key={card.title} className="rounded-lg border border-border bg-bg-secondary p-5 shadow-sm">
                <Icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-semibold text-text-primary">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{card.description}</p>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Doble Labs</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-text-primary">Login</Link>
            <Link href="/signup" className="hover:text-text-primary">Start creating</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
