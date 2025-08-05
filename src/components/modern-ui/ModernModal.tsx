// =====================================================================================
// COMPONENT: Modern Modal (Magic UI Style)
// Autor: Claude (baseado em HeroVideoDialog pattern)
// Descrição: Modal moderno com animações suaves e design elegante
// =====================================================================================

"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';
import { BorderBeam } from '../magicui/border-beam';

export interface ModernModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animationStyle?: 'from-bottom' | 'from-center' | 'from-top' | 'from-left' | 'from-right' | 'fade' | 'scale';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  hasError?: boolean;
  icon?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
};

const animationVariants = {
  'from-bottom': {
    initial: { opacity: 0, y: 100, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 100, scale: 0.95 }
  },
  'from-center': {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  },
  'from-top': {
    initial: { opacity: 0, y: -100, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -100, scale: 0.95 }
  },
  'from-left': {
    initial: { opacity: 0, x: -100, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -100, scale: 0.95 }
  },
  'from-right': {
    initial: { opacity: 0, x: 100, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.95 }
  },
  'fade': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  'scale': {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 }
  }
};

export const ModernModal: React.FC<ModernModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  size = 'md',
  animationStyle = 'from-center',
  showCloseButton = true,
  closeOnOverlayClick = true,
  hasError = false,
  icon
}) => {
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  }, [onClose, closeOnOverlayClick]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const animation = animationVariants[animationStyle];

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={animation.initial}
            animate={animation.animate}
            exit={animation.exit}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className={`
              relative bg-white rounded-xl shadow-2xl overflow-hidden
              ${sizeClasses[size]}
              max-h-[90vh] overflow-y-auto
              ${className}
            `}
          >
            {/* BorderBeam para modals com erro */}
            {hasError && <BorderBeam className="rounded-xl" />}

            {/* Header */}
            {(title || showCloseButton || icon) && (
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {icon && (
                    <div className="flex-shrink-0">
                      {icon}
                    </div>
                  )}
                  {title && (
                    <h2 className="text-xl font-semibold text-gray-900">
                      {title}
                    </h2>
                  )}
                </div>
                
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="
                      flex items-center justify-center w-8 h-8 
                      rounded-full hover:bg-gray-100 
                      transition-colors duration-200
                      group
                    "
                  >
                    <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Hook para controle do modal
export const useModernModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
};

// Componente especializado para confirmação
export interface ModernConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'success';
  icon?: React.ReactNode;
}

export const ModernConfirmModal: React.FC<ModernConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  icon
}) => {
  const variantClasses = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      animationStyle="from-center"
      hasError={variant === 'danger'}
      icon={icon}
    >
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg border border-gray-300 
              text-gray-700 hover:bg-gray-50
              transition-colors duration-200
            "
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            className={`
              px-4 py-2 rounded-lg transition-colors duration-200
              ${variantClasses[variant]}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModernModal>
  );
};