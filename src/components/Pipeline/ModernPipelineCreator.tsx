import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage, CustomField as PipelineCustomField } from '../../types/Pipeline';
import { User } from '../../types/User';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelineNameValidation } from '../../hooks/usePipelineNameValidation';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';

// Magic UI components
import { AnimatedCard } from '../ui/animated-card';
import { BlurFade } from '../ui/blur-fade';
import { ShimmerButton } from '../ui/shimmer-button';

// Icons
import { 
  Settings, 
  Target, 
  Sliders, 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  X,
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
  FileCheck,
  Users,
  Workflow,
  Database,
  Rocket,
  Eye,
  EyeOff,
  Copy,
  Save,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Star,
  Sparkles,
  GripVertical,
  Shuffle, // 🆕 ÍCONE PARA RODÍZIO
  RotateCcw, // 🆕 ÍCONE PARA DISTRIBUIÇÃO
  UserPlus, // 🆕 ÍCONE PARA ATRIBUIÇÃO
  CheckCircle, // ✅ ÍCONE PARA VALIDAÇÃO
  AlertCircle, // ❌ ÍCONE PARA ERRO
  Loader2, // 🔄 ÍCONE PARA LOADING
  Lightbulb // 💡 ÍCONE PARA SUGESTÃO
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

interface CadenceTask {
  id?: string;
  day_offset: number;
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

interface DistributionRule {
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  skip_inactive_members: boolean;
  fallback_to_manual: boolean;
}

interface PipelineFormData {
  name: string;
  description: string;
  member_ids: string[];
  stages: Omit<PipelineStage, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>[];
  custom_fields: CustomField[];
  cadence_configs: CadenceConfig[];
  distribution_rule?: DistributionRule; // 🆕 NOVA FUNCIONALIDADE
}

interface ModernPipelineCreatorProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: PipelineFormData) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
}

