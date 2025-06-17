import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
      alert('Campo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      alert('Erro ao salvar campo');
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
      alert('Campo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir campo:', error);
      alert('Erro ao excluir campo');
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
        alert('Nome e rótulo são obrigatórios');
        return;
      }
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Campo *
            </label>
            <input
              type="text"
              value={formData.field_name}
              onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: email_cliente"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rótulo *
            </label>
            <input
              type="text"
              value={formData.field_label}
              onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Email do Cliente"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.field_type}
              onChange={(e) => setFormData({ ...formData, field_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordem
            </label>
            <input
              type="number"
              value={formData.field_order}
              onChange={(e) => setFormData({ ...formData, field_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={formData.placeholder || ''}
            onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Texto de exemplo para o campo"
          />
        </div>

        {formData.field_type === 'select' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opções (uma por linha)
            </label>
            <textarea
              value={(formData.field_options || []).join('\n')}
              onChange={(e) => setFormData({ 
                ...formData, 
                field_options: e.target.value.split('\n').filter(opt => opt.trim()) 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="mr-2"
          />
          <label className="text-sm text-gray-700">Campo obrigatório</label>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Gerenciar Campos Personalizados</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando campos...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
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
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">Nenhum campo personalizado criado</p>
                  <p className="text-gray-400 text-sm">Adicione campos para personalizar sua pipeline</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.id}>
                      {editingField?.id === field.id ? (
                        <FieldForm
                          field={editingField}
                          onSave={saveField}
                          onCancel={() => setEditingField(null)}
                        />
                      ) : (
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">#{field.field_order}</span>
                              <h4 className="font-medium text-gray-900">{field.field_label}</h4>
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {fieldTypes.find(t => t.value === field.field_type)?.label}
                              </span>
                              {field.is_required && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                                  Obrigatório
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Campo: {field.field_name}
                              {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setEditingField(field)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => field.id && deleteField(field.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
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
      </div>
    </div>
  );
};

export default CustomFieldsManager; 