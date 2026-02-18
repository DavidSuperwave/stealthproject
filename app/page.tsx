'use client'

import { useState } from 'react'
import { 
  Play, 
  CheckCircle2, 
  Users, 
  Building2, 
  Linkedin,
  ArrowRight,
  Video,
  FileSpreadsheet,
  Sparkles,
  Send,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Move
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
        {number < 4 && (
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

// Video Player Component with Vimeo Embed (Hero)
function VideoPlayer() {
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#0D0D0F] border border-[#2D2D35]">
      <iframe
        src="https://player.vimeo.com/video/1165562311?h=fa0dedf19f&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479"
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        title="DobleLabs VSL"
      />
      <script src="https://player.vimeo.com/api/player.js" />
    </div>
  )
}

// Feature Video Player Component with Tella.tv Embed
function FeatureVideoPlayer() {
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#0D0D0F] border border-[#2D2D35]">
      <iframe
        src="https://www.tella.tv/video/como-funciona-doblelabs-61vt/embed"
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        title="Cómo Funciona DobleLabs"
      />
    </div>
  )
}

// Video Placeholder Component (fallback/loading state)
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

  const navLinks = [
    { href: '#como-funciona', label: 'Cómo Funciona' },
    { href: '#para-quien', label: 'Para Quién' },
    { href: '#preguntas', label: 'Preguntas' },
  ]

  const faqs = [
    {
      question: '¿Puedo crear contenido con doblaje de IA sin grabar?',
      answer: 'Sí, Doble Labs te permite crear contenido sin necesidad de grabar utilizando tu "doble digital". Simplemente cargas tu audio, y el sistema generará videos tuyos hablando con sincronización labial perfecta, ahorrándote tiempo y recursos mientras mantienes tu presencia auténtica.'
    },
    {
      question: '¿El doblaje con IA puede preservar la emoción y la interpretación?',
      answer: 'Sí, la tecnología de doblaje de Doble Labs preserva las expresiones faciales y los matices emocionales en tus videos. El sistema mantiene la articulación, la emoción y la fidelidad de textura incluso en escenas dinámicas con primeros planos y movimiento, asegurando que tu video se vea REAL, no algo claramente hecho con IA.'
    },
    {
      question: '¿Qué formatos de video son compatibles?',
      answer: 'La plataforma actualmente admite archivos MOV o MP4 en resolución profesional, hasta 4K, tanto material sin corrección de color como con corrección aplicada. Los espacios de color compatibles incluyen sRGB y Rec709. Para obtener los mejores resultados, evita material manipulado, como superposiciones de texto sobre el rostro o algo que obstruya tu cara. Toma en cuenta que el vídeo maestro que cargues es el vídeo con el cual saldrán todos los vídeos finales, entonces procura cargarlo de la mejor manera.'
    },
    {
      question: '¿Por qué no usar HeyGen u otras soluciones más económicas para clonarte?',
      answer: 'Claro que puedes usarlas. Pero esta solución no está diseñada para quien solo quiere "algo que más o menos funcione". Está pensada para quien quiere videos de máxima calidad, que pasen completamente desapercibidos… no para quien está cómodo con algo que grita "esto es IA" a los tres segundos. Si tu prioridad es simplemente subir contenido por subir, sin importar si se ve artificial o genérico, probablemente no necesites esto. Pero si quieres que tu clon digital se vea real, natural y profesional… entonces estamos hablando el mismo idioma.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0F]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0F]/80 backdrop-blur-xl border-b border-[#2D2D35]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E040FB] to-[#B027F7] flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Doble<span className="text-[#E040FB]">Labs</span>
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
                Regístrate Gratis
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
                  Regístrate Gratis
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
                Nunca más vuelvas a{' '}
                <span className="gradient-text">grabarte</span>
              </h1>
              <p className="text-lg sm:text-xl text-[#9CA3AF] mb-8 leading-relaxed">
                Clonate con IA sin perder el realismo, emoción o calidad de tu vídeo original. 
                Ideal para crear contenido, hacer anuncios, o crear cursos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#E040FB] to-[#B027F7] text-white font-semibold hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Regístrate Gratis
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
                  <span>Calidad 4K</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E040FB]" />
                  <span>Tus datos te pertenecen</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <VideoPlayer />
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
              Por Qué <span className="gradient-text">Doble Labs</span> Es Diferente
            </h2>
            <p className="text-[#9CA3AF] text-lg max-w-2xl mx-auto">
              Tecnología propietaria diseñada para resultados que pasan desapercibidos
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={CheckCircle2}
              title="Alta Fidelidad"
              description="Doble Labs preserva los detalles únicos de los dientes, el vello facial, el tono y la textura de la piel del ponente mejor que cualquier otra solución."
            />
            <FeatureCard
              icon={Shield}
              title="Propiedad de los Datos"
              description="No entrenamos ni mejoramos nuestros modelos con el contenido de video que subes. Tus datos siempre te pertenecen por defecto."
            />
            <FeatureCard
              icon={Move}
              title="Movimiento Dinámico"
              description="Nuestra calidad se mantiene consistente durante el movimiento natural, manteniendo la sincronización labial alineada incluso cuando la pose, la postura, la iluminación o la distancia cambian."
            />
            <FeatureCard
              icon={Zap}
              title="Modelo Propietario"
              description="La mayoría de las herramientas de clones con IA utilizan los mismos modelos estándar disponibles en el mercado. Doble Labs es completamente propio, construido para ofrecer articulación natural, rendimiento confiable y resultados fieles a la realidad."
            />
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="para-quien" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Para Quién Está <span className="gradient-text">Construido</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <UseCaseCard
              icon={Users}
              title="Profesionistas"
              description="Que quieren empezar a crear contenido en redes sociales y conseguir clientes"
            />
            <UseCaseCard
              icon={Building2}
              title="Agencias"
              description="Que quieren ayudar a sus clientes con contenido y anuncios y quieren un proceso más sencillo"
            />
            <UseCaseCard
              icon={Video}
              title="Creadores de Contenido"
              description="Buscando liberar su tiempo de grabación o incorporar otro pilar de contenido"
            />
            <UseCaseCard
              icon={Sparkles}
              title="Vendedores de Cursos"
              description="Que quieren grabar módulos de alta calidad sin estar horas grabando el material o gastando pequeñas fortunas en estudios de producción"
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
                Tan simple que cualquier persona así no tenga experiencia con tecnología lo puede usar
              </p>

              <div className="space-y-0">
                <StepCard
                  number={1}
                  icon={Video}
                  title="Graba un vídeo maestro"
                  description="El vídeo el cual quieres usar para clonarte."
                />
                <StepCard
                  number={2}
                  icon={FileSpreadsheet}
                  title="Crea un proyecto"
                  description="Aquí es donde estará tu proyecto de clon."
                />
                <StepCard
                  number={3}
                  icon={Sparkles}
                  title="Cargar audio"
                  description="Cargas un audio del guión del vídeo que quieres crear."
                />
                <StepCard
                  number={4}
                  icon={Send}
                  title="Genera tu vídeo final"
                  description="Obtén tu vídeo maestro sincronizado con el audio personalizado obteniendo la versión final, lista para publicar o editar."
                />
              </div>
            </div>

            <div className="lg:sticky lg:top-32">
              <FeatureVideoPlayer />
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
              { value: '4K', label: 'Calidad de Video' },
              { value: '100%', label: 'Tus Datos' },
              { value: 'Real', label: 'Resultados' },
              { value: 'Simple', label: 'De Usar' },
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
                Comienza a Crear Videos Sin Grabar
              </h2>
              <p className="text-[#9CA3AF] text-lg mb-8 max-w-2xl mx-auto">
                Únete a los creadores que ya están ahorrando horas de grabación mientras mantienen su presencia auténtica.
              </p>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-[#E040FB] to-[#B027F7] text-white text-lg font-semibold hover:opacity-90 transition-all hover:scale-105"
              >
                Regístrate Gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#2D2D35]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E040FB] to-[#B027F7] flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Doble<span className="text-[#E040FB]">Labs</span>
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
              © 2025 Doble Labs. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
