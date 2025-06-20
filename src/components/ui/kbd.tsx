
import * as React from "react"
import { cn } from "@/lib/utils"

interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(
          "px-2 py-1 text-xs font-sans font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </kbd>
    )
  }
)
Kbd.displayName = "Kbd"

export { Kbd }
