import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { BaseModalProps } from '../../types/CommonProps';

/**
 * 🎯 BaseModal - Componente base unificado para todos os modais
 * Elimina duplicação de estrutura em 50+ modais
 */

interface BaseModalExtendedProps extends BaseModalProps {
  /** Conteúdo principal do modal */
  children: React.ReactNode;
  /** Cor do header */
  headerColor?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray';
  /** Botões do footer */
  footerContent?: React.ReactNode;
  /** Botões padrão do footer */
  showDefaultFooter?: boolean;
  /** Texto do botão principal */
  primaryButtonText?: string;
  /** Texto do botão secundário */
  secondaryButtonText?: string;
  /** Função do botão principal */
  onPrimaryAction?: () => void;
  /** Função do botão secundário */
  onSecondaryAction?: () => void;
  /** Variante do botão principal */
  primaryButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  /** Desabilitar botão principal */
  primaryButtonDisabled?: boolean;
  /** Mostrar loader no botão principal */
  primaryButtonLoading?: boolean;
  /** Ícone do header */
  headerIcon?: React.ReactNode;
  /** Descrição do modal */
  description?: string;
}

const headerColorClasses = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-emerald-600 text-white',
  red: 'bg-red-600 text-white',
  purple: 'bg-purple-600 text-white',
  orange: 'bg-orange-600 text-white',
  gray: 'bg-gray-600 text-white'
};

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl'
};

export const BaseModal: React.FC<BaseModalExtendedProps> = ({
  isOpen,
  onClose,
  title,
  children,
  headerColor = 'blue',
  footerContent,
  showDefaultFooter = false,
  primaryButtonText = 'Confirmar',
  secondaryButtonText = 'Cancelar',
  onPrimaryAction,
  onSecondaryAction,
  primaryButtonVariant = 'default',
  primaryButtonDisabled = false,
  primaryButtonLoading = false,
  loading = false,
  headerIcon,
  description,
  className,
  closeOnOverlayClick = true,
  size = 'lg',
  headerContent
}) => {
  const handleClose = () => {
    if (loading || primaryButtonLoading) return;
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick || loading || primaryButtonLoading) return;
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handlePrimaryAction = () => {
    if (primaryButtonLoading || primaryButtonDisabled) return;
    onPrimaryAction?.();
  };

  const handleSecondaryAction = () => {
    if (primaryButtonLoading) return;
    onSecondaryAction?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeOnOverlayClick ? handleClose : undefined}>
      <DialogContent 
        className={cn(
          sizeClasses[size], 
          'max-h-[90vh] overflow-hidden p-0',
          className
        )}
        onClick={handleOverlayClick}
      >
        {/* Header Colorido */}
        <div className={cn(headerColorClasses[headerColor], 'p-6')}>
          <DialogHeader>
            <DialogTitle className={cn(
              'text-xl font-bold flex items-center gap-3',
              headerColor !== 'gray' ? 'text-white' : 'text-white'
            )}>
              {headerIcon && <span className="flex-shrink-0">{headerIcon}</span>}
              {title}
              {loading && (
                <Loader2 className="w-5 h-5 animate-spin ml-auto" />
              )}
            </DialogTitle>
            {description && (
              <p className={cn(
                'text-sm mt-2 opacity-90',
                headerColor !== 'gray' ? 'text-white' : 'text-white'
              )}>
                {description}
              </p>
            )}
            {headerContent && (
              <div className="mt-3">
                {headerContent}
              </div>
            )}
          </DialogHeader>
          
          {/* Botão de fechar customizado */}
          <button
            onClick={handleClose}
            disabled={loading || primaryButtonLoading}
            className={cn(
              'absolute right-4 top-4 p-2 rounded-lg transition-colors',
              'hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20',
              (loading || primaryButtonLoading) && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {(footerContent || showDefaultFooter) && (
          <DialogFooter className="border-t border-gray-200 p-6 space-x-2">
            {footerContent || (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSecondaryAction || handleClose}
                  disabled={primaryButtonLoading}
                  className="min-w-[100px]"
                >
                  {secondaryButtonText}
                </Button>
                <Button
                  type="button"
                  variant={primaryButtonVariant}
                  onClick={handlePrimaryAction}
                  disabled={primaryButtonDisabled || primaryButtonLoading}
                  className="min-w-[100px] relative"
                >
                  {primaryButtonLoading && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {primaryButtonText}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BaseModal; 