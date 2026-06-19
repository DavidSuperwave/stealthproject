import { marked } from 'marked'
import { memo, useId, useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { CodeBlock, CodeBlockCode } from './code-block'

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return 'plaintext'
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : 'plaintext'
}

const INITIAL_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, ...props }) {
    const position = props.node?.position
    const isInline = !position?.start.line || position.start.line === position.end.line
    if (isInline) {
      return (
        <code className="rounded bg-bg-elevated px-1.5 py-0.5 text-[0.9em] text-text-primary">
          {children}
        </code>
      )
    }
    const language = extractLanguage(className)
    return (
      <CodeBlock>
        <CodeBlockCode code={String(children).replace(/\n$/, '')} language={language} />
      </CodeBlock>
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    )
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content,
)
MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none break-words text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary prose-a:text-accent prose-li:my-0',
        className,
      )}
    >
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = 'Markdown'

export { Markdown }
