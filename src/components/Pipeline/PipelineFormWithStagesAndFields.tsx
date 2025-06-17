import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage } from '../../hooks/usePipelines';
import { User } from '../../hooks/useMembers';
import './PipelineFormWithStagesAndFields.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CustomField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card: boolean;
}

interface PipelineFormData {
  name: string;
  description: string;
  member_ids: string[];
  stages: Omit<PipelineStage, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>[];
  custom_fields: CustomField[];
}

interface PipelineFormWithStagesAndFieldsProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: PipelineFormData) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
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

const DEFAULT_STAGES = [
  { name: 'Novo Lead', temperature_score: 10, max_days_allowed: 7, color: '#3B82F6', order_index: 0 },
  { name: 'Contato Inicial', temperature_score: 25, max_days_allowed: 5, color: '#10B981', order_index: 1 },
  { name: 'Qualificação', temperature_score: 50, max_days_allowed: 7, color: '#F59E0B', order_index: 2 },
  { name: 'Proposta', temperature_score: 75, max_days_allowed: 10, color: '#EF4444', order_index: 3 },
  { name: 'Negociação', temperature_score: 90, max_days_allowed: 5, color: '#8B5CF6', order_index: 4 },
];

const DEFAULT_FIELDS: CustomField[] = [
  { field_name: 'nome', field_label: 'Nome', field_type: 'text', is_required: true, field_order: 1, placeholder: 'Digite o nome completo', show_in_card: true },
  { field_name: 'email', field_label: 'Email', field_type: 'email', is_required: true, field_order: 2, placeholder: 'exemplo@email.com', show_in_card: true },
  { field_name: 'telefone', field_label: 'Telefone', field_type: 'phone', is_required: true, field_order: 3, placeholder: '(11) 99999-9999', show_in_card: true },
  { field_name: 'valor', field_label: 'Valor', field_type: 'number', is_required: true, field_order: 4, placeholder: '0.00', show_in_card: true },
];

