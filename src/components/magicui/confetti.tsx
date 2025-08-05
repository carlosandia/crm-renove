// =====================================================================================
// COMPONENT: Confetti (Magic UI)
// Autor: Claude (baseado em Magic UI documentation)
// Descrição: Efeito de confetti para celebrar ações de sucesso
// =====================================================================================

"use client";

import React, { useCallback, useEffect, useRef } from "react";

interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: string[];
  scalar?: number;
}

interface ConfettiProps {
  options?: ConfettiOptions;
  globalOptions?: ConfettiOptions;
  manualstart?: boolean;
  children?: React.ReactNode;
}

const defaultOptions: ConfettiOptions = {
  particleCount: 50,
  angle: 90,
  spread: 45,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  drift: 0,
  ticks: 200,
  origin: { x: 0.5, y: 0.5 },
  colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
  shapes: ["square", "circle"],
  scalar: 1,
};

// Simulated confetti functionality
const createConfetti = (canvas: HTMLCanvasElement, options: ConfettiOptions) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const particles: any[] = [];
  const particleCount = options.particleCount || defaultOptions.particleCount!;

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: (options.origin?.x || 0.5) * canvas.width,
      y: (options.origin?.y || 0.5) * canvas.height,
      velocity: {
        x: (Math.random() - 0.5) * (options.spread || 45) / 10,
        y: -(Math.random() * (options.startVelocity || 45)) / 10,
      },
      color: options.colors?.[Math.floor(Math.random() * options.colors.length)] || "#26ccff",
      size: Math.random() * 5 + 3,
      life: options.ticks || 200,
      maxLife: options.ticks || 200,
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Update position
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.velocity.y += (options.gravity || 1) * 0.1;
      particle.velocity.x += (options.drift || 0) * 0.01;
      
      // Update life
      particle.life--;
      
      // Draw particle
      ctx.save();
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.restore();
      
      // Remove dead particles
      if (particle.life <= 0 || particle.y > canvas.height) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      requestAnimationFrame(animate);
    }
  };

  animate();
};

export const Confetti: React.FC<ConfettiProps> = ({ 
  options, 
  globalOptions, 
  manualstart = false, 
  children 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fire = useCallback((opts?: ConfettiOptions) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const finalOptions = { ...defaultOptions, ...globalOptions, ...options, ...opts };
    createConfetti(canvas, finalOptions);
  }, [options, globalOptions]);

  useEffect(() => {
    if (!manualstart) {
      fire();
    }
  }, [fire, manualstart]);

  const handleClick = () => {
    fire();
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: "100vw", height: "100vh" }}
      />
      {children && (
        <div onClick={handleClick} className="cursor-pointer">
          {children}
        </div>
      )}
    </>
  );
};

export const ConfettiButton: React.FC<{
  options?: ConfettiOptions;
  children?: React.ReactNode;
  className?: string;
}> = ({ options, children, className }) => {
  const fire = useCallback(() => {
    if (typeof window !== "undefined") {
      // Create a temporary canvas for one-time confetti
      const canvas = document.createElement("canvas");
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "9999";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);

      const finalOptions = { ...defaultOptions, ...options };
      createConfetti(canvas, finalOptions);

      // Remove canvas after animation
      setTimeout(() => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }, (finalOptions.ticks || 200) * 20);
    }
  }, [options]);

  return (
    <button onClick={fire} className={className}>
      {children}
    </button>
  );
};