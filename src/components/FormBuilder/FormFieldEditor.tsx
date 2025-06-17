
import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface FormField {
  id?: string;
  field_type: string;
  field_name: string;
  field_label: string;
  field_description?: string;
  placeholder?: string;
  is_required: boolean;
  field_options: any;
  validation_rules: any;
  styling: any;
  order_index: number;
}

interface FormFieldEditorProps {
  fields: FormField[];
  onAddField: () => void;
  onUpdateField: (index: number, field: FormField) => void;
  onRemoveField: (index: number) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

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

export default FormFieldEditor;
