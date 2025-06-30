import React, { useState } from 'react';
import { Eye, Edit, Trash2, ExternalLink, Copy, MoreHorizontal } from 'lucide-react';
import { BaseModal } from './base-modal';
import { DetailsModalProps as BaseDetailsModalProps, BaseModalProps } from '../../types/CommonProps';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

/**
 * 🎯 DetailsModal - Modal especializado para visualização de dados
 * Unifica apresentação de dados em 15+ modais de detalhes
 */

interface DetailsModalProps<T = any> extends BaseModalProps {
  /** Item a ser exibido */
  item: T;
  /** Seções de dados para exibição */
  sections?: DetailSection[];
  /** Configuração de tabs */
  tabs?: DetailTab[];
  /** Tab ativo inicial */
  defaultTab?: string;
  /** Ações personalizadas */
  actions?: DetailAction[];
  /** Ações rápidas no header */
  quickActions?: DetailAction[];
  /** Formatter para valores */
  valueFormatter?: (key: string, value: any) => React.ReactNode;
  /** Mostrar metadados (created_at, updated_at, etc.) */
  showMetadata?: boolean;
  /** Campos para mascarar (ex: senhas) */
  maskedFields?: string[];
  /** Callback quando um campo é copiado */
  onFieldCopy?: (field: string, value: any) => void;
  /** Descrição do modal */
  description?: string;
}

interface DetailSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  fields: DetailField[];
  description?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface DetailField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'phone' | 'url' | 'date' | 'currency' | 'status' | 'list' | 'json';
  copyable?: boolean;
  linkable?: boolean;
  hideEmpty?: boolean;
  formatter?: (value: any) => React.ReactNode;
}

interface DetailTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: string | number;
}

interface DetailAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
}

const formatValue = (field: DetailField, value: any, formatter?: (key: string, value: any) => React.ReactNode): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">Não informado</span>;
  }

  // Custom formatter has priority
  if (formatter) {
    const customFormatted = formatter(field.key, value);
    if (customFormatted !== null && customFormatted !== undefined) {
      return customFormatted;
    }
  }

  // Field-specific formatter
  if (field.formatter) {
    return field.formatter(value);
  }

  // Default formatters by type
  switch (field.type) {
    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      );
    case 'phone':
      return (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      );
    case 'url':
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
          {value} <ExternalLink className="w-3 h-3" />
        </a>
      );
    case 'date':
      return new Date(value).toLocaleDateString('pt-BR');
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    case 'status':
      return <Badge variant="outline">{value}</Badge>;
    case 'list':
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <Badge key={index} variant="secondary">{item}</Badge>
            ))}
          </div>
        );
      }
      return value;
    case 'json':
      return (
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    default:
      return String(value);
  }
};

export const DetailsModal = <T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  item,
  sections = [],
  tabs = [],
  defaultTab,
  actions = [],
  quickActions = [],
  valueFormatter,
  showMetadata = true,
  maskedFields = [],
  onFieldCopy,
  description,
  ...baseProps
}: DetailsModalProps<T>) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.defaultExpanded !== false).map(s => s.id))
  );

  const copyToClipboard = async (field: string, value: any) => {
    try {
      await navigator.clipboard.writeText(String(value));
      onFieldCopy?.(field, value);
      console.log('✅ Copiado:', field, value);
    } catch (error) {
      console.error('❌ Erro ao copiar:', error);
      alert('Erro ao copiar para área de transferência');
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderField = (field: DetailField, value: any) => {
    if (field.hideEmpty && (value === null || value === undefined || value === '')) {
      return null;
    }

    const isMasked = maskedFields.includes(field.key);
    const displayValue = isMasked ? '••••••••' : value;

    return (
      <div key={field.key} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-600">
            {field.label}
          </label>
          {field.copyable && !isMasked && (
            <button
              onClick={() => copyToClipboard(field.key, value)}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Copiar"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="text-sm text-gray-900">
          {formatValue(field, displayValue, valueFormatter)}
        </div>
      </div>
    );
  };

  const renderSection = (section: DetailSection) => {
    const isExpanded = expandedSections.has(section.id);
    
    return (
      <div key={section.id} className="border border-gray-200 rounded-lg">
        <div
          className={`p-4 ${section.collapsible ? 'cursor-pointer hover:bg-gray-50' : ''} flex items-center justify-between`}
          onClick={section.collapsible ? () => toggleSection(section.id) : undefined}
        >
          <div className="flex items-center gap-2">
            {section.icon && <span className="text-gray-500">{section.icon}</span>}
            <h3 className="font-medium text-gray-900">{section.title}</h3>
          </div>
          {section.collapsible && (
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          )}
        </div>
        
        {section.description && (
          <div className="px-4 pb-2">
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
        )}
        
        {(!section.collapsible || isExpanded) && (
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map(field => renderField(field, item[field.key]))}
          </div>
        )}
      </div>
    );
  };

  // Quick actions for header
  const headerContent = quickActions.length > 0 && (
    <div className="flex gap-2 mt-3">
      {quickActions
        .filter(action => !action.hidden)
        .slice(0, 3) // Máximo 3 ações rápidas
        .map(action => (
          <Button
            key={action.id}
            size="sm"
            variant="outline"
            onClick={action.onClick}
            disabled={action.disabled}
            className="text-white border-white/20 hover:bg-white/20"
          >
            {action.icon && <span className="mr-1">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
    </div>
  );

  // Footer actions
  const footerContent = actions.length > 0 && (
    <div className="flex items-center justify-between w-full">
      <div className="flex gap-2">
        {actions
          .filter(action => !action.hidden)
          .map(action => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
      </div>
      
      <Button variant="outline" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );

  // Metadata section
  const metadataFields: DetailField[] = showMetadata ? [
    { key: 'id', label: 'ID', copyable: true },
    { key: 'created_at', label: 'Criado em', type: 'date' },
    { key: 'updated_at', label: 'Atualizado em', type: 'date' },
  ] : [];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Detalhes'}
      headerColor="gray"
      headerIcon={<Eye className="w-5 h-5" />}
      description={description}
      headerContent={headerContent}
      footerContent={footerContent}
      size="xl"
      {...baseProps}
    >
      {tabs.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-6">
          {sections.map(renderSection)}
          
          {/* Metadata */}
          {showMetadata && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">Metadados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metadataFields.map(field => renderField(field, item[field.key]))}
              </div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export default DetailsModal; 