import React, { useEffect, useRef } from 'react';

// Hook para gerenciar focus trap em modais
export const useFocusTrap = (isOpen: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Salvar elemento focado antes do modal
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Elementos focáveis dentro do modal
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focar primeiro elemento
    if (firstElement) {
      firstElement.focus();
    }

    // Gerenciar navegação por Tab
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab - voltar
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab - avançar
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Fechar modal com Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Disparar evento customizado para fechar modal
        containerRef.current?.dispatchEvent(
          new CustomEvent('escape-pressed', { bubbles: true })
        );
      }
    };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
      
      // Restaurar focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
};

// Componente para anúncios para screen readers
export const ScreenReaderAnnouncement: React.FC<{
  message: string;
  priority?: 'polite' | 'assertive';
}> = ({ message, priority = 'polite' }) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Componente para skip links
export const SkipLink: React.FC<{
  href: string;
  children: React.ReactNode;
}> = ({ href, children }) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:font-medium focus:text-sm focus:no-underline"
    >
      {children}
    </a>
  );
};

// Componente para melhorar contraste de cores
export const HighContrastText: React.FC<{
  children: React.ReactNode;
  className?: string;
  contrast?: 'normal' | 'high';
}> = ({ children, className = '', contrast = 'normal' }) => {
  const contrastClasses = {
    normal: 'text-foreground',
    high: 'text-gray-900 dark:text-gray-100 font-medium'
  };

  return (
    <span className={`${contrastClasses[contrast]} ${className}`}>
      {children}
    </span>
  );
};

// Hook para navegação por teclado em listas
export const useKeyboardNavigation = (
  items: any[],
  onSelect: (item: any) => void,
  isActive: boolean = true
) => {
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (items[focusedIndex]) {
            onSelect(items[focusedIndex]);
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onSelect, isActive]);

  return { focusedIndex, setFocusedIndex };
};

// Componente para botões com melhor acessibilidade
export const AccessibleButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  'aria-label'?: string;
  'aria-describedby'?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  ...ariaProps 
}) => {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-secondary',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center rounded-md font-medium 
        transition-colors focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-offset-2 disabled:pointer-events-none 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...ariaProps}
    >
      {children}
    </button>
  );
};

// Componente para inputs com melhor acessibilidade
export const AccessibleInput: React.FC<{
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
}> = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  error,
  description,
  className = ''
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={id}
        className="text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="obrigatório">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        className="
          flex h-10 w-full rounded-md border border-input bg-background 
          px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground 
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
          focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
        "
      />
      
      {error && (
        <p 
          id={errorId} 
          className="text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Componente para regiões com landmarks ARIA
export const LandmarkRegion: React.FC<{
  children: React.ReactNode;
  role?: 'main' | 'navigation' | 'banner' | 'contentinfo' | 'complementary' | 'region';
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}> = ({ children, role = 'region', className = '', ...ariaProps }) => {
  return (
    <div
      role={role}
      className={className}
      {...ariaProps}
    >
      {children}
    </div>
  );
};

// Hook para detectar usuários que preferem movimento reduzido
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}; 