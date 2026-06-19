'use client'

import { cn } from '@/lib/utils'

export interface LoaderProps {
  variant?:
    | 'circular'
    | 'pulse'
    | 'dots'
    | 'typing'
    | 'text-blink'
    | 'text-shimmer'
    | 'loading-dots'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const dotSizes = {
  sm: 'h-1 w-1',
  md: 'h-1.5 w-1.5',
  lg: 'h-2 w-2',
}

function CircularLoader({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', sizeClasses[size], className)}
    />
  )
}

function TypingLoader({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span aria-label="Loading" className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn('animate-bounce rounded-full bg-current', dotSizes[size])}
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </span>
  )
}

function TextBlinkLoader({
  text = 'Thinking',
  className,
}: {
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return <span className={cn('animate-pulse text-sm text-text-muted', className)}>{text}</span>
}

function Loader({ variant = 'circular', size = 'md', text, className }: LoaderProps) {
  switch (variant) {
    case 'typing':
    case 'dots':
    case 'loading-dots':
      return <TypingLoader className={className} size={size} />
    case 'text-blink':
    case 'text-shimmer':
      return <TextBlinkLoader className={className} size={size} text={text} />
    case 'pulse':
      return <span className={cn('inline-block animate-pulse rounded-full bg-current', sizeClasses[size], className)} />
    case 'circular':
    default:
      return <CircularLoader className={className} size={size} />
  }
}

export { CircularLoader, Loader, TextBlinkLoader, TypingLoader }
