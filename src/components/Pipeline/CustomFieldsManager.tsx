import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast, showWarningToast } from '../../hooks/useToast';
import { BlurFade } from '../ui/blur-fade'; // ✅ Adicionado para animação de expansão inline

interface CustomField {
  id?: string;
  pipeline_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface CustomFieldsManagerProps {
  pipelineId: string;
  onClose: () => void;
}

const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({
  pipelineId,
  onClose,
}) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'select', label: 'Seleção' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
  ];

  useEffect(() => {
    loadFields();
  }, [pipelineId]);

  const loadFields = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('field_order', { ascending: true });

      if (error) {
        throw error;
      }

      setFields(data || []);
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (field: CustomField) => {
    try {
      if (field.id) {
        // Atualizar campo existente
        const { error } = await supabase
          .from('pipeline_custom_fields')
          .update({
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: field.field_options,
            is_required: field.is_required,
            field_order: field.field_order,
            placeholder: field.placeholder
          })
          .eq('id', field.id);

        if (error) throw error;
      } else {
        // Criar novo campo
        const { error } = await supabase
          .from('pipeline_custom_fields')
          .insert({
            pipeline_id: pipelineId,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: field.field_options,
            is_required: field.is_required,
            field_order: field.field_order,
            placeholder: field.placeholder
          });

        if (error) throw error;
      }

      await loadFields();
      setEditingField(null);
      setShowAddForm(false);
      showSuccessToast('Campo salvo', 'Campo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      showErrorToast('Erro ao salvar', 'Erro ao salvar campo');
    }
  };

  const deleteField = async (fieldId: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return;

    try {
      const { error } = await supabase
        .from('pipeline_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      await loadFields();
      showSuccessToast('Campo excluído', 'Campo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir campo:', error);
      showErrorToast('Erro ao excluir', 'Erro ao excluir campo');
    }
  };

  const FieldForm: React.FC<{
    field: CustomField;
    onSave: (field: CustomField) => void;
    onCancel: () => void;
  }> = ({ field, onSave, onCancel }) => {
    const [formData, setFormData] = useState<CustomField>(field);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.field_name || !formData.field_label) {
        showWarningToast('Campos obrigatórios', 'Nome e rótulo são obrigatórios');
        return;
      }
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome do Campo *
            </label>
            <input
              type="text"
              value={formData.field_name}
              onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="ex: email_cliente"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rótulo *
            </label>
            <input
              type="text"
              value={formData.field_label}
              onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="ex: Email do Cliente"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo
            </label>
            <select
              value={formData.field_type}
              onChange={(e) => setFormData({ ...formData, field_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ordem
            </label>
            <input
              type="number"
              value={formData.field_order}
              onChange={(e) => setFormData({ ...formData, field_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={formData.placeholder || ''}
            onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Texto de exemplo para o campo"
          />
        </div>

        {formData.field_type === 'select' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opções (uma por linha)
            </label>
            <textarea
              value={(formData.field_options || []).join('\n')}
              onChange={(e) => setFormData({ 
                ...formData, 
                field_options: e.target.value.split('\n').filter(opt => opt.trim()) 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={4}
              placeholder="Opção 1\nOpção 2\nOpção 3"
            />
          </div>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_required}
            onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
            className="mr-2 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700 dark:text-gray-300">Campo obrigatório</label>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4 inline mr-1" />
            Salvar
          </button>
        </div>
      </form>
    );
  };

  // ✅ CONVERSÃO PARA EXPANSÃO INLINE - Elimina modal sobreposto
  return (
    <BlurFade>
      <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-6">
        {/* Header do Formulário Inline */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gerenciar Campos Personalizados</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Carregando campos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Campos Existentes ({fields.length})
              </h3>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Campo</span>
              </button>
            </div>

            {showAddForm && (
              <FieldForm
                field={{
                  pipeline_id: pipelineId,
                  field_name: '',
                  field_label: '',
                  field_type: 'text',
                  is_required: false,
                  field_order: fields.length + 1
                }}
                onSave={saveField}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {fields.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum campo personalizado criado</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">Adicione campos para personalizar sua pipeline</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id}>
                    {editingField?.id === field.id ? (
                      <FieldForm
                        field={editingField!}
                        onSave={saveField}
                        onCancel={() => setEditingField(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-800">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500 dark:text-gray-400">#{field.field_order}</span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{field.field_label}</h4>
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                              {fieldTypes.find(t => t.value === field.field_type)?.label}
                            </span>
                            {field.is_required && (
                              <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Campo: {field.field_name}
                            {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingField(field)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => field.id && deleteField(field.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </BlurFade>
  );
};

export default CustomFieldsManager; 