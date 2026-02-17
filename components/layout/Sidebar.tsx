'use client'

import { Folder, Wand2, CreditCard, FileText } from 'lucide-react'
import Link from 'next/link'

interface SidebarProps {
  activeItem: 'personalize' | 'projects' | 'subscription'
}

const navItems = [
  { 
    id: 'personalize' as const, 
    label: 'Personalizar video', 
    icon: Wand2,
    href: '/personalize'
  },
  { 
    id: 'scripts' as const, 
    label: 'Biblioteca de guiones', 
    icon: FileText,
    href: '/scripts'
  },
  { 
    id: 'projects' as const, 
    label: 'Proyectos', 
    icon: Folder,
    href: '/'
  },
  { 
    id: 'subscription' as const, 
    label: 'Suscripción', 
    icon: CreditCard,
    href: '/subscription'
  },
]

export default function Sidebar({ activeItem }: SidebarProps) {
  return (
    <aside className="w-64 bg-bg-secondary flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold gradient-text">DOBLELABS</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${isActive 
                  ? 'bg-bg-elevated text-white border-l-2 border-accent' 
                  : 'text-text-secondary hover:text-white hover:bg-bg-elevated'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
