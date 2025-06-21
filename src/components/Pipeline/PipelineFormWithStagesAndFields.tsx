import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage, CustomField as PipelineCustomField } from '../../types/Pipeline';
import { User } from '../../types/User';
import './PipelineFormWithStagesAndFields.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Settings, 
  Target, 
  Sliders, 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Thermometer,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  CheckSquare,
  FileText,
  Hash,
  AlignLeft,
  List,
  CalendarDays,
  Building2,
  Send,
  PhoneCall,
  ClipboardList,
  UserCheck,
  FileCheck
} from 'lucide-react';

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

// Interfaces para Cadência
interface CadenceTask {
  id?: string;
  day_offset: number; // D+0, D+1, D+2...
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

interface CadenceConfig {
  id?: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
}

interface PipelineFormData {
  name: string;
  description: string;
  member_ids: string[];
  stages: Omit<PipelineStage, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>[];
  custom_fields: CustomField[];
  cadence_configs: CadenceConfig[]; // Nova propriedade para cadências
}

interface PipelineFormWithStagesAndFieldsProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: PipelineFormData) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
}

// Constantes para cadência
const CHANNEL_OPTIONS = [
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'tarefa', label: 'Tarefa', icon: ClipboardList },
  { value: 'visita', label: 'Visita', icon: Building2 },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'mensagem', label: 'Enviar Mensagem', icon: Send },
  { value: 'ligacao', label: 'Fazer Ligação', icon: PhoneCall },
  { value: 'tarefa', label: 'Criar Tarefa', icon: ClipboardList },
  { value: 'email_followup', label: 'Follow-up Email', icon: Mail },
  { value: 'agendamento', label: 'Agendar Reunião', icon: Calendar },
  { value: 'proposta', label: 'Enviar Proposta', icon: FileCheck },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: FileText },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'phone', label: 'Telefone', icon: Phone },
  { value: 'textarea', label: 'Texto Longo', icon: AlignLeft },
  { value: 'select', label: 'Lista de Opções', icon: List },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'date', label: 'Data', icon: CalendarDays },
];

// Etapas obrigatórias do sistema (não editáveis/excluíveis)
const SYSTEM_STAGES = [
  { 
    name: 'Novos leads', 
    temperature_score: 10, 
    max_days_allowed: 7, 
    time_unit: 'days' as 'minutes' | 'hours' | 'days',
    color: '#3B82F6', 
    order_index: 0, 
    is_system: true,
    position: 'first'
  },
  { 
    name: 'Ganho', 
    temperature_score: 100, 
    max_days_allowed: 0, 
    time_unit: 'days' as 'minutes' | 'hours' | 'days',
    color: '#10B981', 
    order_index: 998, 
    is_system: true,
    position: 'second-last'
  },
  { 
    name: 'Perdido', 
    temperature_score: 0, 
    max_days_allowed: 0, 
    time_unit: 'days' as 'minutes' | 'hours' | 'days',
    color: '#EF4444', 
    order_index: 999, 
    is_system: true,
    position: 'last'
  },
];

// Campos obrigatórios do sistema (não editáveis) - VISÍVEIS E ORGANIZADOS
const SYSTEM_REQUIRED_FIELDS: CustomField[] = [
  { field_name: 'nome_lead', field_label: 'Nome do Lead', field_type: 'text', is_required: true, field_order: 1, placeholder: 'Digite o nome do lead', show_in_card: true },
  { field_name: 'email', field_label: 'E-mail', field_type: 'email', is_required: true, field_order: 2, placeholder: 'exemplo@email.com', show_in_card: true },
  { field_name: 'telefone', field_label: 'Telefone', field_type: 'phone', is_required: true, field_order: 3, placeholder: '(11) 99999-9999', show_in_card: true },
];

// Campos customizados padrão (editáveis)
const DEFAULT_CUSTOM_FIELDS: CustomField[] = [];

