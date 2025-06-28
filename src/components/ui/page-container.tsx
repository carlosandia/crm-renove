import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { Button } from "./button"

// PageContainer - Container principal da página
export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col h-full space-y-6 p-6", className)}
      {...props}
    />
  )
)
PageContainer.displayName = "PageContainer"

// PageHeader - Header da página com título e ações
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        className
      )}
      {...props}
    />
  )
)
PageHeader.displayName = "PageHeader"

// PageTitle - Título da página com ícone opcional
export interface PageTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  iconClassName?: string
}

const PageTitle = React.forwardRef<HTMLDivElement, PageTitleProps>(
  ({ icon: Icon, iconClassName, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center space-x-3", className)}
      {...props}
    >
      {Icon && (
        <Icon className={cn("w-6 h-6 text-foreground", iconClassName)} />
      )}
      <h1 className="text-2xl font-bold text-foreground">{children}</h1>
    </div>
  )
)
PageTitle.displayName = "PageTitle"

// PageActions - Container para ações da página
export interface PageActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageActions = React.forwardRef<HTMLDivElement, PageActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center space-x-2", className)}
      {...props}
    />
  )
)
PageActions.displayName = "PageActions"

// PageContent - Container principal do conteúdo
export interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageContent = React.forwardRef<HTMLDivElement, PageContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 flex flex-col space-y-4", className)}
      {...props}
    />
  )
)
PageContent.displayName = "PageContent"

// PageSubheader - Subheader opcional com descrição
export interface PageSubheaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageSubheader = React.forwardRef<HTMLDivElement, PageSubheaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
PageSubheader.displayName = "PageSubheader"

// PageSection - Seção dentro do conteúdo
export interface PageSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  actions?: React.ReactNode
}

const PageSection = React.forwardRef<HTMLDivElement, PageSectionProps>(
  ({ title, description, actions, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-4", className)} {...props}>
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
)
PageSection.displayName = "PageSection"

export {
  PageContainer,
  PageHeader,
  PageTitle,
  PageActions,
  PageContent,
  PageSubheader,
  PageSection,
} 