'use client'

import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type FileUploadContextValue = {
  isDragging: boolean
  inputRef: React.RefObject<HTMLInputElement>
  multiple?: boolean
  disabled?: boolean
  accept?: string
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null)

export type FileUploadProps = {
  onFilesAdded: (files: File[]) => void
  children: React.ReactNode
  multiple?: boolean
  accept?: string
  disabled?: boolean
}

function FileUpload({
  onFilesAdded,
  children,
  multiple = true,
  accept,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleFiles = useCallback(
    (files: FileList) => {
      const newFiles = Array.from(files)
      onFilesAdded(multiple ? newFiles : newFiles.slice(0, 1))
    },
    [multiple, onFilesAdded],
  )

  useEffect(() => {
    const handleDrag = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
    const handleDragIn = (event: DragEvent) => {
      handleDrag(event)
      dragCounter.current += 1
      if (event.dataTransfer?.items.length) setIsDragging(true)
    }
    const handleDragOut = (event: DragEvent) => {
      handleDrag(event)
      dragCounter.current -= 1
      if (dragCounter.current === 0) setIsDragging(false)
    }
    const handleDrop = (event: DragEvent) => {
      handleDrag(event)
      setIsDragging(false)
      dragCounter.current = 0
      if (!disabled && event.dataTransfer?.files.length) {
        handleFiles(event.dataTransfer.files)
      }
    }

    window.addEventListener('dragenter', handleDragIn)
    window.addEventListener('dragleave', handleDragOut)
    window.addEventListener('dragover', handleDrag)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragIn)
      window.removeEventListener('dragleave', handleDragOut)
      window.removeEventListener('dragover', handleDrag)
      window.removeEventListener('drop', handleDrop)
    }
  }, [disabled, handleFiles])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      handleFiles(event.target.files)
      event.target.value = ''
    }
  }

  return (
    <FileUploadContext.Provider value={{ isDragging, inputRef, multiple, disabled, accept }}>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={handleFileSelect}
      />
      {children}
    </FileUploadContext.Provider>
  )
}

export type FileUploadTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean
}

const FileUploadTrigger = forwardRef<HTMLButtonElement, FileUploadTriggerProps>(
  ({ asChild = false, className, children, disabled, ...props }, ref) => {
  const context = useContext(FileUploadContext)
  const isDisabled = disabled || context?.disabled
  const handleClick = () => {
    if (!isDisabled) context?.inputRef.current?.click()
  }

  if (asChild) {
    const child = Children.only(children) as React.ReactElement<React.HTMLAttributes<HTMLElement>>
    const childProps = {
      ...props,
      ref,
      role: 'button',
      'aria-disabled': isDisabled,
      className: cn(className, child.props.className),
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation()
        handleClick()
        child.props.onClick?.(event)
      },
    } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLButtonElement> }

    return cloneElement(child, childProps)
  }

  return (
    <button ref={ref} type="button" className={className} disabled={isDisabled} onClick={handleClick} {...props}>
      {children}
    </button>
  )
  },
)
FileUploadTrigger.displayName = 'FileUploadTrigger'

type FileUploadContentProps = React.HTMLAttributes<HTMLDivElement>

function FileUploadContent({ className, ...props }: FileUploadContentProps) {
  const context = useContext(FileUploadContext)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!context?.isDragging || !mounted || context.disabled) return null

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-50 grid place-items-center bg-accent/10 backdrop-blur-[1px]',
        className,
      )}
      {...props}
    />,
    document.body,
  )
}

export { FileUpload, FileUploadContent, FileUploadTrigger }
