// =====================================================================================
// COMPONENT: LeadDataBlock
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Bloco 1 - Dados do Lead e Oportunidade (sempre visível)
// =====================================================================================

import React, { useState } from 'react';
import { User, Mail, Phone, Target, DollarSign, FileText, Globe, ChevronDown, ChevronRight, UserCheck, Calendar } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Lead, CustomField } from '../../../types/Pipeline';
import { getFieldIcon } from '../../../utils/leadDetailsUtils';
import { formatCurrency } from '../../../utils/formatUtils';

interface LeadDataBlockProps {
  lead: Lead;
  customFields: any; // Aceitar qualquer tipo já que pode vir como array ou objeto
  editing: {[key: string]: boolean};
  saving: {[key: string]: boolean};
  editValues: {[key: string]: string};
  getLeadData: (key: string) => any;
  renderEditableField: (
    fieldName: string,
    label: string,
    icon: React.ReactNode,
    placeholder?: string,
    disabled?: boolean,
    fieldOptions?: string[], // ✅ NOVO: Opções para campos select
    key?: string // ✅ NOVO: Key para componente
  ) => React.ReactNode;
  createdByUser?: { // Dados do usuário responsável
    name?: string;
    email?: string;
  };
}

const LeadDataBlockComponent: React.FC<LeadDataBlockProps> = ({
  lead,
  customFields,
  editing,
  saving,
  editValues,
  getLeadData,
  renderEditableField,
  createdByUser
}) => {
  // Estado para controlar seções colapsáveis
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['lead', 'customizados']) // Seções abertas por padrão
  );

  // Função para alternar seções
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Função para formatar data de criação compacta
  const formatCreationDate = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleDateString('pt-BR', { month: 'short' });
      const year = date.getFullYear();
      
      // Formato: 20/Ago de 2025
      return `${day}/${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
    } catch {
      return null;
    }
  };
  // Lista de campos básicos do sistema que NÃO devem aparecer nos campos customizados
  const camposBasicosDoSistema = [
    'nome_oportunidade', 'titulo_oportunidade', 'titulo', 'name',
    'nome_lead', 'nome_contato', 'contato', 'nome', 'lead_name',
    'email', 'email_contato',
    'telefone', 'telefone_contato', 'celular', 'phone',
    'valor', 'valor_oportunidade', 'valor_proposta', 'value'
  ];
  
  // ✅ CORREÇÃO: customFields vem como {fields: Array} - extrair o array
  const fieldsArray = Array.isArray(customFields) 
    ? customFields 
    : (customFields?.fields && Array.isArray(customFields.fields)) 
      ? customFields.fields 
      : [];
  
  // Extrair array dos campos customizados

  // ✅ CORREÇÃO 1: Mostrar TODOS os campos customizados da pipeline (com ou sem valor)
  const camposCustomizadosReais = fieldsArray.filter((field: any) => {
    const naoECampoBasico = !camposBasicosDoSistema.includes(field.field_name);
    
    // Verificar se é campo customizado
    
    return naoECampoBasico; // Mostrar todos os campos customizados, independente de ter valor
  });

  // Campos customizados filtrados prontos para renderização

  return (
    <div className="space-y-6">
      {/* Header do Bloco com Data */}
      <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Dados</h3>
        
        {/* Data de Criação da Oportunidade */}
        {formatCreationDate(lead.created_at) && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="ml-1">{formatCreationDate(lead.created_at)}</span>
          </div>
        )}
      </div>

      {/* SEÇÃO 1: DADOS DA OPORTUNIDADE - LAYOUT OTIMIZADO */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
          {/* Nome da Oportunidade - Sem div wrapper desnecessária */}
          {renderEditableField(
            'nome_oportunidade',
            'Nome da Oportunidade',
            <Target className="w-4 h-4 text-blue-500 flex-shrink-0" />,
            'Digite o nome da oportunidade...',
            false,
            undefined,
            'nome_oportunidade_field'
          )}

          {/* Campos da Oportunidade - Espaçamento Compacto */}
          <div className="space-y-1 mt-2">
            {/* Valor */}
            {renderEditableField(
              'valor',
              'Valor',
              <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Digite o valor...'
            )}

            {/* Links da Oportunidade */}
            {renderEditableField(
              'links_oportunidade',
              'Links',
              <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Cole URLs separadas por vírgula...'
            )}

            {/* Responsável pela Oportunidade - Estrutura Simplificada */}
            {createdByUser?.name && (
              <div className="flex items-center space-x-3 p-1">
                <UserCheck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">Responsável:</span>
                <span className="text-sm text-gray-900">{createdByUser.name}</span>
              </div>
            )}
          </div>
      </div>

      {/* SEÇÃO 2: DADOS DO LEAD - COLAPSÁVEL */}
      <Collapsible.Root
        open={expandedSections.has('lead')}
        onOpenChange={() => toggleSection('lead')}
      >
        <Collapsible.Trigger className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border border-gray-200 rounded-lg bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {expandedSections.has('lead') ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              <User className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm text-gray-900">Lead</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            3 campos
          </div>
        </Collapsible.Trigger>
        
        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
          <div className="mt-3 space-y-1 p-4 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50">
            {/* Nome do Lead */}
            <div className="group">
              {renderEditableField(
                'nome_lead',
                'Nome',
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />,
                'Digite o nome completo...'
              )}
            </div>
            
            {/* Email do Lead */}
            <div className="group">
              {renderEditableField(
                'email',
                'E-mail',
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />,
                'Digite o e-mail...'
              )}
            </div>
            
            {/* Telefone do Lead */}
            <div className="group">
              {renderEditableField(
                'telefone',
                'Telefone',
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />,
                'Digite o telefone...'
              )}
            </div>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      {/* SEÇÃO 3: CAMPOS CUSTOMIZADOS - COLAPSÁVEL */}
      <Collapsible.Root
        open={expandedSections.has('customizados')}
        onOpenChange={() => toggleSection('customizados')}
      >
        <Collapsible.Trigger className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border border-gray-200 rounded-lg bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {expandedSections.has('customizados') ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm text-gray-900">Customizados</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {camposCustomizadosReais.length} campo{camposCustomizadosReais.length !== 1 ? 's' : ''}
          </div>
        </Collapsible.Trigger>
        
        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
          <div className="mt-3 p-2 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50">
            {camposCustomizadosReais.length > 0 ? (
              <div className="space-y-1">
                {camposCustomizadosReais.map((field: any, index: number) => {
                  const IconComponent = getFieldIcon(field.field_type);
                  
                  // ✅ CORREÇÃO REACT ERROR: Key mais robusta combinando id + field_name + index
                  const fieldKey = field.id ? 
                    `field-${field.id}-${field.field_name}` : 
                    `field-${field.field_name}-${index}`;
                  
                  return (
                    renderEditableField(
                      field.field_name,
                      field.field_label + (field.is_required ? ' *' : ''),
                      <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />,
                      `Digite ${field.field_label.toLowerCase()}...`,
                      false, // disabled
                      field.field_options, // ✅ PASSAR field_options para renderizar select quando disponível
                      fieldKey // ✅ PASSAR key para o componente
                    )
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum campo customizado preenchido</p>
                <p className="text-xs mt-1">
                  {(() => {
                    const fieldsArray = Array.isArray(customFields) ? customFields : (customFields?.fields || []);
                    const customFieldsCount = fieldsArray.filter((field: any) => !camposBasicosDoSistema.includes(field.field_name)).length;
                    return customFieldsCount > 0 
                      ? `${customFieldsCount} campos customizados disponíveis neste pipeline`
                      : 'Nenhum campo customizado configurado para este pipeline';
                  })()}
                </p>
              </div>
            )}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
};

// ✅ CORREÇÃO REACT ERROR: React.memo para prevenir re-renders desnecessários
const LeadDataBlock = React.memo(LeadDataBlockComponent);

// ✅ CORREÇÃO REACT ERROR: Adicionar displayName para facilitar debugging
LeadDataBlock.displayName = 'LeadDataBlock';

export default LeadDataBlock;