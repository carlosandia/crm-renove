import * as React from "react"
import { motion } from "framer-motion"
import { BorderBeam } from "../magicui/border-beam"
import { PulsatingButton } from "../magicui/pulsating-button"
import { AnimatedCircularProgressBar } from "../magicui/animated-circular-progress-bar"
import { NumberTicker } from "../magicui/number-ticker"
import { cn } from "../../lib/utils"

type UserRole = "super_admin" | "admin" | "member"

interface LoginVisualContainerProps {
  role?: UserRole
  className?: string
}

const LoginVisualContainer: React.FC<LoginVisualContainerProps> = ({
  role = "member",
  className
}) => {
  const [isMobile, setIsMobile] = React.useState(false)

  // Detectar tamanho da tela
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  // Configurações por role
  const roleConfig = {
    super_admin: {
      title: "Super Admin",
      subtitle: "Controle Total do Sistema",
      primaryColor: "#F59E0B", // amber-500
      secondaryColor: "#FCD34D", // amber-300
      bgGradient: "from-amber-400/20 to-orange-400/20",
      accentGradient: "from-amber-500 to-orange-500",
    },
    admin: {
      title: "Administrador",
      subtitle: "Gestão Empresarial",
      primaryColor: "#3B82F6", // blue-500
      secondaryColor: "#93C5FD", // blue-300
      bgGradient: "from-blue-400/20 to-indigo-400/20",
      accentGradient: "from-blue-500 to-indigo-500",
    },
    member: {
      title: "Membro",
      subtitle: "Acesso Comercial",
      primaryColor: "#10B981", // emerald-500
      secondaryColor: "#6EE7B7", // emerald-300
      bgGradient: "from-emerald-400/20 to-teal-400/20",
      accentGradient: "from-emerald-500 to-teal-500",
    }
  }

  const config = roleConfig[role]

  return (
    <div className={cn("relative w-full h-full flex flex-col items-center justify-center", className)}>
      {/* Background Pattern Específico por Role */}
      <div className="absolute inset-0">
        <div className={cn(
          "absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-30",
          `bg-gradient-to-r ${config.bgGradient}`
        )} />
        <div className={cn(
          "absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-2xl opacity-40",
          `bg-gradient-to-r ${config.bgGradient}`
        )} />
      </div>

      {/* Conteúdo Principal */}
      <div className={cn(
        "relative z-10 text-center max-w-md",
        isMobile ? "space-y-4" : "space-y-8"
      )}>
        {/* Logo/Brand Area com BorderBeam */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative"
        >
          <div className={cn(
            "relative mx-auto rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg",
            isMobile 
              ? "w-16 h-16 mb-3" // Mobile: menor
              : "w-24 h-24 mb-6" // Desktop: tamanho normal
          )}>
            <BorderBeam 
              size={isMobile ? 64 : 96}
              duration={3}
              borderWidth={2}
              colorFrom={config.primaryColor}
              colorTo={config.secondaryColor}
            />
            <span className={cn(
              "font-bold bg-gradient-to-r bg-clip-text text-transparent",
              `${config.accentGradient}`,
              isMobile ? "text-xl" : "text-3xl"
            )}>
              CRM
            </span>
          </div>
        </motion.div>

        {/* Título e Subtítulo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className={isMobile ? "space-y-1" : "space-y-3"}
        >
          <h1 className={cn(
            "font-bold bg-gradient-to-r bg-clip-text text-transparent",
            `${config.accentGradient}`,
            isMobile ? "text-2xl" : "text-4xl"
          )}>
            {config.title}
          </h1>
          <p className={cn(
            "text-gray-600 font-medium",
            isMobile ? "text-sm" : "text-lg"
          )}>
            {config.subtitle}
          </p>
        </motion.div>

        {/* Elementos Magic UI Específicos por Role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col items-center space-y-6"
        >
          {role === "super_admin" && (
            <div className="flex items-center space-x-4">
              <NumberTicker 
                value={100} 
                className="text-2xl font-bold text-amber-600"
              />
              <span className="text-gray-600">% Controle</span>
            </div>
          )}

          {role === "admin" && (
            <div className="relative">
              <PulsatingButton
                className={cn(
                  "px-6 py-3 text-white font-semibold rounded-lg",
                  `bg-gradient-to-r ${config.accentGradient}`
                )}
                pulseColor={config.primaryColor}
              >
                Gestão Ativa
              </PulsatingButton>
            </div>
          )}

          {role === "member" && (
            <div className="flex flex-col items-center space-y-2">
              <AnimatedCircularProgressBar
                max={100}
                value={85}
                min={0}
                gaugePrimaryColor={config.primaryColor}
                gaugeSecondaryColor={config.secondaryColor}
                className="w-20 h-20"
              />
              <span className="text-sm text-gray-600">Performance</span>
            </div>
          )}
        </motion.div>

        {/* Estatísticas ou Info Adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="pt-6 border-t border-gray-200/50"
        >
          <div className="flex justify-center space-x-8 text-sm text-gray-500">
            <div className="text-center">
              <div className={cn("font-bold text-lg", `text-${role === 'super_admin' ? 'amber' : role === 'admin' ? 'blue' : 'emerald'}-600`)}>
                <NumberTicker value={role === 'super_admin' ? 50 : role === 'admin' ? 25 : 10} />+
              </div>
              <div>Empresas</div>
            </div>
            <div className="text-center">
              <div className={cn("font-bold text-lg", `text-${role === 'super_admin' ? 'amber' : role === 'admin' ? 'blue' : 'emerald'}-600`)}>
                <NumberTicker value={role === 'super_admin' ? 1000 : role === 'admin' ? 500 : 100} />+
              </div>
              <div>Leads</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Elementos Decorativos Flutuantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full opacity-40",
              `bg-gradient-to-r ${config.bgGradient}`
            )}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  )
}

export { LoginVisualContainer }