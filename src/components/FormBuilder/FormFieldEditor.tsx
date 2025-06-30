import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

// ================================================================================
// MIGRAÇÃO FASE 2.5: Usando tipos unificados de src/types/Forms.ts
// ================================================================================
import { FormField } from '../../types/Forms';

interface FormFieldEditorProps {
  fields: FormField[];
  onAddField: () => void;
  onUpdateField: (index: number, field: FormField) => void;
  onRemoveField: (index: number) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

// Nova interface para editar um único campo
interface SingleFieldEditorProps {
  field: FormField;
  onUpdate: (updatedField: FormField) => void;
}

// Componente para editar um único campo
const SingleFieldEditor: React.FC<SingleFieldEditorProps> = ({ field, onUpdate }) => {
  const fieldTypes = [
    { value: 'text', label: 'Texto Simples' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'time', label: 'Horário' },
    { value: 'select', label: 'Lista Suspensa' },
    { value: 'radio', label: 'Múltipla Escolha' },
    { value: 'checkbox', label: 'Caixas de Seleção' },
    { value: 'range', label: 'Controle Deslizante' },
    { value: 'rating', label: 'Avaliação' },
    { value: 'file', label: 'Upload de Arquivo' },
    { value: 'url', label: 'URL/Link' },
    { value: 'address', label: 'Endereço' },
    { value: 'currency', label: 'Moeda' },
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'divider', label: 'Divisor' },
    { value: 'heading', label: 'Título' },
    { value: 'paragraph', label: 'Parágrafo' },
    { value: 'image', label: 'Imagem' }
  ];

  const updateField = (key: string, value: any) => {
    onUpdate({ ...field, [key]: value });
  };

  const updateFieldOptions = (options: any) => {
    updateField('field_options', { ...field.field_options, ...options });
  };

