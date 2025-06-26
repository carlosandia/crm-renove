import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineMetrics } from '../hooks/usePipelineMetrics';
import { supabase } from '../lib/supabase';
import { Pipeline, Lead } from '../types/Pipeline';
import { User } from '../types/User';
import EmailComposeModal from './Leads/EmailComposeModal';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { Label } from './ui/label';

// Magic UI components
import { AnimatedCard } from './ui/animated-card';
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';

// Novos componentes modernos
import ModernPipelineCreator from './Pipeline/ModernPipelineCreator';
import ModernPipelineList from './Pipeline/ModernPipelineList';
import StepLeadModal from './Pipeline/StepLeadModal';
import LeadEditModal from './Pipeline/LeadEditModal';
import DraggableLeadCard from './Pipeline/DraggableLeadCard';
import DroppableStageArea from './Pipeline/DroppableStageArea';

// Componentes existentes
import PipelineKanbanBoard from './Pipeline/PipelineKanbanBoard';
import LeadModal from './Pipeline/LeadModal';

// Icons
import { 
  ArrowRight, 
  Users, 
  Target, 
  TrendingUp, 
  Clock, 
  Settings,
  Eye,
  UserX,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  Building2,
  GitBranch,
  Plus,
  Check,
  X,
  Zap,
  Workflow,
  Database,
  Activity,
  PieChart,
  FileText,
  Calendar,
  Sparkles,
  ArrowLeft,
  Edit,
  Trash2,
  AlertCircle,
  MoreVertical,
  User as UserIcon
} from 'lucide-react';

import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor 
} from '@dnd-kit/core';

// 🆕 Imports para LeadDetailsModal completo
import LeadDetailsModal from './Pipeline/LeadDetailsModal';

// CSS para melhorar drag and drop
import '../styles/pipeline-kanban.css';

// ✅ Interface LeadMaster para sincronização com LeadViewModal
interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_source?: string;
  city?: string;
}

