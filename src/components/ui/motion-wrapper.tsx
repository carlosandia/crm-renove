import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { cn } from "../../lib/utils";

// ============================================
// Motion Variants Presets
// ============================================
export const motionVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  },
  
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  },
  
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  },
  
  scaleOut: {
    hidden: { opacity: 0, scale: 1.1 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.1 }
  },
  
  rotateIn: {
    hidden: { opacity: 0, rotate: -10 },
    visible: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 10 }
  },
  
  bounceIn: {
    hidden: { opacity: 0, scale: 0.3 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 10,
        stiffness: 100
      }
    },
    exit: { opacity: 0, scale: 0.3 }
  },
  
  flipY: {
    hidden: { opacity: 0, rotateY: -90 },
    visible: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: 90 }
  },
  
  stagger: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
} as const;

// ============================================
// Motion Wrapper Component
// ============================================
interface MotionWrapperProps {
  children: React.ReactNode;
  variant?: keyof typeof motionVariants;
  duration?: number;
  delay?: number;
  className?: string;
  animate?: boolean;
  exit?: boolean;
  whileHover?: any;
  whileTap?: any;
  custom?: Variants;
  layout?: boolean;
  layoutId?: string;
}

export function MotionWrapper({
  children,
  variant = "fadeIn",
  duration = 0.3,
  delay = 0,
  className,
  animate = true,
  exit = true,
  whileHover,
  whileTap,
  custom,
  layout = false,
  layoutId,
}: MotionWrapperProps) {
  const variants = custom || motionVariants[variant];
  
  const transition = {
    duration,
    delay,
    type: "tween" as const,
    ease: "easeOut" as const, // explicitly typed
  };

  return (
    <motion.div
      variants={variants}
      initial={animate ? "hidden" : false}
      animate={animate ? "visible" : false}
      exit={exit ? "exit" : undefined}
      transition={transition}
      whileHover={whileHover}
      whileTap={whileTap}
      layout={layout}
      layoutId={layoutId}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Stagger Container Component
// ============================================
interface StaggerContainerProps {
  children: React.ReactNode;
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  delay = 0,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delay,
            staggerChildren: staggerDelay,
            delayChildren: delay,
          }
        }
      }}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Hover Card Component
// ============================================
interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  lift?: boolean;
  glow?: boolean;
}

export function HoverCard({
  children,
  className,
  scale = 1.02,
  lift = true,
  glow = false,
}: HoverCardProps) {
  return (
    <motion.div
      whileHover={{
        scale,
        y: lift ? -4 : 0,
        boxShadow: glow 
          ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
          : undefined,
      }}
      whileTap={{ scale: scale * 0.98 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300,
      }}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Page Transition Component
// ============================================
interface PageTransitionProps {
  children: React.ReactNode;
  variant?: "slide" | "fade" | "scale" | "rotate";
  direction?: "left" | "right" | "up" | "down";
}

export function PageTransition({
  children,
  variant = "slide",
  direction = "right",
}: PageTransitionProps) {
  const getVariants = () => {
    switch (variant) {
      case "slide":
        const slideVariants = {
          left: { x: "-100%" },
          right: { x: "100%" },
          up: { y: "-100%" },
          down: { y: "100%" },
        };
        return {
          initial: slideVariants[direction],
          animate: { x: 0, y: 0 },
          exit: slideVariants[direction],
        };
      
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      
      case "scale":
        return {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.8, opacity: 0 },
        };
      
      case "rotate":
        return {
          initial: { rotate: 180, opacity: 0 },
          animate: { rotate: 0, opacity: 1 },
          exit: { rotate: -180, opacity: 0 },
        };
      
      default:
        return motionVariants.fadeIn;
    }
  };

  return (
    <motion.div
      variants={getVariants()}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        type: "tween",
        ease: "easeInOut",
        duration: 0.3,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Loading Spinner Component
// ============================================
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  color = "currentColor",
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
      className={cn(
        "rounded-full border-2 border-transparent border-t-current",
        sizeClasses[size],
        className
      )}
      style={{ color }}
    />
  );
}

// ============================================
// Pulse Component
// ============================================
interface PulseProps {
  children: React.ReactNode;
  className?: string;
  scale?: [number, number];
  duration?: number;
}

export function Pulse({
  children,
  className,
  scale = [1, 1.05],
  duration = 2,
}: PulseProps) {
  return (
    <motion.div
      animate={{
        scale,
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Floating Component
// ============================================
interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
}

export function Floating({
  children,
  className,
  distance = 10,
  duration = 3,
}: FloatingProps) {
  return (
    <motion.div
      animate={{
        y: [-distance, distance, -distance],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Export all components
// ============================================
export { AnimatePresence };
export default MotionWrapper; 