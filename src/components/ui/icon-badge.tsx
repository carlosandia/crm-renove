import React from 'react';
import { cn } from '../../lib/utils';

/**
 * 🎨 IconBadge - Componente reutilizável para ícones em containers coloridos
 * 
 * Elimina duplicação de 100+ elementos com padrão:
 * `bg-*-100 rounded-* flex items-center justify-center`
 */

export interface IconBadgeProps {
  /** Ícone a ser exibido */
  icon: React.ReactNode;
  /** Variante de cor do badge */
  variant?: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'orange' | 'gray' | 'slate' | 'amber' | 'emerald';
  /** Tamanho do badge */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Forma do badge */
  shape?: 'square' | 'rounded' | 'circle';
  /** Classe CSS adicional */
  className?: string;
  /** Props adicionais do div */
  children?: React.ReactNode;
  /** Função onClick */
  onClick?: () => void;
  /** Tooltip */
  title?: string;
  /** Se deve mostrar animação de hover */
  hover?: boolean;
  /** Se o badge está desabilitado */
  disabled?: boolean;
}

// Mapeamento de variantes de cor
const colorVariants = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  orange: 'bg-orange-100 text-orange-600',
  gray: 'bg-gray-100 text-gray-600',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
};

// Mapeamento de tamanhos
const sizeVariants = {
  xs: 'w-4 h-4 text-xs',
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
  '2xl': 'w-16 h-16 text-xl',
  '3xl': 'w-24 h-24 text-2xl',
};

// Mapeamento de formas
const shapeVariants = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  circle: 'rounded-full',
};

// Variantes de hover
const hoverVariants = {
  blue: 'hover:bg-blue-200',
  green: 'hover:bg-green-200',
  red: 'hover:bg-red-200',
  purple: 'hover:bg-purple-200',
  yellow: 'hover:bg-yellow-200',
  orange: 'hover:bg-orange-200',
  gray: 'hover:bg-gray-200',
  slate: 'hover:bg-slate-200',
  amber: 'hover:bg-amber-200',
  emerald: 'hover:bg-emerald-200',
};

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  variant = 'blue',
  size = 'md',
  shape = 'rounded',
  className,
  children,
  onClick,
  title,
  hover = false,
  disabled = false,
  ...props
}) => {
  // Classes base
  const baseClasses = 'flex items-center justify-center flex-shrink-0 transition-colors duration-200';
  
  // Classes de cor
  const colorClasses = colorVariants[variant] || colorVariants.blue;
  
  // Classes de tamanho
  const sizeClasses = sizeVariants[size] || sizeVariants.md;
  
  // Classes de forma
  const shapeClasses = shapeVariants[shape] || shapeVariants.rounded;
  
  // Classes de hover
  const hoverClasses = hover && !disabled ? hoverVariants[variant] || hoverVariants.blue : '';
  
  // Classes de interação
  const interactionClasses = onClick && !disabled ? 'cursor-pointer select-none' : '';
  
  // Classes de disabled
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // Classes finais
  const classes = cn(
    baseClasses,
    colorClasses,
    sizeClasses,
    shapeClasses,
    hoverClasses,
    interactionClasses,
    disabledClasses,
    className
  );

  return (
    <div
      className={classes}
      onClick={disabled ? undefined : onClick}
      title={title}
      {...props}
    >
      {icon}
      {children}
    </div>
  );
};

// Componentes de conveniência para tamanhos específicos
export const IconBadgeXS: React.FC<Omit<IconBadgeProps, 'size'>> = (props) => (
  <IconBadge {...props} size="xs" />
);

export const IconBadgeSM: React.FC<Omit<IconBadgeProps, 'size'>> = (props) => (
  <IconBadge {...props} size="sm" />
);

export const IconBadgeMD: React.FC<Omit<IconBadgeProps, 'size'>> = (props) => (
  <IconBadge {...props} size="md" />
);

export const IconBadgeLG: React.FC<Omit<IconBadgeProps, 'size'>> = (props) => (
  <IconBadge {...props} size="lg" />
);

export const IconBadgeXL: React.FC<Omit<IconBadgeProps, 'size'>> = (props) => (
  <IconBadge {...props} size="xl" />
);

export const IconBadge2XL: React.FC<Omit<IconBadgeProps, 'size'>> = (props) => (
  <IconBadge {...props} size="2xl" />
);

// Componentes de conveniência para formas específicas
export const IconBadgeCircle: React.FC<Omit<IconBadgeProps, 'shape'>> = (props) => (
  <IconBadge {...props} shape="circle" />
);

export const IconBadgeSquare: React.FC<Omit<IconBadgeProps, 'shape'>> = (props) => (
  <IconBadge {...props} shape="square" />
);

// Componentes de conveniência para variantes específicas
export const IconBadgePrimary: React.FC<Omit<IconBadgeProps, 'variant'>> = (props) => (
  <IconBadge {...props} variant="blue" />
);

export const IconBadgeSuccess: React.FC<Omit<IconBadgeProps, 'variant'>> = (props) => (
  <IconBadge {...props} variant="green" />
);

export const IconBadgeDanger: React.FC<Omit<IconBadgeProps, 'variant'>> = (props) => (
  <IconBadge {...props} variant="red" />
);

export const IconBadgeWarning: React.FC<Omit<IconBadgeProps, 'variant'>> = (props) => (
  <IconBadge {...props} variant="yellow" />
);

// Export padrão
export default IconBadge; 