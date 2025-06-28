import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { StatusBadge } from "./status-badge"
import { Building, MapPin, Calendar, User } from "lucide-react"
import { Company, CompanyAdmin } from "../../types/Company"

export interface CompanyCardProps {
  company: Company
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  className?: string
  onClick?: () => void
  actions?: React.ReactNode
}

const CompanyCard = React.forwardRef<
  HTMLDivElement,
  CompanyCardProps
>(({ 
  company, 
  variant = 'default', 
  showActions = false,
  className,
  onClick,
  actions,
  ...props 
}, ref) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getAdminStatus = (admin?: CompanyAdmin) => {
    if (!admin) return null
    if (!admin.activation_status || admin.activation_status === 'activated') {
      return 'activated'
    }
    return admin.activation_status
  }

  // Variant: Compact (para uso em tabelas)
  if (variant === 'compact') {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center space-x-3 cursor-pointer',
          onClick && 'hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors',
          className
        )}
        onClick={onClick}
        {...props}
      >
        <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground font-semibold text-sm flex-shrink-0">
          {company.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {company.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {company.industry}
          </p>
        </div>
      </div>
    )
  }

  // Variant: Detailed (para modais e detalhes)
  if (variant === 'detailed') {
    return (
      <Card
        ref={ref}
        className={cn(
          'transition-colors',
          onClick && 'cursor-pointer hover:bg-muted/50',
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground font-semibold">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {company.name}
                </h3>
                <StatusBadge 
                  status={company.is_active ? 'active' : 'inactive'} 
                  size="sm"
                />
              </div>
            </div>
            {showActions && actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Building className="w-4 h-4" />
              <span>{company.industry}</span>
            </div>
            
            {company.city && company.state && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{company.city}/{company.state}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(company.created_at)}</span>
            </div>

            {company.admin && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {company.admin.name}
                  </span>
                  {getAdminStatus(company.admin) && (
                    <StatusBadge 
                      status={getAdminStatus(company.admin) as any}
                      size="sm"
                      showIcon={false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expectativas (se existirem) */}
          {(company.expected_leads_monthly || company.expected_sales_monthly) && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Expectativas Mensais</h4>
              <div className="flex flex-wrap gap-2">
                {company.expected_leads_monthly && (
                  <Badge variant="secondary" className="text-xs">
                    {company.expected_leads_monthly} leads
                  </Badge>
                )}
                {company.expected_sales_monthly && (
                  <Badge variant="secondary" className="text-xs">
                    {company.expected_sales_monthly} vendas
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Variant: Default (para listas)
  return (
    <Card
      ref={ref}
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground font-semibold text-sm flex-shrink-0">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground truncate">
                {company.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {company.industry}
                </Badge>
                <StatusBadge 
                  status={company.is_active ? 'active' : 'inactive'} 
                  size="sm"
                />
              </div>
            </div>
          </div>
          
          {showActions && actions && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Admin info */}
        {company.admin && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{company.admin.name}</span>
              </div>
              {getAdminStatus(company.admin) && (
                <StatusBadge 
                  status={getAdminStatus(company.admin) as any}
                  size="sm"
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

CompanyCard.displayName = "CompanyCard"

export { CompanyCard } 