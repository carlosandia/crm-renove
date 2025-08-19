"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  UseInViewOptions,
  Variants,
  MotionProps,
} from "framer-motion";
import { useRef } from "react";
import React from "react";

type MarginType = UseInViewOptions["margin"];

// ✅ CORREÇÃO DOM NESTING: Tipos TypeScript rígidos para prevenir elementos problemáticos
type SafeMotionElement = "div" | "span" | "section" | "article" | "tr" | "td" | "th" | "tbody" | "thead";

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  inView?: boolean;
  inViewMargin?: MarginType;
  blur?: string;
  // ✅ CORREÇÃO DOM NESTING: Apenas elementos seguros permitidos via TypeScript
  as?: SafeMotionElement;
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.25,
  delay = 0,
  offset = 4,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "4px",
  as = "div",
  ...props
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  const defaultVariants: Variants = {
    hidden: {
      [direction === "left" || direction === "right" ? "x" : "y"]:
        direction === "right" || direction === "down" ? -offset : offset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      [direction === "left" || direction === "right" ? "x" : "y"]: 0,
      opacity: 1,
      filter: `blur(0px)`,
    },
  };
  const combinedVariants = variant || defaultVariants;
  
  // ✅ CORREÇÃO DOM NESTING: Lista branca de componentes motion seguros
  const SAFE_MOTION_COMPONENTS = new Set([
    'AnimatedCard',
    'MotionWrapper', 
    'HoverCard',
    'StaggerContainer',
    'PageTransition',
    'LoadingSpinner',
    'Pulse',
    'Floating',
    'Card' // ✅ CORREÇÃO: Card é seguro quando BlurFade usa as="section"
  ]);

  // ✅ CORREÇÃO DOM NESTING: Validação inteligente apenas para componentes realmente problemáticos
  if (process.env.NODE_ENV === 'development') {
    // Verificação otimizada para detectar componentes React que podem renderizar elementos problemáticos
    const hasProblematicChildren = React.Children.toArray(children).some(child => {
      if (React.isValidElement(child)) {
        const childType = child.type;
        
        // Verificar elementos HTML nativos problemáticos
        if (typeof childType === 'string') {
          const blockElements = ['div', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside', 'form', 'fieldset', 'button'];
          return blockElements.includes(childType);
        }
        
        // Verificar componentes React - APENAS se não estão na lista branca
        if (typeof childType === 'function' || typeof childType === 'object') {
          const componentName = childType?.displayName || childType?.name || 'Unknown';
          
          // ✅ CORREÇÃO: Ignorar componentes motion seguros
          if (SAFE_MOTION_COMPONENTS.has(componentName)) {
            return false; // Componente seguro - não gerar warning
          }
          
          const problematicComponents = ['Button', 'Card', 'CardTitle', 'CardDescription', 'Badge', 'Alert'];
          
          if (problematicComponents.some(comp => componentName.includes(comp))) {
            console.warn(`[BlurFade] Aviso: componente "${componentName}" pode renderizar elementos block. Verifique se não causará DOM nesting error.`);
            return true;
          }
        }
      }
      return false;
    });
    
    // Log preventivo apenas se necessário (sem spam)
    if (hasProblematicChildren) {
      console.debug(`[BlurFade] Renderizando com elemento: ${as}, children problemáticos detectados: ${hasProblematicChildren}`);
    }
  }
  
  // ✅ CORREÇÃO DOM NESTING: Componente motion tipado com validação
  const MotionComponent = motion[as as keyof typeof motion] as React.ComponentType<any>;
  
  return (
    <AnimatePresence>
      <MotionComponent
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
        }}
        className={className}
        {...props}
      >
        {children}
      </MotionComponent>
    </AnimatePresence>
  );
} 