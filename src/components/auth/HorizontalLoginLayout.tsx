import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

interface HorizontalLoginLayoutProps {
  children: React.ReactNode
  visualContent: React.ReactNode
  className?: string
}

const HorizontalLoginLayout: React.FC<HorizontalLoginLayoutProps> = ({
  children,
  visualContent,
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

  return (
    <div className={cn(
      "min-h-screen w-full flex",
      isMobile ? "flex-col" : "flex-row",
      className
    )}>
      {/* Container Visual - Responsivo */}
      <motion.div
        initial={{ opacity: 0, x: isMobile ? 0 : -50, y: isMobile ? -50 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50",
          isMobile 
            ? "h-64 w-full flex-shrink-0" // Mobile: altura fixa
            : "flex-1 lg:w-[70%] min-h-screen" // Desktop: 70% largura
        )}
      >
        {/* Elementos de background */}
        <div className="absolute inset-0">
          {/* Gradientes animados de fundo */}
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-blue-300/10 to-purple-300/10 blur-3xl animate-pulse" />
        </div>

        {/* Elementos flutuantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-4 h-4 bg-blue-400/30 rounded-full"
            animate={{ 
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-40 right-32 w-6 h-6 bg-purple-400/30 rounded-full"
            animate={{ 
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div
            className="absolute bottom-32 left-32 w-5 h-5 bg-pink-400/30 rounded-full"
            animate={{ 
              y: [0, -25, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>

        {/* Conteúdo visual personalizado */}
        <div className={cn(
          "relative z-10 flex items-center justify-center",
          isMobile 
            ? "h-full p-4" // Mobile: padding menor
            : "h-full p-8" // Desktop: padding normal
        )}>
          {visualContent}
        </div>
      </motion.div>

      {/* Container Formulário - Responsivo */}
      <motion.div
        initial={{ opacity: 0, x: isMobile ? 0 : 50, y: isMobile ? 50 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className={cn(
          "flex items-center justify-center bg-white",
          isMobile 
            ? "flex-1 w-full p-6" // Mobile: ocupa espaço restante
            : "w-full lg:w-[30%] min-h-screen p-6 lg:p-8 lg:bg-gray-50/50" // Desktop: 30% largura
        )}
      >
        <div className={cn(
          "w-full",
          isMobile ? "max-w-md" : "max-w-sm"
        )}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export { HorizontalLoginLayout }