'use client'

import { useState } from 'react'
import { 
  Play, 
  CheckCircle2, 
  Users, 
  Building2, 
  Mail, 
  Linkedin,
  ArrowRight,
  Video,
  FileSpreadsheet,
  Sparkles,
  Send,
  Menu,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-[#2D2D35]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <span className="text-lg font-medium text-white pr-8">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#E040FB] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#E040FB] flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-6 text-[#9CA3AF] leading-relaxed animate-in slide-in-from-top-2 duration-200">
          {answer}
        </div>
      )}
    </div>
  )
}

// Feature Card Component
function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType
  title: string
  description: string 
}) {
  return (
    <div className="group p-6 sm:p-8 rounded-2xl bg-[#1A1A1F] border border-[#2D2D35] hover:border-[#E040FB]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#E040FB]/5">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E040FB]/20 to-[#B027F7]/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-[#E040FB]" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-[#9CA3AF] leading-relaxed">{description}</p>
    </div>
  )
}

// Step Card Component
function StepCard({ 
  number, 
  title, 
  description, 
  icon: Icon 
}: { 
  number: number
  title: string
  description: string
  icon: React.ElementType
}) {
  return (
    <div className="relative flex gap-4 sm:gap-6">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#E040FB] to-[#B027F7] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {number}
        </div>
        {number < 5 && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-[#E040FB]/50 to-transparent mt-4" />
        )}
      </div>
      <div className="pb-12 flex-1">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-5 h-5 text-[#E040FB]" />
          <h3 className="text-lg sm:text-xl font-semibold text-white">{title}</h3>
        </div>
        <p className="text-[#9CA3AF] leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// Use Case Card
function UseCaseCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType
  title: string
  description: string 
}) {
  return (
    <div className="p-6 rounded-xl bg-[#25252B] border border-[#2D2D35] hover:border-[#E040FB]/30 transition-all duration-300">
      <Icon className="w-8 h-8 text-[#E040FB] mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-[#9CA3AF] text-sm">{description}</p>
    </div>
  )
}

// Video Placeholder Component
function VideoPlaceholder() {
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#1A1A1F] to-[#25252B] border border-[#2D2D35] group cursor-pointer">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#E040FB_0%,_transparent_50%)] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#B027F7]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-[#E040FB]/20 rounded-full blur-3xl" />
      </div>
      
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E040FB]/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#E040FB]/30">
          <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white ml-1" />
        </div>
      </div>
      
      {/* Label */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <span className="text-xs sm:text-sm text-[#9CA3AF] bg-[#0D0D0F]/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
          Video Demo
        </span>
        <span className="text-xs sm:text-sm text-[#E040FB] font-medium">
          Reproducir
        </span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [email, setEmail] = useState('')

  const navLinks = [
    { href: '#como-funciona', label: 'Cómo Funciona' },
    { href: '#casos-de-uso', label: 'Casos de Uso' },
    { href: '#preguntas', label: 'Preguntas' },
  ]

  const faqs = [
    {
      question: '¿Qué hace que los videos personalizados sean más efectivos que el contenido de video regular?',
      answer: 'Los videos personalizados ofrecen tasas de engagement significativamente más altas porque hablan directamente de las necesidades específicas del cliente, sus puntos de dolor e intereses. Al personalizar el mensaje para diferentes segmentos de audiencia, creas conexiones emocionales más fuertes que impulsan mejores tasas de conversión, mayor tiempo de visualización y relaciones mejoradas con el cliente en comparación con el contenido de video único para todos.'
    },
    {
      question: '¿Qué tan rápido puedo crear variaciones de video personalizadas con LipDub AI?',
      answer: 'Una vez que subes tu video base, puedes generar nuevas versiones personalizadas en solo minutos. Nuestra IA procesa la sincronización labial automáticamente, por lo que puedes crear docenas o cientos de variaciones en el tiempo que tradicionalmente tomaría filmar solo un video, permitiendo un despliegue y optimización rápida de campañas.'
    },
    {
      question: '¿Puedo personalizar videos para diferentes idiomas y regiones?',
      answer: 'Sí, LipDub AI admite personalización en más de 150 idiomas y dialectos con clonación de voz perfecta y sincronización labial. Puedes crear versiones localizadas que mantienen la emoción y el rendimiento del hablante original mientras adaptas el mensaje para diferentes contextos culturales, permitiendo campañas de video personalizadas verdaderamente globales.'
    },
    {
      question: '¿Qué formatos de video y niveles de calidad admite LipDub AI?',
      answer: 'LipDub AI admite archivos profesionales MOV y MP4 hasta resolución 4K, trabajando con material sin graduar y graduado en espacios de color sRGB y Rec709. Esto asegura que tus videos personalizados mantengan estándares de calidad broadcast independientemente de tu material fuente o canal de distribución previsto.'
    },
    {
      question: '¿Cómo impacta el marketing de video personalizado en las tasas de conversión?',
      answer: 'Los videos personalizados típicamente ven tasas de conversión 2-5x más altas en comparación con el contenido de video genérico porque abordan necesidades específicas del cliente y crean conexiones emocionales más fuertes. La capacidad de probar múltiples versiones personalizadas también permite una optimización continua, liderando a un rendimiento mejorado a lo largo del tiempo.'
    },
    {
      question: '¿Es rentable crear videos personalizados a escala?',
      answer: 'La producción tradicional de video personalizado cuesta miles de dólares por variación, haciendo que las campañas a gran escala sean prohibitivamente caras. LipDub AI reduce estos costos en más del 90% al eliminar la necesidad de múltiples filmaciones, permitiéndote crear cientos de videos personalizados por el mismo presupuesto que anteriormente producía solo unos pocos.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0F]/80 backdrop-blur-xl border-b border-[#2D2D35]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/landing" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E040FB] to-[#B027F7] flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Jaime<span className="text-[#E040FB]">AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[#9CA3AF] hover:text-white transition-colors text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-[#9CA3AF] hover:text-white transition-colors text-sm font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#E040FB] to-[#B027F7] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Comenzar Gratis
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1A1A1F] border-t border-[#2D2D35]">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-[#9CA3AF] hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-[#2D2D35] space-y-2">
                <Link
                  href="/login"
                  className="block py-2 text-[#9CA3AF] hover:text-white transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/signup"
                  className="block py-2 px-4 rounded-lg bg-gradient-to-r from-[#E040FB] to-[#B027F7] text-white text-center font-medium"
                >
                  Comenzar Gratis
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Una Mejor Forma de{' '}
                <span className="gradient-text">Personalizar Video</span>
              </h1>
              <p className="text-lg sm:text-xl text-[#9CA3AF] mb-6 leading-relaxed">
                La IA hizo la personalización de video más rápida, pero no mejor. 
                Los avatares y voces sintéticas rompen la confianza.
              </p>
              <p className="text-lg text-white mb-8">
                <strong className="text-[#E040FB]">Jaime AI elimina ese compromiso.</strong>{' '}
                Te permitimos personalizar video real — tu rostro, tu voz, tu mensaje — a escala.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#E040FB] to-[#B027F7] text-white font-semibold hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Comenzar Gratis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#como-funciona"
                  className="px-8 py-4 rounded-xl border border-[#2D2D35] text-white font-semibold hover:bg-[#1A1A1F] transition-all flex items-center justify-center gap-2"
                >
                  Ver Cómo Funciona
                </a>
              </div>
              
              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E040FB]" />
                  <span>Sin tarjeta requerida</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E040FB]" />
                  <span>150+ idiomas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E040FB]" />
                  <span>Calidad 4K</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <VideoPlaceholder />
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#E040FB]/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[#B027F7]/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1A1A1F]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Por Qué <span className="gradient-text">Jaime AI</span> Es Diferente
            </h2>
            <p className="text-[#9CA3AF] text-lg max-w-2xl mx-auto">
              No más compromisos entre volumen y realismo
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={CheckCircle2}
              title="Realismo Que Genera Confianza"
              description="Cada video se ve y se siente auténtico con habla natural, sincronización labial perfecta y tono humano real. Sin avatares. Sin automatización extraña."
            />
            <FeatureCard
              icon={Users}
              title="Personalización Que Escala"
              description="Graba una vez. Importa tu CSV o datos de CRM. Genera cientos o miles de videos 1-a-1 que tu equipo puede enviar con confianza."
            />
            <FeatureCard
              icon={Building2}
              title="Diseñado Para Flujos de Ventas"
              description="Diseñado para outbound, seguimientos, LinkedIn y secuencias de email. Rápido de crear, seguro para la marca y listo para enviar donde tu equipo ya trabaja."
            />
            <FeatureCard
              icon={Sparkles}
              title="Resultados Que Impulsan Pipeline"
              description="Los equipos que usan video personalizado ven hasta 2x más respuestas y reuniones agendadas en comparación con outreach de email estándar."
            />
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="casos-de-uso" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Para Quién Está <span className="gradient-text">Construido</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <UseCaseCard
              icon={Send}
              title="Ventas Outbound"
              description="Envía videos personalizados que realmente obtienen respuestas"
            />
            <UseCaseCard
              icon={Building2}
              title="Campañas ABM"
              description="Personaliza contenido para cada cuenta objetivo sin regrabar"
            />
            <UseCaseCard
              icon={Users}
              title="Marketing al Cliente"
              description="Reengancha, haz upsell o agradece a clientes con video auténtico"
            />
            <UseCaseCard
              icon={Mail}
              title="Email Marketing"
              description="Destaca en bandejas de entrada y feeds saturados"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1A1A1F]/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Cómo <span className="gradient-text">Funciona</span>
              </h2>
              <p className="text-[#9CA3AF] text-lg mb-10">
                De la grabación al envío en simples pasos
              </p>

              <div className="space-y-0">
                <StepCard
                  number={1}
                  icon={Video}
                  title="Graba Una Vez"
                  description="Graba un mensaje auténtico — sin guiones, sin repeticiones."
                />
                <StepCard
                  number={2}
                  icon={Sparkles}
                  title="Resalta Tus Variables"
                  description="Nuestra IA transcribe tu video. Resalta palabras como nombres o empresas, haz clic en Agregar Variable y listo."
                />
                <StepCard
                  number={3}
                  icon={FileSpreadsheet}
                  title="Importa Tus Datos"
                  description="Sube un CSV o conecta tu CRM. Emparejamos automáticamente cada variable con tus contactos."
                />
                <StepCard
                  number={4}
                  icon={Sparkles}
                  title="Genera Tus Videos"
                  description="Obtén cientos de videos personalizados hiperrealistas que se ven y suenan completamente naturales."
                />
                <StepCard
                  number={5}
                  icon={Send}
                  title="Envía A Cualquier Lugar"
                  description="Comparte videos personalizados vía email, mensajes de LinkedIn o campañas — sin afectar la entregabilidad."
                />
              </div>
            </div>

            <div className="lg:sticky lg:top-32">
              <VideoPlaceholder />
              <div className="mt-6 p-6 rounded-xl bg-[#25252B] border border-[#2D2D35]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#E040FB]/20 flex items-center justify-center">
                    <Linkedin className="w-5 h-5 text-[#E040FB]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Mensaje Enviado</p>
                    <p className="text-[#6B7280] text-sm">Hace 2 minutos</p>
                  </div>
                </div>
                <p className="text-[#9CA3AF] text-sm">
                  &ldquo;¡Hola Carlos! Vi que tu empresa está expandiéndose a México. 
                  Tengo algunas ideas sobre cómo podemos ayudar...&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '2x', label: 'Más Respuestas' },
              { value: '90%', label: 'Reducción de Costos' },
              { value: '150+', label: 'Idiomas Soportados' },
              { value: '4K', label: 'Calidad de Video' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-[#9CA3AF]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="preguntas" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1A1A1F]/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Preguntas <span className="gradient-text">Frecuentes</span>
            </h2>
            <p className="text-[#9CA3AF]">
              No dudes en contactarnos si tienes alguna pregunta
            </p>
          </div>

          <div className="space-y-0">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E040FB]/20 to-[#B027F7]/20 border border-[#E040FB]/30 p-8 sm:p-12 lg:p-16 text-center">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#E040FB]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#B027F7]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Obtén Acceso Temprano al Video Personalizado Real
              </h2>
              <p className="text-[#9CA3AF] text-lg mb-8 max-w-2xl mx-auto">
                Estamos construyendo la próxima generación de video personalizado para equipos de ventas modernos. Únete a la lista de espera para acceso temprano.
              </p>
              
              <form 
                onSubmit={(e) => { e.preventDefault(); alert('¡Gracias por tu interés! Te contactaremos pronto.'); setEmail(''); }}
                className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-8"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex-1 px-4 py-3 rounded-xl bg-[#0D0D0F] border border-[#2D2D35] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#E040FB] transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E040FB] to-[#B027F7] text-white font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Unirse a la Lista
                </button>
              </form>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="px-8 py-3 rounded-xl bg-white text-[#0D0D0F] font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  Crear Cuenta Gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert('Demo próximamente disponible'); }}
                  className="text-[#9CA3AF] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Ver Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#2D2D35]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/landing" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E040FB] to-[#B027F7] flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Jaime<span className="text-[#E040FB]">AI</span>
              </span>
            </Link>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <a href="#" className="text-[#9CA3AF] hover:text-white transition-colors">
                Términos de Servicio
              </a>
              <a href="#" className="text-[#9CA3AF] hover:text-white transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-[#9CA3AF] hover:text-white transition-colors">
                Contacto
              </a>
            </div>

            {/* Copyright */}
            <p className="text-[#6B7280] text-sm">
              © 2025 Jaime AI. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