const PipelineFormWithStagesAndFields: React.FC<PipelineFormWithStagesAndFieldsProps> = ({
  members,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'stages' | 'fields'>('basic');
  const [formData, setFormData] = useState<PipelineFormData>({
    name: '',
    description: '',
    member_ids: [],
    stages: DEFAULT_STAGES,
    custom_fields: DEFAULT_FIELDS,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showStageForm, setShowStageForm] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Estados para formulários de etapa e campo
  const [stageForm, setStageForm] = useState({
    name: '',
    temperature_score: 50,
    max_days_allowed: 7,
    color: '#3B82F6',
  });

  const [fieldForm, setFieldForm] = useState<CustomField>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    field_options: [],
    is_required: false,
    field_order: 1,
    placeholder: '',
    show_in_card: true,
  });

  const [loading, setLoading] = useState(false);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (pipeline) {
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: pipeline.pipeline_members?.map(pm => pm.member_id) || [],
        stages: pipeline.pipeline_stages?.map(stage => ({
          name: stage.name,
          temperature_score: stage.temperature_score,
          max_days_allowed: stage.max_days_allowed,
          color: stage.color,
          order_index: stage.order_index,
        })) || DEFAULT_STAGES,
        custom_fields: [], // Será carregado via API se necessário
      });
    }
  }, [pipeline]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.stages.length === 0) {
      newErrors.stages = 'Pelo menos uma etapa é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      console.log('🚀 Criando pipeline completa:', formData.name);
      
      // Usar Supabase diretamente em vez de API
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          name: formData.name,
          description: formData.description,
          tenant_id: user?.tenant_id,
          created_by: user?.email
        })
        .select()
        .single();

      if (pipelineError) {
        throw pipelineError;
      }

      console.log('✅ Pipeline criada:', pipelineData.id);

      // CRIAR ETAPAS COMPLETAS: FIXAS + CUSTOMIZADAS
      const allStages: any[] = [];
      
      // 1. ETAPA FIXA: Novo lead (sempre primeira - order_index: 0)
      allStages.push({
        pipeline_id: pipelineData.id,
        name: 'Novo lead',
        order_index: 0,
        temperature_score: 10,
        max_days_allowed: 7,
        color: '#3B82F6'
      });

      // 2. ETAPAS CUSTOMIZADAS (meio - order_index: 1, 2, 3...)
      formData.stages.forEach((stage, index) => {
        allStages.push({
          pipeline_id: pipelineData.id,
          name: stage.name,
          order_index: index + 1, // Começar do 1 (depois de "Novo lead")
          temperature_score: stage.temperature_score || 50,
          max_days_allowed: stage.max_days_allowed || 7,
          color: stage.color || '#8B5CF6'
        });
      });

      // 3. ETAPAS FIXAS: Ganho e Perdido (sempre últimas)
      const nextIndex = formData.stages.length + 1;
      
      allStages.push({
        pipeline_id: pipelineData.id,
        name: 'Ganho',
        order_index: nextIndex,
        temperature_score: 100,
        max_days_allowed: 0,
        color: '#22C55E'
      });

      allStages.push({
        pipeline_id: pipelineData.id,
        name: 'Perdido',
        order_index: nextIndex + 1,
        temperature_score: 0,
        max_days_allowed: 0,
        color: '#EF4444'
      });

      console.log('📝 Criando etapas:', allStages.map(s => `${s.order_index}: ${s.name}`));

      // Inserir todas as etapas
      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(allStages);

      if (stagesError) {
        console.error('❌ Erro ao criar etapas:', stagesError);
        throw stagesError;
      }

      console.log('✅ Etapas criadas com sucesso');

      // CRIAR CAMPOS CUSTOMIZADOS OBRIGATÓRIOS + CUSTOMIZADOS
      const allFields: any[] = [];

      // 1. CAMPOS OBRIGATÓRIOS (sempre presentes)
      const requiredFields = [
        { field_name: 'nome', field_label: 'Nome', field_type: 'text', is_required: true, field_order: 1, placeholder: 'Digite o nome completo' },
        { field_name: 'email', field_label: 'Email', field_type: 'email', is_required: true, field_order: 2, placeholder: 'exemplo@email.com' },
        { field_name: 'telefone', field_label: 'Telefone', field_type: 'phone', is_required: true, field_order: 3, placeholder: '(11) 99999-9999' },
        { field_name: 'valor', field_label: 'Valor', field_type: 'number', is_required: true, field_order: 4, placeholder: '0.00' }
      ];

      requiredFields.forEach(field => {
        allFields.push({
          pipeline_id: pipelineData.id,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: null,
          is_required: field.is_required,
          field_order: field.field_order,
          placeholder: field.placeholder
        });
      });

      // 2. CAMPOS CUSTOMIZADOS ADICIONAIS
      formData.custom_fields.forEach((field, index) => {
        // Verificar se não é um campo obrigatório duplicado
        const isRequiredField = requiredFields.some(rf => rf.field_name === field.field_name);
        if (!isRequiredField) {
          allFields.push({
            pipeline_id: pipelineData.id,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: field.field_options || null,
            is_required: field.is_required,
            field_order: index + 5, // Começar depois dos campos obrigatórios
            placeholder: field.placeholder
          });
        }
      });

      console.log('📋 Criando campos:', allFields.map(f => `${f.field_order}: ${f.field_label}`));

      // Inserir todos os campos
      if (allFields.length > 0) {
        const { error: fieldsError } = await supabase
          .from('pipeline_custom_fields')
          .insert(allFields);

        if (fieldsError) {
          console.error('❌ Erro ao criar campos:', fieldsError);
          throw fieldsError;
        }

        console.log('✅ Campos criados com sucesso');
      }

      // Adicionar membros se fornecidos
      if (formData.member_ids.length > 0) {
        const memberInserts = formData.member_ids.map(member_id => ({
          pipeline_id: pipelineData.id,
          member_id
        }));

        const { error: membersError } = await supabase
          .from('pipeline_members')
          .insert(memberInserts);

        if (membersError) {
          console.warn('⚠️ Erro ao adicionar membros:', membersError);
        } else {
          console.log('✅ Membros adicionados com sucesso');
        }
      }

      alert(`✅ Pipeline "${formData.name}" criada com sucesso!\n\n📊 Resumo:\n- ${allStages.length} etapas criadas\n- ${allFields.length} campos configurados\n- ${formData.member_ids.length} membros vinculados`);
      onSubmit(formData);
    } catch (error) {
      console.error('💥 Erro ao criar pipeline:', error);
      alert(`❌ Erro ao criar pipeline: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  // Funções para gerenciar etapas
  const handleAddStage = () => {
    if (!stageForm.name.trim()) return;

    const newStage = {
      ...stageForm,
      order_index: formData.stages.length,
    };

    if (editingStageIndex !== null) {
      const updatedStages = [...formData.stages];
      updatedStages[editingStageIndex] = newStage;
      setFormData(prev => ({ ...prev, stages: updatedStages }));
      setEditingStageIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        stages: [...prev.stages, newStage]
      }));
    }

    setStageForm({ name: '', temperature_score: 50, max_days_allowed: 7, color: '#3B82F6' });
    setShowStageForm(false);
  };

  const handleEditStage = (index: number) => {
    const stage = formData.stages[index];
    setStageForm({
      name: stage.name,
      temperature_score: stage.temperature_score,
      max_days_allowed: stage.max_days_allowed,
      color: stage.color,
    });
    setEditingStageIndex(index);
    setShowStageForm(true);
  };

  const handleDeleteStage = (index: number) => {
    if (!confirm('Tem certeza que deseja excluir esta etapa?')) return;
    
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index).map((stage, i) => ({
        ...stage,
        order_index: i
      }))
    }));
  };

  // Funções para gerenciar campos customizados
  const handleAddField = () => {
    if (!fieldForm.field_name.trim() || !fieldForm.field_label.trim()) return;

    const newField = {
      ...fieldForm,
      field_order: formData.custom_fields.length + 1,
    };

    if (editingFieldIndex !== null) {
      const updatedFields = [...formData.custom_fields];
      updatedFields[editingFieldIndex] = newField;
      setFormData(prev => ({ ...prev, custom_fields: updatedFields }));
      setEditingFieldIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        custom_fields: [...prev.custom_fields, newField]
      }));
    }

    setFieldForm({
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      field_order: 1,
      placeholder: '',
      show_in_card: true,
    });
    setShowFieldForm(false);
  };

  const handleEditField = (index: number) => {
    const field = formData.custom_fields[index];
    setFieldForm({ ...field });
    setEditingFieldIndex(index);
    setShowFieldForm(true);
  };

  const handleDeleteField = (index: number) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return;
    
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index).map((field, i) => ({
        ...field,
        field_order: i + 1
      }))
    }));
  };

  // Funções para opções de campo select
  const addSelectOption = () => {
    setFieldForm(prev => ({
      ...prev,
      field_options: [...(prev.field_options || []), '']
    }));
  };

  const removeSelectOption = (index: number) => {
    setFieldForm(prev => ({
      ...prev,
      field_options: (prev.field_options || []).filter((_, i) => i !== index)
    }));
  };

  const updateSelectOption = (index: number, value: string) => {
    setFieldForm(prev => ({
      ...prev,
      field_options: (prev.field_options || []).map((opt, i) => i === index ? value : opt)
    }));
  };

  return (
    <div className="pipeline-form-with-stages-fields">
      <div className="form-header">
        <h4>{title}</h4>
        <div className="form-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            📋 Básico
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
            onClick={() => setActiveTab('stages')}
          >
            🎯 Etapas ({formData.stages.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            🎛️ Campos ({formData.custom_fields.length})
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {/* ABA BÁSICO */}
        {activeTab === 'basic' && (
          <div className="tab-content">
            <div className="form-group">
              <label htmlFor="name">Nome da Pipeline *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? 'error' : ''}
                placeholder="Ex: Vendas Imóveis"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o objetivo desta pipeline..."
                rows={3}
              />
            </div>

            {!pipeline && (
              <div className="form-group">
                <label>Membros da Equipe</label>
                <div className="members-selection">
                  {members.length === 0 ? (
                    <p className="no-members">Nenhum membro disponível</p>
                  ) : (
                    members.map(member => (
                      <div key={member.id} className="member-checkbox">
                        <input
                          type="checkbox"
                          id={`member-${member.id}`}
                          checked={formData.member_ids.includes(member.id)}
                          onChange={() => handleMemberToggle(member.id)}
                        />
                        <label htmlFor={`member-${member.id}`}>
                          {member.first_name} {member.last_name}
                          <small>({member.email})</small>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <small className="form-hint">
                  Selecione os membros que terão acesso a esta pipeline
                </small>
              </div>
            )}
          </div>
        )}

        {/* ABA ETAPAS */}
        {activeTab === 'stages' && (
          <div className="tab-content">
            <div className="section-header">
              <h5>🎯 Etapas do Funil</h5>
              <button
                type="button"
                onClick={() => setShowStageForm(true)}
                className="add-btn"
              >
                ➕ Adicionar Etapa
              </button>
            </div>

            {errors.stages && <div className="error-message">{errors.stages}</div>}

            <div className="stages-list">
              {formData.stages.map((stage, index) => (
                <div key={index} className="stage-item">
                  <div className="stage-info">
                    <div className="stage-color" style={{ backgroundColor: stage.color }}></div>
                    <div className="stage-details">
                      <h6>{stage.name}</h6>
                      <div className="stage-meta">
                        <span>🌡️ {stage.temperature_score}%</span>
                        <span>⏰ {stage.max_days_allowed} dias</span>
                      </div>
                    </div>
                  </div>
                  <div className="stage-actions">
                    <button type="button" onClick={() => handleEditStage(index)} className="edit-btn">
                      ✏️
                    </button>
                    <button type="button" onClick={() => handleDeleteStage(index)} className="delete-btn">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA CAMPOS */}
        {activeTab === 'fields' && (
          <div className="tab-content">
            <div className="section-header">
              <h5>🎛️ Campos Customizados</h5>
              <button
                type="button"
                onClick={() => setShowFieldForm(true)}
                className="add-btn"
              >
                ➕ Adicionar Campo
              </button>
            </div>

            <div className="fields-list">
              {formData.custom_fields.map((field, index) => (
                <div key={index} className="field-item">
                  <div className="field-info">
                    <h6>{field.field_label}</h6>
                    <div className="field-meta">
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
                    <button type="button" onClick={() => handleEditField(index)} className="edit-btn">
                      ✏️
                    </button>
                    <button type="button" onClick={() => handleDeleteField(index)} className="delete-btn">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={async () => {
              // Teste direto
              const testData = {
                name: "Pipeline Teste Felipe",
                description: "Teste direto do formulário",
                tenant_id: "65a7e014-38be-422a-bf45-47d93945df7c",
                created_by: "felipe@felipe.com",
                member_ids: [],
                stages: [
                  {
                    name: "Novo lead",
                    temperature_score: 50,
                    max_days_allowed: 7,
                    color: "#3B82F6",
                    order_index: 1
                  }
                ],
                custom_fields: [
                  {
                    field_name: "nome",
                    field_label: "Nome",
                    field_type: "text",
                    is_required: true,
                    field_order: 1
                  }
                ]
              };

              try {
                const response = await fetch('http://localhost:5001/api/pipelines/complete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(testData),
                });

                if (response.ok) {
                  const result = await response.json();
                  alert('✅ Teste bem-sucedido! Pipeline criada: ' + result.pipeline.id);
                  window.location.reload();
                } else {
                  const error = await response.json();
                  alert('❌ Erro no teste: ' + error.error);
                }
              } catch (error) {
                alert('💥 Erro de conexão: ' + error);
              }
            }}
            className="submit-btn"
            style={{ backgroundColor: '#10B981', marginRight: '10px' }}
          >
            🧪 Teste Direto
          </button>
          <button type="submit" className="submit-btn">
            {submitText}
          </button>
        </div>
      </form>

      {/* MODAL PARA ADICIONAR/EDITAR ETAPA */}
      {showStageForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h5>{editingStageIndex !== null ? 'Editar Etapa' : 'Nova Etapa'}</h5>
              <button onClick={() => setShowStageForm(false)} className="close-btn">❌</button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Nome da Etapa *</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Contato Inicial"
                />
              </div>

              <div className="form-group">
                <label>Temperatura (0-100%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={stageForm.temperature_score}
                  onChange={(e) => setStageForm(prev => ({ ...prev, temperature_score: parseInt(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label>Máximo de Dias *</label>
                <input
                  type="number"
                  min="1"
                  value={stageForm.max_days_allowed}
                  onChange={(e) => setStageForm(prev => ({ ...prev, max_days_allowed: parseInt(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label>Cor</label>
                <input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleAddStage} className="submit-btn">
                  {editingStageIndex !== null ? 'Atualizar' : 'Adicionar'}
                </button>
                <button type="button" onClick={() => setShowStageForm(false)} className="cancel-btn">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ADICIONAR/EDITAR CAMPO */}
      {showFieldForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h5>{editingFieldIndex !== null ? 'Editar Campo' : 'Novo Campo'}</h5>
              <button onClick={() => setShowFieldForm(false)} className="close-btn">❌</button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Nome do Campo (identificador) *</label>
                <input
                  type="text"
                  value={fieldForm.field_name}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, field_name: e.target.value }))}
                  placeholder="ex: nome_cliente"
                  disabled={editingFieldIndex !== null}
                />
              </div>

              <div className="form-group">
                <label>Rótulo do Campo *</label>
                <input
                  type="text"
                  value={fieldForm.field_label}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, field_label: e.target.value }))}
                  placeholder="ex: Nome do Cliente"
                />
              </div>

              <div className="form-group">
                <label>Tipo do Campo *</label>
                <select
                  value={fieldForm.field_type}
                  onChange={(e) => setFieldForm(prev => ({ 
                    ...prev, 
                    field_type: e.target.value as CustomField['field_type']
                  }))}
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
                  value={fieldForm.placeholder}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="Texto de ajuda para o usuário"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={fieldForm.is_required}
                    onChange={(e) => setFieldForm(prev => ({ ...prev, is_required: e.target.checked }))}
                  />
                  Campo obrigatório
                </label>
              </div>

              {fieldForm.field_type === 'select' && (
                <div className="form-group">
                  <label>Opções da Lista</label>
                  {(fieldForm.field_options || []).map((option, index) => (
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

              <div className="modal-actions">
                <button type="button" onClick={handleAddField} className="submit-btn">
                  {editingFieldIndex !== null ? 'Atualizar' : 'Adicionar'}
                </button>
                <button type="button" onClick={() => setShowFieldForm(false)} className="cancel-btn">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineFormWithStagesAndFields; 