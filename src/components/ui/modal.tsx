import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  headerAction?: React.ReactNode;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'xl',
  className = '',
  headerAction,
  showCloseButton = false,
  footer
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl mx-4'
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`
            relative bg-white rounded-lg shadow-xl transition-all
            w-full ${sizeClasses[size]} ${className}
            flex flex-col max-h-[95vh]
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Fixo */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              {/* LADO ESQUERDO: headerAction + título */}
              <div className="flex items-center gap-3 flex-grow">
                {headerAction && (
                  <div className="flex-shrink-0 order-first">
                    {headerAction}
                  </div>
                )}
                <div className="text-lg font-semibold text-gray-900 order-last">
                  {typeof title === 'string' ? <h2>{title}</h2> : title}
                </div>
              </div>
              
              {/* LADO DIREITO: botão fechar */}
              {showCloseButton && (
                <div className="flex-shrink-0 ml-auto">
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Content com Scroll */}
          <div className={`flex-1 overflow-y-auto ${title ? '' : 'relative'}`}>
            {!title && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {children}
          </div>
          
          {/* Footer Fixo */}
          {footer && (
            <div className="border-t border-gray-200 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use Portal to render at document root
  return createPortal(modalContent, document.body);
};

export default Modal;