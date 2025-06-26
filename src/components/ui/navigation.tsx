import React from "react";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";
import { BlurFade } from "./blur-fade";

// ============================================
// Tab Navigation Component
// ============================================
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  count?: number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "default" | "pills" | "underline";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = "underline",
  size = "default",
  className,
}: TabNavigationProps) {
  const sizeClasses = {
    sm: "text-xs px-3 py-2",
    default: "text-sm px-4 py-3",
    lg: "text-base px-6 py-4",
  };

  const variantClasses = {
    default: "border-b border-border",
    pills: "bg-muted rounded-lg p-1",
    underline: "border-b border-border",
  };

  return (
    <BlurFade>
      <nav className={cn("flex", variantClasses[variant], className)}>
        <div className="flex space-x-1">
          {tabs.map((tab, index) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <BlurFade key={tab.id} delay={index * 0.05}>
                <button
                  onClick={() => !tab.disabled && onTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    "flex items-center space-x-2 font-medium transition-all duration-200",
                    sizeClasses[size],
                    variant === "pills" && [
                      "rounded-md",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                    ],
                    variant === "underline" && [
                      "border-b-2",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
                    ],
                    variant === "default" && [
                      isActive
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground",
                    ],
                    tab.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium flex items-center justify-center",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              </BlurFade>
            );
          })}
        </div>
      </nav>
    </BlurFade>
  );
}

// ============================================
// Breadcrumb Navigation Component
// ============================================
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
  maxItems?: number;
}

export function Breadcrumb({
  items,
  separator = <ChevronRight className="w-4 h-4" />,
  className,
  maxItems = 3,
}: BreadcrumbProps) {
  const displayItems = items.length > maxItems 
    ? [
        items[0],
        { label: "...", icon: MoreHorizontal, onClick: undefined },
        ...items.slice(-maxItems + 2)
      ]
    : items;

  return (
    <BlurFade>
      <nav
        aria-label="Breadcrumb"
        className={cn("flex items-center space-x-1 text-sm", className)}
      >
        {displayItems.map((item, index) => {
          const IconComponent = item.icon;
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === "...";

          return (
            <BlurFade key={index} delay={index * 0.05}>
              <div className="flex items-center space-x-1">
                {index > 0 && (
                  <span className="text-muted-foreground">{separator}</span>
                )}
                
                {isEllipsis ? (
                  <span className="text-muted-foreground px-2">
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                ) : (
                  <button
                    onClick={item.onClick}
                    disabled={isLast}
                    className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded-md transition-colors",
                      isLast
                        ? "text-foreground font-medium cursor-default"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {IconComponent && <IconComponent className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            </BlurFade>
          );
        })}
      </nav>
    </BlurFade>
  );
}

// ============================================
// Step Navigation Component
// ============================================
export interface StepItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
  status?: "completed" | "current" | "pending" | "error";
}

interface StepNavigationProps {
  steps: StepItem[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function StepNavigation({
  steps,
  currentStep,
  onStepClick,
  orientation = "horizontal",
  className,
}: StepNavigationProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <BlurFade>
      <nav
        className={cn(
          "flex",
          orientation === "horizontal" ? "items-center space-x-4" : "flex-col space-y-4",
          className
        )}
      >
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isCurrent = step.id === currentStep;
          const isCompleted = index < currentIndex;
          const isPending = index > currentIndex;
          const status = step.status || (isCompleted ? "completed" : isCurrent ? "current" : "pending");

          const statusColors = {
            completed: "bg-green-500 text-white border-green-500",
            current: "bg-primary text-primary-foreground border-primary",
            pending: "bg-muted text-muted-foreground border-muted",
            error: "bg-destructive text-destructive-foreground border-destructive",
          };

          return (
            <BlurFade key={step.id} delay={index * 0.1}>
              <div
                className={cn(
                  "flex items-center",
                  orientation === "horizontal" ? "flex-row" : "flex-col text-center"
                )}
              >
                <button
                  onClick={() => onStepClick?.(step.id)}
                  disabled={!onStepClick}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium text-sm transition-all duration-200",
                    statusColors[status],
                    onStepClick && "hover:scale-105 cursor-pointer",
                    !onStepClick && "cursor-default"
                  )}
                >
                  {IconComponent ? (
                    <IconComponent className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                {orientation === "horizontal" && index < steps.length - 1 && (
                  <div className="w-full h-px bg-border mx-4" />
                )}

                <div
                  className={cn(
                    "ml-3",
                    orientation === "vertical" && "ml-0 mt-2"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            </BlurFade>
          );
        })}
      </nav>
    </BlurFade>
  );
}

// ============================================
// Sidebar Navigation Component
// ============================================
export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  href?: string;
  count?: number;
  badge?: string;
  children?: SidebarItem[];
  onClick?: () => void;
}

interface SidebarNavigationProps {
  items: SidebarItem[];
  activeItem?: string;
  collapsed?: boolean;
  className?: string;
}

export function SidebarNavigation({
  items,
  activeItem,
  collapsed = false,
  className,
}: SidebarNavigationProps) {
  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((item, index) => {
        const IconComponent = item.icon;
        const isActive = activeItem === item.id;

        return (
          <BlurFade key={item.id} delay={index * 0.05}>
            <button
              onClick={item.onClick}
              className={cn(
                "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                collapsed ? "justify-center" : "justify-start",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={collapsed ? item.label : undefined}
            >
              {IconComponent && (
                <IconComponent className={cn("w-5 h-5", !collapsed && "mr-3")} />
              )}
              
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  
                  {item.count !== undefined && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center justify-center">
                      {item.count}
                    </span>
                  )}
                  
                  {item.badge && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          </BlurFade>
        );
      })}
    </nav>
  );
} 