  return (
    <div className="space-y-4">
      {/* Configurações básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Campo
          </label>
          <select
            value={field.field_type}
            onChange={(e) => updateField('field_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          >
            {fieldTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Campo
          </label>
          <input
            type="text"
            value={field.field_name}
            onChange={(e) => updateField('field_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="nome_do_campo"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rótulo (Label)
        </label>
        <input
          type="text"
          value={field.field_label}
          onChange={(e) => updateField('field_label', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          placeholder="Rótulo do campo"
        />
      </div>

      {/* Placeholder - não mostrar para alguns tipos */}
      {!['divider', 'heading', 'paragraph', 'image', 'whatsapp'].includes(field.field_type) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => updateField('placeholder', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="Texto de exemplo..."
          />
        </div>
      )}

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição/Ajuda
        </label>
        <input
          type="text"
          value={field.field_description || ''}
          onChange={(e) => updateField('field_description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          placeholder="Texto de ajuda para o usuário..."
        />
      </div>

      {/* Opções específicas por tipo de campo */}
      
      {/* Select, Radio, Checkbox - Opções */}
      {['select', 'radio', 'checkbox'].includes(field.field_type) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opções (uma por linha)
          </label>
          <textarea
            value={(field.field_options.options || []).join('\n')}
            onChange={(e) => updateFieldOptions({ options: e.target.value.split('\n').filter(opt => opt.trim()) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            rows={4}
            placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
          />
        </div>
      )}

      {/* Rating - Configurações */}
      {field.field_type === 'rating' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máximo de Estrelas
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={field.field_options.max_rating || 5}
              onChange={(e) => updateFieldOptions({ max_rating: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estilo
            </label>
            <select
              value={field.field_options.style || 'stars'}
              onChange={(e) => updateFieldOptions({ style: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="stars">Estrelas</option>
              <option value="hearts">Corações</option>
              <option value="thumbs">Polegares</option>
            </select>
          </div>
        </div>
      )}

      {/* Range - Configurações */}
      {field.field_type === 'range' && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mínimo
            </label>
            <input
              type="number"
              value={field.field_options.min || 0}
              onChange={(e) => updateFieldOptions({ min: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máximo
            </label>
            <input
              type="number"
              value={field.field_options.max || 100}
              onChange={(e) => updateFieldOptions({ max: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passo
            </label>
            <input
              type="number"
              value={field.field_options.step || 1}
              onChange={(e) => updateFieldOptions({ step: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* File - Configurações */}
      {field.field_type === 'file' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipos Aceitos
            </label>
            <input
              type="text"
              value={field.field_options.accept || '*'}
              onChange={(e) => updateFieldOptions({ accept: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="image/*,.pdf,.doc"
            />
          </div>
          <div>
            <label className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={field.field_options.multiple || false}
                onChange={(e) => updateFieldOptions({ multiple: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Múltiplos arquivos</span>
            </label>
          </div>
        </div>
      )}

      {/* WhatsApp - Configurações */}
      {field.field_type === 'whatsapp' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número do WhatsApp
            </label>
            <input
              type="text"
              value={field.field_options.number || ''}
              onChange={(e) => updateFieldOptions({ number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="5511999999999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem Padrão
            </label>
            <textarea
              value={field.field_options.message || 'Olá! Gostaria de mais informações.'}
              onChange={(e) => updateFieldOptions({ message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Texto do Botão
            </label>
            <input
              type="text"
              value={field.field_options.button_text || 'Enviar via WhatsApp'}
              onChange={(e) => updateFieldOptions({ button_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Heading - Configurações */}
      {field.field_type === 'heading' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nível do Título
            </label>
            <select
              value={field.field_options.level || 'h2'}
              onChange={(e) => updateFieldOptions({ level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="h1">H1 - Título Principal</option>
              <option value="h2">H2 - Título Secundário</option>
              <option value="h3">H3 - Subtítulo</option>
              <option value="h4">H4 - Título Menor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alinhamento
            </label>
            <select
              value={field.field_options.align || 'left'}
              onChange={(e) => updateFieldOptions({ align: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </div>
        </div>
      )}

      {/* Paragraph - Configurações */}
      {field.field_type === 'paragraph' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alinhamento
          </label>
          <select
            value={field.field_options.align || 'left'}
            onChange={(e) => updateFieldOptions({ align: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
            <option value="justify">Justificado</option>
          </select>
        </div>
      )}

      {/* Image - Configurações */}
      {field.field_type === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL da Imagem
            </label>
            <input
              type="url"
              value={field.field_options.src || ''}
              onChange={(e) => updateFieldOptions({ src: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto Alternativo
              </label>
              <input
                type="text"
                value={field.field_options.alt || ''}
                onChange={(e) => updateFieldOptions({ alt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="Descrição da imagem"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Largura
              </label>
              <input
                type="text"
                value={field.field_options.width || '100%'}
                onChange={(e) => updateFieldOptions({ width: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="100%, 300px, etc."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alinhamento
            </label>
            <select
              value={field.field_options.align || 'center'}
              onChange={(e) => updateFieldOptions({ align: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </div>
        </div>
      )}

      {/* Campo obrigatório - não mostrar para alguns tipos */}
      {!['divider', 'heading', 'paragraph', 'image', 'whatsapp'].includes(field.field_type) && (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={field.is_required}
              onChange={(e) => updateField('is_required', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Campo obrigatório</span>
          </label>
        </div>
      )}
    </div>
  );
};

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  fields,
  onAddField,
  onUpdateField,
  onRemoveField,
  onMoveField
}) => {
  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'select', label: 'Seleção (Dropdown)' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'date', label: 'Data' },
    { value: 'file', label: 'Arquivo' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'hidden', label: 'Campo Oculto' },
    { value: 'captcha', label: 'Captcha' }
  ];

  const updateField = (index: number, key: string, value: any) => {
    const updatedField = { ...fields[index], [key]: value };
    onUpdateField(index, updatedField);
  };

  const updateFieldOptions = (index: number, options: any) => {
    updateField(index, 'field_options', { ...fields[index].field_options, ...options });
  };

  return (
    <div className="space-y-6">
      {/* Botão Adicionar Campo */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Campos do Formulário</h3>
        <button
          onClick={onAddField}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} />
          <span>Adicionar Campo</span>
        </button>
      </div>

      {/* Lista de Campos */}
      {fields.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhum campo adicionado ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Adicionar Campo" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Header do Campo */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GripVertical size={16} className="text-gray-400 cursor-move" />
                  <span className="font-medium text-gray-900">
                    Campo {index + 1}
                  </span>
                  {field.is_required && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Obrigatório
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {index > 0 && (
                    <button
                      onClick={() => onMoveField(index, index - 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Mover para cima"
                    >
                      ↑
                    </button>
                  )}
                  {index < fields.length - 1 && (
                    <button
                      onClick={() => onMoveField(index, index + 1)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Mover para baixo"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveField(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Remover campo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Configurações do Campo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Campo
                  </label>
                  <select
                    value={field.field_type}
                    onChange={(e) => updateField(index, 'field_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Campo
                  </label>
                  <input
                    type="text"
                    value={field.field_name}
                    onChange={(e) => updateField(index, 'field_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="nome_do_campo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rótulo (Label)
                  </label>
                  <input
                    type="text"
                    value={field.field_label}
                    onChange={(e) => updateField(index, 'field_label', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Rótulo do campo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Texto de exemplo..."
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição/Ajuda
                </label>
                <input
                  type="text"
                  value={field.field_description || ''}
                  onChange={(e) => updateField(index, 'field_description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Texto de ajuda para o usuário..."
                />
              </div>

              {/* Opções para campos select */}
              {field.field_type === 'select' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opções (uma por linha)
                  </label>
                  <textarea
                    value={field.field_options.options || ''}
                    onChange={(e) => updateFieldOptions(index, { options: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={4}
                    placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  />
                </div>
              )}

              {/* Máscara para telefone/WhatsApp */}
              {(field.field_type === 'phone' || field.field_type === 'whatsapp') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máscara
                  </label>
                  <select
                    value={field.field_options.mask || 'phone'}
                    onChange={(e) => updateFieldOptions(index, { mask: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="phone">(00) 00000-0000</option>
                    <option value="phone-alt">(00) 0000-0000</option>
                    <option value="none">Sem máscara</option>
                  </select>
                </div>
              )}

              {/* Campo obrigatório */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={(e) => updateField(index, 'is_required', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Campo obrigatório</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Exportar ambos os componentes
export { SingleFieldEditor };
export default FormFieldEditor;
