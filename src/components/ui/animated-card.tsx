import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

interface AnimatedCardProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right"
  hover?: boolean
  className?: string
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, delay = 0, duration = 0.25, direction = "up", hover = false }, ref) => {
    const initialY = direction === "up" ? 8 : direction === "down" ? -8 : 0
    const initialX = direction === "left" ? 8 : direction === "right" ? -8 : 0

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          className
        )}
        initial={{ opacity: 0, y: initialY, x: initialX }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration, delay }}
        whileHover={hover ? { y: -4 } : undefined}
      >
        {children}
      </motion.div>
    )
  }
)

AnimatedCard.displayName = "AnimatedCard"

export { AnimatedCard } 