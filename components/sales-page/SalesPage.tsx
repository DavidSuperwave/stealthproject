import Link from 'next/link'
import type { ReactNode } from 'react'
import CalendlyEmbed from '@/components/sales-page/CalendlyEmbed'
import HowItWorksSequence from '@/components/sales-page/HowItWorksSequence'
import SmartCalendlyButton from '@/components/sales-page/SmartCalendlyButton'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from 'lucide-react'

const phoneDisplay = '+52 81 2872 6879'
const phoneHref = 'tel:+528128726879'
const whatsappHref = 'https://wa.me/528128726879'
const tellaVslEmbedUrl =
  'https://www.tella.tv/video/escala-tu-negocio-con-clones-de-ia-6j16/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0'
const adAccelerationVisualUrl =
  'https://framerusercontent.com/images/6QINNRpwITTNKcuklGx6QYbFBc.svg?width=536&height=303'

const ctaClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover'

const secondaryCtaClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-text-secondary shadow-sm transition hover:border-accent/50 hover:text-text-primary'

const sectionClass = 'px-4 py-16 sm:px-6 sm:py-20 lg:px-8'
const containerClass = 'mx-auto max-w-7xl'
const cardClass =
  'rounded-[28px] border border-border/80 bg-white p-6 shadow-[0_18px_60px_rgba(13,31,23,0.08)]'

const pains = [
  'No quieres grabar 10 horas a la semana para mantenerte visible.',
  'No quieres contratar editores, camarógrafos, copywriters y media buyers por separado.',
  'Tu experiencia no se convierte en contenido porque no existe un sistema de producción.',
  'La empresa que sí use IA para educar, aparecer y vender puede empezar a comerte mercado.',
]

const useCases = [
  {
    label: 'Ejemplo 1',
    title: 'Un video abrió una audiencia nueva',
    eyebrow: '392 seguidores nuevos desde un nicho donde no existía una marca personal previa.',
    before:
      'El objetivo era probar el alcance de un video creado con el sistema en un tema de interés personal, pero sin una audiencia construida alrededor de ese nicho.',
    after:
      'El video generó tracción suficiente para atraer 392 personas nuevas: una audiencia que no habría llegado sin publicar esa pieza.',
    proof: '392 seguidores nuevos',
    metrics: ['1 video publicado', '392 nuevos seguidores', 'Nueva audiencia alcanzada'],
    layout: 'text-left',
  },
  {
    label: 'Ejemplo 2',
    title: 'Despacho jurídico de cero presencia a autoridad visible',
    eyebrow: 'Un despacho sin historial de video construyó presencia, autoridad y confianza con contenido educativo.',
    before:
      'El despacho no tenía presencia en línea: nadie lo encontraba, nadie sabía que existía y escalar servicios legales con anuncios tradicionales era difícil.',
    after:
      'Creamos su clon de IA y publicamos videos semanales explicando conceptos clave, qué hacer en casos reales e insights prácticos para posicionarlo como autoridad en accidentes graves.',
    proof: '159k seguidores en Facebook e Instagram, más presencia en TikTok',
    metrics: ['0 presencia inicial', '159k seguidores FB/IG', 'Contenido semanal en plataformas'],
    layout: 'media-left',
  },
  {
    label: 'Ejemplo 3',
    title: 'Anuncios con clones para una oferta de IA',
    eyebrow: 'Tres variantes de anuncio creadas rápido para un nicho difícil de explicar con publicidad tradicional.',
    before:
      'La oferta de agentes autónomos de IA era técnica, de nicho y difícil para correr anuncios. Producir múltiples videos manuales habría tomado demasiado tiempo y dinero.',
    after:
      'Se generaron tres variantes, incluyendo una versión con clon de IA. Con 3,000 pesos de inversión llegaron 106 clientes potenciales, a unos 23 pesos por lead, con 60,000 pesos atribuidos a la campaña.',
    proof: '3,000 pesos invertidos, 106 leads, 20x de retorno',
    metrics: ['106 leads', '23 pesos por lead', '60,000 pesos atribuidos'],
    layout: 'text-left',
  },
]

const deliverables = [
  ['Videógrafo de IA', 'Capturamos tus activos base y los convertimos en un sistema de video que no depende de grabaciones constantes.'],
  ['Editor short-form', 'Preparamos videos listos para publicar con estructura, cortes, captions y formato para redes o anuncios.'],
  ['Copywriter', 'Creamos hooks, guiones, objeciones, comparaciones y mensajes diseñados para educar y mover al prospecto.'],
  ['Estrategia de medios', 'Definimos qué ángulos probar, qué canales usar y cómo convertir atención en conversaciones comerciales.'],
  ['Pruebas de anuncios', 'Cuando tiene sentido, convertimos los mejores ángulos en campañas pagadas para validar más rápido.'],
  ['Análisis de rendimiento', 'Rastreamos métricas, detectamos patrones y duplicamos lo que empieza a generar atención, leads o ventas.'],
  ['Sistema delegado', 'No necesitas coordinar un equipo fragmentado. Doble Labs opera el sistema contigo de inicio a fin.'],
  ['Optimización continua', 'El sistema no se crea una vez y se olvida: se ajusta con datos para mejorar semana tras semana.'],
]

