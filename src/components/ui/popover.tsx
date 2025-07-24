import React, { useState, createContext, useContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Context para gerenciar estado do popover
interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  setTriggerRef: (ref: HTMLElement) => void;
}

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

const usePopover = () => {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('usePopover must be used within a Popover');
  }
  return context;
};

// Componente Popover raiz
interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Popover: React.FC<PopoverProps> = ({ 
  children, 
  open: controlledOpen, 
  onOpenChange 
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const setTriggerRef = (ref: HTMLElement) => {
    if (triggerRef.current !== ref) {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = ref;
    }
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, setTriggerRef }}>
      <div className="relative">
        {children}
      </div>
    </PopoverContext.Provider>
  );
};

// Trigger component
interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ 
  children, 
  asChild = false 
}) => {
  const { open, setOpen, setTriggerRef } = usePopover();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: (ref: HTMLElement) => {
        if (ref) setTriggerRef(ref);
      },
      onClick: () => setOpen(!open),
      'aria-expanded': open,
    } as any);
  }

  return (
    <button
      ref={(ref) => {
        if (ref) setTriggerRef(ref);
      }}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className="inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
};

// Content component
interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}

export const PopoverContent: React.FC<PopoverContentProps> = ({ 
  children, 
  className = '',
  align = 'center',
  side = 'bottom',
  sideOffset = 4
}) => {
  const { open, setOpen, triggerRef } = usePopover();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      let top = 0;
      let left = 0;
      
      // Calcular posição baseada no side
      switch (side) {
        case 'bottom':
          top = triggerRect.bottom + scrollY + sideOffset;
          break;
        case 'top':
          top = triggerRect.top + scrollY - sideOffset;
          break;
        case 'left':
          left = triggerRect.left + scrollX - sideOffset;
          top = triggerRect.top + scrollY;
          break;
        case 'right':
          left = triggerRect.right + scrollX + sideOffset;
          top = triggerRect.top + scrollY;
          break;
      }
      
      // Calcular posição baseada no align (para bottom e top)
      if (side === 'bottom' || side === 'top') {
        switch (align) {
          case 'start':
            left = triggerRect.left + scrollX;
            break;
          case 'center':
            left = triggerRect.left + scrollX + (triggerRect.width / 2);
            break;
          case 'end':
            left = triggerRect.right + scrollX;
            break;
        }
      }
      
      setPosition({ top, left });
    }
  }, [open, triggerRef, side, align, sideOffset]);

  if (!open) return null;

  const getTransformOrigin = () => {
    if (side === 'bottom' || side === 'top') {
      switch (align) {
        case 'start': return 'left';
        case 'center': return 'center';
        case 'end': return 'right';
        default: return 'center';
      }
    }
    return 'center';
  };

  const getTransform = () => {
    if (side === 'bottom' || side === 'top') {
      switch (align) {
        case 'start': return 'translateX(0)';
        case 'center': return 'translateX(-50%)';
        case 'end': return 'translateX(-100%)';
        default: return 'translateX(-50%)';
      }
    }
    return 'translateX(0)';
  };

  // Usar portal para renderizar fora da hierarquia DOM
  const portalContent = (
    <>
      {/* Overlay para fechar quando clicar fora */}
      <div 
        className="fixed inset-0 z-[10010]" 
        onClick={() => setOpen(false)}
      />
      
      {/* Content */}
      <div 
        className={`
          fixed z-[10011] min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-slate-950 shadow-md 
          transition-all duration-200 ease-out
          ${className}
        `}
        style={{
          top: position.top,
          left: position.left,
          transform: getTransform(),
          transformOrigin: getTransformOrigin(),
          opacity: position.top === 0 && position.left === 0 ? 0 : 1,
        }}
      >
        {children}
      </div>
    </>
  );

  // Usar portal para anexar ao body
  return createPortal(portalContent, document.body);
};