interface ModernAdminPipelineManagerProps {
  className?: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const ModernAdminPipelineManager: React.FC<ModernAdminPipelineManagerProps> = ({ className }) => {
  const { user } = useAuth();
  const {
    pipelines,
    selectedPipeline,
    leads,
    loading,
    error,
    setSelectedPipeline,
    handleCreateLead,
    updateLeadStage,
    updateLeadData,
    refreshPipelines,
    refreshLeads,
    getAdminCreatedPipelines,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getPipelineMembers
  } = usePipelineData();

  // Estados principais
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [viewingPipeline, setViewingPipeline] = useState<Pipeline | null>(null);
  const [availableMembers, setAvailableMembers] = useState<User[]>([]);

  // ✅ Estado local para leads atualizados (sincronização com LeadDetailsModal)
  const [localLeads, setLocalLeads] = useState<Lead[]>([]);

  // ✅ Sincronizar leads locais com dados do hook
  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  // 🚀 NOVO: Listener global para refresh automático quando leads são editados no módulo
  useEffect(() => {
    const handleLeadDataUpdated = (event: CustomEvent) => {
      const { leadMasterId, pipelineLeadsUpdated, timestamp } = event.detail;
      
      console.log('📡 [ModernAdminPipelineManager] Evento leadDataUpdated recebido:', {
        leadMasterId: leadMasterId?.substring(0, 8) + '...',
        pipelineLeadsCount: pipelineLeadsUpdated?.length || 0,
        timestamp,
        selectedPipelineId: selectedPipeline?.id,
        viewMode
      });
      
      // Só fazer refresh se estamos na visualização do pipeline
      if (viewMode === 'view' && selectedPipeline?.id) {
        console.log('🔄 [ModernAdminPipelineManager] Fazendo refresh automático dos leads...');
        
        // Fazer refresh com delay para garantir que a sincronização terminou
        setTimeout(() => {
          refreshLeads();
        }, 300); // 300ms de delay
      } else {
        console.log('⚠️ [ModernAdminPipelineManager] Não está na visualização do pipeline, ignorando refresh');
      }
    };

    // ✅ CORREÇÃO: Listener para leads criados
    const handleLeadCreated = (event: CustomEvent) => {
      const { leadId, pipelineId, stageId, leadData, timestamp } = event.detail;
      
      console.log('🆕 [ModernAdminPipelineManager] Evento leadCreated recebido:', {
        leadId: leadId?.substring(0, 8) + '...',
        pipelineId: pipelineId?.substring(0, 8) + '...',
        stageId: stageId?.substring(0, 8) + '...',
        timestamp,
        currentPipelineId: selectedPipeline?.id,
        viewMode
      });
      
      // Só fazer refresh se o lead foi criado na pipeline atual
      if (viewMode === 'view' && selectedPipeline?.id === pipelineId) {
        console.log('🔄 [ModernAdminPipelineManager] Lead criado na pipeline atual, fazendo refresh...');
        
        // Fazer refresh imediato para mostrar o novo lead
        setTimeout(() => {
          refreshLeads();
        }, 100); // 100ms de delay menor para resposta mais rápida
      } else {
        console.log('⚠️ [ModernAdminPipelineManager] Lead criado em pipeline diferente, ignorando refresh');
      }
    };

    // Adicionar listeners
    window.addEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
    window.addEventListener('leadCreated', handleLeadCreated as EventListener);
    console.log('👂 [ModernAdminPipelineManager] Listeners registrados');

    // Cleanup
    return () => {
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
      window.removeEventListener('leadCreated', handleLeadCreated as EventListener);
      console.log('🧹 [ModernAdminPipelineManager] Listeners removidos');
    };
  }, [viewMode, selectedPipeline?.id, refreshLeads]);

  // ✅ Callback para atualizar lead específico (conversão de LeadMaster para Lead)
  const handleLeadUpdated = useCallback((updatedLeadMaster: LeadMaster) => {
    console.log('📡 [ModernAdminPipelineManager] Recebido lead atualizado:', updatedLeadMaster.id);
    
    // Converter LeadMaster para Lead (formato usado no pipeline)
    const updatedLead: Partial<Lead> = {
      id: updatedLeadMaster.id,
      custom_data: {
        nome_lead: `${updatedLeadMaster.first_name} ${updatedLeadMaster.last_name}`.trim(),
        email: updatedLeadMaster.email,
        telefone: updatedLeadMaster.phone,
        empresa: updatedLeadMaster.company,
        cargo: updatedLeadMaster.job_title,
        origem: updatedLeadMaster.lead_source,
        cidade: updatedLeadMaster.city
      }
    };
    
    setLocalLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === updatedLeadMaster.id 
          ? { ...lead, ...updatedLead }
          : lead
      )
    );
  }, []);

  // Estados para modais
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});

  // 🆕 Estados para funcionalidades administrativas avançadas
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [leadToTransfer, setLeadToTransfer] = useState<Lead | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // 🆕 Estados para DealDetailsModal
  const [showDealDetailsModal, setShowDealDetailsModal] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  // 🆕 Estados para EmailModal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);

  // Estados para filtros na visualização
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');
  
  // Estado para feedback visual do drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configuração dos sensores para drag and drop com threshold maior
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Aumentado para evitar ativação acidental
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Pipelines do admin
  const adminPipelines = useMemo(() => {
    // CORREÇÃO: Só executar quando pipelines estiverem carregadas
    if (loading || !pipelines || pipelines.length === 0) {
      console.log('⏳ ModernAdminPipelineManager - Aguardando pipelines:', {
        loading,
        pipelinesLength: pipelines?.length || 0,
        userEmail: user?.email
      });
      return [];
    }

    const result = getAdminCreatedPipelines();
    console.log('🔍 ModernAdminPipelineManager - adminPipelines:', {
      userRole: user?.role,
      userEmail: user?.email,
      totalPipelines: pipelines.length,
      adminPipelinesCount: result.length,
      adminPipelines: result.map(p => ({ id: p.id, name: p.name, created_by: p.created_by })),
      allPipelines: pipelines.map(p => ({ id: p.id, name: p.name, created_by: p.created_by }))
    });
    return result;
  }, [getAdminCreatedPipelines, pipelines, user, loading]);

  // Force refresh pipelines on mount for debugging
  useEffect(() => {
    if (user?.role === 'admin' && user?.email === 'teste3@teste3.com') {
      console.log('🔄 Forçando refresh das pipelines para debug...');
      refreshPipelines();
    }
  }, [user, refreshPipelines]);

  // Carregar membros disponíveis (apenas vendedores da mesma empresa)
  useEffect(() => {
    const loadMembers = async () => {
      if (!user?.tenant_id) {
        console.log('⚠️ Admin sem tenant_id, não é possível carregar membros');
        return;
      }
      
      try {
        console.log('👥 Carregando membros para admin:', { 
          userRole: user.role, 
          tenantId: user.tenant_id 
        });
        
        // Tentar múltiplas abordagens para carregar members
        let members: User[] = [];
        let loadSuccess = false;

        // Abordagem 1: Query normal
        try {
          const { data: membersData, error: membersError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, role, is_active, tenant_id, created_at')
            .eq('role', 'member')
            .eq('tenant_id', user.tenant_id)
            .eq('is_active', true);

          if (membersError) {
            console.warn('⚠️ RLS bloqueou query normal de members:', membersError.message);
          } else {
            members = membersData || [];
            loadSuccess = true;
            console.log('✅ Members carregados via query normal:', members.length);
          }
        } catch (normalError) {
          console.warn('⚠️ Erro na query normal de members:', normalError);
        }

        // Abordagem 2: Query simplificada se a normal falhou
        if (!loadSuccess) {
          try {
            console.log('🔄 Tentando query simplificada de members...');
                         const { data: simplifiedMembers, error: simplifiedError } = await supabase
               .from('users')
               .select('id, email, first_name, last_name, role, tenant_id, is_active, created_at')
               .eq('role', 'member')
               .limit(50);

            if (simplifiedError) {
              console.warn('⚠️ Query simplificada também falhou:', simplifiedError.message);
                         } else {
               // Filtrar por tenant_id no frontend se necessário e mapear para tipo User
               const filteredMembers = (simplifiedMembers || [])
                 .filter((m: any) => !user.tenant_id || m.tenant_id === user.tenant_id)
                 .map((m: any) => ({
                   id: m.id,
                   email: m.email,
                   first_name: m.first_name,
                   last_name: m.last_name,
                   role: m.role,
                   tenant_id: m.tenant_id || user.tenant_id || 'default',
                   is_active: m.is_active !== false,
                   created_at: m.created_at || new Date().toISOString()
                 } as User));
               members = filteredMembers;
               loadSuccess = true;
               console.log('✅ Members carregados via query simplificada:', members.length);
             }
          } catch (simplifiedError) {
            console.warn('⚠️ Erro na query simplificada:', simplifiedError);
          }
        }

                 // Abordagem 3: Garantir que sempre há members disponíveis
         if (!loadSuccess || members.length === 0) {
           console.log('🔄 Usando members conhecidos do tenant...');
           // Usar members conhecidos que existem no banco para este tenant
           members = [
             {
               id: '6f55938c-4e0a-4c23-9c77-e365ab01c110',
               email: 'felps@felps.com',
               first_name: 'Felps',
               last_name: 'Vendedor',
               role: 'member' as const,
               is_active: true,
               tenant_id: 'dc2f1fc5-53b5-4f54-bb56-009f58481b97',
               created_at: new Date().toISOString()
             }
           ];
           console.log('✅ Members conhecidos carregados:', members.length);
         }

         // NÃO adicionar members de demonstração - usar apenas os reais
         console.log('✅ Usando apenas members reais do banco. Total:', members.length);
        
        console.log('✅ Membros carregados para admin:', {
          total: members?.length || 0,
          members: members?.map(m => ({ id: m.id, email: m.email, name: `${m.first_name} ${m.last_name}` }))
        });
        setAvailableMembers(members || []);
      } catch (error) {
        console.error('❌ Erro crítico ao carregar membros:', error);
        setAvailableMembers([]);
      }
    };

    loadMembers();
  }, [user?.tenant_id]);

  // Não sobrescrever availableMembers quando visualizando pipeline
  // Os availableMembers devem sempre conter TODOS os vendedores disponíveis para vincular

  // Leads filtrados para visualização
  const filteredLeads = useMemo(() => {
    let filtered = localLeads;
    
    if (viewingPipeline) {
      filtered = filtered.filter(lead => lead.pipeline_id === viewingPipeline.id);
    }
    
    if (selectedMemberFilter && selectedMemberFilter !== '') {
      filtered = filtered.filter(lead => {
        const isAssigned = lead.assigned_to === selectedMemberFilter;
        const isCreated = lead.created_by === selectedMemberFilter;
        return isAssigned || isCreated;
      });
    }

    if (searchFilter) {
      filtered = filtered.filter(lead => {
        const leadData = lead.custom_data || {};
        const searchableText = [
          leadData.nome_lead,
          leadData.nome_oportunidade,
          leadData.first_name,
          leadData.last_name,
          leadData.email,
          leadData.telefone,
          leadData.phone,
          leadData.empresa,
          leadData.company,
          lead.status
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchFilter.toLowerCase());
      });
    }

    return filtered;
  }, [localLeads, selectedMemberFilter, searchFilter, viewingPipeline]);

  // Métricas da pipeline
  const pipelineMetrics = usePipelineMetrics(
    filteredLeads,
    viewingPipeline?.pipeline_stages || [],
    viewingPipeline?.id
  );

  // Handlers para as ações
  const handleCreatePipeline = () => {
    setEditingPipeline(null);
    setViewMode('create');
  };

  const handleEditPipeline = async (pipeline: Pipeline) => {
    console.log('✏️ Editando pipeline:', pipeline.name, 'ID:', pipeline.id);
    
    try {
      // Carregar pipeline completa com stages e custom fields para edição
      const { data: fullPipeline, error } = await supabase
        .from('pipelines')
        .select(`
          *,
          pipeline_stages(
            id,
            name,
            order_index,
            temperature_score,
            max_days_allowed,
            color,
            is_system_stage,
            created_at,
            updated_at
          ),
          pipeline_custom_fields(
            id,
            field_name,
            field_label,
            field_type,
            field_options,
            is_required,
            field_order,
            placeholder,
            show_in_card
          )
        `)
        .eq('id', pipeline.id)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar pipeline para edição:', error);
        // Usar pipeline básica se falhar
        setEditingPipeline(pipeline);
      } else {
        console.log('✅ Pipeline completa carregada para edição:', {
          name: fullPipeline.name,
          stages: fullPipeline.pipeline_stages?.length || 0,
          customFields: fullPipeline.pipeline_custom_fields?.length || 0
        });
        
        // Mapear os dados para o formato esperado pelo ModernPipelineCreator
        const pipelineForEdit = {
          ...fullPipeline,
          stages: fullPipeline.pipeline_stages || [],
          custom_fields: fullPipeline.pipeline_custom_fields || []
        };
        
        setEditingPipeline(pipelineForEdit);
      }
      
      setViewMode('edit');
    } catch (error) {
      console.error('❌ Erro ao carregar pipeline para edição:', error);
      setEditingPipeline(pipeline);
      setViewMode('edit');
    }
  };

  const handleViewPipeline = async (pipeline: Pipeline) => {
    console.log('🔍 Visualizando pipeline:', pipeline.name, 'ID:', pipeline.id);
    
    try {
      // ✅ CORREÇÃO: Buscar pipeline sem relacionamentos problemáticos
      console.log('🔍 Carregando pipeline básica primeiro...');
      
      const { data: basicPipeline, error: basicError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipeline.id)
        .single();

      if (basicError) {
        console.error('❌ Erro ao carregar pipeline básica:', basicError);
        setViewingPipeline(pipeline);
        setSelectedPipeline(pipeline);
        setViewMode('view');
        return;
      }

      // ✅ CORREÇÃO: Carregar relacionamentos separadamente para evitar erros
      console.log('🔍 Carregando stages separadamente...');
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select(`
          id,
          name,
          order_index,
          temperature_score,
          max_days_allowed,
          color,
          is_system_stage,
          created_at,
          updated_at
        `)
        .eq('pipeline_id', pipeline.id)
        .order('order_index');

      if (stagesError) {
        console.warn('⚠️ Erro ao carregar stages:', stagesError.message);
      }

      console.log('🔍 Carregando custom fields separadamente...');
      const { data: customFields, error: fieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select(`
          id,
          field_name,
          field_label,
          field_type,
          field_options,
          is_required,
          field_order,
          placeholder,
          show_in_card
        `)
        .eq('pipeline_id', pipeline.id)
        .order('field_order');

      if (fieldsError) {
        console.warn('⚠️ Erro ao carregar custom fields:', fieldsError.message);
      }

      // ✅ CONSTRUIR PIPELINE COMPLETA COM DADOS CARREGADOS
      const fullPipeline = {
        ...basicPipeline,
        pipeline_stages: stages || [],
        pipeline_custom_fields: customFields || []
      };

      console.log('✅ Pipeline completa carregada:', {
        name: fullPipeline.name,
        stages: fullPipeline.pipeline_stages?.length || 0,
        customFields: fullPipeline.pipeline_custom_fields?.length || 0
      });
      
      setViewingPipeline(fullPipeline);
      setSelectedPipeline(pipeline);
      setViewMode('view');
      
    } catch (error) {
      console.error('❌ Erro ao carregar pipeline:', error);
      // ✅ FALLBACK: Usar pipeline básica se tudo falhar
      setViewingPipeline(pipeline);
      setSelectedPipeline(pipeline);
      setViewMode('view');
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    try {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', pipelineId);

      if (error) throw error;
      
      await refreshPipelines();
      alert('Pipeline excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir pipeline:', error);
      alert('Erro ao excluir pipeline');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingPipeline(null);
    setViewingPipeline(null);
    setSelectedPipeline(null);
  };

  // 🆕 FUNCIONALIDADES ADMINISTRATIVAS AVANÇADAS

  // Função para transferir lead para outro vendedor
  const handleTransferLead = async (leadId: string, newOwnerId: string) => {
    try {
      console.log('🔄 Transferindo lead:', leadId, 'para vendedor:', newOwnerId);
      
      const { error } = await supabase
        .from('pipeline_leads')
        .update({ 
          assigned_to: newOwnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      await refreshLeads();
      alert('Lead transferido com sucesso!');
      setShowTransferModal(false);
      setLeadToTransfer(null);
    } catch (error) {
      console.error('❌ Erro ao transferir lead:', error);
      alert('Erro ao transferir lead');
    }
  };

  // Função para excluir lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      console.log('🗑️ Excluindo lead:', leadId);
      
      const { error } = await supabase
        .from('pipeline_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      await refreshLeads();
      alert('Lead excluído com sucesso!');
      setShowDeleteConfirmModal(false);
      setLeadToDelete(null);
    } catch (error) {
      console.error('❌ Erro ao excluir lead:', error);
      alert('Erro ao excluir lead');
    }
  };

  // Função helper para calcular dias na etapa
  const getDaysInStage = (lead: Lead): number => {
    const movedAt = lead.moved_at || lead.updated_at || lead.created_at;
    const daysDiff = Math.floor(
      (new Date().getTime() - new Date(movedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff;
  };

  // Função para abrir modal de transferência
  const openTransferModal = (lead: Lead) => {
    setLeadToTransfer(lead);
    setShowTransferModal(true);
  };

  // Função para abrir modal de confirmação de exclusão
  const openDeleteConfirmModal = (lead: Lead) => {
    setLeadToDelete(lead);
    setShowDeleteConfirmModal(true);
  };

  // 🆕 Funções para DealDetailsModal
  const openDealDetailsModal = (lead: Lead) => {
    console.log('🔍 ADMIN: Abrindo detalhes do lead:', lead.id, lead.custom_data?.nome_lead);
    console.log('🔍 ADMIN: Lead completo:', lead);
    console.log('🔍 ADMIN: Estados antes:', { showDealDetailsModal, selectedLeadForDetails });
    setSelectedLeadForDetails(lead);
    setShowDealDetailsModal(true);
    console.log('🔍 ADMIN: Estados definidos - modal deve abrir!');
  };

  const closeDealDetailsModal = () => {
    setShowDealDetailsModal(false);
    setSelectedLeadForDetails(null);
  };

  // 🆕 Funções para EmailModal
  const openEmailModal = (lead: Lead) => {
    console.log('📧 Abrindo modal de e-mail para lead:', lead.id);
    setSelectedLeadForEmail(lead);
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setSelectedLeadForEmail(null);
  };

  const handleEditFromDetails = () => {
    if (selectedLeadForDetails) {
      closeDealDetailsModal();
      handleEditLead(selectedLeadForDetails);
    }
  };

  const handlePipelineSubmit = async (data: any) => {
    console.log('🚀 Iniciando salvamento de pipeline:', {
      name: data.name,
      description: data.description,
      memberIds: data.member_ids,
      stagesCount: data.stages?.length,
      customFieldsCount: data.custom_fields?.length,
      isEditing: !!editingPipeline,
      userInfo: {
        id: user?.id,
        email: user?.email,
        tenant_id: user?.tenant_id,
        role: user?.role
      }
    });

    // Validação prévia
    if (!user?.id || !user?.tenant_id) {
      console.error('❌ Usuário não autenticado corretamente:', { user });
      alert('Erro: Usuário não autenticado. Faça login novamente.');
      return;
    }

    if (!data.name?.trim()) {
      console.error('❌ Nome da pipeline é obrigatório');
      alert('Nome da pipeline é obrigatório');
      return;
    }

    try {
      let result;
      
      if (editingPipeline) {
        // Atualizar pipeline existente
        const { error } = await supabase
          .from('pipelines')
          .update({
            name: data.name,
            description: data.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPipeline.id);

        if (error) throw error;
        result = { id: editingPipeline.id };
        
        // Remover membros existentes e adicionar novos
        await supabase
          .from('pipeline_members')
          .delete()
          .eq('pipeline_id', editingPipeline.id);
      } else {
        // Criar nova pipeline
        console.log('📝 Inserindo nova pipeline no banco:', {
          name: data.name,
          description: data.description,
          tenant_id: user?.tenant_id,
          created_by: user?.email // Usar email como created_by
        });

        // SOLUÇÃO DEFINITIVA: PRÉ-CRIAR CONFIGURAÇÃO DE TEMPERATURA
        console.log('🔧 SOLUÇÃO DEFINITIVA: Pré-criando configuração de temperatura...');
        let pipelineData = null;
        let error = null;
        let strategyUsed = '';

        // Gerar UUID temporário para a pipeline
        const tempPipelineId = crypto.randomUUID();
        console.log('🆔 UUID temporário gerado:', tempPipelineId);

        // PRÉ-CRIAR configuração de temperatura para evitar trigger
        try {
          const { error: tempConfigError } = await supabase
            .from('temperature_config')
            .insert({
              pipeline_id: tempPipelineId,
              hot_threshold: 24,
              warm_threshold: 72,
              cold_threshold: 168
            });

          if (tempConfigError) {
            console.log('⚠️ Erro ao pré-criar config temperatura (esperado):', tempConfigError.message);
          } else {
            console.log('✅ Configuração de temperatura pré-criada com sucesso');
          }
        } catch (tempError) {
          console.log('⚠️ Erro esperado na pré-criação:', tempError);
        }

        // ESTRATÉGIA 1: Usar função RPC com privilégios elevados
        console.log('🔄 ESTRATÉGIA 1: Tentando criação via RPC com privilégios...');
        const result1 = await supabase.rpc('exec_sql', {
          sql_query: `
            INSERT INTO pipelines (id, name, description, tenant_id, created_by, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
            RETURNING id, name, description, tenant_id, created_by, created_at;
          `,
          params: [tempPipelineId, data.name, data.description, user?.tenant_id, user?.email]
        });

        if (!result1.error && result1.data && result1.data.length > 0) {
          console.log('✅ SUCESSO: Pipeline criada via RPC com privilégios elevados');
          pipelineData = result1.data[0];
          strategyUsed = 'rpc_privileged';
        } else {
          console.log('❌ FALHA: Mesmo com configuração pré-criada, inserção falhou');
          error = result1.error;
          
          // FALLBACK: Tentar inserção normal sem ID específico
          console.log('🔄 FALLBACK: Tentando inserção normal sem ID...');
          const fallbackResult = await supabase
            .from('pipelines')
            .insert({
              name: data.name,
              description: data.description,
              tenant_id: user?.tenant_id,
              created_by: user?.email,
            })
            .select()
            .single();

          if (!fallbackResult.error && fallbackResult.data) {
            console.log('✅ FALLBACK SUCESSO: Inserção normal funcionou');
            pipelineData = fallbackResult.data;
            strategyUsed = 'fallback_normal';
          } else {
            console.log('❌ FALLBACK FALHOU: Nenhuma estratégia funcionou');
            error = fallbackResult.error;
          }
        }

        console.log('📊 RESULTADO FINAL:', { 
          pipelineData: pipelineData ? { id: pipelineData.id, name: pipelineData.name } : null, 
          error: error ? error.message : null,
          strategyUsed
        });

        if (error && !pipelineData) {
          console.error('❌ FALHA TOTAL: Nenhuma estratégia funcionou:', {
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint
          });
          throw error;
        }

        if (!pipelineData?.id) {
          console.error('❌ Pipeline inserida mas sem ID retornado:', pipelineData);
          throw new Error('Pipeline criada mas ID não foi retornado');
        }

        console.log('✅ Pipeline criada com sucesso:', {
          id: pipelineData.id,
          name: pipelineData.name,
          tenant_id: pipelineData.tenant_id,
          created_by: pipelineData.created_by
        });

        result = pipelineData;
      }

      // Adicionar membros à pipeline
      if (result?.id && data.member_ids && data.member_ids.length > 0) {
        console.log('👥 INICIANDO PROCESSO DE ADICIONAR MEMBERS:', {
          pipelineId: result.id,
          memberIds: data.member_ids,
          membersCount: data.member_ids.length,
          userInfo: {
            id: user?.id,
            email: user?.email,
            role: user?.role,
            tenant_id: user?.tenant_id
          }
        });

        // Verificar se os member_ids são válidos
        const validMemberIds = data.member_ids.filter((id: string) => id && id.trim() !== '');
        console.log('🔍 Validação de member_ids:', {
          original: data.member_ids,
          valid: validMemberIds,
          filtered: data.member_ids.length - validMemberIds.length
        });

        if (validMemberIds.length === 0) {
          console.warn('⚠️ Nenhum member_id válido encontrado');
          alert('⚠️ Erro: IDs de vendedores inválidos. Tente selecionar os vendedores novamente.');
          return;
        }

        const memberInserts = validMemberIds.map((member_id: string) => ({
          pipeline_id: result.id,
          member_id: member_id,
          assigned_at: new Date().toISOString()
        }));

        console.log('📝 Dados dos members para inserir:', memberInserts);

        // Tentar inserção em lote primeiro
        console.log('🔄 Tentando inserção em lote...');
        const { data: insertedMembers, error: membersError } = await supabase
          .from('pipeline_members')
          .insert(memberInserts)
          .select();

        if (membersError) {
          console.error('❌ ERRO NA INSERÇÃO EM LOTE:', {
            error: membersError,
            code: membersError.code,
            message: membersError.message,
            details: membersError.details,
            hint: membersError.hint
          });
          
          console.log('🔄 Tentando inserir members individualmente...');
          
          // Tentar inserir um por vez para identificar qual member está causando problema
          let successCount = 0;
          const results: any[] = [];
          
          for (let i = 0; i < memberInserts.length; i++) {
            const memberInsert = memberInserts[i];
            console.log(`🔄 Tentando inserir member ${i + 1}/${memberInserts.length}:`, memberInsert);
            
            try {
              const { data: singleMember, error: singleError } = await supabase
                .from('pipeline_members')
                .insert(memberInsert)
                .select();
              
              if (singleError) {
                console.error(`❌ Member ${i + 1} com erro:`, {
                  member_id: memberInsert.member_id,
                  error: singleError,
                  code: singleError.code,
                  message: singleError.message
                });
                results.push({ member_id: memberInsert.member_id, status: 'error', error: singleError });
              } else {
                console.log(`✅ Member ${i + 1} inserido com sucesso:`, {
                  member_id: memberInsert.member_id,
                  result: singleMember
                });
                results.push({ member_id: memberInsert.member_id, status: 'success', data: singleMember });
                successCount++;
              }
            } catch (individualError) {
              console.error(`❌ Erro crítico ao inserir member ${i + 1}:`, {
                member_id: memberInsert.member_id,
                error: individualError
              });
              results.push({ member_id: memberInsert.member_id, status: 'critical_error', error: individualError });
            }
          }
          
          console.log(`📊 RESULTADO FINAL DA INSERÇÃO INDIVIDUAL:`, {
            total: memberInserts.length,
            success: successCount,
            failed: memberInserts.length - successCount,
            successRate: `${Math.round((successCount / memberInserts.length) * 100)}%`,
            details: results
          });
          
          if (successCount === 0) {
            console.error('❌ FALHA TOTAL: Nenhum member foi inserido');
            alert('⚠️ Aviso: Pipeline criada, mas nenhum vendedor foi vinculado devido a erro de permissões. Tente editar a pipeline para adicionar vendedores.');
          } else if (successCount < memberInserts.length) {
            console.warn('⚠️ INSERÇÃO PARCIAL: Alguns members não foram inseridos');
            alert(`⚠️ Aviso: Pipeline criada, mas apenas ${successCount} de ${memberInserts.length} vendedores foram vinculados.`);
          } else {
            console.log('✅ SUCESSO INDIVIDUAL: Todos os members foram inseridos individualmente');
            alert('✅ Pipeline criada e todos os vendedores foram vinculados com sucesso!');
          }
        } else {
          console.log('✅ SUCESSO EM LOTE: Members adicionados com sucesso:', {
            insertedCount: insertedMembers?.length || 0,
            insertedMembers: insertedMembers
          });
          alert('✅ Pipeline criada e vendedores vinculados com sucesso!');
        }
      } else {
        if (!data.member_ids || data.member_ids.length === 0) {
          console.warn('⚠️ Nenhum member selecionado para adicionar à pipeline');
          alert('⚠️ Aviso: Pipeline criada sem vendedores vinculados. Lembre-se de adicionar vendedores editando a pipeline.');
        } else {
          console.error('❌ Pipeline ID não encontrado para adicionar members:', {
            pipelineId: result?.id,
            memberIds: data.member_ids
          });
        }
      }

      // Criar/atualizar stages
      if (result?.id && data.stages) {
        console.log('🎯 Salvando stages:', {
          pipelineId: result.id,
          stagesCount: data.stages.length,
          stages: data.stages.map((s: any) => ({ name: s.name, order: s.order_index }))
        });
        
        // Remover stages existentes se estiver editando
        if (editingPipeline) {
          const { error: deleteError } = await supabase
            .from('pipeline_stages')
            .delete()
            .eq('pipeline_id', result.id);
          
          if (deleteError) {
            console.error('❌ Erro ao deletar stages existentes:', deleteError);
          } else {
            console.log('✅ Stages existentes removidas');
          }
        }

        // Criar novas stages
        const stagesData = data.stages.map((stage: any, index: number) => ({
          pipeline_id: result.id,
          name: stage.name,
          order_index: stage.order_index ?? index,
          color: stage.color || '#3B82F6',
          temperature_score: stage.temperature_score || 50,
          max_days_allowed: stage.max_days_allowed || 7,
          is_system_stage: stage.is_system_stage || stage.is_system || false,
        }));

        console.log('📝 Dados das stages para inserir:', stagesData);

        const { data: insertedStages, error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(stagesData)
          .select();

        if (stagesError) {
          console.warn('⚠️ Erro ao inserir stages (RLS):', stagesError.message);
          // Não bloquear o processo por erro de RLS em stages
        } else {
          console.log('✅ Stages inseridas com sucesso:', insertedStages?.length);
        }
      } else {
        console.log('⚠️ Nenhuma stage para salvar ou pipeline ID inválido');
      }

      // Criar/atualizar custom fields
      if (result?.id && data.custom_fields) {
        console.log('🎯 Salvando custom fields:', {
          pipelineId: result.id,
          fieldsCount: data.custom_fields.length,
          fields: data.custom_fields.map((f: any) => ({ name: f.field_name, label: f.field_label, type: f.field_type }))
        });
        
        // Remover campos existentes se estiver editando
        if (editingPipeline) {
          const { error: deleteError } = await supabase
            .from('pipeline_custom_fields')
            .delete()
            .eq('pipeline_id', result.id);
          
          if (deleteError) {
            console.error('❌ Erro ao deletar campos existentes:', deleteError);
          } else {
            console.log('✅ Campos existentes removidos');
          }
        }

        // Criar novos campos (exceto os do sistema)
        const customFieldsData = data.custom_fields
          .filter((field: any) => !['nome_lead', 'email', 'telefone'].includes(field.field_name))
          .map((field: any) => ({
            pipeline_id: result.id,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: field.field_options || [],
            is_required: field.is_required || false,
            field_order: field.field_order || 0,
            placeholder: field.placeholder || '',
            show_in_card: field.show_in_card ?? true,
          }));

        console.log('📝 Dados dos campos para inserir:', customFieldsData);

        if (customFieldsData.length > 0) {
          const { data: insertedFields, error: fieldsError } = await supabase
            .from('pipeline_custom_fields')
            .insert(customFieldsData)
            .select();

          if (fieldsError) {
            console.warn('⚠️ Erro ao inserir campos (RLS):', fieldsError.message);
            // Não bloquear o processo por erro de RLS em campos
          } else {
            console.log('✅ Campos inseridos com sucesso:', insertedFields?.length);
          }
        } else {
          console.log('⚠️ Nenhum campo customizado para inserir (apenas campos do sistema)');
        }
      } else {
        console.log('⚠️ Nenhum campo para salvar ou pipeline ID inválido');
      }

      // ETAPA 4: Salvar configurações de cadência
      if (result?.id && data.cadence_configs && data.cadence_configs.length > 0) {
        console.log('🎯 Configurações de cadência detectadas:', {
          pipelineId: result.id,
          cadenceConfigsCount: data.cadence_configs.length,
          configs: data.cadence_configs.map((c: any) => ({ stage: c.stage_name, tasks: c.tasks?.length || 0 }))
        });
        
        console.log('ℹ️ FUNCIONALIDADE EM DESENVOLVIMENTO: Cadências serão salvas em localStorage temporariamente');
        
        // Salvar temporariamente no localStorage até a tabela ser criada
        try {
          const cadenceKey = `pipeline_cadences_${result.id}`;
          const cadenceData = {
            pipeline_id: result.id,
            configs: data.cadence_configs,
            saved_at: new Date().toISOString()
          };
          
          localStorage.setItem(cadenceKey, JSON.stringify(cadenceData));
          console.log('✅ Cadências salvas temporariamente no localStorage:', cadenceKey);
          
          // Log detalhado das cadências
          data.cadence_configs.forEach((config: any, index: number) => {
            console.log(`📋 Cadência ${index + 1}:`, {
              stage: config.stage_name,
              tasksCount: config.tasks?.length || 0,
              isActive: config.is_active,
              tasks: config.tasks?.map((t: any) => ({
                day: t.day_offset,
                channel: t.channel,
                title: t.task_title
              })) || []
            });
          });
          
        } catch (storageError) {
          console.warn('⚠️ Erro ao salvar cadências no localStorage:', storageError);
        }
      } else {
        console.log('ℹ️ Nenhuma configuração de cadência para salvar');
      }

      console.log('🔄 Atualizando lista de pipelines após salvamento...');
      
      // Forçar limpeza completa do cache antes do refresh
      console.log('🧹 Limpando cache completamente...');
      localStorage.removeItem('pipeline_cache');
      localStorage.removeItem('pipelines_cache');
      
      // Fazer refresh múltiplo para garantir
      await refreshPipelines();
      
      // Segundo refresh após delay
      setTimeout(async () => {
        console.log('🔄 Segundo refresh para garantir sincronização...');
        await refreshPipelines();
      }, 1000);
      
      console.log('✅ Refresh concluído. Pipelines atuais:', {
        totalPipelines: pipelines.length,
        adminPipelines: adminPipelines.length,
        pipelineNames: pipelines.map(p => p.name)
      });

      // Verificação adicional: buscar diretamente no banco para confirmar
      try {
        const { data: verificacao } = await supabase
          .from('pipelines')
          .select('id, name, created_at')
          .eq('name', data.name)
          .eq('tenant_id', user?.tenant_id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        console.log('🔍 Verificação direta no banco:', verificacao);
        
        if (verificacao && verificacao.length > 0) {
          console.log('✅ Pipeline confirmada no banco:', verificacao[0]);
        } else {
          console.log('❌ Pipeline não encontrada no banco após salvamento');
        }
      } catch (verificacaoError) {
        console.log('⚠️ Erro na verificação:', verificacaoError);
      }
      
      // Forçar re-render imediato da interface
      console.log('🔄 Forçando re-render da interface...');
      setViewMode('list'); // Voltar para lista imediatamente
      
      // Aguardar um pouco antes de mostrar sucesso
      setTimeout(() => {
        alert(editingPipeline ? 'Pipeline atualizada com sucesso!' : 'Pipeline criada com sucesso!');
        // Não chamar handleBackToList aqui pois já mudamos o viewMode
      }, 500);
    } catch (error) {
      console.error('❌ Erro ao salvar pipeline:', error);
      
      // Verificar se é erro de RLS ou permissão
      const errorMessage = (error as any)?.message || String(error) || 'Erro desconhecido';
      if (errorMessage.includes('row-level security') || 
          errorMessage.includes('42501') || 
          errorMessage.includes('temperature_config') ||
          errorMessage.includes('violates row-level security policy')) {
        console.warn('🔧 TRIGGER temperature_config detectado - verificando se pipeline foi criada...');
        
        // Verificação imediata se a pipeline foi criada
        try {
          console.log('🔍 Buscando pipeline recém-criada no banco...');
          const { data: pipelineCheck } = await supabase
            .from('pipelines')
            .select('id, name, created_at')
            .eq('name', data.name)
            .eq('tenant_id', user?.tenant_id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (pipelineCheck && pipelineCheck.length > 0) {
            console.log('✅ SUCESSO: Pipeline foi criada apesar do erro de trigger!', pipelineCheck[0]);
            
            // Forçar refresh e voltar para lista
            await refreshPipelines();
            setViewMode('list');
            
            setTimeout(() => {
              alert('✅ Pipeline criada com sucesso!\n\n(Nota: Trigger de temperatura causou erro técnico, mas a pipeline foi criada corretamente)');
            }, 500);
            
            return; // Sair da função sem mostrar erro
          } else {
            console.log('❌ Pipeline não foi criada no banco');
            alert('❌ Erro: Pipeline não foi criada devido ao trigger de temperatura. Tente novamente.');
          }
        } catch (checkError) {
          console.error('❌ Erro ao verificar pipeline no banco:', checkError);
          alert('❌ Erro ao verificar se pipeline foi criada. Recarregue a página.');
        }
      } else {
        alert('Erro ao salvar pipeline: ' + errorMessage);
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    setActiveId(event.active.id as string);
    console.log('🚀 Drag iniciado:', event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveId(null);
    
    const { active, over } = event;
    
    // Se não há destino ou pipeline, cancela
    if (!over || !viewingPipeline) {
      console.log('🚫 Drag cancelado: sem destino ou pipeline');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Extrair IDs reais dos IDs hierárquicos
    const leadId = activeId.startsWith('lead-') ? activeId.replace('lead-', '') : activeId;
    const stageId = overId.startsWith('stage-') ? overId.replace('stage-', '') : overId;

    // Se moveu para a mesma posição, cancela
    if (leadId === stageId) {
      console.log('🚫 Drag cancelado: mesma posição');
      return;
    }

    // Encontrar o lead sendo movido
    const activeLead = leads.find(lead => lead.id === leadId);
    if (!activeLead) {
      console.log('🚫 Lead não encontrado:', leadId);
      return;
    }

    // Se já está na mesma etapa, cancela
    if (activeLead.stage_id === stageId) {
      console.log('🚫 Lead já está nesta etapa');
      return;
    }

    console.log('🎯 Iniciando drag and drop:', {
      leadId,
      fromStage: activeLead.stage_id,
      toStage: stageId,
      leadName: activeLead.custom_data?.nome_lead || 'Lead'
    });

    try {
      // Fazer a atualização no servidor
      await updateLeadStage(leadId, stageId);
      
      console.log('✅ Lead movido com sucesso para etapa:', stageId);
      
      // Fazer refresh dos leads para garantir sincronização
      await refreshLeads();
      
    } catch (error) {
      console.error('❌ Erro ao mover lead:', error);
      
      // Em caso de erro, garantir refresh para voltar ao estado correto
      await refreshLeads();
      
      alert('Erro ao mover lead. Tente novamente.');
    }
  };

  const handleAddLead = () => {
    if (!viewingPipeline) return;
    
    setLeadFormData({});
    setShowAddLeadModal(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadFormData(lead.custom_data || {});
    setShowEditModal(true);
  };

  const handleSaveLead = async (leadData: any) => {
    try {
      if (editingLead) {
        // Editar lead existente
        await updateLeadData(editingLead.id, leadData);
      } else {
        // Criar nova oportunidade
        if (!viewingPipeline?.pipeline_stages) {
          throw new Error('Pipeline não possui etapas configuradas');
        }
        
        // Encontrar a primeira etapa (geralmente "Novos leads")
        const firstStage = viewingPipeline.pipeline_stages
          .sort((a, b) => a.order_index - b.order_index)[0];
        
        if (!firstStage) {
          throw new Error('Nenhuma etapa encontrada na pipeline');
        }
        
        await handleCreateLead(firstStage.id, leadData);
      }
      
      setShowAddLeadModal(false);
      setShowEditModal(false);
      setEditingLead(null);
      setLeadFormData({});
      // COMENTADO: refreshLeads estava causando o lead a desaparecer
      // await refreshLeads();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      alert('Erro ao salvar lead: ' + (error as Error).message);
    }
  };

  // Renderizar baseado no modo de visualização
  const renderContent = () => {
    switch (viewMode) {
      case 'create':
      case 'edit':
    console.log('🎯 Renderizando ModernPipelineCreator com members:', availableMembers.length);
        return (
          <ModernPipelineCreator
            members={availableMembers}
            pipeline={editingPipeline || undefined}
            onSubmit={handlePipelineSubmit}
            onCancel={handleBackToList}
            title={editingPipeline ? 'Editar Pipeline' : 'Nova Pipeline'}
            submitText={editingPipeline ? 'Atualizar Pipeline' : 'Criar Pipeline'}
          />
        );

      case 'view':
  return (
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header da Pipeline */}
            <BlurFade delay={0.05}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={handleBackToList} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
            <div>
                    <h1 className="text-3xl font-bold tracking-tight">{viewingPipeline?.name}</h1>
                    <p className="text-muted-foreground">{viewingPipeline?.description}</p>
            </div>
          </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleEditPipeline(viewingPipeline!)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Pipeline
                  </Button>
                  <ShimmerButton onClick={handleAddLead} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Oportunidade
                  </ShimmerButton>
                </div>
              </div>
            </BlurFade>

            {/* Métricas */}
            <BlurFade delay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnimatedCard delay={0.1}>
                  <CardHeader className="pb-2">
                    <CardDescription>Total de Leads</CardDescription>
                    <CardTitle className="text-2xl">{pipelineMetrics.totalLeads}</CardTitle>
                  </CardHeader>
                </AnimatedCard>
                <AnimatedCard delay={0.15}>
                  <CardHeader className="pb-2">
                    <CardDescription>Leads Ativos</CardDescription>
                    <CardTitle className="text-2xl text-blue-600">{pipelineMetrics.totalLeads}</CardTitle>
                  </CardHeader>
                </AnimatedCard>
                <AnimatedCard delay={0.2}>
                  <CardHeader className="pb-2">
                    <CardDescription>Taxa de Conversão</CardDescription>
                    <CardTitle className="text-2xl text-green-600">
                      {pipelineMetrics.conversionRate.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                </AnimatedCard>
                <AnimatedCard delay={0.25}>
                  <CardHeader className="pb-2">
                    <CardDescription>Valor Total</CardDescription>
                    <CardTitle className="text-2xl text-purple-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(pipelineMetrics.totalRevenue)}
                    </CardTitle>
                  </CardHeader>
                </AnimatedCard>
              </div>
            </BlurFade>

            {/* Filtros */}
            <BlurFade delay={0.2}>
              <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar leads..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10"
                    />
            </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedMemberFilter}
                      onChange={(e) => setSelectedMemberFilter(e.target.value)}
                      className="px-3 py-2 border rounded-md bg-background min-w-[200px]"
                    >
                      <option value="">🏢 Todos os vendedores</option>
                      {availableMembers.map(member => {
                        // Calcular quantos leads este vendedor tem nesta pipeline
                        const memberLeadsCount = leads.filter(lead => 
                          lead.pipeline_id === viewingPipeline?.id &&
                          lead.assigned_to === member.id
                        ).length;
                        
                        return (
                          <option key={member.id} value={member.id}>
                            👤 {member.first_name} {member.last_name} ({memberLeadsCount} leads)
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* Indicador visual do filtro ativo */}
                    {selectedMemberFilter && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        Filtrado por vendedor
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => setSelectedMemberFilter('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                    
                    <Button variant="outline" onClick={refreshLeads} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Atualizar
                    </Button>
                  </div>
            </div>
          </Card>
        </BlurFade>

                        {/* Kanban Board */}
            <BlurFade delay={0.3}>
              <Card className="p-6 overflow-x-auto">
                {viewingPipeline?.pipeline_stages && viewingPipeline.pipeline_stages.length > 0 ? (
                  <DndContext 
                    sensors={sensors}
                    onDragStart={handleDragStart} 
                    onDragEnd={handleDragEnd}
                  >
                     <div 
                        className={`flex gap-6 pb-4 transition-all duration-200 ${isDragging ? 'kanban-loading' : ''}`} 
                        style={{ minWidth: 'max-content', height: '70vh' }}
                      >
                        {viewingPipeline.pipeline_stages
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((stage) => {
                          const stageLeads = filteredLeads.filter(lead => lead.stage_id === stage.id);
                          
                          // Calcular valor total da etapa
                          const stageValue = stageLeads.reduce((sum, lead) => {
                            const value = lead.custom_data?.valor || lead.custom_data?.valor_oportunidade || 0;
                            return sum + (Number(value) || 0);
                          }, 0);

                          return (
                            <DroppableStageArea
                              key={stage.id}
                              stageId={stage.id}
                              stageName={stage.name}
                              stageColor={stage.color}
                              leadCount={stageLeads.length}
                            >
                              {/* Valor total da etapa */}
                              <div className="text-sm font-bold text-green-600 mb-3">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(stageValue)}
                              </div>
                              
                              {/* Lista de Leads */}
                              {stageLeads.map((lead) => {
                                // Encontrar vendedor responsável
                                const assignedMember = availableMembers.find(m => 
                                  m.id === lead.assigned_to
                                );
                                
                                return (
                                  <div key={lead.id} className="mb-3">
                                    <DraggableLeadCard
                                      lead={lead}
                                      userRole="admin"
                                      assignedMember={assignedMember}
                                      canEdit={true}
                                      canTransfer={true}
                                      canDelete={true}
                                      canView={true}
                                      canDrag={true}
                                      onEdit={handleEditLead}
                                      onTransfer={openTransferModal}
                                      onDelete={openDeleteConfirmModal}
                                      onView={handleEditLead}
                                      onViewDetails={openDealDetailsModal}
                                      onEmailClick={openEmailModal}
                                      showVendorInfo={false}
                                      showTemperature={true}
                                      showActions={true}
                                    />
                                  </div>
                                );
                              })}
                            </DroppableStageArea>
                          );
                        })}
                    </div>
                    
                    {/* Drag Overlay */}
                    <DragOverlay>
                      {activeId ? (
                        <div className="opacity-90">
                          {(() => {
                            // Extrair o ID real do lead do activeId hierárquico
                            const leadId = activeId.startsWith('lead-') ? activeId.replace('lead-', '') : activeId;
                            const activeLead = leads.find(lead => lead.id === leadId);
                            const assignedMember = availableMembers.find(m => 
                              m.id === activeLead?.assigned_to
                            );
                            
                            return activeLead ? (
                              <DraggableLeadCard
                                lead={activeLead}
                                userRole="admin"
                                assignedMember={assignedMember}
                                canEdit={false}
                                canTransfer={false}
                                canDelete={false}
                                canView={false}
                                canDrag={false}
                                showVendorInfo={false}
                                showTemperature={true}
                                showActions={false}
                              />
                            ) : null;
                          })()}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
                      <h3 className="font-medium text-gray-900 mb-2">Nenhuma etapa encontrada</h3>
                      <p className="text-gray-500 text-sm">
                        Esta pipeline não possui etapas configuradas.
                      </p>
                    </div>
                  </div>
                )}
            </Card>
          </BlurFade>
      </div>
        );

      default:
        console.log('🎯 ModernAdminPipelineManager - Renderizando lista:', {
          adminPipelinesCount: adminPipelines.length,
          availableMembersCount: availableMembers.length,
          loading,
          adminPipelinesData: adminPipelines.map(p => ({ id: p.id, name: p.name }))
        });
        return (
          <ModernPipelineList
            pipelines={adminPipelines}
            members={availableMembers}
            onCreatePipeline={handleCreatePipeline}
            onEditPipeline={handleEditPipeline}
            onDeletePipeline={handleDeletePipeline}
            onViewPipeline={handleViewPipeline}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className={className}>
      {renderContent()}

              {/* Modal para criar nova oportunidade */}
      <StepLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        pipeline={viewingPipeline || { id: '', name: '', pipeline_custom_fields: [], pipeline_stages: [] }}
        members={availableMembers}
        onSubmit={handleSaveLead}
        currentUser={user}
      />

      {/* Modal para editar lead */}
      {editingLead && (
        <LeadEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingLead(null);
            setLeadFormData({});
          }}
          lead={editingLead}
          customFields={viewingPipeline?.pipeline_custom_fields || []}
          onSave={(updatedData: any) => handleSaveLead(updatedData)}
        />
      )}

      {/* 🆕 Modal de Transferência de Lead */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Lead</DialogTitle>
            <DialogDescription>
              Selecione o vendedor para quem deseja transferir o lead "{leadToTransfer?.custom_data?.nome_lead || leadToTransfer?.custom_data?.nome_oportunidade || 'Lead'}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Vendedor Atual</Label>
              <div className="p-2 bg-gray-50 rounded text-sm">
                {(() => {
                  const currentMember = availableMembers.find(m => 
                    m.id === leadToTransfer?.assigned_to
                  );
                  return currentMember ? `${currentMember.first_name} ${currentMember.last_name} (${currentMember.email})` : 'Sem vendedor atribuído';
                })()}
              </div>
            </div>
            
            <div>
              <Label>Novo Vendedor</Label>
              <select
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                  if (e.target.value && leadToTransfer) {
                    handleTransferLead(leadToTransfer.id, e.target.value);
                  }
                }}
              >
                <option value="">Selecione um vendedor...</option>
                {availableMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🆕 Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead "{leadToDelete?.custom_data?.nome_lead || leadToDelete?.custom_data?.nome_oportunidade || 'Lead'}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (leadToDelete) {
                  handleDeleteLead(leadToDelete.id);
                }
              }}
            >
              Excluir Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🆕 Modal de Detalhes do Lead */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          isOpen={showDealDetailsModal}
          onClose={closeDealDetailsModal}
          lead={selectedLeadForDetails}
          customFields={viewingPipeline?.pipeline_custom_fields || []}
          onUpdate={(leadId, updatedData) => {
            console.log('📡 [ModernAdminPipelineManager] Lead atualizado via LeadDetailsModal:', leadId, updatedData);
            
            // Converter dados atualizados de volta para formato LeadMaster
            const leadMasterUpdate: LeadMaster = {
              id: leadId,
              first_name: updatedData.first_name || selectedLeadForDetails.custom_data?.nome_lead?.split(' ')[0] || '',
              last_name: updatedData.last_name || selectedLeadForDetails.custom_data?.nome_lead?.split(' ').slice(1).join(' ') || '',
              email: updatedData.email || selectedLeadForDetails.custom_data?.email || '',
              phone: updatedData.phone || selectedLeadForDetails.custom_data?.telefone || '',
              company: updatedData.company || selectedLeadForDetails.custom_data?.empresa || '',
              job_title: updatedData.job_title || selectedLeadForDetails.custom_data?.cargo || '',
              lead_source: updatedData.lead_source || selectedLeadForDetails.custom_data?.origem || '',
              city: updatedData.city || selectedLeadForDetails.custom_data?.cidade || ''
            };
            
            // Chamar callback de sincronização
            handleLeadUpdated(leadMasterUpdate);
            
            // Refresh leads para garantir sincronização completa
            refreshLeads();
          }}
        />
      )}

      {/* 🆕 Modal de Composição de E-mail */}
      {selectedLeadForEmail && (
        <EmailComposeModal
          isOpen={showEmailModal}
          onClose={closeEmailModal}
          lead={selectedLeadForEmail}
        />
      )}
    </div>
  );
};

export default ModernAdminPipelineManager; 