// Opções de unidade de tempo
const TIME_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutos', short: 'min' },
  { value: 'hours', label: 'Horas', short: 'h' },
  { value: 'days', label: 'Dias', short: 'd' },
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
  const [activeTab, setActiveTab] = useState<'basic' | 'stages' | 'fields' | 'cadence'>('basic');
  
  // Função para organizar etapas na ordem correta
  const organizeStages = (stages: any[]) => {
    const systemStages = SYSTEM_STAGES;
    const customStages = stages.filter(stage => !stage.is_system);
    
    // Reordenar: Novos leads → Custom → Ganho → Perdido
    const organized = [
      systemStages.find(s => s.position === 'first')!, // Novos leads
      ...customStages.map((stage, index) => ({ ...stage, order_index: index + 1 })),
      systemStages.find(s => s.position === 'second-last')!, // Ganho
      systemStages.find(s => s.position === 'last')! // Perdido
    ];
    
    return organized.map((stage, index) => ({ ...stage, order_index: index }));
  };

  const [formData, setFormData] = useState<PipelineFormData>({
    name: '',
    description: '',
    member_ids: [],
    stages: organizeStages(SYSTEM_STAGES),
    custom_fields: [...SYSTEM_REQUIRED_FIELDS],
    cadence_configs: [],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Estados para edição inline (SEM MODAIS)
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [showNewStageForm, setShowNewStageForm] = useState(false);
  const [showNewFieldForm, setShowNewFieldForm] = useState(false);
  const [editingCadenceStage, setEditingCadenceStage] = useState<string | null>(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState<string | null>(null);

  // Estados para formulários inline
  const [stageForm, setStageForm] = useState({
    name: '',
    temperature_score: 50,
    max_days_allowed: 7,
    time_unit: 'days' as 'minutes' | 'hours' | 'days',
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

  // Estados para formulário de tarefa de cadência
  const [cadenceTaskForm, setCadenceTaskForm] = useState<CadenceTask>({
    day_offset: 0,
    task_order: 1,
    channel: 'email',
    action_type: 'mensagem',
    task_title: '',
    task_description: '',
    template_content: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (pipeline) {
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: pipeline.pipeline_members?.map(pm => pm.user_id) || [],
        stages: pipeline.pipeline_stages?.map(stage => ({
          name: stage.name,
          temperature_score: stage.temperature_score,
          max_days_allowed: stage.max_days_allowed,
          color: stage.color,
          order_index: stage.order_index,
        })) || SYSTEM_STAGES,
        custom_fields: [
          ...SYSTEM_REQUIRED_FIELDS, // Sempre incluir campos do sistema
          ...(pipeline.custom_fields || []).filter((field: PipelineCustomField) => 
            // Filtrar campos customizados que não sejam do sistema
            !SYSTEM_REQUIRED_FIELDS.some(sysField => sysField.field_name === field.field_name)
          ).map(field => ({
            ...field,
            show_in_card: field.show_in_card ?? true // Garantir que show_in_card seja boolean
          }))
        ],
        cadence_configs: [], // Será carregado via API se necessário
      });

      // Carregar configurações de cadência se estiver editando
      loadCadenceConfigs(pipeline.id);
    }
  }, [pipeline]);

  // Função para carregar configurações de cadência
  const loadCadenceConfigs = async (pipelineId: string) => {
    try {
      const response = await fetch(`/api/cadence/load/${pipelineId}?tenant_id=${user?.tenant_id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.configs && data.configs.length > 0) {
          setFormData(prev => ({
            ...prev,
            cadence_configs: data.configs
          }));
          console.log('✅ Configurações de cadência carregadas:', data.configs.length);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar configurações de cadência:', error);
    }
  };

  // Inicializar configurações de cadência para cada etapa
  useEffect(() => {
    if (formData.stages.length > 0 && formData.cadence_configs.length === 0) {
      const initialCadenceConfigs = formData.stages.map((stage, index) => ({
        stage_name: stage.name,
        stage_order: index,
        tasks: [],
        is_active: true,
      }));
      setFormData(prev => ({ ...prev, cadence_configs: initialCadenceConfigs }));
    }
  }, [formData.stages]);

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

      console.log('<FileText className="w-4 h-4" /> Criando etapas:', allStages.map(s => `${s.order_index}: ${s.name}`));

      // Inserir todas as etapas
      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(allStages);

      if (stagesError) {
        console.error('<X className="w-4 h-4" /> Erro ao criar etapas:', stagesError);
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
          console.error('<X className="w-4 h-4" /> Erro ao criar campos:', fieldsError);
          throw fieldsError;
        }

        console.log('✅ Campos criados com sucesso');
      }

      // SALVAR CONFIGURAÇÕES DE CADÊNCIA
      if (formData.cadence_configs.length > 0) {
        try {
          const cadenceData = {
            pipeline_id: pipelineData.id,
            cadence_configs: formData.cadence_configs.map(config => ({
              pipeline_id: pipelineData.id,
              stage_name: config.stage_name,
              stage_order: config.stage_order,
              tasks: config.tasks,
              is_active: config.is_active,
              tenant_id: user?.tenant_id
            })),
            tenant_id: user?.tenant_id,
            created_by: user?.email || 'system'
          };

          const cadenceResponse = await fetch('/api/cadence/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cadenceData)
          });

          if (cadenceResponse.ok) {
            console.log('✅ Configurações de cadência salvas com sucesso');
          } else {
            console.warn('⚠️ Erro ao salvar configurações de cadência');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao salvar configurações de cadência:', error);
        }
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
      alert(`<X className="w-4 h-4" /> Erro ao criar pipeline: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    if (stageForm.name.trim()) {
      const newStage = {
        name: stageForm.name,
        temperature_score: stageForm.temperature_score,
        max_days_allowed: stageForm.max_days_allowed,
        time_unit: stageForm.time_unit,
        color: stageForm.color,
        order_index: formData.stages.length,
        is_system: false, // Etapas customizadas não são do sistema
      };
      
      setFormData(prev => ({
        ...prev,
        stages: [...prev.stages, newStage]
      }));
      
      setStageForm({
        name: '',
        temperature_score: 50,
        max_days_allowed: 7,
        time_unit: 'days',
        color: '#3B82F6',
      });
      setShowNewStageForm(false);
    }
  };

  const handleEditStage = (index: number) => {
    const stage = formData.stages[index];
    
    // Verificar se é etapa do sistema - só pode editar temperatura e tempo
    if (stage.is_system) {
      setStageForm({
        name: stage.name, // Nome bloqueado para edição
        temperature_score: stage.temperature_score,
        max_days_allowed: stage.max_days_allowed,
        time_unit: stage.time_unit || 'days',
        color: stage.color, // Cor bloqueada para edição
      });
    } else {
      setStageForm({
        name: stage.name,
        temperature_score: stage.temperature_score,
        max_days_allowed: stage.max_days_allowed,
        time_unit: stage.time_unit || 'days',
        color: stage.color,
      });
    }
    
    setEditingStageIndex(index);
    setShowNewStageForm(true);
  };

  const handleDeleteStage = (index: number) => {
    const stage = formData.stages[index];
    
    // Bloquear exclusão de etapas do sistema
    if (stage.is_system) {
      alert('Não é possível excluir etapas do sistema (Novos leads, Ganho, Perdido)');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
    }));
  };

  const handleSaveStage = () => {
    if (editingStageIndex !== null) {
      const stage = formData.stages[editingStageIndex];
      
      // Para etapas do sistema, só atualizar temperatura e tempo
      if (stage.is_system) {
        const updatedStages = [...formData.stages];
        updatedStages[editingStageIndex] = {
          ...stage,
          temperature_score: stageForm.temperature_score,
          max_days_allowed: stageForm.max_days_allowed,
          time_unit: stageForm.time_unit,
        };
        setFormData(prev => ({ ...prev, stages: updatedStages }));
      } else {
        // Para etapas customizadas, permitir edição completa
        const updatedStages = [...formData.stages];
        updatedStages[editingStageIndex] = {
          ...stage,
          name: stageForm.name,
          temperature_score: stageForm.temperature_score,
          max_days_allowed: stageForm.max_days_allowed,
          time_unit: stageForm.time_unit,
          color: stageForm.color,
        };
        setFormData(prev => ({ ...prev, stages: updatedStages }));
      }
      
      setEditingStageIndex(null);
      setShowNewStageForm(false);
      setStageForm({
        name: '',
        temperature_score: 50,
        max_days_allowed: 7,
        time_unit: 'days',
        color: '#3B82F6',
      });
    } else {
      handleAddStage();
    }
  };

  // Função para formatar a unidade de tempo
  const formatTimeUnit = (value: number, unit: 'minutes' | 'hours' | 'days') => {
    const unitMap = {
      minutes: value === 1 ? 'min' : 'min',
      hours: value === 1 ? 'h' : 'h', 
      days: value === 1 ? 'd' : 'd'
    };
    return `${value}${unitMap[unit]}`;
  };

  // Funções para gerenciar campos customizados
  const handleAddField = () => {
    if (!fieldForm.field_name.trim() || !fieldForm.field_label.trim()) return;

    // Verificar se já existe um campo com este nome
    const fieldExists = formData.custom_fields.some((field, index) => 
      field.field_name.toLowerCase() === fieldForm.field_name.toLowerCase() && 
      index !== editingFieldIndex
    );

    if (fieldExists) {
      alert('⚠️ Já existe um campo com este nome!');
      return;
    }

    // Verificar se está tentando criar um campo com nome de sistema
    const isSystemFieldName = SYSTEM_REQUIRED_FIELDS.some(sysField => 
      sysField.field_name.toLowerCase() === fieldForm.field_name.toLowerCase()
    );

    if (isSystemFieldName && editingFieldIndex === null) {
      alert('⚠️ Este nome de campo é reservado pelo sistema!');
      return;
    }

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
    setShowNewFieldForm(false);
  };

  const handleEditField = (index: number) => {
    const field = formData.custom_fields[index];
    
    // Verificar se é um campo do sistema - não pode ser editado
    const isSystemField = SYSTEM_REQUIRED_FIELDS.some(sysField => sysField.field_name === field.field_name);
    if (isSystemField) {
      alert('⚠️ Campos do sistema não podem ser editados!');
      return;
    }
    
    setFieldForm(field);
    setEditingFieldIndex(index);
    setShowNewFieldForm(true);
  };

  const handleDeleteField = (index: number) => {
    const field = formData.custom_fields[index];
    
    // Verificar se é um campo do sistema - não pode ser excluído
    const isSystemField = SYSTEM_REQUIRED_FIELDS.some(sysField => sysField.field_name === field.field_name);
    if (isSystemField) {
      alert('⚠️ Campos do sistema não podem ser excluídos!');
      return;
    }
    
    const updatedFields = formData.custom_fields.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, custom_fields: updatedFields }));
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

  // Funções para gerenciar cadência
  const handleAddCadenceTask = (stageName: string) => {
    setEditingCadenceStage(stageName);
    setEditingTaskIndex(null);
    setCadenceTaskForm({
      day_offset: 0,
      task_order: 1,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      template_content: '',
      is_active: true,
    });
    setShowNewTaskForm(stageName);
  };

  const handleEditCadenceTask = (stageName: string, taskIndex: number) => {
    const config = formData.cadence_configs.find(c => c.stage_name === stageName);
    if (config && config.tasks[taskIndex]) {
      setEditingCadenceStage(stageName);
      setEditingTaskIndex(taskIndex);
      setCadenceTaskForm(config.tasks[taskIndex]);
      setShowNewTaskForm(stageName);
    }
  };

  const handleDeleteCadenceTask = (stageName: string, taskIndex: number) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      setFormData(prev => ({
        ...prev,
        cadence_configs: prev.cadence_configs.map(c =>
          c.stage_name === stageName
            ? { ...c, tasks: c.tasks.filter((_, index) => index !== taskIndex) }
            : c
        )
      }));
    }
  };

  return (
    <div className="pipeline-form-with-stages-fields">
      <div className="form-header">
        <h4>
          <Settings className="w-5 h-5" />
          {title}
        </h4>
        <div className="form-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <FileText className="w-4 h-4" />
            Básico
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
            onClick={() => setActiveTab('stages')}
          >
            <Target className="w-4 h-4" />
            Etapas ({formData.stages.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            <Sliders className="w-4 h-4" />
            Campos ({formData.custom_fields.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'cadence' ? 'active' : ''}`}
            onClick={() => setActiveTab('cadence')}
          >
            <Zap className="w-4 h-4" />
            Cadência
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

        {/* ABA ETAPAS - INTERFACE INLINE MODERNA */}
        {activeTab === 'stages' && (
          <div className="tab-content">
            <div className="section-header-modern">
              <div className="section-info">
                <h5>Etapas da Pipeline</h5>
                <p>Configure as etapas do funil de vendas. Novos leads → Etapas customizadas → Ganho → Perdido</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewStageForm(true)}
                className="add-btn-modern"
              >
                <Plus className="w-4 h-4" />
                Nova Etapa
              </button>
            </div>

            {errors.stages && <div className="error-message">{errors.stages}</div>}

            {/* FORMULÁRIO INLINE PARA NOVA ETAPA */}
            {showNewStageForm && (
              <div className="inline-form-card">
                <div className="inline-form-header">
                  <h6>{editingStageIndex !== null ? 'Editando Etapa' : 'Nova Etapa Customizada'}</h6>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowNewStageForm(false);
                      setEditingStageIndex(null);
                      setStageForm({
                        name: '',
                        temperature_score: 50,
                        max_days_allowed: 7,
                        time_unit: 'days',
                        color: '#3B82F6',
                      });
                    }}
                    className="close-inline-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="inline-form-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome da Etapa *</label>
                      <input
                        type="text"
                        value={stageForm.name}
                        onChange={(e) => setStageForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Contato Inicial"
                        disabled={editingStageIndex !== null && formData.stages[editingStageIndex]?.is_system}
                      />
                      {editingStageIndex !== null && formData.stages[editingStageIndex]?.is_system && (
                        <small className="field-hint">Nome não pode ser alterado em etapas do sistema</small>
                      )}
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
                      <small className="field-hint">Indica o quão próximo o lead está da conversão</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tempo Máximo *</label>
                      <div className="time-input-group">
                        <input
                          type="number"
                          min="1"
                          value={stageForm.max_days_allowed}
                          onChange={(e) => setStageForm(prev => ({ ...prev, max_days_allowed: parseInt(e.target.value) }))}
                          className="time-value"
                        />
                        <select
                          value={stageForm.time_unit}
                          onChange={(e) => setStageForm(prev => ({ ...prev, time_unit: e.target.value as 'minutes' | 'hours' | 'days' }))}
                          className="time-unit"
                        >
                          {TIME_UNIT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <small className="field-hint">Tempo máximo que um lead pode ficar nesta etapa</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Cor</label>
                      <input
                        type="color"
                        value={stageForm.color}
                        onChange={(e) => setStageForm(prev => ({ ...prev, color: e.target.value }))}
                        disabled={editingStageIndex !== null && formData.stages[editingStageIndex]?.is_system}
                      />
                      {editingStageIndex !== null && formData.stages[editingStageIndex]?.is_system && (
                        <small className="field-hint">Cor não pode ser alterada em etapas do sistema</small>
                      )}
                    </div>
                  </div>
                  
                  <div className="inline-form-actions">
                    <button type="button" onClick={handleSaveStage} className="save-btn">
                      {editingStageIndex !== null ? 'Salvar Alterações' : 'Adicionar Etapa'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowNewStageForm(false);
                        setEditingStageIndex(null);
                        setStageForm({
                          name: '',
                          temperature_score: 50,
                          max_days_allowed: 7,
                          time_unit: 'days',
                          color: '#3B82F6',
                        });
                      }}
                      className="cancel-btn"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LISTA DE ETAPAS COM INDICADORES DE POSIÇÃO */}
            <div className="stages-list-modern">
              {formData.stages.map((stage: any, index) => {
                const isSystemStage = stage.is_system;
                const position = stage.position || (index === 0 ? 'first' : index === formData.stages.length - 1 ? 'last' : 'middle');
                
                return (
                  <div key={index} className={`stage-card-modern ${isSystemStage ? 'system-stage' : 'custom-stage'}`}>
                    <div className="stage-position-indicator">
                      <span className="position-number">{index + 1}</span>
                      {position === 'first' && <span className="position-label">Início</span>}
                      {position === 'second-last' && <span className="position-label">Ganho</span>}
                      {position === 'last' && <span className="position-label">Final</span>}
                    </div>
                    
                    <div className="stage-color-indicator" style={{ backgroundColor: stage.color }}></div>
                    
                    <div className="stage-content-modern">
                      <div className="stage-header-modern">
                        <h6 className="stage-name">{stage.name}</h6>
                        <div className="stage-badges">
                          {isSystemStage && <span className="system-badge">Sistema</span>}
                          {!isSystemStage && <span className="custom-badge">Customizada</span>}
                        </div>
                      </div>
                      
                      <div className="stage-metrics-modern">
                        <div className="metric-item">
                          <Thermometer className="w-3 h-3" />
                          <span>{stage.temperature_score}% temperatura</span>
                        </div>
                        <div className="metric-item">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeUnit(stage.max_days_allowed, stage.time_unit || 'days')} máximo</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="stage-actions-modern">
                      <button 
                        type="button" 
                        onClick={() => handleEditStage(index)} 
                        className="edit-btn-modern"
                        title={isSystemStage ? "Editar temperatura e tempo" : "Editar etapa"}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      {!isSystemStage && (
                        <button 
                          type="button" 
                          onClick={() => handleDeleteStage(index)} 
                          className="delete-btn-modern"
                          title="Excluir etapa"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA CAMPOS - INTERFACE INLINE MODERNA */}
        {activeTab === 'fields' && (
          <div className="tab-content">
            <div className="section-header-modern">
              <div className="section-info">
                <h5>Campos da Pipeline</h5>
                <p>Configure os campos que serão coletados para cada lead. Campos do sistema são obrigatórios.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewFieldForm(true)}
                className="add-btn-modern"
              >
                <Plus className="w-4 h-4" />
                Novo Campo
              </button>
            </div>

            {errors.fields && <div className="error-message">{errors.fields}</div>}

            {/* FORMULÁRIO INLINE PARA NOVO CAMPO */}
            {showNewFieldForm && (
              <div className="inline-form-card">
                <div className="inline-form-header">
                  <h6>{editingFieldIndex !== null ? 'Editando Campo' : 'Novo Campo Customizado'}</h6>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowNewFieldForm(false);
                      setEditingFieldIndex(null);
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
                    }}
                    className="close-inline-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="inline-form-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome do Campo *</label>
                      <input
                        type="text"
                        value={fieldForm.field_name}
                        onChange={(e) => setFieldForm(prev => ({ ...prev, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                        placeholder="Ex: empresa"
                      />
                      <small className="field-hint">Nome técnico do campo (sem espaços)</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Rótulo do Campo *</label>
                      <input
                        type="text"
                        value={fieldForm.field_label}
                        onChange={(e) => setFieldForm(prev => ({ ...prev, field_label: e.target.value }))}
                        placeholder="Ex: Nome da Empresa"
                      />
                      <small className="field-hint">Nome que aparecerá no formulário</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo do Campo *</label>
                      <select
                        value={fieldForm.field_type}
                        onChange={(e) => setFieldForm(prev => ({ ...prev, field_type: e.target.value as CustomField['field_type'] }))}
                      >
                        <option value="text">Texto</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="textarea">Área de Texto</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                        <option value="select">Lista de Opções</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Placeholder</label>
                      <input
                        type="text"
                        value={fieldForm.placeholder}
                        onChange={(e) => setFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                        placeholder="Ex: Digite aqui..."
                      />
                      <small className="field-hint">Texto de ajuda no campo</small>
                    </div>
                  </div>

                  {/* OPÇÕES PARA CAMPO SELECT */}
                  {fieldForm.field_type === 'select' && (
                    <div className="form-group">
                      <label>Opções da Lista</label>
                      <div className="select-options-manager">
                        {fieldForm.field_options?.map((option, index) => (
                          <div key={index} className="option-item">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateSelectOption(index, e.target.value)}
                              placeholder="Digite uma opção"
                            />
                            <button
                              type="button"
                              onClick={() => removeSelectOption(index)}
                              className="remove-option-btn"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addSelectOption}
                          className="add-option-btn"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Opção
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={fieldForm.is_required}
                          onChange={(e) => setFieldForm(prev => ({ ...prev, is_required: e.target.checked }))}
                        />
                        Campo obrigatório
                      </label>
                    </div>
                    
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={fieldForm.show_in_card}
                          onChange={(e) => setFieldForm(prev => ({ ...prev, show_in_card: e.target.checked }))}
                        />
                        Exibir no card do lead
                      </label>
                    </div>
                  </div>
                  
                  <div className="inline-form-actions">
                    <button type="button" onClick={handleAddField} className="save-btn">
                      {editingFieldIndex !== null ? 'Salvar Alterações' : 'Adicionar Campo'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowNewFieldForm(false);
                        setEditingFieldIndex(null);
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
                      }}
                      className="cancel-btn"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CAMPOS DO SISTEMA - SEÇÃO SEPARADA */}
            <div className="fields-section">
              <div className="section-title">
                <h6>Campos do Sistema</h6>
                <span className="section-subtitle">Campos obrigatórios que não podem ser removidos</span>
              </div>
              <div className="fields-grid-system">
                {SYSTEM_REQUIRED_FIELDS.map((field, index) => (
                  <div key={index} className="field-card-system">
                    <div className="field-icon">
                      {field.field_type === 'text' && <FileText className="w-4 h-4" />}
                      {field.field_type === 'email' && <Mail className="w-4 h-4" />}
                      {field.field_type === 'phone' && <Phone className="w-4 h-4" />}
                    </div>
                    <div className="field-content">
                      <h6 className="field-name">{field.field_label}</h6>
                      <div className="field-details">
                        <span className="field-type">{field.field_type}</span>
                        <span className="required-badge">Obrigatório</span>
                        <span className="system-badge">Sistema</span>
                      </div>
                      <p className="field-placeholder">{field.placeholder}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CAMPOS CUSTOMIZADOS - SEÇÃO SEPARADA */}
            <div className="fields-section">
              <div className="section-title">
                <h6>Campos Customizados</h6>
                <span className="section-subtitle">Campos adicionais criados para esta pipeline</span>
              </div>
              
              {formData.custom_fields.filter(field => !SYSTEM_REQUIRED_FIELDS.some(sysField => sysField.field_name === field.field_name)).length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum campo customizado criado ainda.</p>
                  <button
                    type="button"
                    onClick={() => setShowNewFieldForm(true)}
                    className="empty-state-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Primeiro Campo
                  </button>
                </div>
              ) : (
                <div className="fields-grid-custom">
                  {formData.custom_fields
                    .filter(field => !SYSTEM_REQUIRED_FIELDS.some(sysField => sysField.field_name === field.field_name))
                    .map((field, index) => {
                      const actualIndex = formData.custom_fields.findIndex(f => f.field_name === field.field_name);
                      return (
                        <div key={actualIndex} className="field-card-custom">
                          <div className="field-icon">
                            {field.field_type === 'text' && <FileText className="w-4 h-4" />}
                            {field.field_type === 'email' && <Mail className="w-4 h-4" />}
                            {field.field_type === 'phone' && <Phone className="w-4 h-4" />}
                            {field.field_type === 'textarea' && <MessageSquare className="w-4 h-4" />}
                            {field.field_type === 'number' && <Hash className="w-4 h-4" />}
                            {field.field_type === 'date' && <Calendar className="w-4 h-4" />}
                            {field.field_type === 'select' && <List className="w-4 h-4" />}
                          </div>
                          <div className="field-content">
                            <h6 className="field-name">{field.field_label}</h6>
                            <div className="field-details">
                              <span className="field-type">{field.field_type}</span>
                              {field.is_required && <span className="required-badge">Obrigatório</span>}
                              {field.show_in_card && <span className="card-badge">No Card</span>}
                              <span className="custom-badge">Customizado</span>
                            </div>
                            <p className="field-placeholder">{field.placeholder}</p>
                            {field.field_type === 'select' && field.field_options && (
                              <div className="field-options">
                                <small>Opções: {field.field_options.join(', ')}</small>
                              </div>
                            )}
                          </div>
                          <div className="field-actions">
                            <button 
                              type="button" 
                              onClick={() => handleEditField(actualIndex)} 
                              className="edit-btn-modern"
                              title="Editar campo"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteField(actualIndex)} 
                              className="delete-btn-modern"
                              title="Excluir campo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA CADÊNCIA - INTERFACE INLINE MODERNA */}
        {activeTab === 'cadence' && (
          <div className="tab-content">
            <div className="section-header-modern">
              <div className="section-info">
                <h5>Configuração de Cadência</h5>
                <p>Configure tarefas automáticas para cada etapa da pipeline. As tarefas serão executadas automaticamente conforme os leads avançam.</p>
              </div>
            </div>

            {/* FORMULÁRIO INLINE PARA NOVA TAREFA */}
            {showNewTaskForm && (
              <div className="inline-form-card">
                <div className="inline-form-header">
                  <h6>{editingTaskIndex !== null ? 'Editando Tarefa' : `Nova Tarefa - ${showNewTaskForm}`}</h6>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowNewTaskForm(null);
                      setEditingCadenceStage(null);
                      setEditingTaskIndex(null);
                      setCadenceTaskForm({
                        day_offset: 0,
                        task_order: 1,
                        channel: 'email',
                        action_type: 'mensagem',
                        task_title: '',
                        task_description: '',
                        template_content: '',
                        is_active: true,
                      });
                    }}
                    className="close-inline-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="inline-form-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Título da Tarefa *</label>
                      <input
                        type="text"
                        value={cadenceTaskForm.task_title}
                        onChange={(e) => setCadenceTaskForm(prev => ({ ...prev, task_title: e.target.value }))}
                        placeholder="Ex: Contato Inicial"
                      />
                      <small className="field-hint">Nome que identificará esta tarefa</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Dias de Atraso *</label>
                      <input
                        type="number"
                        min="0"
                        value={cadenceTaskForm.day_offset}
                        onChange={(e) => setCadenceTaskForm(prev => ({ ...prev, day_offset: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                      <small className="field-hint">D+0 = imediato, D+1 = após 1 dia, etc.</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Canal de Comunicação *</label>
                      <select
                        value={cadenceTaskForm.channel}
                        onChange={(e) => setCadenceTaskForm(prev => ({ 
                          ...prev, 
                          channel: e.target.value as CadenceTask['channel']
                        }))}
                      >
                        {CHANNEL_OPTIONS.map(channel => (
                          <option key={channel.value} value={channel.value}>
                            {channel.label}
                          </option>
                        ))}
                      </select>
                      <small className="field-hint">Meio de comunicação que será usado</small>
                    </div>
                    
                    <div className="form-group">
                      <label>Tipo de Ação *</label>
                      <select
                        value={cadenceTaskForm.action_type}
                        onChange={(e) => setCadenceTaskForm(prev => ({ 
                          ...prev, 
                          action_type: e.target.value as CadenceTask['action_type']
                        }))}
                      >
                        {ACTION_TYPE_OPTIONS.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <small className="field-hint">Tipo de ação que será realizada</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descrição da Tarefa</label>
                    <textarea
                      value={cadenceTaskForm.task_description}
                      onChange={(e) => setCadenceTaskForm(prev => ({ ...prev, task_description: e.target.value }))}
                      placeholder="Descreva detalhadamente o que deve ser feito..."
                      rows={3}
                    />
                    <small className="field-hint">Instruções detalhadas para quem executar a tarefa</small>
                  </div>

                  <div className="form-group">
                    <label>Template de Conteúdo</label>
                    <textarea
                      value={cadenceTaskForm.template_content}
                      onChange={(e) => setCadenceTaskForm(prev => ({ ...prev, template_content: e.target.value }))}
                      placeholder="Template da mensagem/email que será enviado..."
                      rows={4}
                    />
                    <small className="field-hint">Conteúdo padrão que será usado na comunicação</small>
                  </div>
                  
                  <div className="inline-form-actions">
                    <button type="button" onClick={() => {
                      if (editingCadenceStage !== null && editingTaskIndex !== null) {
                        const currentConfig = formData.cadence_configs.find(c => c.stage_name === editingCadenceStage);
                        if (currentConfig) {
                          const updatedTasks = currentConfig.tasks.map((task, index) =>
                            index === editingTaskIndex ? cadenceTaskForm : task
                          );
                          setFormData(prev => ({
                            ...prev,
                            cadence_configs: prev.cadence_configs.map(c =>
                              c.stage_name === editingCadenceStage ? { ...c, tasks: updatedTasks } : c
                            )
                          }));
                        }
                      } else if (editingCadenceStage !== null) {
                        // Adicionar nova tarefa à etapa existente
                        setFormData(prev => ({
                          ...prev,
                          cadence_configs: prev.cadence_configs.map(c =>
                            c.stage_name === editingCadenceStage ? 
                              { ...c, tasks: [...c.tasks, cadenceTaskForm] } : c
                          )
                        }));
                      }
                      setShowNewTaskForm(null);
                      setEditingCadenceStage(null);
                      setEditingTaskIndex(null);
                      setCadenceTaskForm({
                        day_offset: 0,
                        task_order: 1,
                        channel: 'email',
                        action_type: 'mensagem',
                        task_title: '',
                        task_description: '',
                        template_content: '',
                        is_active: true,
                      });
                    }} className="save-btn">
                      {editingTaskIndex !== null ? 'Salvar Alterações' : 'Adicionar Tarefa'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowNewTaskForm(null);
                        setEditingCadenceStage(null);
                        setEditingTaskIndex(null);
                        setCadenceTaskForm({
                          day_offset: 0,
                          task_order: 1,
                          channel: 'email',
                          action_type: 'mensagem',
                          task_title: '',
                          task_description: '',
                          template_content: '',
                          is_active: true,
                        });
                      }}
                      className="cancel-btn"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIGURAÇÕES POR ETAPA */}
            <div className="cadence-stages-list">
              {formData.cadence_configs.map((config, configIndex) => (
                <div key={configIndex} className="cadence-stage-card">
                  <div className="cadence-stage-header">
                    <div className="stage-info">
                      <h6 className="stage-name">{config.stage_name}</h6>
                      <span className="tasks-count">
                        {config.tasks.length} {config.tasks.length === 1 ? 'tarefa' : 'tarefas'} configuradas
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCadenceTask(config.stage_name)}
                      className="add-task-btn"
                    >
                      <Plus className="w-4 h-4" />
                      Nova Tarefa
                    </button>
                  </div>

                  {config.tasks.length === 0 ? (
                    <div className="empty-tasks-state">
                      <p>Nenhuma tarefa configurada para esta etapa</p>
                      <button
                        type="button"
                        onClick={() => handleAddCadenceTask(config.stage_name)}
                        className="empty-state-btn"
                      >
                        <Plus className="w-4 h-4" />
                        Criar Primeira Tarefa
                      </button>
                    </div>
                  ) : (
                    <div className="tasks-timeline">
                      {config.tasks
                        .sort((a, b) => a.day_offset - b.day_offset || a.task_order - b.task_order)
                        .map((task, taskIndex) => (
                          <div key={taskIndex} className="task-timeline-item">
                            <div className="task-timeline-marker">
                              <div className="timeline-dot">
                                <span className="day-label">D+{task.day_offset}</span>
                              </div>
                              {taskIndex < config.tasks.length - 1 && <div className="timeline-line"></div>}
                            </div>
                            
                            <div className="task-content">
                              <div className="task-header">
                                <h6 className="task-title">{task.task_title}</h6>
                                <div className="task-badges">
                                  <span className="channel-badge">
                                    {React.createElement(CHANNEL_OPTIONS.find(c => c.value === task.channel)?.icon || Mail, { className: "w-3 h-3" })}
                                    {CHANNEL_OPTIONS.find(c => c.value === task.channel)?.label}
                                  </span>
                                  <span className="action-badge">
                                    {ACTION_TYPE_OPTIONS.find(a => a.value === task.action_type)?.label}
                                  </span>
                                </div>
                              </div>
                              
                              {task.task_description && (
                                <p className="task-description">{task.task_description}</p>
                              )}
                              
                              {task.template_content && (
                                <div className="task-template">
                                  <small className="template-label">Template:</small>
                                  <p className="template-content">{task.template_content.substring(0, 100)}...</p>
                                </div>
                              )}
                              
                              <div className="task-actions">
                                <button
                                  type="button"
                                  onClick={() => handleEditCadenceTask(config.stage_name, taskIndex)}
                                  className="edit-btn-modern"
                                  title="Editar tarefa"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCadenceTask(config.stage_name, taskIndex)}
                                  className="delete-btn-modern"
                                  title="Excluir tarefa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancelar
          </button>
          <button type="submit" className="submit-btn">
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PipelineFormWithStagesAndFields; 