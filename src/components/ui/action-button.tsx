import * as React from "react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface ActionButtonProps extends React.ComponentProps<typeof Button> {
  icon: LucideIcon
  tooltip?: string
  iconSize?: 'sm' | 'md' | 'lg'
}

const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ActionButtonProps
>(({ icon: Icon, tooltip, iconSize = 'md', size = 'sm', variant = 'ghost', className, children, ...props }, ref) => {
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const buttonContent = (
    <Button
      ref={ref}
      size={size}
      variant={variant}
      className={cn(
        'transition-colors',
        !children && 'p-2', // Square button quando só tem ícone
        className
      )}
      {...props}
    >
      <Icon className={cn(iconSizeClasses[iconSize], children && 'mr-2')} />
      {children}
    </Button>
  )

  // Se não tem tooltip, retorna botão simples
  if (!tooltip) {
    return buttonContent
  }

  // Com tooltip, envolve em div com title (tooltip nativo)
  return (
    <div title={tooltip} className="inline-block">
      {buttonContent}
    </div>
  )
})

ActionButton.displayName = "ActionButton"

export { ActionButton } 