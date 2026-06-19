'use client'

import { StickToBottom } from 'use-stick-to-bottom'
import { cn } from '@/lib/utils'

export type ChatContainerRootProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export type ChatContainerContentProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export type ChatContainerScrollAnchorProps = {
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps) {
  return (
    <StickToBottom
      className={cn('relative flex h-full flex-col overflow-y-auto', className)}
      resize="smooth"
      initial="smooth"
      {...props}
    >
      {children}
    </StickToBottom>
  )
}

function ChatContainerContent({ children, className, ...props }: ChatContainerContentProps) {
  return (
    <StickToBottom.Content className={cn('flex flex-col gap-4 p-4', className)} {...props}>
      {children}
    </StickToBottom.Content>
  )
}

function ChatContainerScrollAnchor({ className, ...props }: ChatContainerScrollAnchorProps) {
  return <div className={cn('h-px w-full shrink-0', className)} {...props} />
}

export { ChatContainerContent, ChatContainerRoot, ChatContainerScrollAnchor }