const comparisons = [
  ['25k-35k pesos al mes en producción tradicional', 'Un sistema enfocado en clones, guiones, edición y distribución'],
  ['10-15 horas semanales grabando, editando y coordinando', 'Activos base que permiten crear más contenido sin grabar todos los días'],
  ['Videógrafo, editor, copywriter, media buyer y analista separados', 'Un equipo especializado trabajando sobre un mismo sistema'],
  ['Hasta 500k pesos al año sin garantía de aprendizaje real', 'Pruebas más rápidas para encontrar ángulos que sí muevan el mercado'],
  ['Pocas piezas y demasiada fricción operativa', 'Mayor volumen de videos educativos, anuncios y variantes listas para usar'],
]

const faqs = [
  ['¿Para quién es este sistema?', 'Es para proveedores de servicios B2B, abogados, consultores, coaches, profesionales independientes y emprendedores de servicios que necesitan autoridad, presencia y confianza para cerrar oportunidades de mayor valor.'],
  ['¿Para quién no es?', 'No está pensado para marcas de ecommerce que solo quieren hacerse virales de la noche a la mañana, ni para quien busca convertirse en influencer local sin una oferta clara detrás.'],
  ['¿Necesito grabar todos los días?', 'No. La idea es evitar que tengas que sentarte a grabar 10 horas por semana. Empezamos con activos base, estrategia y guiones para producir con clones de IA.'],
  ['¿El clon debe ser de una persona real?', 'Lo ideal es que sí. Podemos usar avatares genéricos, pero el mayor impacto suele venir de una persona real porque la gente compra a personas que conoce y en quienes confía.'],
  ['¿La gente nota que es IA?', 'Los clones son hiperrealistas y, con buenos activos base, la mayoría de las personas no lo nota. Aun así, la calidad depende del material inicial, el estilo y la aprobación final.'],
  ['¿Mis activos y datos están seguros?', 'Tus activos siguen siendo tuyos. Trabajamos con una lógica de seguridad empresarial y tratamos tus videos, voz y materiales como propiedad exclusiva del cliente.'],
  ['¿Esto reemplaza a mi equipo de marketing?', 'Puede complementar o reducir la carga de tu equipo. Doble Labs funciona como videógrafo, editor, copywriter, estrategia de medios y análisis especializado en contenido con IA.'],
  ['¿También manejan anuncios?', 'Sí, cuando tiene sentido. Podemos usar los mejores ángulos orgánicos o crear variantes específicas para Meta, TikTok u otros canales pagados.'],
  ['¿Qué pasa si mi negocio no es buena opción?', 'Te lo diremos en la llamada. La sesión sirve para revisar tu oferta, mercado, canales y capacidad de conversión antes de recomendarte el sistema.'],
]

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
      {children}
    </p>
  )
}

function CalendlySection({ id, label }: { id: string; label: string }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className={`${cardClass} mx-auto max-w-5xl p-5 sm:p-6`}>
        <div className="rounded-[24px] border border-accent/20 bg-accent/5 p-4 text-center sm:p-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-accent/20 bg-white text-accent shadow-sm">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {label}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-text-primary sm:text-3xl">
            Agenda tu llamada con Doble Labs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-text-secondary">
            Elige el horario que mejor te funcione. Si prefieres hablar ahora, también puedes llamar o escribir por WhatsApp abajo.
          </p>
          <div className="mt-6 rounded-[24px] bg-white p-2 shadow-sm">
            <CalendlyEmbed />
          </div>
        </div>
      </div>
    </section>
  )
}

function DirectContactBlock() {
  return (
    <div className="mx-auto mt-6 flex max-w-5xl flex-col gap-3 rounded-[24px] border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-text-primary">¿Prefieres hablar ahora?</p>
        <p className="text-sm text-text-secondary">Llama o escribe por WhatsApp: {phoneDisplay}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={phoneHref} className={secondaryCtaClass}>
          <Phone className="h-4 w-4" />
          Llamar
        </a>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className={ctaClass}>
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </div>
  )
}

