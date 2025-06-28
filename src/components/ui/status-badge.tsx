import * as React from "react"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"
import { CheckCircle, Clock, AlertCircle, XCircle, Mail } from "lucide-react"

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'sent' | 'expired' | 'activated' | 'completed' | 'cancelled'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const STATUS_CONFIG = {
  active: {
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
    icon: CheckCircle,
    label: 'Ativo'
  },
  inactive: {
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
    icon: XCircle,
    label: 'Inativo'
  },
  pending: {
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    icon: Clock,
    label: 'Pendente'
  },
  sent: {
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    icon: Mail,
    label: 'Enviado'
  },
  expired: {
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
    icon: AlertCircle,
    label: 'Expirado'
  },
  activated: {
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
    icon: CheckCircle,
    label: 'Ativado'
  },
  completed: {
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
    icon: CheckCircle,
    label: 'Concluído'
  },
  cancelled: {
    variant: 'destructive' as const,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    icon: XCircle,
    label: 'Cancelado'
  }
}

const StatusBadge = React.forwardRef<
  HTMLDivElement,
  StatusBadgeProps
>(({ status, size = 'md', showIcon = true, className, ...props }, ref) => {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <div ref={ref} {...props}>
      <Badge
        variant={config.variant}
        className={cn(
          config.className,
          sizeClasses[size],
          'inline-flex items-center gap-1.5 font-medium transition-colors',
          className
        )}
      >
        {showIcon && <Icon className={iconSizes[size]} />}
        {config.label}
      </Badge>
    </div>
  )
})
StatusBadge.displayName = "StatusBadge"

export { StatusBadge } 