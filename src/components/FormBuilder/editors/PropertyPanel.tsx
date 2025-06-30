// FASE 3.3: PropertyPanel - Painel de propriedades de campo modular
// Extrai lógica de edição de propriedades do ModernFormBuilder

import React, { memo } from 'react';
import { X, Eye, EyeOff, Star, Settings } from 'lucide-react';
import { FormField } from '../../../types/Forms';

export interface PropertyPanelProps {
  selectedField: FormField | null;
  onUpdateField: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = memo(({
  selectedField,
  onUpdateField,
  onClose
}) => {
  if (!selectedField) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
        <div className="text-center">
          <Settings size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Selecione um campo</h3>
          <p className="text-sm">Clique em um campo para editar suas propriedades</p>
        </div>
      </div>
    );
  }

  const updateField = (key: keyof FormField, value: any) => {
    onUpdateField({ [key]: value });
  };

  const updateFieldOption = (key: string, value: any) => {
    onUpdateField({
      field_options: {
        ...selectedField.field_options,
        [key]: value
      }
    });
  };

  const updateValidationRule = (key: string, value: any) => {
    onUpdateField({
      validation_rules: {
        ...selectedField.validation_rules,
        [key]: value
      }
    });
  };

  const updateStyling = (key: string, value: any) => {
    onUpdateField({
      styling: {
        ...selectedField.styling,
        [key]: value
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Settings size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Propriedades</h3>
            <p className="text-xs text-gray-500">{selectedField.field_type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Configurações Básicas */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 text-sm">Configurações Básicas</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Campo
            </label>
            <input
              type="text"
              value={selectedField.field_name}
              onChange={(e) => updateField('field_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="nome_do_campo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rótulo
            </label>
            <input
              type="text"
              value={selectedField.field_label}
              onChange={(e) => updateField('field_label', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rótulo visível"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={selectedField.field_description || ''}
              onChange={(e) => updateField('field_description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
              placeholder="Texto de ajuda (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={selectedField.placeholder || ''}
              onChange={(e) => updateField('placeholder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Texto de exemplo"
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <input
                id="required"
                type="checkbox"
                checked={selectedField.is_required}
                onChange={(e) => updateField('is_required', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                Campo obrigatório
              </label>
            </div>
          </div>
        </div>

        {/* Pontuação MQL */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 text-sm flex items-center">
            <Star size={16} className="mr-2 text-yellow-500" />
            Pontuação MQL
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peso (0-100 pontos)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={selectedField.scoring_weight || 0}
              onChange={(e) => updateField('scoring_weight', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pontos atribuídos quando o campo é preenchido
            </p>
          </div>
        </div>

        {/* Opções Específicas por Tipo */}
        {(selectedField.field_type === 'select' || 
          selectedField.field_type === 'radio' || 
          selectedField.field_type === 'checkbox') && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 text-sm">Opções</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lista de opções (uma por linha)
              </label>
              <textarea
                value={selectedField.field_options.options?.join('\n') || ''}
                onChange={(e) => updateFieldOption('options', e.target.value.split('\n').filter(o => o.trim()))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
              />
            </div>
          </div>
        )}

        {selectedField.field_type === 'rating' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 text-sm">Configurações da Avaliação</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo de estrelas
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={selectedField.field_options.max_rating || 5}
                onChange={(e) => updateFieldOption('max_rating', parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estilo
              </label>
              <select
                value={selectedField.field_options.style || 'stars'}
                onChange={(e) => updateFieldOption('style', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="stars">Estrelas</option>
                <option value="hearts">Corações</option>
                <option value="thumbs">Polegares</option>
              </select>
            </div>
          </div>
        )}

        {selectedField.field_type === 'range' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 text-sm">Configurações da Faixa</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mínimo
                </label>
                <input
                  type="number"
                  value={selectedField.field_options.min || 0}
                  onChange={(e) => updateFieldOption('min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo
                </label>
                <input
                  type="number"
                  value={selectedField.field_options.max || 100}
                  onChange={(e) => updateFieldOption('max', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passo
              </label>
              <input
                type="number"
                min="1"
                value={selectedField.field_options.step || 1}
                onChange={(e) => updateFieldOption('step', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {selectedField.field_type === 'file' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 text-sm">Configurações do Arquivo</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipos aceitos
              </label>
              <input
                type="text"
                value={selectedField.field_options.accept || ''}
                onChange={(e) => updateFieldOption('accept', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder=".pdf,.jpg,.png ou image/*"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho máximo
              </label>
              <input
                type="text"
                value={selectedField.field_options.max_size || ''}
                onChange={(e) => updateFieldOption('max_size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="5MB, 10MB, etc."
              />
            </div>

            <div className="flex items-center">
              <input
                id="multiple"
                type="checkbox"
                checked={selectedField.field_options.multiple || false}
                onChange={(e) => updateFieldOption('multiple', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="multiple" className="ml-2 text-sm text-gray-700">
                Permitir múltiplos arquivos
              </label>
            </div>
          </div>
        )}

        {/* Validações */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 text-sm">Validações</h4>
          
          {(selectedField.field_type === 'text' || selectedField.field_type === 'textarea') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. caracteres
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedField.validation_rules?.min_length || ''}
                    onChange={(e) => updateValidationRule('min_length', parseInt(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max. caracteres
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedField.validation_rules?.max_length || ''}
                    onChange={(e) => updateValidationRule('max_length', parseInt(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Padrão (RegEx)
                </label>
                <input
                  type="text"
                  value={selectedField.validation_rules?.pattern || ''}
                  onChange={(e) => updateValidationRule('pattern', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="^[A-Za-z]+$"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem de erro personalizada
            </label>
            <input
              type="text"
              value={selectedField.validation_rules?.custom_message || ''}
              onChange={(e) => updateValidationRule('custom_message', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mensagem quando a validação falhar"
            />
          </div>
        </div>

        {/* Estilo */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 text-sm">Estilo</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor de fundo
              </label>
              <input
                type="color"
                value={selectedField.styling?.backgroundColor || '#ffffff'}
                onChange={(e) => updateStyling('backgroundColor', e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor do texto
              </label>
              <input
                type="color"
                value={selectedField.styling?.textColor || '#000000'}
                onChange={(e) => updateStyling('textColor', e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tamanho da fonte
            </label>
            <select
              value={selectedField.styling?.fontSize || '16px'}
              onChange={(e) => updateStyling('fontSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="14px">Pequeno (14px)</option>
              <option value="16px">Normal (16px)</option>
              <option value="18px">Médio (18px)</option>
              <option value="20px">Grande (20px)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raio da borda
            </label>
            <select
              value={selectedField.styling?.borderRadius || '8px'}
              onChange={(e) => updateStyling('borderRadius', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="0px">Sem arredondamento</option>
              <option value="4px">Pequeno (4px)</option>
              <option value="8px">Normal (8px)</option>
              <option value="12px">Médio (12px)</option>
              <option value="16px">Grande (16px)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

PropertyPanel.displayName = 'PropertyPanel';

export default PropertyPanel; 