import { useState, useEffect } from 'react'
import { useAuth } from '../../../providers/AuthProvider'

type UserRole = "super_admin" | "admin" | "member"

interface RoleTheme {
  name: string
  title: string
  subtitle: string
  primaryColor: string
  secondaryColor: string
  bgGradient: string
  accentGradient: string
  textGradient: string
  shadowColor: string
  borderColor: string
  focusColor: string
}

const ROLE_THEMES: Record<UserRole, RoleTheme> = {
  super_admin: {
    name: "Super Admin",
    title: "Super Admin",
    subtitle: "Controle Total do Sistema",
    primaryColor: "#F59E0B", // amber-500
    secondaryColor: "#FCD34D", // amber-300
    bgGradient: "from-amber-400/20 via-orange-400/10 to-yellow-400/20",
    accentGradient: "from-amber-500 via-orange-500 to-yellow-500",
    textGradient: "from-amber-600 to-orange-600",
    shadowColor: "shadow-amber-500/20",
    borderColor: "border-amber-200",
    focusColor: "focus:ring-amber-500",
  },
  admin: {
    name: "Admin",
    title: "Administrador",
    subtitle: "Gestão Empresarial",
    primaryColor: "#3B82F6", // blue-500
    secondaryColor: "#93C5FD", // blue-300
    bgGradient: "from-blue-400/20 via-indigo-400/10 to-purple-400/20",
    accentGradient: "from-blue-500 via-indigo-500 to-purple-500",
    textGradient: "from-blue-600 to-indigo-600",
    shadowColor: "shadow-blue-500/20",
    borderColor: "border-blue-200",
    focusColor: "focus:ring-blue-500",
  },
  member: {
    name: "Member",
    title: "Membro",
    subtitle: "Acesso Comercial",
    primaryColor: "#10B981", // emerald-500
    secondaryColor: "#6EE7B7", // emerald-300
    bgGradient: "from-emerald-400/20 via-teal-400/10 to-green-400/20",
    accentGradient: "from-emerald-500 via-teal-500 to-green-500",
    textGradient: "from-emerald-600 to-teal-600",
    shadowColor: "shadow-emerald-500/20",
    borderColor: "border-emerald-200",
    focusColor: "focus:ring-emerald-500",
  },
}

export function useRoleTheme(overrideRole?: UserRole) {
  const { user } = useAuth()
  const [detectedRole, setDetectedRole] = useState<UserRole>('member')

  // Detectar role do usuário
  useEffect(() => {
    if (overrideRole) {
      setDetectedRole(overrideRole)
      return
    }

    if ((user as any)?.user_metadata?.role) {
      // Usar role do metadata do usuário se disponível
      const userRole = (user as any).user_metadata.role
      if (userRole in ROLE_THEMES) {
        setDetectedRole(userRole as UserRole)
      }
    } else if (user?.email) {
      // Fallback: detectar pelo email
      const email = user.email.toLowerCase()
      if (email.includes('superadmin') || email.includes('super')) {
        setDetectedRole('super_admin')
      } else if (email.includes('admin')) {
        setDetectedRole('admin')
      } else {
        setDetectedRole('member')
      }
    }
  }, [user, overrideRole])

  const theme = ROLE_THEMES[detectedRole]

  // Função para detectar role temporariamente pelo email (para preview)
  const detectRoleFromEmail = (email: string): UserRole => {
    const emailLower = email.toLowerCase()
    if (emailLower.includes('superadmin') || emailLower.includes('super')) {
      return 'super_admin'
    }
    if (emailLower.includes('admin')) {
      return 'admin'
    }
    return 'member'
  }

  // Função para obter tema por role específico
  const getThemeByRole = (role: UserRole): RoleTheme => {
    return ROLE_THEMES[role]
  }

  // Função para aplicar CSS customizado baseado no tema
  const applyThemeCSS = () => {
    const root = document.documentElement
    root.style.setProperty('--theme-primary', theme.primaryColor)
    root.style.setProperty('--theme-secondary', theme.secondaryColor)
  }

  return {
    role: detectedRole,
    theme,
    detectRoleFromEmail,
    getThemeByRole,
    applyThemeCSS,
    availableRoles: Object.keys(ROLE_THEMES) as UserRole[],
    isLoading: !user && !overrideRole,
  }
}

export type { UserRole, RoleTheme }