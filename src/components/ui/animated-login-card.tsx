import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { cn } from "@/lib/utils"

interface AnimatedLoginCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  showBackgroundPattern?: boolean
}

const AnimatedLoginCard = React.forwardRef<
  HTMLDivElement,
  AnimatedLoginCardProps
>(({ 
  children, 
  title, 
  description, 
  className,
  showBackgroundPattern = true,
  ...props 
}, ref) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background Pattern */}
      {showBackgroundPattern && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-blue-300/10 to-purple-300/10 blur-3xl animate-pulse" />
        </div>
      )}

      {/* Floating Elements */}
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

      {/* Main Card */}
      <motion.div
        ref={ref}
        initial={{ 
          opacity: 0, 
          y: 20,
          scale: 0.95
        }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: 1
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut"
        }}
        className="relative z-10 w-full max-w-md mx-4"
        {...props}
      >
        <Card className={cn(
          "backdrop-blur-xl bg-white/80 shadow-2xl border-0 ring-1 ring-gray-200/50",
          className
        )}>
          {(title || description) && (
            <CardHeader className="text-center space-y-2">
              {title && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {title}
                  </CardTitle>
                </motion.div>
              )}
              {description && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <CardDescription className="text-gray-600">
                    {description}
                  </CardDescription>
                </motion.div>
              )}
            </CardHeader>
          )}
          <CardContent className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {children}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
})

AnimatedLoginCard.displayName = "AnimatedLoginCard"

export { AnimatedLoginCard }