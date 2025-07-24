/**
 * ============================================
 * 📑 SECTION HEADER COMPONENT
 * ============================================
 * 
 * Componente reutilizável para headers padronizados nas abas do pipeline
 * Garante consistência visual seguindo padrões de mercado
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';

interface SectionHeaderProps {
  /** Ícone da seção (componente Lucide) */
  icon: LucideIcon;
  /** Título principal da seção */
  title: string;
  /** Descrição opcional da seção */
  description?: string;
  /** Componente adicional no lado direito (ex: botões, badges) */
  action?: React.ReactNode;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Header padronizado para seções do pipeline
 * Segue hierarquia visual: Ícone + Título + Descrição + Ação
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: IconComponent,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-start ${className}`}>
      {/* Lado Esquerdo - Ícone + Título + Descrição */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <IconComponent className={`${PIPELINE_UI_CONSTANTS.icons.sectionSize} text-primary`} />
          <h3 className={PIPELINE_UI_CONSTANTS.typography.sectionTitle}>
            {title}
          </h3>
        </div>
        {description && (
          <p className={PIPELINE_UI_CONSTANTS.typography.description}>
            {description}
          </p>
        )}
      </div>

      {/* Lado Direito - Ação (opcional) */}
      {action && (
        <div className="flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </div>
  );
};

/**
 * Variant compacta para uso em cards menores
 */
export const CompactSectionHeader: React.FC<Omit<SectionHeaderProps, 'description'> & { 
  subtitle?: string 
}> = ({
  icon: IconComponent,
  title,
  subtitle,
  action,
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <div className="flex items-center gap-2">
        <IconComponent className={`${PIPELINE_UI_CONSTANTS.icons.standardSize} text-primary`} />
        <div>
          <h4 className={PIPELINE_UI_CONSTANTS.typography.cardTitle}>
            {title}
          </h4>
          {subtitle && (
            <p className={PIPELINE_UI_CONSTANTS.typography.hint}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && action}
    </div>
  );
};

/**
 * Header para formulários inline expansíveis
 */
export const FormHeader: React.FC<{
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}> = ({
  title,
  description,
  onClose,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div>
        <h4 className="text-lg font-semibold">
          {title}
        </h4>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SectionHeader;