import React, { useState, useEffect } from 'react';

export interface CustomField {
  id: string;
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

const FIELD_TYPES = [
  { value: 'text', label: '📝 Texto' },
  { value: 'email', label: '📧 E-mail' },
  { value: 'phone', label: '📞 Telefone' },
  { value: 'textarea', label: '📄 Texto Longo' },
  { value: 'select', label: '📋 Lista de Opções' },
  { value: 'number', label: '🔢 Número' },
  { value: 'date', label: '📅 Data' },
];

const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({
  pipelineId,
  onClose,
}) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text' as CustomField['field_type'],
    field_options: [] as string[],
    is_required: false,
    placeholder: '',
  });

  const API_BASE = 'http://localhost:5001/api';

  // Carregar campos customizados
  const loadFields = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/pipelines/${pipelineId}/custom-fields`);
      
      if (response.ok) {
        const data = await response.json();
        setFields(data.fields || []);
      }
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [pipelineId]);

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      placeholder: '',
    });
    setEditingField(null);
    setShowForm(false);
  };

  // Criar campo
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/pipelines/${pipelineId}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadFields();
        resetForm();
        alert('Campo criado com sucesso!');
      } else {
        alert('Erro ao criar campo');
      }
    } catch (error) {
      console.error('Erro ao criar campo:', error);
      alert('Erro ao criar campo');
    }
  };

  // Atualizar campo
  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;

    try {
      const response = await fetch(`${API_BASE}/pipelines/${pipelineId}/custom-fields/${editingField.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadFields();
        resetForm();
        alert('Campo atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar campo');
      }
    } catch (error) {
      console.error('Erro ao atualizar campo:', error);
      alert('Erro ao atualizar campo');
    }
  };

  // Excluir campo
  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return;

    try {
      const response = await fetch(`${API_BASE}/pipelines/${pipelineId}/custom-fields/${fieldId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadFields();
        alert('Campo excluído com sucesso!');
      } else {
        alert('Erro ao excluir campo');
      }
    } catch (error) {
      console.error('Erro ao excluir campo:', error);
      alert('Erro ao excluir campo');
    }
  };

  // Editar campo
  const handleEditField = (field: CustomField) => {
    setFormData({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      field_options: field.field_options || [],
      is_required: field.is_required,
      placeholder: field.placeholder || '',
    });
    setEditingField(field);
    setShowForm(true);
  };

  // Adicionar opção para campo select
  const addSelectOption = () => {
    setFormData(prev => ({
      ...prev,
      field_options: [...prev.field_options, '']
    }));
  };

  // Remover opção do campo select
  const removeSelectOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      field_options: prev.field_options.filter((_, i) => i !== index)
    }));
  };

  // Atualizar opção do campo select
  const updateSelectOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      field_options: prev.field_options.map((opt, i) => i === index ? value : opt)
    }));
  };

  if (loading) {
    return <div className="loading">Carregando campos customizados...</div>;
  }

  return (
    <div className="custom-fields-manager">
      <div className="manager-header">
        <h4>🎛️ Campos Customizados</h4>
        <div className="header-actions">
          <button onClick={() => setShowForm(true)} className="add-field-btn">
            ➕ Adicionar Campo
          </button>
          <button onClick={onClose} className="close-btn">
            ❌
          </button>
        </div>
      </div>

      {/* Lista de campos existentes */}
      <div className="fields-list">
        {fields.length === 0 ? (
          <div className="empty-fields">
            <p>Nenhum campo customizado criado ainda.</p>
            <p>Clique em "Adicionar Campo" para começar.</p>
          </div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="field-item">
              <div className="field-info">
                <h5>{field.field_label}</h5>
                <div className="field-details">
                  <span className="field-type">
                    {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                  </span>
                  {field.is_required && <span className="required-badge">Obrigatório</span>}
                </div>
                {field.field_options && field.field_options.length > 0 && (
                  <div className="field-options">
                    Opções: {field.field_options.join(', ')}
                  </div>
                )}
              </div>
              <div className="field-actions">
                <button onClick={() => handleEditField(field)} className="edit-btn">
                  ✏️
                </button>
                <button onClick={() => handleDeleteField(field.id)} className="delete-btn">
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulário para criar/editar campo */}
      {showForm && (
        <div className="field-form-overlay">
          <div className="field-form">
            <h5>{editingField ? 'Editar Campo' : 'Novo Campo'}</h5>
            
            <form onSubmit={editingField ? handleUpdateField : handleCreateField}>
              <div className="form-group">
                <label>Nome do Campo (identificador) *</label>
                <input
                  type="text"
                  value={formData.field_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value }))}
                  placeholder="ex: nome_cliente"
                  required
                  disabled={!!editingField} // Não permitir editar o nome
                />
              </div>

              <div className="form-group">
                <label>Rótulo do Campo *</label>
                <input
                  type="text"
                  value={formData.field_label}
                  onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
                  placeholder="ex: Nome do Cliente"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo do Campo *</label>
                <select
                  value={formData.field_type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    field_type: e.target.value as CustomField['field_type']
                  }))}
                  required
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Placeholder</label>
                <input
                  type="text"
                  value={formData.placeholder}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Texto de ajuda para o usuário"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_required: e.target.checked }))}
                  />
                  Campo obrigatório
                </label>
              </div>

              {/* Opções para campo select */}
              {formData.field_type === 'select' && (
                <div className="form-group">
                  <label>Opções da Lista</label>
                  {formData.field_options.map((option, index) => (
                    <div key={index} className="select-option">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateSelectOption(index, e.target.value)}
                        placeholder={`Opção ${index + 1}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeSelectOption(index)}
                        className="remove-option-btn"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addSelectOption} className="add-option-btn">
                    ➕ Adicionar Opção
                  </button>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancelar
                </button>
                <button type="submit" className="submit-btn">
                  {editingField ? 'Atualizar' : 'Criar'} Campo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFieldsManager; 