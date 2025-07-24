// =====================================================================================
// COMPONENT: LeadDataBlock
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Bloco 1 - Dados do Lead e Oportunidade (sempre visível)
// =====================================================================================

import React from 'react';
import { User, Mail, Phone, Target, DollarSign, FileText, Globe, MessageCircle } from 'lucide-react';
import { Lead, CustomField } from '../../../types/Pipeline';
import { getFieldIcon } from '../../../utils/leadDetailsUtils';

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
}

const LeadDataBlock: React.FC<LeadDataBlockProps> = ({
  lead,
  customFields,
  editing,
  saving,
  editValues,
  getLeadData,
  renderEditableField
}) => {
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
    <div className="space-y-6 h-full">
      {/* Header do Bloco */}
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">Dados do Lead</h3>
        <p className="text-sm text-gray-500">Informações da oportunidade e contato</p>
      </div>

      {/* SEÇÃO 1: DADOS DA OPORTUNIDADE */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200 flex items-center">
          <Target className="w-4 h-4 mr-2 text-blue-600" />
          Oportunidade
        </h4>
        <div className="space-y-2">
          {/* Nome da Oportunidade */}
          <div className="group">
            {renderEditableField(
              'nome_oportunidade',
              'Nome',
              <Target className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Digite o nome da oportunidade...'
            )}
          </div>
          
          {/* Valor da Oportunidade */}
          <div className="group">
            {renderEditableField(
              'valor',
              'Valor',
              <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Ex: 1500,00'
            )}
          </div>

          {/* Documentos da Oportunidade */}
          <div className="group">
            {renderEditableField(
              'documentos_anexos',
              'Documentos',
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Cole links de documentos separados por vírgula...'
            )}
          </div>

          {/* Links da Oportunidade */}
          <div className="group">
            {renderEditableField(
              'links_oportunidade',
              'Links',
              <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Cole URLs separadas por vírgula...'
            )}
          </div>

          {/* Notas sobre a Oportunidade */}
          <div className="group">
            {renderEditableField(
              'notas_oportunidade',
              'Notas',
              <MessageCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />,
              'Digite observações sobre a oportunidade...'
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: DADOS DO LEAD */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200 flex items-center">
          <User className="w-4 h-4 mr-2 text-green-600" />
          Lead
        </h4>
        <div className="space-y-2">
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
      </div>

      {/* SEÇÃO 3: CAMPOS CUSTOMIZADOS */}
      {camposCustomizadosReais.length > 0 ? (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-purple-600" />
            Campos Customizados ({camposCustomizadosReais.length})
          </h4>
          <div className="space-y-2">
            {camposCustomizadosReais.map((field: any) => {
              const IconComponent = getFieldIcon(field.field_type);
              
              return (
                <div key={field.id} className="group">
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
        </div>
      ) : (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-purple-600" />
            Campos Customizados
          </h4>
          <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
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
        </div>
      )}
    </div>
  );
};

export default LeadDataBlock;