// Constantes
const CHANNEL_OPTIONS = [
  { value: 'email', label: 'E-mail', icon: Mail, color: 'bg-blue-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'bg-purple-500' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'bg-orange-500' },
  { value: 'tarefa', label: 'Tarefa', icon: ClipboardList, color: 'bg-gray-500' },
  { value: 'visita', label: 'Visita', icon: Building2, color: 'bg-indigo-500' },
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

// Remover constantes de temperatura e simplificar etapas do sistema
const SYSTEM_STAGES = [
  { 
    name: 'Lead', 
    color: '#3B82F6', 
    order_index: 0, 
    is_system: true,
    position: 'first',
    description: 'Etapa inicial onde todos os novos leads são criados.'
  },
  { 
    name: 'Closed Won', 
    color: '#10B981', 
    order_index: 998, 
    is_system: true,
    position: 'second-last',
    description: 'Penúltima etapa - leads convertidos em vendas.'
  },
  { 
    name: 'Closed Lost', 
    color: '#EF4444', 
    order_index: 999, 
    is_system: true,
    position: 'last',
    description: 'Última etapa - leads perdidos ou vendas não concretizadas.'
  },
];

const SYSTEM_REQUIRED_FIELDS: CustomField[] = [
  { field_name: 'nome_lead', field_label: 'Nome do Lead', field_type: 'text', is_required: true, field_order: 1, placeholder: 'Digite o nome do lead', show_in_card: true },
  { field_name: 'email', field_label: 'E-mail', field_type: 'email', is_required: true, field_order: 2, placeholder: 'exemplo@email.com', show_in_card: true },
  { field_name: 'telefone', field_label: 'Telefone', field_type: 'phone', is_required: true, field_order: 3, placeholder: '(11) 99999-9999', show_in_card: true },
];



const ModernPipelineCreator: React.FC<ModernPipelineCreatorProps> = ({
  members,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
}) => {
  const { user } = useAuth();
  
  // ✅ INTEGRAÇÃO: Hook de validação de nome
  const nameValidation = usePipelineNameValidation(
    pipeline?.name || '', 
    pipeline?.id
  );
  
  // Estados locais - sem sistema de temperatura
  const [activeTab, setActiveTab] = useState<'basic' | 'stages' | 'fields' | 'distribution' | 'cadence'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para modal de etapas
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);

  // Estados para modal de campos
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Estados para modal de cadência
  const [cadenceModalOpen, setCadenceModalOpen] = useState(false);

  // Estados para modal de task
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingCadenceIndex, setEditingCadenceIndex] = useState<number | null>(null);

  // Estados temporários para modais
  const [tempStage, setTempStage] = useState({
    name: '',
    order_index: 0,
    color: '#3B82F6',
    is_system: false
  });

  const [tempField, setTempField] = useState<CustomField>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    field_options: [],
    is_required: false,
    field_order: 1,
    placeholder: '',
    show_in_card: true,
  });

  const [tempTask, setTempTask] = useState<CadenceTask>({
    day_offset: 0,
    task_order: 1,
    channel: 'email',
    action_type: 'mensagem',
    task_title: '',
    task_description: '',
    is_active: true,
  });

  // Função para organizar etapas sem sistema de temperatura
  const organizeStages = (stages: any[]) => {
    const systemStages = SYSTEM_STAGES;
    const customStages = stages.filter(stage => !stage.is_system_stage && !stage.is_system);
    
    const organized = [
      systemStages.find(s => s.position === 'first')!,
      ...customStages.map((stage, index) => ({ ...stage, order_index: index + 1 })),
      systemStages.find(s => s.position === 'second-last')!,
      systemStages.find(s => s.position === 'last')!
    ];
    
    return organized.map((stage, index) => ({ ...stage, order_index: index }));
  };

  // Estado do formulário simplificado
  const [formData, setFormData] = useState<PipelineFormData>({
    name: '',
    description: '',
    member_ids: [],
    stages: organizeStages(SYSTEM_STAGES),
    custom_fields: [...SYSTEM_REQUIRED_FIELDS],
    cadence_configs: [],
    distribution_rule: {
      mode: 'manual',
      is_active: true,
      working_hours_only: false,
      skip_inactive_members: true,
      fallback_to_manual: true
    }
  });

  // Carregar dados da pipeline se estiver editando
  useEffect(() => {
    const loadPipelineData = async () => {
      if (pipeline) {
        let memberIds: string[] = [];
        
        // Carregar membros da pipeline se estiver editando
        if (pipeline.id) {
          try {
            // ✅ CORREÇÃO: Usar lógica de isolamento total para admin
            console.log('🔍 [ModernPipelineCreator] Carregando membros da pipeline:', {
              pipelineId: pipeline.id,
              userRole: user?.role,
              userEmail: user?.email
            });

            const { data: pipelineMembers, error } = await supabase
              .from('pipeline_members')
              .select('member_id')
              .eq('pipeline_id', pipeline.id);
            
            if (!error && pipelineMembers) {
              memberIds = pipelineMembers.map(pm => pm.member_id);
              console.log('✅ [ModernPipelineCreator] Membros carregados para edição:', memberIds);
            } else {
              console.warn('⚠️ [ModernPipelineCreator] Erro ao carregar membros:', error?.message);
            }
          } catch (error) {
            console.error('❌ [ModernPipelineCreator] Erro crítico ao carregar membros:', error);
          }
        }
        
        console.log('📋 [ModernPipelineCreator] Carregando dados da pipeline para edição:', {
          name: pipeline.name,
          stagesCount: pipeline.stages?.length || 0,
          customFieldsCount: pipeline.custom_fields?.length || 0,
          stages: pipeline.stages?.map(s => s.name),
          customFields: pipeline.custom_fields?.map(f => f.field_name),
          userRole: user?.role,
          userEmail: user?.email
        });

        // 🆕 CARREGAR REGRA DE DISTRIBUIÇÃO EXISTENTE
        let distributionRule: DistributionRule = {
          mode: 'manual',
          is_active: true,
          working_hours_only: false,
          skip_inactive_members: true,
          fallback_to_manual: true
        };

        if (pipeline.id) {
          try {
            console.log('🔍 [ModernPipelineCreator] Carregando regra de distribuição...');
            const { data: distributionData } = await supabase
              .from('pipeline_distribution_rules')
              .select('*')
              .eq('pipeline_id', pipeline.id)
              .single();
            
            if (distributionData) {
              distributionRule = {
                mode: distributionData.mode || 'manual',
                is_active: distributionData.is_active ?? true,
                working_hours_only: distributionData.working_hours_only ?? false,
                skip_inactive_members: distributionData.skip_inactive_members ?? true,
                fallback_to_manual: distributionData.fallback_to_manual ?? true
              };
              console.log('✅ [ModernPipelineCreator] Regra de distribuição carregada:', distributionRule);
            } else {
              console.log('ℹ️ [ModernPipelineCreator] Nenhuma regra de distribuição encontrada, usando padrão');
            }
          } catch (error) {
            console.log('ℹ️ [ModernPipelineCreator] Regra de distribuição não encontrada, usando padrão:', error);
          }
        }

        // ✅ CORREÇÃO: Aplicar isolamento total - admin só vê pipelines que criou
        const canEditPipeline = user?.role === 'super_admin' || 
          (user?.role === 'admin' && (pipeline.created_by === user.email || pipeline.created_by === user.id));

        if (!canEditPipeline) {
          console.error('❌ [ModernPipelineCreator] Usuário não tem permissão para editar esta pipeline:', {
            userRole: user?.role,
            userEmail: user?.email,
            userId: user?.id,
            pipelineCreatedBy: pipeline.created_by,
            pipelineName: pipeline.name
          });
          alert('Erro: Você não tem permissão para editar esta pipeline.');
          return;
        }

        console.log('✅ [ModernPipelineCreator] Permissão confirmada para edição da pipeline');

        setFormData({
          name: pipeline.name,
          description: pipeline.description || '',
          member_ids: memberIds,
          stages: organizeStages(pipeline.stages || SYSTEM_STAGES),
          custom_fields: [...SYSTEM_REQUIRED_FIELDS, ...(pipeline.custom_fields || []).map(field => ({
            ...field,
            show_in_card: field.show_in_card ?? false
          }))],
          cadence_configs: [],
          distribution_rule: distributionRule // 🆕 INCLUIR REGRA DE DISTRIBUIÇÃO
        });

        console.log('✅ [ModernPipelineCreator] FormData configurado:', {
          stagesCount: organizeStages(pipeline.stages || SYSTEM_STAGES).length,
          customFieldsCount: [...SYSTEM_REQUIRED_FIELDS, ...(pipeline.custom_fields || [])].length,
          memberIdsCount: memberIds.length,
          distributionMode: distributionRule.mode
        });
        
        if (pipeline.id) {
          loadCadenceConfigs(pipeline.id);
        }
      }
    };
    
    loadPipelineData();
  }, [pipeline, user?.role, user?.email, user?.id]); // ✅ DEPENDÊNCIAS CORRIGIDAS

  const loadCadenceConfigs = async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('cadence_configs')
        .select('*')
        .eq('pipeline_id', pipelineId);

      if (error) {
        console.warn('⚠️ Tabela cadence_configs não existe ou RLS bloqueou:', error.message);
        
        // FALLBACK: Tentar carregar do localStorage
        console.log('🔄 Tentando carregar cadências do localStorage...');
        const cadenceKey = `pipeline_cadences_${pipelineId}`;
        const savedCadences = localStorage.getItem(cadenceKey);
        
        if (savedCadences) {
          try {
            const parsedCadences = JSON.parse(savedCadences);
            console.log('✅ Cadências carregadas do localStorage:', parsedCadences);
            setFormData(prev => ({ ...prev, cadence_configs: parsedCadences.configs || [] }));
            return;
          } catch (parseError) {
            console.warn('⚠️ Erro ao parsear cadências do localStorage:', parseError);
          }
        } else {
          console.log('ℹ️ Nenhuma cadência encontrada no localStorage');
        }
        
        // Usar configuração padrão se nada for encontrado
        setFormData(prev => ({ ...prev, cadence_configs: [] }));
        return;
      }
      
      if (data) {
        console.log('✅ Cadências carregadas do banco:', data);
        setFormData(prev => ({ ...prev, cadence_configs: data }));
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar configurações de cadência:', error);
      
      // FALLBACK: Tentar carregar do localStorage
      console.log('🔄 Fallback: Tentando carregar cadências do localStorage...');
      const cadenceKey = `pipeline_cadences_${pipelineId}`;
      const savedCadences = localStorage.getItem(cadenceKey);
      
      if (savedCadences) {
        try {
          const parsedCadences = JSON.parse(savedCadences);
          console.log('✅ Cadências carregadas do localStorage (fallback):', parsedCadences);
          setFormData(prev => ({ ...prev, cadence_configs: parsedCadences.configs || [] }));
        } catch (parseError) {
          console.warn('⚠️ Erro ao parsear cadências do localStorage (fallback):', parseError);
          setFormData(prev => ({ ...prev, cadence_configs: [] }));
        }
      } else {
        console.log('ℹ️ Nenhuma cadência encontrada no localStorage (fallback)');
        setFormData(prev => ({ ...prev, cadence_configs: [] }));
      }
    }
  };

  const validateForm = async () => {
    // ✅ VALIDAÇÃO INTEGRADA: Usar hook de validação
    if (!nameValidation.name.trim()) {
      alert('Nome da pipeline é obrigatório');
      return false;
    }
    
    // Validar nome imediatamente se necessário
    if (!nameValidation.hasChecked) {
      await nameValidation.validateImmediately();
    }
    
    if (!nameValidation.isValid) {
      alert(`Erro no nome da pipeline: ${nameValidation.error}`);
      return false;
    }
    
    if (formData.member_ids.length === 0) {
      alert('Selecione pelo menos um membro para a pipeline');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ VALIDAÇÃO ASYNC: Aguardar validação completa
    const isValid = await validateForm();
    if (!isValid) return;
    
    setIsSubmitting(true);
    
    try {
      // ✅ CORREÇÃO: Validar permissões antes de prosseguir
      if (!user?.id || !user?.tenant_id) {
        console.error('❌ [ModernPipelineCreator] Usuário não autenticado:', { user });
        alert('Erro: Usuário não autenticado. Faça login novamente.');
        return;
      }

      // ✅ CORREÇÃO: Aplicar isolamento total para admin
      if (pipeline && user.role === 'admin') {
        const canEditPipeline = pipeline.created_by === user.email || pipeline.created_by === user.id;
        if (!canEditPipeline) {
          console.error('❌ [ModernPipelineCreator] Admin não pode editar pipeline de outro admin:', {
            userEmail: user.email,
            userId: user.id,
            pipelineCreatedBy: pipeline.created_by
          });
          alert('Erro: Você só pode editar pipelines que você criou.');
          return;
        }
      }

      // ✅ USAR NOME VALIDADO: Sincronizar formData com nome validado
      const finalFormData = {
        ...formData,
        name: nameValidation.name // Usar nome do hook de validação
      };

      console.log('🚀 [ModernPipelineCreator] Iniciando salvamento de pipeline:', {
        name: finalFormData.name,
        description: finalFormData.description,
        memberIds: finalFormData.member_ids,
        stagesCount: finalFormData.stages?.length,
        customFieldsCount: finalFormData.custom_fields?.length,
        isEditing: !!pipeline,
        userInfo: {
          id: user?.id,
          email: user?.email,
          tenant_id: user?.tenant_id,
          role: user?.role
        }
      });

      await onSubmit(finalFormData);
    } catch (error) {
      console.error('❌ [ModernPipelineCreator] Erro no salvamento:', error);
      alert('Erro ao salvar pipeline: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
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

  const handleAddStage = () => {
    setTempStage({
      name: '',
      order_index: 0,
      color: '#3B82F6',
      is_system: false
    });
    setEditingStageIndex(null);
    setStageModalOpen(true);
  };

  const handleEditStage = (index: number) => {
    const stage = formData.stages[index];
    setTempStage({
      name: stage.name,
      order_index: stage.order_index,
      color: stage.color,
      is_system: stage.is_system || false
    });
    setEditingStageIndex(index);
    setStageModalOpen(true);
  };

  const handleSaveStage = () => {
    if (!tempStage.name.trim()) {
      alert('Nome da etapa é obrigatório');
      return;
    }

    const newStage = {
      ...tempStage,
      order_index: editingStageIndex !== null ? formData.stages[editingStageIndex].order_index : formData.stages.length - 2,
      is_system_stage: false,
    };

    if (editingStageIndex !== null) {
      const updatedStages = [...formData.stages];
      updatedStages[editingStageIndex] = { ...updatedStages[editingStageIndex], ...newStage };
      setFormData(prev => ({ ...prev, stages: updatedStages }));
    } else {
      const customStages = formData.stages.filter(stage => !stage.is_system_stage && !stage.is_system);
      const systemStages = formData.stages.filter(stage => stage.is_system_stage || stage.is_system);
      const newStages = organizeStages([...customStages, newStage]);
      setFormData(prev => ({ ...prev, stages: newStages }));
    }

    setStageModalOpen(false);
    setEditingStageIndex(null);
  };

  const handleDeleteStage = (index: number) => {
    const stage = formData.stages[index];
    if (stage.is_system_stage || stage.is_system) {
      alert('Não é possível excluir etapas do sistema');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir a etapa "${stage.name}"?`)) {
      const updatedStages = formData.stages.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, stages: organizeStages(updatedStages) }));
    }
  };

  const handleAddField = () => {
    setTempField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      field_order: formData.custom_fields.length + 1,
      placeholder: '',
      show_in_card: true,
    });
    setEditingFieldIndex(null);
    setFieldModalOpen(true);
  };

  const handleEditField = (index: number) => {
    const field = formData.custom_fields[index];
    setTempField({ ...field });
    setEditingFieldIndex(index);
    setFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!tempField.field_name.trim() || !tempField.field_label.trim()) {
      alert('Nome e rótulo do campo são obrigatórios');
      return;
    }

    if (editingFieldIndex !== null) {
      const updatedFields = [...formData.custom_fields];
      updatedFields[editingFieldIndex] = tempField;
      setFormData(prev => ({ ...prev, custom_fields: updatedFields }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        custom_fields: [...prev.custom_fields, { ...tempField, field_order: prev.custom_fields.length + 1 }]
      }));
    }

    setFieldModalOpen(false);
    setEditingFieldIndex(null);
  };

  const handleDeleteField = (index: number) => {
    const field = formData.custom_fields[index];
    if (SYSTEM_REQUIRED_FIELDS.some(sf => sf.field_name === field.field_name)) {
      alert('Não é possível excluir campos obrigatórios do sistema');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o campo "${field.field_label}"?`)) {
      const updatedFields = formData.custom_fields.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, custom_fields: updatedFields }));
    }
  };

  // Funções para gerenciar cadências
  const handleAddCadence = () => {
    setCadenceModalOpen(true);
  };

  const handleSaveCadence = () => {
    // Usar as tarefas do estado tempTask se houver, senão usar as tarefas padrão
    const defaultTasks: CadenceTask[] = [
      { day_offset: 0, task_order: 1, channel: 'ligacao', action_type: 'ligacao', task_title: 'Ligação de boas-vindas', task_description: 'Fazer primeira ligação para o lead', is_active: true },
      { day_offset: 1, task_order: 2, channel: 'email', action_type: 'mensagem', task_title: 'E-mail de apresentação', task_description: 'Enviar material sobre a empresa', is_active: true },
      { day_offset: 3, task_order: 3, channel: 'whatsapp', action_type: 'mensagem', task_title: 'WhatsApp follow-up', task_description: 'Verificar interesse via WhatsApp', is_active: true },
      { day_offset: 7, task_order: 4, channel: 'email', action_type: 'proposta', task_title: 'Proposta comercial', task_description: 'Enviar proposta personalizada', is_active: true },
      { day_offset: 14, task_order: 5, channel: 'ligacao', action_type: 'ligacao', task_title: 'Ligação de fechamento', task_description: 'Última tentativa de conversão', is_active: true }
    ];

    const newConfig: CadenceConfig = {
      stage_name: formData.stages[0]?.name || 'Novos leads',
      stage_order: 0,
      tasks: defaultTasks,
      is_active: true
    };
    setFormData(prev => ({ 
      ...prev, 
      cadence_configs: [...prev.cadence_configs, newConfig] 
    }));
    setCadenceModalOpen(false);
  };

  // Funções para CRUD de cadências
  const handleEditCadence = (configIndex: number) => {
    // TODO: Implementar edição de cadência
    console.log('Editar cadência:', configIndex);
  };

  const handleDeleteCadence = (configIndex: number) => {
    if (confirm('Tem certeza que deseja excluir esta cadência?')) {
      const updatedConfigs = formData.cadence_configs.filter((_, index) => index !== configIndex);
      setFormData(prev => ({ ...prev, cadence_configs: updatedConfigs }));
    }
  };

  const handleToggleCadenceActive = (configIndex: number) => {
    const updatedConfigs = formData.cadence_configs.map((config, index) => 
      index === configIndex ? { ...config, is_active: !config.is_active } : config
    );
    setFormData(prev => ({ ...prev, cadence_configs: updatedConfigs }));
  };

  // Estados para controle de configuração ativa
  const [activeConfigIndex, setActiveConfigIndex] = useState<number>(0);

  // Estados para modal de tarefa
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Funções para CRUD de tarefas de cadência
  const handleAddTask = (configIndex: number) => {
    console.log('🆕 Adicionando nova tarefa para config:', configIndex);
    setActiveConfigIndex(configIndex);
    setEditingTaskIndex(null);
    setTempTask({
      day_offset: 0,
      task_order: 1,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      is_active: true
    });
    setTaskModalOpen(true);
  };

  const handleEditTask = (configIndex: number, taskIndex: number) => {
    console.log('✏️ Editando tarefa:', configIndex, taskIndex);
    setActiveConfigIndex(configIndex);
    const config = formData.cadence_configs[configIndex];
    const task = config.tasks[taskIndex];
    setEditingTaskIndex(taskIndex);
    setTempTask({ ...task });
    setTaskModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!tempTask.task_title || !tempTask.task_description) return;

    const updatedConfigs = [...formData.cadence_configs];
    const config = updatedConfigs[activeConfigIndex];
    
    if (editingTaskIndex !== null) {
      // Editando tarefa existente
      config.tasks[editingTaskIndex] = {
        ...tempTask,
        task_order: editingTaskIndex + 1
      } as CadenceTask;
    } else {
      // Adicionando nova tarefa
      const newTask: CadenceTask = {
        ...tempTask,
        task_order: config.tasks.length + 1
      } as CadenceTask;
      config.tasks.push(newTask);
    }

    setFormData(prev => ({ ...prev, cadence_configs: updatedConfigs }));
    setEditingTaskIndex(null);
    setTaskModalOpen(false);
    setTempTask({
      day_offset: 0,
      task_order: 1,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      is_active: true
    });
  };

  const handleDeleteTask = (configIndex: number, taskIndex: number) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      const updatedConfigs = [...formData.cadence_configs];
      updatedConfigs[configIndex].tasks = updatedConfigs[configIndex].tasks.filter((_, index) => index !== taskIndex);
      
      // Reordenar task_order
      updatedConfigs[configIndex].tasks.forEach((task, index) => {
        task.task_order = index + 1;
      });

      setFormData(prev => ({ ...prev, cadence_configs: updatedConfigs }));
    }
  };

  const handleToggleTaskActive = (configIndex: number, taskIndex: number) => {
    const updatedConfigs = [...formData.cadence_configs];
    updatedConfigs[configIndex].tasks[taskIndex].is_active = !updatedConfigs[configIndex].tasks[taskIndex].is_active;
    setFormData(prev => ({ ...prev, cadence_configs: updatedConfigs }));
  };

  // Função para drag and drop das etapas
  const handleStagesDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newStages = Array.from(formData.stages);
    const [reorderedStage] = newStages.splice(sourceIndex, 1);
    newStages.splice(destinationIndex, 0, reorderedStage);

    // Reorganizar as etapas mantendo as do sistema nas posições corretas
    const organizedStages = organizeStages(newStages);
    
    setFormData(prev => ({ ...prev, stages: organizedStages }));
  };

  // Função para renderizar a aba básica
  const renderBasicTab = () => (
    <BlurFade delay={0.1} className="space-y-6">
      <AnimatedCard delay={0.2} className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            <p className="text-sm text-muted-foreground">Configure os dados principais da sua pipeline</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Pipeline *</Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Ex: Vendas Imobiliárias, Captação de Leads..."
                value={nameValidation.name}
                onChange={(e) => nameValidation.updateName(e.target.value)}
                onBlur={nameValidation.validateImmediately}
                className={`text-base pr-10 ${
                  nameValidation.showValidation 
                    ? nameValidation.isValid 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              
              {/* Ícone de status */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {nameValidation.isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : nameValidation.showValidation ? (
                  nameValidation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )
                ) : null}
              </div>
            </div>
            
            {/* Mensagens de validação */}
            {nameValidation.showValidation && (
              <div className="space-y-2">
                {nameValidation.hasError && (
                  <div className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{nameValidation.error}</span>
                  </div>
                )}
                
                {nameValidation.suggestion && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-800">
                        Sugestão: <strong>{nameValidation.suggestion}</strong>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={nameValidation.applySuggestion}
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      Usar Sugestão
                    </Button>
                  </div>
                )}
                
                {nameValidation.similarNames.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">Pipelines similares:</p>
                    <div className="flex flex-wrap gap-1">
                      {nameValidation.similarNames.map((similarName, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {similarName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo e processo desta pipeline..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.3} className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Membros da Equipe</h3>
            <p className="text-sm text-muted-foreground">Selecione os vendedores que terão acesso a esta pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-105 ${
                formData.member_ids.includes(member.id)
                  ? 'bg-primary/10 border-primary shadow-md'
                  : 'bg-card hover:bg-accent'
              }`}
              onClick={() => handleMemberToggle(member.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  formData.member_ids.includes(member.id) ? 'bg-primary' : 'bg-muted'
                }`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.first_name} {member.last_name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                {formData.member_ids.includes(member.id) && (
                  <CheckSquare className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>

        {formData.member_ids.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              ✓ {formData.member_ids.length} membro(s) selecionado(s)
            </p>
          </div>
        )}
      </AnimatedCard>
    </BlurFade>
  );

  // Função para renderizar a aba de etapas
  const renderStagesTab = () => (
    <BlurFade delay={0.1} className="space-y-6">
      <AnimatedCard delay={0.2} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Workflow className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Etapas da Pipeline</h3>
              <p className="text-sm text-muted-foreground">Configure as etapas do seu processo de vendas</p>
            </div>
          </div>
          <Button onClick={handleAddStage} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Etapa
          </Button>
        </div>

        <div className="space-y-4">
          {formData.stages.map((stage, index) => {
            const isSystemStage = stage.is_system;
            const isNovosLeads = stage.name === 'Novos leads';

            return (
              <div key={`stage-${index}`}
                        >
                          <AnimatedCard 
                            delay={0.1 + index * 0.05} 
                            className={`p-4 border-l-4 ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                          >
                            <div style={{ borderLeftColor: stage.color }} className="absolute left-0 top-0 w-1 h-full" />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {canDrag && (
                                  <div {...provided.dragHandleProps} className="cursor-grab hover:cursor-grabbing">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div 
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{stage.name}</h4>
                                    {stage.is_system && (
                                      <Badge variant="secondary" className="text-xs">Sistema</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Etapa {stage.order_index + 1} do pipeline
                                  </p>
                                  {stage.description && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                      {stage.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {!stage.is_system && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditStage(index)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteStage(index)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </AnimatedCard>
                        </div>
                      );
            })}
        </div>
      </AnimatedCard>
    </BlurFade>
  );

  // Função para renderizar a aba de campos
  const renderFieldsTab = () => (
    <BlurFade delay={0.1} className="space-y-6">
      <AnimatedCard delay={0.2} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Database className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Campos Personalizados</h3>
              <p className="text-sm text-muted-foreground">Configure os campos que aparecerão nos leads</p>
            </div>
          </div>
          <Button onClick={handleAddField} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Campo
          </Button>
        </div>

        <div className="space-y-4">
          {formData.custom_fields.map((field, index) => {
            const isSystemField = SYSTEM_REQUIRED_FIELDS.some(sf => sf.field_name === field.field_name);
            const fieldType = FIELD_TYPES.find(ft => ft.value === field.field_type);
            
            return (
              <AnimatedCard key={index} delay={0.1 + index * 0.05} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-accent">
                      {fieldType && <fieldType.icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{field.field_label}</h4>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                        )}
                        {isSystemField && (
                          <Badge variant="secondary" className="text-xs">Sistema</Badge>
                        )}
                        {field.show_in_card && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            Visível no Card
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {fieldType?.label} • Nome: {field.field_name}
                        {field.placeholder && ` • Placeholder: ${field.placeholder}`}
                      </p>
                    </div>
                  </div>
                  
                  {!isSystemField && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditField(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      </AnimatedCard>
    </BlurFade>
  );

  // Função para renderizar a aba de cadência
  // 🆕 RENDER DA ABA DE DISTRIBUIÇÃO
  const renderDistributionTab = () => (
    <div className="space-y-6">
      {/* Header da Distribuição */}
      <BlurFade delay={0.1}>
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl">
              <Shuffle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-900">Sistema de Distribuição de Leads</h3>
              <p className="text-blue-700 mt-1">
                Configure como os novos leads serão distribuídos entre os vendedores desta pipeline
              </p>
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* Configurações Principais */}
      <BlurFade delay={0.2}>
        <AnimatedCard className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Modo de Distribuição
                </h4>
                <p className="text-muted-foreground text-sm mt-1">
                  Escolha como os leads serão atribuídos aos vendedores
                </p>
              </div>
            </div>

            {/* Seletor de Modo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Modo Manual */}
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.distribution_rule?.mode === 'manual' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  distribution_rule: {
                    ...prev.distribution_rule!,
                    mode: 'manual'
                  }
                }))}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.distribution_rule?.mode === 'manual' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}>
                    <UserPlus className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium">Distribuição Manual</h5>
                    <p className="text-xs text-muted-foreground">
                      Admins atribuem leads manualmente
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  • Controle total sobre cada atribuição<br/>
                  • Ideal para leads de alto valor<br/>
                  • Vendedores especializados por tipo de lead
                </div>
              </div>

              {/* Modo Rodízio */}
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.distribution_rule?.mode === 'rodizio' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  distribution_rule: {
                    ...prev.distribution_rule!,
                    mode: 'rodizio'
                  }
                }))}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.distribution_rule?.mode === 'rodizio' ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    <RotateCcw className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium">Rodízio Automático</h5>
                    <p className="text-xs text-muted-foreground">
                      Sistema distribui igualmente entre vendedores
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  • Distribuição justa e automática<br/>
                  • Leads distribuídos em sequência circular<br/>
                  • Perfeito para volume alto de leads
                </div>
              </div>
            </div>

            {/* Configurações Avançadas (apenas no modo rodízio) */}
            {formData.distribution_rule?.mode === 'rodizio' && (
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h5 className="font-medium flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    Configurações Avançadas
                  </h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    Personalize o comportamento do sistema de rodízio
                  </p>
                </div>

                {/* Opções Avançadas */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Horário Comercial */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <div>
                        <Label className="font-medium">Apenas Horário Comercial</Label>
                        <p className="text-xs text-muted-foreground">
                          Distribuir leads apenas durante horário comercial
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.distribution_rule?.working_hours_only || false}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distribution_rule: {
                          ...prev.distribution_rule!,
                          working_hours_only: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300"
                    />
                  </div>

                  {/* Pular Membros Inativos */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <EyeOff className="h-4 w-4 text-gray-600" />
                      <div>
                        <Label className="font-medium">Pular Membros Inativos</Label>
                        <p className="text-xs text-muted-foreground">
                          Não atribuir leads a vendedores marcados como inativos
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.distribution_rule?.skip_inactive_members ?? true}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distribution_rule: {
                          ...prev.distribution_rule!,
                          skip_inactive_members: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300"
                    />
                  </div>

                  {/* Fallback para Manual */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-gray-600" />
                      <div>
                        <Label className="font-medium">Fallback para Manual</Label>
                        <p className="text-xs text-muted-foreground">
                          Se rodízio falhar, permitir atribuição manual
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.distribution_rule?.fallback_to_manual ?? true}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        distribution_rule: {
                          ...prev.distribution_rule!,
                          fallback_to_manual: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status da Distribuição */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.distribution_rule?.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {formData.distribution_rule?.is_active ? (
                      <Eye className="h-4 w-4 text-white" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <Label className="font-medium">
                      Sistema de Distribuição {formData.distribution_rule?.is_active ? 'Ativo' : 'Inativo'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {formData.distribution_rule?.is_active 
                        ? 'Novos leads serão distribuídos automaticamente'
                        : 'Distribuição automática está desabilitada'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant={formData.distribution_rule?.is_active ? "destructive" : "default"}
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    distribution_rule: {
                      ...prev.distribution_rule!,
                      is_active: !prev.distribution_rule?.is_active
                    }
                  }))}
                  className="gap-2"
                >
                  {formData.distribution_rule?.is_active ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Ativar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Informações sobre o Rodízio */}
            {formData.distribution_rule?.mode === 'rodizio' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h6 className="font-medium text-blue-900">Como funciona o Rodízio</h6>
                    <div className="text-sm text-blue-800 mt-2 space-y-1">
                      <p>• <strong>Distribuição Circular:</strong> Lead 1 → Vendedor A, Lead 2 → Vendedor B, Lead 3 → Vendedor C, Lead 4 → Vendedor A...</p>
                      <p>• <strong>Ordem Consistente:</strong> Baseada na ordem de criação dos usuários no sistema</p>
                      <p>• <strong>Histórico Completo:</strong> Todas as atribuições são registradas para auditoria</p>
                      <p>• <strong>Recuperação Inteligente:</strong> Se um vendedor não estiver disponível, passa para o próximo</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AnimatedCard>
      </BlurFade>
    </div>
  );

  const renderCadenceTab = () => (
    <BlurFade delay={0.1} className="space-y-6">
      <AnimatedCard delay={0.2} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Automação de Cadência</h3>
              <p className="text-sm text-muted-foreground">Configure follow-ups automáticos para cada etapa da pipeline</p>
            </div>
          </div>
          <Button onClick={() => setCadenceModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cadência
          </Button>
        </div>

        {formData.cadence_configs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhuma cadência configurada</h4>
            <p className="text-muted-foreground mb-4">
              Crie cadências de follow-up para automatizar o acompanhamento dos seus leads
            </p>
            <Button onClick={() => setCadenceModalOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar primeira cadência
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.cadence_configs.map((config, configIndex) => (
              <AnimatedCard key={configIndex} delay={0.1 + configIndex * 0.05} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Workflow className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Cadência: {config.stage_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {config.tasks.length} tarefa(s) configurada(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleCadenceActive(configIndex)}
                    >
                      <Badge variant={config.is_active ? "default" : "secondary"}>
                        {config.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditCadence(configIndex)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => handleDeleteCadence(configIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {config.tasks.map((task, taskIndex) => {
                    const channel = CHANNEL_OPTIONS.find(c => c.value === task.channel);
                    const actionType = ACTION_TYPE_OPTIONS.find(a => a.value === task.action_type);
                    
                    return (
                      <div key={taskIndex} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Dia {task.day_offset}
                          </Badge>
                          {channel && (
                            <div className={`p-1 rounded ${channel.color} text-white`}>
                              <channel.icon className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{task.task_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {actionType?.label} via {channel?.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.task_description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleTaskActive(configIndex, taskIndex)}
                          >
                            <Badge variant={task.is_active ? "default" : "secondary"} className="text-xs">
                              {task.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditTask(configIndex, taskIndex)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive"
                            onClick={() => handleDeleteTask(configIndex, taskIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Botão para adicionar nova tarefa */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTask(configIndex)}
                    className="w-full gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Tarefa
                  </Button>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </AnimatedCard>
    </BlurFade>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">
              {pipeline ? 'Edite as configurações da sua pipeline' : 'Crie uma nova pipeline para organizar seus leads'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </BlurFade>

      {/* Tabs */}
      <BlurFade delay={0.1}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full"> {/* 🆕 5 COLUNAS AGORA */}
          <TabsList className="grid w-full grid-cols-5"> {/* 🆕 5 COLUNAS AGORA */}
            <TabsTrigger value="basic" className="gap-2">
              <Rocket className="h-4 w-4" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="stages" className="gap-2">
              <Workflow className="h-4 w-4" />
              Etapas
            </TabsTrigger>
            <TabsTrigger value="fields" className="gap-2">
              <Database className="h-4 w-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2"> {/* 🆕 NOVA ABA */}
              <Shuffle className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="cadence" className="gap-2">
              <Zap className="h-4 w-4" />
              Cadência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            {renderBasicTab()}
          </TabsContent>

          <TabsContent value="stages" className="mt-6">
            {renderStagesTab()}
          </TabsContent>

          <TabsContent value="fields" className="mt-6">
            {renderFieldsTab()}
          </TabsContent>

          <TabsContent value="distribution" className="mt-6"> {/* 🆕 NOVA ABA */}
            {renderDistributionTab()}
          </TabsContent>

          <TabsContent value="cadence" className="mt-6">
            {renderCadenceTab()}
          </TabsContent>
        </Tabs>
      </BlurFade>

      {/* Footer */}
      <BlurFade delay={0.4}>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {formData.stages.length} etapas • {formData.custom_fields.length} campos • {formData.member_ids.length} membros
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <ShimmerButton
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name.trim() || formData.member_ids.length === 0}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {submitText}
                  </>
                )}
              </ShimmerButton>
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* Modal para Etapas - Simplificado sem temperatura */}
      <Dialog open={stageModalOpen} onOpenChange={setStageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStageIndex !== null ? 'Editar Etapa' : 'Nova Etapa'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome e aparência da etapa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Nome da Etapa</Label>
              <Input
                id="stage-name"
                placeholder="Ex: Qualificação, Proposta..."
                value={tempStage.name}
                onChange={(e) => setTempStage(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage-color">Cor</Label>
              <Input
                id="stage-color"
                type="color"
                value={tempStage.color}
                onChange={(e) => setTempStage(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStageModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStage}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Campos */}
      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFieldIndex !== null ? 'Editar Campo' : 'Novo Campo'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do campo personalizado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field-name">Nome do Campo</Label>
                <Input
                  id="field-name"
                  placeholder="Ex: empresa, cargo..."
                  value={tempField.field_name}
                  onChange={(e) => setTempField(prev => ({ ...prev, field_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-label">Rótulo</Label>
                <Input
                  id="field-label"
                  placeholder="Ex: Empresa, Cargo..."
                  value={tempField.field_label}
                  onChange={(e) => setTempField(prev => ({ ...prev, field_label: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Tipo do Campo</Label>
              <Select
                value={tempField.field_type}
                onValueChange={(value) => setTempField(prev => ({ ...prev, field_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                placeholder="Texto de exemplo para o campo..."
                value={tempField.placeholder}
                onChange={(e) => setTempField(prev => ({ ...prev, placeholder: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={tempField.is_required}
                  onChange={(e) => setTempField(prev => ({ ...prev, is_required: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="field-required">Campo obrigatório</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="field-show-card"
                  checked={tempField.show_in_card}
                  onChange={(e) => setTempField(prev => ({ ...prev, show_in_card: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="field-show-card">Mostrar no card</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveField}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Cadência */}
      <Dialog open={cadenceModalOpen} onOpenChange={setCadenceModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Cadência de Follow-up</DialogTitle>
            <DialogDescription>
              Configure uma sequência automática de tarefas para acompanhar seus leads
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Seleção da Etapa */}
            <div className="space-y-2">
              <Label>Etapa da Pipeline</Label>
              <Select defaultValue={formData.stages[0]?.name}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {formData.stages.map((stage, index) => (
                    <SelectItem key={index} value={stage.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                As tarefas serão executadas quando um lead entrar nesta etapa
              </p>
            </div>

            {/* Exemplo de Tarefas Pré-configuradas */}
            <div className="space-y-3">
              <Label>Tarefas de Exemplo (Baseadas no Mercado)</Label>
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                {[
                  { day: 0, title: "Ligação de boas-vindas", channel: "ligacao", description: "Fazer primeira ligação para o lead" },
                  { day: 1, title: "E-mail de apresentação", channel: "email", description: "Enviar material sobre a empresa" },
                  { day: 3, title: "WhatsApp follow-up", channel: "whatsapp", description: "Verificar interesse via WhatsApp" },
                  { day: 7, title: "Proposta comercial", channel: "email", description: "Enviar proposta personalizada" },
                  { day: 14, title: "Ligação de fechamento", channel: "ligacao", description: "Última tentativa de conversão" }
                ].map((task, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-background rounded border">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Dia {task.day}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                    <Badge variant="secondary">{task.channel}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Esta é uma cadência padrão baseada nas melhores práticas de CRMs como HubSpot e Salesforce. 
                Você poderá personalizar as tarefas após criar a pipeline.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCadenceModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCadence} className="gap-2">
              <Zap className="h-4 w-4" />
              Criar Cadência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Edição de Tarefa Individual */}
      <Dialog open={taskModalOpen} onOpenChange={(open) => {
        if (!open) {
          setTaskModalOpen(false);
          setEditingTaskIndex(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTaskIndex !== null ? 'Editar Tarefa' : 'Nova Tarefa'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da tarefa de follow-up
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Dia e Canal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia da Execução</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={tempTask.day_offset || 0}
                  onChange={(e) => setTempTask(prev => ({ ...prev, day_offset: Number(e.target.value) }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Quantos dias após o lead entrar na etapa
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Canal de Comunicação</Label>
                <Select 
                  value={tempTask.channel} 
                  onValueChange={(value) => setTempTask(prev => ({ ...prev, channel: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${channel.color} text-white`}>
                            <channel.icon className="h-3 w-3" />
                          </div>
                          {channel.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de Ação */}
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select 
                value={tempTask.action_type} 
                onValueChange={(value) => setTempTask(prev => ({ ...prev, action_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de ação" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div className="flex items-center gap-2">
                        <action.icon className="h-4 w-4" />
                        {action.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título da Tarefa */}
            <div className="space-y-2">
              <Label>Título da Tarefa *</Label>
              <Input
                value={tempTask.task_title || ''}
                onChange={(e) => setTempTask(prev => ({ ...prev, task_title: e.target.value }))}
                placeholder="Ex: Ligação de boas-vindas"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição da Tarefa *</Label>
              <Textarea
                value={tempTask.task_description || ''}
                onChange={(e) => setTempTask(prev => ({ ...prev, task_description: e.target.value }))}
                placeholder="Descreva o que deve ser feito nesta tarefa..."
                rows={3}
              />
            </div>

            {/* Status Ativo */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="task-active"
                checked={tempTask.is_active !== false}
                onChange={(e) => setTempTask(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="task-active">Tarefa ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTaskModalOpen(false);
              setEditingTaskIndex(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTask} 
              disabled={!tempTask.task_title || !tempTask.task_description}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {editingTaskIndex !== null ? 'Salvar Alterações' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernPipelineCreator; 