function ProofVisual({ proof, title }: { proof: string; title: string }) {
  return (
    <div className="flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[28px] border border-border bg-text-primary p-4 shadow-[0_18px_60px_rgba(13,31,23,0.12)]">
      <div className="relative aspect-video overflow-hidden rounded-[22px] border border-white/12 bg-[radial-gradient(circle_at_25%_20%,rgba(18,214,163,0.36),transparent_34%),linear-gradient(135deg,#081f17,#0f4f3b_55%,#087a4b)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.1)_45%,transparent_70%)]" />
        <div className="absolute left-5 top-5 grid h-12 w-12 place-items-center rounded-full border border-white/18 bg-white/12 text-white backdrop-blur">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur">
            Video ejemplo
          </span>
          <h4 className="mt-3 text-xl font-semibold leading-tight text-white">{title}</h4>
        </div>
      </div>
      <p className="mt-4 rounded-2xl border border-white/14 bg-white/10 p-4 text-sm font-semibold leading-6 text-white/78">
        {proof}
      </p>
    </div>
  )
}

function UseCaseSection({ item }: { item: (typeof useCases)[number] }) {
  const text = (
    <div className={cardClass}>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">{item.label}</p>
      <h3 className="mt-3 text-3xl font-semibold text-text-primary">{item.title}</h3>
      <p className="mt-2 font-medium text-text-secondary">{item.eyebrow}</p>
      <div className="mt-6 grid gap-4">
        <div>
          <p className="text-sm font-semibold text-text-primary">Antes</p>
          <p className="mt-2 leading-7 text-text-secondary">{item.before}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Después</p>
          <p className="mt-2 leading-7 text-text-secondary">{item.after}</p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/10 p-4 text-sm font-semibold text-accent">
        {item.proof}
      </div>
      <div className="mt-4 grid gap-3">
        {item.metrics.map((metric) => (
          <div key={metric} className="rounded-2xl border border-border bg-bg-elevated p-4">
            <p className="text-lg font-semibold text-text-primary">{metric}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const visual = <ProofVisual proof={item.proof} title={item.title} />

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
      {text}
      {visual}
    </div>
  )
}

export default function SalesPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-border bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-accent/25 bg-accent/10">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <span className="text-lg font-semibold text-text-primary">Doble Labs</span>
          </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-text-secondary md:flex">
              <a href="#como-funciona" className="transition hover:text-text-primary">Cómo funciona</a>
              <a href="#faq" className="transition hover:text-text-primary">FAQ</a>
            </nav>
          <SmartCalendlyButton className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover" />
        </div>
      </header>

      <section className="border-b border-border bg-background pt-16">
        <div className={`${containerClass} flex flex-col px-4 pb-12 pt-20 text-center sm:px-6 sm:pb-16 sm:pt-24 lg:px-8`}>
          <div className="order-1 mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-accent/25 bg-white/90 px-4 py-2 text-sm font-semibold text-accent shadow-sm backdrop-blur">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Sistema delegado de captación con clones de IA
          </div>
          <h1 className="order-2 mx-auto mt-6 max-w-5xl text-4xl font-semibold leading-tight text-text-primary sm:text-6xl lg:text-7xl">
            Construimos y gestionamos tu sistema de captación de clientes con clones de inteligencia artificial.
          </h1>
          <p className="order-4 mx-auto mt-6 max-w-3xl text-lg leading-8 text-text-secondary sm:order-3">
            Necesitas un solo video viral o un solo anuncio ganador para abrir un canal de ventas escalable. Doble Labs te ayuda a producirlo sin grabar 10 horas a la semana, sin coordinar editores y sin levantar un equipo completo desde cero.
          </p>
          <div id="vsl-video" className="vsl-gradient-frame order-3 mx-auto mt-8 w-full max-w-5xl scroll-mt-24 sm:order-5 sm:mt-12">
            <div className="overflow-hidden rounded-[24px] bg-text-primary">
              <iframe
                className="aspect-video w-full border-0"
                src={tellaVslEmbedUrl}
                title="Escala tu negocio con clones de IA"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <CalendlySection id="book-top" label="Agenda tu sesión estratégica" />
        <DirectContactBlock />
      </section>

      <section className={sectionClass}>
        <div className={`${containerClass} grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}>
          <div>
            <SectionLabel>El problema</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-text-primary sm:text-5xl">
              La mayoría de los negocios no publican porque el costo operativo del contenido es demasiado alto.
            </h2>
            <p className="mt-5 leading-8 text-text-secondary">
              Si quieres hacerlo de forma tradicional, necesitas videógrafo, editor, copywriter, estrategia de medios, experto en anuncios y alguien que analice los resultados. Además, sigues dependiendo de tu tiempo personal para grabar, revisar y coordinar.
            </p>
            <p className="mt-4 leading-8 text-text-secondary">
              Doble Labs convierte tu experiencia, tu voz y tu forma de explicar en un sistema de contenido y captación que se puede probar, medir y optimizar sin que tengas que vivir frente a la cámara.
            </p>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_18px_60px_rgba(13,31,23,0.08)]">
            <div className="border-b border-border bg-bg-elevated px-5 py-4 sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                Lo que bloquea el crecimiento
              </p>
            </div>
            <div className="divide-y divide-border">
              {pains.map((pain, index) => (
                <div
                  key={pain}
                  className="vsl-problem-row grid gap-4 px-5 py-5 sm:grid-cols-[44px_1fr] sm:px-6"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-200/80">
                    <X className="h-5 w-5 stroke-[3]" aria-hidden="true" />
                  </div>
                  <p className="self-center font-semibold leading-7 text-text-primary">{pain}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-border bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className={containerClass}>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Cómo funciona</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-5xl">
              De un activo base a un sistema completo de contenido, anuncios y aprendizaje.
            </h2>
          </div>
          <HowItWorksSequence />
        </div>
      </section>

      <section className={sectionClass}>
        <div className={`${containerClass} space-y-6`}>
          <div className="max-w-3xl">
            <SectionLabel>Prueba y transformación</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-5xl">
              Resultados que muestran el alcance del sistema.
            </h2>
            <p className="mt-4 leading-8 text-text-secondary">
              Estos ejemplos vienen del VSL: alcance orgánico, autoridad para un despacho jurídico y anuncios con clones para una oferta técnica de IA.
            </p>
          </div>
          <div className="space-y-8">
            {useCases.map((item) => (
              <UseCaseSection key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className={`${containerClass} grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start`}>
          <div>
            <SectionLabel>Comparación</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-5xl">
              La forma tradicional cuesta más, tarda más y exige demasiada coordinación.
            </h2>
            <p className="mt-5 leading-8 text-text-secondary">
              El problema no es solo el dinero. Es la fricción de coordinar personas, grabaciones, edición, estrategia, anuncios y análisis sin saber todavía qué ángulo va a funcionar.
            </p>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-border bg-white shadow-sm">
            <div className="grid grid-cols-2 border-b border-border bg-bg-elevated text-sm font-semibold text-text-primary">
              <div className="p-4">Método tradicional</div>
              <div className="border-l border-border p-4">Doble Labs</div>
            </div>
            {comparisons.map(([traditional, doble]) => (
              <div key={traditional} className="grid grid-cols-2 border-b border-border last:border-b-0">
                <div className="p-4 text-sm leading-6 text-text-secondary">{traditional}</div>
                <div className="border-l border-border bg-accent/5 p-4 text-sm font-semibold leading-6 text-text-primary">
                  {doble}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={containerClass}>
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Qué incluye</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-5xl">
              Doble Labs opera como tu equipo de contenido con IA.
            </h2>
            <p className="mt-4 leading-8 text-text-secondary">
              Somos la combinación de producción, edición, copywriting, estrategia de medios y análisis que normalmente tendrías que contratar por separado.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deliverables.map(([title, body]) => (
              <div key={title} className="rounded-[24px] border border-border bg-white p-5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href="#book-bottom" className={ctaClass}>
              Agendar mi llamada
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={`${containerClass} rounded-[32px] bg-text-primary p-6 text-white shadow-[0_24px_80px_rgba(13,31,23,0.18)] sm:p-8 lg:p-10`}>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Aceleración con anuncios</p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-5xl">
                Con anuncios, puedes ver señales desde el día uno.
              </h2>
              <p className="mt-5 leading-8 text-white/78">
                El VSL muestra cómo una campaña con clones generó 106 clientes potenciales con 3,000 pesos de inversión. No se trata de adivinar: se trata de probar variantes, medir costo por resultado y escalar el ángulo correcto.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-3 shadow-[0_20px_70px_rgba(3,28,20,0.28)] backdrop-blur">
              <img
                src={adAccelerationVisualUrl}
                alt="Ejemplo visual de aceleración con anuncios"
                className="w-full rounded-[22px] bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className={containerClass}>
          <CalendlySection id="book-bottom" label="Último paso" />
          <DirectContactBlock />
        </div>
      </section>

      <section id="faq" className={sectionClass}>
        <div className={`${containerClass} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div>
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-5xl">
              Objeciones importantes antes de agendar.
            </h2>
          </div>
          <div className="grid gap-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-[24px] border border-border bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-text-primary">
                  {question}
                  <ChevronRight className="h-5 w-5 shrink-0 text-accent transition group-open:rotate-90" />
                </summary>
                <p className="mt-4 leading-7 text-text-secondary">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-text-primary">Doble Labs</p>
            <p className="mt-1">Construimos sistemas de captación y contenido con clones de IA para negocios de servicios.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href={phoneHref} className="hover:text-text-primary">{phoneDisplay}</a>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="hover:text-text-primary">WhatsApp</a>
            <Link href="/" className="hover:text-text-primary">Inicio</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
