'use client'

import { ArrowRight } from 'lucide-react'

type SmartCalendlyButtonProps = {
  className: string
}

export default function SmartCalendlyButton({ className }: SmartCalendlyButtonProps) {
  function handleClick() {
    const targets = ['book-top', 'book-bottom']
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (targets.length === 0) {
      return
    }

    const viewportCenter = window.scrollY + window.innerHeight / 2
    const nearest = targets.reduce((closest, element) => {
      const elementTop = element.getBoundingClientRect().top + window.scrollY
      const closestTop = closest.getBoundingClientRect().top + window.scrollY
      return Math.abs(elementTop - viewportCenter) < Math.abs(closestTop - viewportCenter)
        ? element
        : closest
    })

    nearest.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${nearest.id}`)
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      Agendar llamada
      <ArrowRight className="h-4 w-4" />
    </button>
  )
}
