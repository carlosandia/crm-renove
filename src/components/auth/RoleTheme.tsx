import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { useRoleTheme, type UserRole } from "./hooks/useRoleTheme"

interface RoleThemeProps {
  children: React.ReactNode
  role?: UserRole
  className?: string
  applyGlobalStyles?: boolean
}

const RoleTheme: React.FC<RoleThemeProps> = ({
  children,
  role,
  className,
  applyGlobalStyles = false
}) => {
  const { theme, applyThemeCSS } = useRoleTheme(role)

  // Aplicar estilos globais se solicitado
  React.useEffect(() => {
    if (applyGlobalStyles) {
      applyThemeCSS()
    }
  }, [applyGlobalStyles, applyThemeCSS])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "role-theme-container",
        className
      )}
      style={{
        '--theme-primary': theme.primaryColor,
        '--theme-secondary': theme.secondaryColor,
      } as React.CSSProperties}
      data-role={role}
    >
      {children}
    </motion.div>
  )
}

export { RoleTheme }