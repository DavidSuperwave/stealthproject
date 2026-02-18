import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "disabled:pointer-events-none disabled:opacity-50",
          
          // Variants
          variant === "default" && "bg-accent text-white hover:bg-accent-hover",
          variant === "outline" && "border border-border bg-transparent hover:bg-bg-elevated text-white",
          variant === "ghost" && "hover:bg-bg-elevated text-white",
          variant === "secondary" && "bg-bg-elevated text-white hover:bg-border",
          
          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-3 text-sm",
          size === "lg" && "h-12 px-6 text-lg",
          size === "icon" && "h-10 w-10",
          
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
