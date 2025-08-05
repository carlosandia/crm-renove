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
import { FlexibleValueInput } from '../../ui/flexible-value-input';

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
    disabled?: boolean
  ) => React.ReactNode;
  createdByUser?: { // Dados do usuário responsável
    name?: string;
    email?: string;
  };
  onUpdateValue?: (fieldName: string, value: any) => void; // Handler para atualizações de valor
}

const LeadDataBlockComponent: React.FC<LeadDataBlockProps> = ({
  lead,
  customFields,
  editing,
  saving,
  editValues,
  getLeadData,
  renderEditableField,
  createdByUser,
  onUpdateValue
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

  // Função para formatar data de criação
  const formatCreationDate = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short', 
        year: '2-digit'
      });
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
  
  // ✅ CORREÇÃO 1: Mostrar TODOS os campos customizados da pipeline (com ou sem valor)
  const camposCustomizadosReais = fieldsArray.filter((field: any) => {
    const naoECampoBasico = !camposBasicosDoSistema.includes(field.field_name);
    return naoECampoBasico; // Mostrar todos os campos customizados, independente de ter valor
  });

  return (
    <div className="space-y-6">
      {/* Header do Bloco */}
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">Dados</h3>
      </div>

      {/* SEÇÃO 1: DADOS DA OPORTUNIDADE - HEADER MODERNO */}
      <div className="group relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Header Principal com Layout Otimizado */}
          <div className="relative flex items-start gap-4 mb-4">
            {/* Avatar com Border Gradient */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5">
                <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              {/* Status Badge */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Nome Principal - Título Destacado */}
              <div className="mb-1">
                <div className="[&_.flex-shrink-0]:hidden [&_.text-sm]:text-2xl [&_.text-sm]:font-semibold [&_.text-sm]:text-foreground [&_input]:text-2xl [&_input]:font-semibold [&_input]:text-foreground">
                  {renderEditableField(
                    'nome_oportunidade',
                    '',
                    <></>,
                    'Digite o nome da oportunidade...'
                  )}
                </div>
              </div>
              
              {/* Metadata Row */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {formatCreationDate(lead.created_at) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Criado em {formatCreationDate(lead.created_at)}
                  </span>
                )}
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Ativo
                </div>
              </div>
            </div>
          </div>

          {/* Campos da Oportunidade */}
          <div className="grid gap-4">
            {/* Sistema de Valores Flexível */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span>Valor da Oportunidade</span>
              </div>
              <div className="pl-6">
                <FlexibleValueInput
                  leadId={lead.id}
                  pipelineId={lead.pipeline_id}
                  initialValues={{
                    valor_unico: lead.valor_unico || (lead.valor ? parseFloat(lead.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0),
                    valor_recorrente: lead.valor_recorrente || 0,
                    recorrencia_periodo: lead.recorrencia_periodo || 1,
                    recorrencia_unidade: lead.recorrencia_unidade || 'mes',
                    tipo_venda: lead.tipo_venda || 'unico'
                  }}
                  onValueChange={(values) => {
                    // Chamar onUpdateValue para cada campo se disponível
                    if (onUpdateValue) {
                      onUpdateValue('valor_unico', values.valor_unico);
                      onUpdateValue('valor_recorrente', values.valor_recorrente);
                      onUpdateValue('recorrencia_periodo', values.recorrencia_periodo);
                      onUpdateValue('recorrencia_unidade', values.recorrencia_unidade);
                      onUpdateValue('tipo_venda', values.tipo_venda);
                    }
                  }}
                  disabled={saving.valor || saving.valor_unico}
                  autoSave={true}
                />
              </div>
            </div>

            {/* Links da Oportunidade */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Globe className="w-4 h-4 text-gray-500" />
                <span>Links</span>
              </div>
              <div className="pl-6">
                <div className="[&_.flex-shrink-0]:hidden [&>div]:p-0 [&_.text-sm]:text-base [&_input]:text-base">
                  {renderEditableField(
                    'links_oportunidade',
                    '',
                    <></>,
                    'Cole URLs separadas por vírgula...'
                  )}
                </div>
              </div>
            </div>

            {/* Responsável pela Oportunidade */}
            {createdByUser?.name && (
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                  <span>Responsável</span>
                </div>
                <div className="pl-6 text-sm text-gray-600">
                  {createdByUser.name}
                </div>
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
          <div className="mt-3 space-y-2 p-4 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50">
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
          <div className="mt-3 p-4 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50">
            {camposCustomizadosReais.length > 0 ? (
              <div className="space-y-2">
                {camposCustomizadosReais.map((field: any, index: number) => {
                  const IconComponent = getFieldIcon(field.field_type);
                  
                  // ✅ CORREÇÃO REACT ERROR: Key mais robusta combinando id + field_name + index
                  const fieldKey = field.id ? 
                    `field-${field.id}-${field.field_name}` : 
                    `field-${field.field_name}-${index}`;
                  
                  return (
                    <div key={fieldKey} className="group">
                      {renderEditableField(
                        field.field_name,
                        field.field_label + (field.is_required ? ' *' : ''),
                        <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />,
                        `Digite ${field.field_label.toLowerCase()}...`
                      )}
                    </div>
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