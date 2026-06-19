'use client'

import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, FileText, Rocket, Video, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const steps = [
  {
    number: '1',
    title: 'Capturamos tu clon',
    body: 'Creamos un video maestro para capturar tus ademanes, tu voz, tu estilo de comunicación y la forma en la que explicas tu oferta.',
    icon: Video,
    visual: 'bars',
  },
  {
    number: '2',
    title: 'Diseñamos la estrategia',
    body: 'Analizamos tu negocio, tus clientes ideales, tus objeciones y los mensajes que pueden convertir atención en conversaciones reales.',
    icon: ClipboardList,
    visual: 'arc',
  },
  {
    number: '3',
    title: 'Producimos variantes',
    body: 'Generamos videos con clones de IA, probamos ángulos, editamos piezas cortas y preparamos formatos para contenido orgánico o anuncios.',
    icon: Wand2,
    visual: 'scatter',
  },
  {
    number: '4',
    title: 'Distribuimos y optimizamos',
    body: 'Entregamos videos para tus canales, revisamos métricas y ajustamos el sistema para escalar lo que empieza a funcionar.',
    icon: Rocket,
    visual: 'lift',
  },
]

function MiniVisual({ type }: { type: string }) {
  if (type === 'arc') {
    return (
      <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-b from-bg-elevated to-white">
        <div className="absolute left-1/2 top-16 h-28 w-28 -translate-x-1/2 rounded-full border border-border bg-white shadow-sm" />
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="absolute grid h-9 w-9 place-items-center rounded-full border border-border bg-white text-accent shadow-sm"
            style={{
              left: `${14 + item * 18}%`,
              top: `${70 - Math.abs(2 - item) * 14}px`,
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
          </div>
        ))}
        <div className="absolute left-1/2 top-8 grid h-16 w-11 -translate-x-1/2 place-items-center rounded-full bg-accent text-white shadow-lg">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </div>
    )
  }

  if (type === 'scatter') {
    return (
      <div className="relative h-32 overflow-hidden rounded-2xl bg-white">
        {[16, 42, 68, 94].map((top) => (
          <div key={top} className="absolute left-0 right-0 border-t border-dashed border-border" style={{ top }} />
        ))}
        {[
          [14, 84, 8],
          [28, 60, 7],
          [42, 88, 9],
          [55, 48, 16],
          [67, 72, 7],
          [76, 34, 22],
          [86, 64, 8],
        ].map(([left, top, size]) => (
          <div
            key={`${left}-${top}`}
            className="absolute rounded-full bg-accent shadow-sm"
            style={{ left: `${left}%`, top, height: size, width: size }}
          />
        ))}
        <div className="absolute left-[40%] top-5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">+26%</div>
        <div className="absolute left-[66%] top-14 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">+2.6%</div>
      </div>
    )
  }

  if (type === 'lift') {
    return (
      <div className="relative h-32 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="absolute inset-x-4 top-9 h-px bg-border" />
        <div className="absolute left-1/2 top-5 h-20 w-20 -translate-x-1/2 rotate-45 rounded-2xl bg-accent" />
        <div className="absolute left-1/2 top-8 -translate-x-1/2 text-3xl font-semibold text-white">20%</div>
        <div className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-accent">
          Más señales
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-32 overflow-hidden rounded-2xl bg-white">
      <div className="absolute bottom-0 left-0 right-0 flex h-24 items-end gap-1 px-2">
        {[44, 36, 56, 52, 72, 72, 72, 72, 72, 72].map((height, index) => (
          <div key={`${height}-${index}`} className="flex-1 rounded-t-sm bg-accent/35" style={{ height }} />
        ))}
      </div>
      <svg className="absolute inset-x-3 bottom-9 h-20 text-accent" viewBox="0 0 260 90" fill="none" aria-hidden="true">
        <path d="M0 62L56 82L103 42L156 52L205 18L260 18" stroke="currentColor" strokeWidth="6" />
      </svg>
      <BarChart3 className="absolute right-4 top-4 h-5 w-5 text-accent" />
    </div>
  )
}

export default function HowItWorksSequence() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const hasStartedRef = useRef(false)
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setVisibleCount(steps.length)
      return
    }

    let intervalId: number | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasStartedRef.current) return
        hasStartedRef.current = true
        setVisibleCount(1)
        intervalId = window.setInterval(() => {
          setVisibleCount((current) => {
            if (current >= steps.length) {
              if (intervalId) window.clearInterval(intervalId)
              return current
            }
            return current + 1
          })
        }, 1000)
      },
      { threshold: 0.12 }
    )

    observer.observe(root)

    return () => {
      observer.disconnect()
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [])

  return (
    <div ref={rootRef} className="vsl-how-frame mt-12">
      <div className="grid overflow-hidden rounded-[26px] bg-white lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isVisible = index < visibleCount
          return (
            <div
              key={step.number}
              className={`vsl-how-card relative min-h-[520px] border-border bg-white p-7 transition duration-700 lg:border-r lg:last:border-r-0 ${
                isVisible ? 'is-visible' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-bg-secondary text-lg font-semibold text-text-primary">
                  {step.number}.
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-7 text-2xl font-semibold leading-tight text-text-primary">{step.title}</h3>
              <p className="mt-4 text-base font-semibold leading-7 text-text-secondary">{step.body}</p>
              <div className="mt-8">
                <MiniVisual type={step.visual} />
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:grid absolute -right-5 top-1/2 z-10 h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-white text-text-primary shadow-sm">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
              {index < steps.length - 1 && (
                <div className="mx-auto mt-7 grid h-10 w-10 place-items-center rounded-full border border-border bg-white text-text-primary shadow-sm lg:hidden">
                  <ArrowRight className="h-5 w-5 rotate-90" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
