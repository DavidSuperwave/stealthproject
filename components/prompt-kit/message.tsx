import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Markdown } from './markdown'

export type MessageProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function Message({ children, className, ...props }: MessageProps) {
  return (
    <div className={cn('group flex w-full items-start gap-3', className)} {...props}>
      {children}
    </div>
  )
}

export type MessageAvatarProps = {
  src?: string
  alt: string
  fallback?: string
  delayMs?: number
  className?: string
}

function MessageAvatar({ src, alt, fallback, delayMs, className }: MessageAvatarProps) {
  return (
    <Avatar className={cn('h-8 w-8 border border-border bg-white', className)}>
      {src ? <AvatarImage src={src} alt={alt} /> : null}
      {fallback && (
        <AvatarFallback delayMs={delayMs} className="text-xs font-semibold">
          {fallback}
        </AvatarFallback>
      )}
    </Avatar>
  )
}

export type MessageContentProps = {
  children: React.ReactNode
  markdown?: boolean
  className?: string
} & React.HTMLProps<HTMLDivElement>

function MessageContent({ children, markdown = false, className, ...props }: MessageContentProps) {
  const classNames = cn(
    'rounded-xl border border-border bg-white p-4 text-sm leading-6 text-text-secondary shadow-sm',
    className,
  )

  return markdown ? (
    <Markdown className={classNames} {...props}>
      {children as string}
    </Markdown>
  ) : (
    <div className={classNames} {...props}>
      {children}
    </div>
  )
}

export type MessageActionsProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function MessageActions({ children, className, ...props }: MessageActionsProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100', className)} {...props}>
        {children}
      </div>
    </TooltipProvider>
  )
}

export type MessageActionProps = {
  className?: string
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
} & React.ComponentProps<typeof Tooltip>

function MessageAction({ tooltip, children, className, side = 'top', ...props }: MessageActionProps) {
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export { Message, MessageAction, MessageActions, MessageAvatar, MessageContent }
