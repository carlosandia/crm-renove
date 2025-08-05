import React from 'react';

interface DropZoneIndicatorProps {
  isOver?: boolean;
  isDragging?: boolean;
  className?: string;
  position?: 'empty' | 'between'; // ✅ NOVO: Tipo de indicador
}

export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({
  isOver = false,
  isDragging = false,
  className = "",
  position = 'empty'
}) => {
  if (!isDragging) return null;

  // Estilos baseados na posição
  const baseStyles = position === 'between' 
    ? 'w-full h-1 rounded-sm' // Menor para entre cards
    : 'w-full h-6 rounded-lg'; // Maior para área vazia

  return (
    <div 
      className={`
        ${baseStyles} transition-all duration-200 
        ${isOver 
          ? 'bg-blue-500/60 border-2 border-blue-500 border-dashed shadow-lg' 
          : 'bg-gray-200/40 border-2 border-gray-300 border-dashed'
        }
        ${position === 'between' ? 'my-1' : 'my-2'}
        ${className}
      `}
      data-testid="drop-zone-indicator"
      data-position={position}
    />
  );
};

export default DropZoneIndicator;