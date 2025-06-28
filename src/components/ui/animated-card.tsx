import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedCardProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right"
  hover?: boolean
  className?: string
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, delay = 0, duration = 0.5, direction = "up", hover = true }, ref) => {
    const initialY = direction === "up" ? 20 : direction === "down" ? -20 : 0
    const initialX = direction === "left" ? 20 : direction === "right" ? -20 : 0

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