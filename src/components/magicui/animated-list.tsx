// =====================================================================================
// COMPONENT: Animated List (Magic UI)
// Autor: Claude (baseado em Magic UI documentation)
// Descrição: Componente para listas animadas sequenciais - ideal para notificações
// =====================================================================================

"use client";

import React, { ReactElement, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ className, children, delay = 1000 }: AnimatedListProps) => {
    const [messages, setMessages] = useState<ReactElement[]>([]);

    useEffect(() => {
      const childrenArray = React.Children.toArray(children) as ReactElement[];
      let timeouts: NodeJS.Timeout[] = [];

      childrenArray.forEach((item, index) => {
        const timeout = setTimeout(() => {
          setMessages(prev => [...prev, item]);
        }, delay * (index + 1));
        timeouts.push(timeout);
      });

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }, [children, delay]);

    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, height: 0, y: -50 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -50 }}
              transition={{
                opacity: { duration: 0.4 },
                height: { duration: 0.4 },
                y: { duration: 0.4 },
              }}
            >
              {message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";