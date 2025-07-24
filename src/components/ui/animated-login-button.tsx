import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { Loader2, CheckCircle } from "lucide-react"

interface AnimatedLoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  isSuccess?: boolean
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loadingText?: string
  successText?: string
  children: React.ReactNode
}

const AnimatedLoginButton = React.forwardRef<HTMLButtonElement, AnimatedLoginButtonProps>(
  ({ 
    isLoading = false,
    isSuccess = false,
    variant = "default",
    size = "default",
    loadingText = "Entrando...",
    successText = "Sucesso!",
    children,
    className,
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)

    const buttonVariants = {
      initial: { scale: 1 },
      hover: { 
        scale: 1.02,
        transition: { duration: 0.2 }
      },
      tap: { 
        scale: 0.98,
        transition: { duration: 0.1 }
      },
      loading: {
        scale: 0.98,
        transition: { duration: 0.2 }
      },
      success: {
        scale: 1.05,
        transition: { 
          type: "spring",
          stiffness: 500,
          damping: 30
        }
      }
    }

    const iconVariants = {
      loading: {
        rotate: 360,
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }
      },
      success: {
        scale: [0, 1.2, 1],
        transition: {
          duration: 0.5,
          ease: "easeOut"
        }
      }
    }

    const textVariants = {
      initial: { opacity: 1, y: 0 },
      loading: { 
        opacity: 0.8,
        transition: { duration: 0.2 }
      },
      success: {
        opacity: 1,
        y: [-2, 0],
        transition: { duration: 0.3 }
      }
    }

    const getCurrentState = () => {
      if (isSuccess) return "success"
      if (isLoading) return "loading"
      if (isHovered) return "hover"
      return "initial"
    }

    const getButtonContent = () => {
      if (isSuccess) {
        return (
          <motion.div
            variants={textVariants}
            animate="success"
            className="flex items-center justify-center gap-2"
          >
            <motion.div variants={iconVariants} animate="success">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </motion.div>
            {successText}
          </motion.div>
        )
      }

      if (isLoading) {
        return (
          <motion.div
            variants={textVariants}
            animate="loading"
            className="flex items-center justify-center gap-2"
          >
            <motion.div variants={iconVariants} animate="loading">
              <Loader2 className="w-4 h-4" />
            </motion.div>
            {loadingText}
          </motion.div>
        )
      }

      return (
        <motion.div
          variants={textVariants}
          animate="initial"
          className="flex items-center justify-center gap-2"
        >
          {children}
        </motion.div>
      )
    }

    return (
      <motion.div
        variants={buttonVariants}
        initial="initial"
        animate={getCurrentState()}
        whileHover="hover"
        whileTap="tap"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="relative"
      >
        <Button
          ref={ref}
          variant={variant}
          size={size}
          disabled={isLoading || isSuccess}
          className={cn(
            "relative overflow-hidden transition-all duration-200",
            "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
            "shadow-lg hover:shadow-xl",
            isLoading && "cursor-not-allowed",
            isSuccess && "bg-gradient-to-r from-green-600 to-emerald-600",
            className
          )}
          {...props}
        >
          {/* Shimmer Effect */}
          {isHovered && !isLoading && !isSuccess && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
          )}
          
          {/* Ripple Effect */}
          {isSuccess && (
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-green-400 rounded-md"
            />
          )}
          
          {/* Content */}
          <span className="relative z-10">
            {getButtonContent()}
          </span>
        </Button>
        
        {/* Glow Effect */}
        {(isHovered || isLoading || isSuccess) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 -z-10 blur-xl rounded-md",
              isSuccess ? "bg-green-400/30" : "bg-blue-400/30"
            )}
          />
        )}
      </motion.div>
    )
  }
)

AnimatedLoginButton.displayName = "AnimatedLoginButton"

export { AnimatedLoginButton }