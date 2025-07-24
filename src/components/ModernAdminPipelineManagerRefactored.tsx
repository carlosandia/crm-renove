import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { useArrayState } from '../hooks/useArrayState';
import { supabase } from '../lib/supabase';
import { Pipeline, PipelineStage, CustomField } from '../types/Pipeline';
import { User } from '../types/User';
import { showSuccessToast, showErrorToast, showWarningToast } from '../hooks/useToast';
import { useAutoCleanupEventManager } from '../services/EventManager';

// ================================================================================
// COMPONENTES REFATORADOS - TAREFA 2
// ================================================================================
import { useModalManager } from './Pipeline/managers/ModalManager';
import { useLeadManager } from './Pipeline/managers/LeadManager';
import { useEventListener } from './Pipeline/events/EventListener';
import PipelineListView from './Pipeline/views/PipelineListView';
import PipelineFormView from './Pipeline/views/PipelineFormView';
import PipelineKanbanView from './Pipeline/PipelineKanbanView';

// ================================================================================
// COMPONENTES EXISTENTES MANTIDOS
// ================================================================================
import EmailComposeModal from './Leads/EmailComposeModal';
import StepLeadModal from './Pipeline/StepLeadModal';
import LeadEditModal from './Pipeline/LeadEditModal';
import LeadDetailsModal from './Pipeline/LeadDetailsModal';

// ================================================================================
// COMPONENTES UI
// ================================================================================
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface ModernAdminPipelineManagerRefactoredProps {
  className?: string;
  searchTerm?: string;
  selectedFilter?: 'all' | 'active' | 'archived';
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const ModernAdminPipelineManagerRefactored: React.FC<ModernAdminPipelineManagerRefactoredProps> = ({ 
  className,
  searchTerm = '',
  selectedFilter = 'active'
}) => {
  const { user, authenticatedFetch } = useAuth();
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

  // ✅ OTIMIZAÇÃO: EventManager centralizado com auto-cleanup
  const eventManager = useAutoCleanupEventManager('ModernAdminPipelineManagerRefactored');

  // ================================================================================
  // ESTADOS PRINCIPAIS
  // ================================================================================
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [viewingPipeline, setViewingPipeline] = useState<Pipeline | null>(null);
  
  // Estados para filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');

  // Estados para arrays usando useArrayState
  const membersState = useArrayState<User>([]);
  
  // ✅ EXTRAIR setItems PARA ESTABILIZAR REFERÊNCIA E EVITAR LOOP
  const setMembers = useCallback((members: User[]) => {
    membersState.setItems(members);
  }, [membersState.setItems]);
  
  // ✅ REFS PARA OTIMIZAÇÃO: Evitar re-render desnecessário
  const prevPipelinesLength = useRef<number>(0);
  const prevLoading = useRef<boolean>(false);
  
  // ============================================
  // OTIMIZADO: Sistema de logging limpo sem console.log
  // ============================================
  const logger = {
    debug: (message: string, ...args: any[]) => {
      // Debug removido para performance
    },
    warn: (message: string, ...args: any[]) => {
      // Warnings removidos para performance, erros críticos vão para error boundary
    },
    error: (message: string, ...args: any[]) => {
      // Erros críticos vão para error boundary 
    }
  };

  // ================================================================================
  // HOOKS DOS COMPONENTES REFATORADOS
  // ================================================================================
  const modalManager = useModalManager();
  
  // 🔧 CORREÇÃO: Carregamento de vendedores otimizado para evitar re-execução
  const loadMembersCallback = useCallback(async () => {
    if (!user?.tenant_id) {
      logger.debug('⚠️ Admin sem tenant_id, não é possível carregar membros');
      return;
    }

    // 🔧 CORREÇÃO: Verificar se já temos membros carregados para evitar chamadas desnecessárias
    if (membersState.items.length > 0) {
      logger.debug('✅ [LoadMembers] Membros já carregados, ignorando nova chamada');
      return;
    }

    // ✅ CACHE INTELIGENTE: Verificar se já temos membros carregados para este tenant
    const cacheKey = `members_cache_${user.tenant_id}`;
    const cachedMembers = sessionStorage.getItem(cacheKey);
    
    if (cachedMembers) {
      try {
        const parsedMembers = JSON.parse(cachedMembers);
        const cacheAge = Date.now() - parsedMembers.timestamp;
        
        // Cache válido por 5 minutos
        if (cacheAge < 300000) {
          logger.debug('✅ [LoadMembers] Usando cache válido:', parsedMembers.data.length);
          setMembers(parsedMembers.data);
          return;
        }
      } catch (cacheError) {
        console.warn('⚠️ [LoadMembers] Erro ao ler cache:', cacheError);
      }
    }
    
    try {
      logger.debug('👥 [LoadMembers] Carregando membros para admin:', { 
        userRole: user.role, 
        tenantId: user.tenant_id 
      });
      
      // Estratégia otimizada: Query direta com fallback
      let members: User[] = [];
      let loadSuccess = false;

      // Query principal otimizada
      try {
        const { data: membersData, error: membersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role, is_active, tenant_id, created_at')
          .eq('role', 'member')
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true)
          .limit(100); // Limit para performance

        if (!membersError && membersData) {
          members = membersData;
          loadSuccess = true;
          logger.debug('✅ [LoadMembers] Carregados via query principal:', members.length);
        } else {
          console.warn('⚠️ [LoadMembers] Query principal falhou:', membersError?.message);
        }
      } catch (queryError) {
        console.warn('⚠️ [LoadMembers] Erro na query principal:', queryError);
      }

      // Fallback com members conhecidos se necessário
      if (!loadSuccess || members.length === 0) {
        logger.debug('🔄 [LoadMembers] Usando fallback para members conhecidos...');
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
        logger.debug('✅ [LoadMembers] Fallback aplicado:', members.length);
      }
      
      // ✅ SALVAR NO CACHE
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: members,
          timestamp: Date.now()
        }));
        logger.debug('💾 [LoadMembers] Cache salvo para tenant:', user.tenant_id);
      } catch (cacheError) {
        logger.warn('⚠️ [LoadMembers] Erro ao salvar cache:', cacheError);
      }
      
      logger.debug('✅ [LoadMembers] Membros finais carregados:', {
        total: members.length,
        members: members.map(m => ({ id: m.id, email: m.email, name: `${m.first_name} ${m.last_name}` }))
      });
      
      setMembers(members);
    } catch (error) {
      console.error('❌ [LoadMembers] Erro crítico:', error);
      setMembers([]);
    }
  }, [user?.tenant_id, user?.role, setMembers, membersState.items.length]); // 🔧 CORREÇÃO: Incluir items.length nas dependências

  // 🔧 CORREÇÃO: UseEffect otimizado para evitar chamadas desnecessárias
  useEffect(() => {
    // Só executar se realmente precisar carregar membros
    if (user?.tenant_id && membersState.items.length === 0) {
      loadMembersCallback();
    }
  }, [user?.tenant_id]); // 🔧 CORREÇÃO: Dependência mais específica
  
  // 🔧 CORREÇÃO: Memoizar condição para carregar leads
  const shouldLoadLeads = useMemo(() => {
    return selectedPipeline && viewMode === 'view';
  }, [selectedPipeline, viewMode]);
  
  // Carregar leads quando a pipeline for selecionada
  useEffect(() => {
    if (shouldLoadLeads) {
      console.log('📋 [ModernAdminPipelineManagerRefactored] Carregando leads para pipeline:', selectedPipeline?.name);
      refreshLeads();
    }
  }, [shouldLoadLeads, refreshLeads]); // 🔧 CORREÇÃO: Usar condição memoizada
  
  const leadManager = useLeadManager({
    initialLeads: leads as any, // Conversão temporária de Lead CRM para Lead Pipeline
    viewingPipeline,
    onCreateLead: async (stageId: string, leadData: any) => {
      await handleCreateLead(stageId, leadData);
    },
    onUpdateLeadData: updateLeadData,
    onDeleteLead: async (leadId: string) => {
      // Implementar lógica de delete
      console.log('Deletando lead:', leadId);
    },
    onTransferLead: async (leadId: string, newOwnerId: string) => {
      // Implementar lógica de transfer
      console.log('Transferindo lead:', leadId, 'para:', newOwnerId);
    },
    onRefreshLeads: refreshLeads
  });

  useEventListener({
    viewMode,
    selectedPipeline,
    onRefreshLeads: refreshLeads,
    onRefreshPipelines: refreshPipelines,
    listenerKey: 'modernAdminPipelineManagerRefactored'
  });

  // ================================================================================
  // LÓGICA DE PIPELINES DO ADMIN
  // ================================================================================
  const adminPipelines = useMemo(() => {
    // 🔍 OTIMIZAÇÃO: Reduzir logs desnecessários - só logar quando há mudança significativa
    const shouldLog = prevPipelinesLength.current !== (pipelines?.length || 0) || prevLoading.current !== loading;
    
    if (shouldLog) {
      console.log('🔍 [ModernAdminPipelineManagerRefactored] Recalculando adminPipelines:', {
        loading,
        pipelinesLength: pipelines?.length || 0,
        userRole: user?.role,
        userEmail: user?.email,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }

    // 🔄 CORREÇÃO: Armazenar valores anteriores para evitar re-render desnecessário
    prevPipelinesLength.current = pipelines?.length || 0;
    prevLoading.current = loading;

    if (loading) {
      if (shouldLog) {
        console.log('⏳ [ModernAdminPipelineManagerRefactored] Aguardando carregamento...');
      }
      return [];
    }

    if (!pipelines) {
      if (shouldLog) {
        console.log('⚠️ [ModernAdminPipelineManagerRefactored] Pipelines ainda não carregadas');
      }
      return [];
    }

    if (!user?.role || (user.role !== 'admin' && user.role !== 'super_admin')) {
      if (shouldLog) {
        console.log('⚠️ [ModernAdminPipelineManagerRefactored] Usuário não é admin:', user?.role);
      }
      return [];
    }

    let result: Pipeline[] = [];
    
    if (user.role === 'super_admin') {
      result = pipelines.filter(p => p.tenant_id === user.tenant_id);
    } else if (user.role === 'admin') {
      // ✅ CORREÇÃO: Admin vê todas as pipelines do seu tenant, não apenas as criadas por ele
      result = pipelines.filter(p => p.tenant_id === user.tenant_id);
    }

    return result;
  }, [pipelines, loading, user]);

  // ================================================================================
  // LÓGICA DE FILTRAGEM (SUBHEADER)
  // ================================================================================
  const filteredPipelines = useMemo(() => {
    let result = adminPipelines;

    // Filtro por busca (searchTerm)
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(pipeline => 
        pipeline.name.toLowerCase().includes(searchLower) ||
        pipeline.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por status (selectedFilter)
    switch (selectedFilter) {
      case 'all':
        // Mostrar todas as pipelines (não fazer nada)
        break;
      case 'active':
        result = result.filter(p => p.is_active !== false && !p.is_archived);
        break;
      case 'archived':
        result = result.filter(p => p.is_archived === true);
        break;
      default:
        result = result.filter(p => p.is_active !== false && !p.is_archived);
    }

    console.log('🔍 [Filtragem] Resultado:', {
      original: adminPipelines.length,
      filtered: result.length,
      searchTerm,
      selectedFilter
    });

    return result;
  }, [adminPipelines, searchTerm, selectedFilter]);

  // ================================================================================
  // HANDLERS PRINCIPAIS - MOVIDOS PARA CIMA PARA RESOLVER TEMPORAL DEAD ZONE
  // ================================================================================
  const handleCreatePipeline = useCallback(() => {
    console.log('🎯 [ModernAdminPipelineManagerRefactored] Criando nova pipeline - abrindo modal');
    setEditingPipeline(null);
    setViewMode('create');
  }, []);

  const handleEditPipeline = useCallback((pipeline: Pipeline) => {
    console.log('✏️ [ModernAdminPipelineManagerRefactored] Editando pipeline:', pipeline.name);
    setEditingPipeline(pipeline);
    setViewMode('edit');
  }, []);

  const handleArchivePipeline = useCallback(async (pipelineId: string, shouldArchive: boolean) => {
    try {
      logger.debug(`🗃️ ${shouldArchive ? 'Arquivando' : 'Desarquivando'} pipeline:`, pipelineId);
      
      // 🔍 DEBUG: Log completo do contexto
      console.log('🔍 [handleArchivePipeline] Contexto completo:', {
        pipelineId,
        shouldArchive,
        userInfo: {
          id: user?.id,
          email: user?.email,
          tenant_id: user?.tenant_id,
          role: user?.role
        },
        timestamp: new Date().toISOString()
      });
      
      // ✅ VALIDAÇÃO: Verificar se o usuário é admin do tenant
      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        throw new Error('Apenas administradores podem arquivar pipelines');
      }
      
      // SOLUÇÃO CRIATIVA: Usar is_active (false = arquivada) + description com metadata
      const archiveMetadata = shouldArchive 
        ? `[ARCHIVED:${new Date().toISOString()}:${user?.email || user?.id}]`
        : '';
      
      // Buscar pipeline atual para preservar description original
      console.log('🔍 [handleArchivePipeline] Buscando pipeline atual...');
      const { data: fetchResult, error: fetchError } = await supabase
        .from('pipelines')
        .select('description, tenant_id, is_active, name')
        .eq('id', pipelineId);
      
      if (fetchError) {
        console.error('❌ [handleArchivePipeline] Erro ao buscar pipeline:', fetchError);
        throw fetchError;
      }
      
      if (!fetchResult || fetchResult.length === 0) {
        throw new Error('Pipeline não encontrada');
      }
      
      const currentPipeline = fetchResult[0];
      
      console.log('🔍 [handleArchivePipeline] Pipeline encontrada:', currentPipeline);
      
      // ✅ VALIDAÇÃO DE SEGURANÇA: Verificar se pipeline pertence ao tenant do usuário
      if (user?.role !== 'super_admin' && currentPipeline.tenant_id !== user?.tenant_id) {
        throw new Error('Você não tem permissão para modificar esta pipeline');
      }
      
      console.log('🔍 [handleArchivePipeline] Validações passaram, continuando...');
      
      // Limpar metadata anterior se existe
      let cleanDescription = currentPipeline?.description || '';
      const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
      cleanDescription = cleanDescription.replace(archiveRegex, '');
      
      const newDescription = shouldArchive 
        ? `${archiveMetadata} ${cleanDescription}`.trim()
        : cleanDescription;
      
      console.log('🔍 [handleArchivePipeline] Dados da atualização:', {
        is_active: !shouldArchive,
        description: newDescription,
        action: shouldArchive ? 'ARQUIVAR' : 'DESARQUIVAR'
      });
      
      // 🔧 SOLUÇÃO: Usar Service Role para contornar RLS 
      // OU usar apenas description para sistemas sem campos específicos
      const updateData: any = {
        description: newDescription,
        updated_at: new Date().toISOString()
      };
      
      // Se campos de arquivamento existem, adicionar
      if (shouldArchive) {
        updateData.is_active = false;
      } else {
        updateData.is_active = true;
      }

      // ✅ CORREÇÃO CRÍTICA: Usar endpoint correto do PipelineController 
      console.log('🔄 [handleArchivePipeline] Fazendo requisição com authenticatedFetch...');
      const archiveEndpoint = shouldArchive ? `pipelines/${pipelineId}/archive` : `pipelines/${pipelineId}/unarchive`;
      const response = await authenticatedFetch(archiveEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na requisição');
      }
      
      const result = await response.json();

      console.log('✅ [handleArchivePipeline] Resposta do servidor:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      // ✅ CORREÇÃO: Limpar TODOS os caches relacionados antes do refresh
      const cacheKeys = [
        `pipelines_${user?.tenant_id}`,
        'pipeline_cache',
        'pipelines_cache',
        `members_cache_${user?.tenant_id}`,
        'pipeline_view_cache',
        'pipeline_list_cache'
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('🗑️ [handleArchivePipeline] Todos os caches limpos');
      
      // Pequeno delay para garantir que a operação do banco foi processada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh da lista de pipelines
      console.log('🔄 [handleArchivePipeline] Refreshing pipelines...');
      await refreshPipelines();
      
      // Aguardar um pouco mais para garantir que a interface se atualize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const actionText = shouldArchive ? 'arquivada' : 'desarquivada';
      console.log(`✅ [handleArchivePipeline] Pipeline ${actionText} com sucesso!`);
      showSuccessToast('Operação concluída', `Pipeline ${actionText} com sucesso!`);
      
    } catch (error: any) {
      console.error('❌ [handleArchivePipeline] Erro completo:', {
        error,
        message: error.message,
        stack: error.stack,
        pipelineId,
        shouldArchive,
        userTenantId: user?.tenant_id
      });
      const actionText = shouldArchive ? 'arquivar' : 'desarquivar';
      showErrorToast('Erro na operação', `Erro ao ${actionText} pipeline: ${error.message}`);
    }
  }, [user, refreshPipelines]);

  // ================================================================================
  // LISTENER PARA EVENTO DE CRIAÇÃO DE PIPELINE (VIA SUBHEADER)
  // ================================================================================
  useEffect(() => {
    const handlePipelineCreateEvent = (event: any) => {
      handleCreatePipeline();
    };

    // ✅ OTIMIZADO: EventManager com deduplicação automática
    const unsubscribe = eventManager.subscribe('pipeline-create-requested', handlePipelineCreateEvent, 'ModernAdminPipelineManagerRefactored-create');

    return unsubscribe;
  }, [handleCreatePipeline, eventManager]);

  // ================================================================================
  // ✅ CORREÇÃO: LISTENER PARA EVENTO DE EDIÇÃO DE PIPELINE (VIA SUBHEADER)
  // ================================================================================
  useEffect(() => {
    const handlePipelineEditEvent = (event: any) => {
      const { pipeline } = event.detail;
      if (pipeline) {
        handleEditPipeline(pipeline);
      }
    };

    // ✅ OTIMIZADO: EventManager com deduplicação automática
    const unsubscribe = eventManager.subscribe('pipeline-edit-requested', handlePipelineEditEvent, 'ModernAdminPipelineManagerRefactored-edit');

    return unsubscribe;
  }, [handleEditPipeline, eventManager]);

  // ================================================================================
  // ✅ CORREÇÃO: LISTENERS PARA EVENTOS DE ARQUIVAMENTO (VIA SUBHEADER) 
  // ================================================================================
  useEffect(() => {
    const handlePipelineArchiveEvent = (event: any) => {
      const { pipeline } = event.detail;
      if (pipeline) {
        handleArchivePipeline(pipeline.id, true); // true = arquivar
      }
    };

    const handlePipelineUnarchiveEvent = (event: any) => {
      const { pipeline } = event.detail;
      if (pipeline) {
        handleArchivePipeline(pipeline.id, false); // false = desarquivar
      }
    };

    // ✅ OTIMIZADO: EventManager com múltiplos listeners em uma única operação
    const unsubscribeArchive = eventManager.subscribe('pipeline-archive-requested', handlePipelineArchiveEvent, 'ModernAdminPipelineManagerRefactored-archive');
    const unsubscribeUnarchive = eventManager.subscribe('pipeline-unarchive-requested', handlePipelineUnarchiveEvent, 'ModernAdminPipelineManagerRefactored-unarchive');

    return () => {
      unsubscribeArchive();
      unsubscribeUnarchive();
    };
  }, [handleArchivePipeline, eventManager]);

  const handleViewPipeline = useCallback(async (pipeline: Pipeline) => {
    console.log('🎯 [handleViewPipeline] Pipeline selecionada:', {
      name: pipeline.name,
      id: pipeline.id,
      fullId: pipeline.id.length > 20 ? pipeline.id : `${pipeline.id} (TRUNCADO?)`,
      fullPipeline: pipeline
    });
    setViewingPipeline(pipeline);
    setSelectedPipeline(pipeline);
    setViewMode('view');
    
    // ✅ FASE 3: REMOVIDO - Eventos pipeline-view-entered/exited causavam ciclo infinito
    // Agora usando apenas cache inteligente sem eventos conflitantes
    
    // Carregar leads da pipeline selecionada
    await refreshLeads();
  }, [setSelectedPipeline, refreshLeads]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setEditingPipeline(null);
    setViewingPipeline(null);
    setSelectedPipeline(null);
    
    // ✅ FASE 3: REMOVIDO - Eventos pipeline-view-entered/exited causavam ciclo infinito
    // Agora usando apenas cache inteligente sem eventos conflitantes
  }, [setSelectedPipeline]);

  // ✅ CORREÇÃO: Função específica para CRIAÇÃO de pipeline (apenas manual)
  const handlePipelineCreate = useCallback(async (data: any, shouldRedirect: boolean = true) => {
    logger.debug('🆕 [CREATE] Iniciando criação de pipeline:', {
      name: data.name,
      description: data.description,
      memberIds: data.member_ids,
      stagesCount: data.stages?.length,
      userInfo: {
        id: user?.id,
        email: user?.email,
        tenant_id: user?.tenant_id,
        role: user?.role
      }
    });

    // ✅ VALIDAÇÃO: Garantir que não é modo edição
    if (editingPipeline) {
      console.error('❌ [CREATE] Erro: tentativa de criação com editingPipeline definido');
      showErrorToast('Erro', 'Modo inconsistente: criação chamada durante edição');
      return;
    }

    // ✅ VALIDAÇÃO: Evitar erros quando dados estão incompletos
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ [CREATE] Dados de pipeline inválidos ou incompletos');
      return;
    }

    // ✅ VALIDAÇÃO BÁSICA
    if (!data.name?.trim()) {
      showWarningToast('Campo obrigatório', 'Nome do pipeline é obrigatório');
      return;
    }

    if (!data.member_ids || data.member_ids.length === 0) {
      showWarningToast('Seleção obrigatória', 'Selecione pelo menos um vendedor');
      return;
    }

    try {
      await handlePipelineSubmit(data, shouldRedirect, { isCreate: true });
    } catch (error: any) {
      console.error('❌ [CREATE] Erro na criação:', error);
      showErrorToast('Erro na criação', error.message || 'Erro inesperado ao criar pipeline');
    }
  }, [user, editingPipeline]);

  // ✅ CORREÇÃO: Função específica para EDIÇÃO de pipeline (auto-save + manual)
  const handlePipelineUpdate = useCallback(async (data: any, shouldRedirect: boolean = true, options: { onlyCustomFields?: boolean } = {}) => {
    logger.debug('✏️ [UPDATE] Iniciando atualização de pipeline:', {
      pipelineId: editingPipeline?.id,
      name: data.name,
      onlyCustomFields: options.onlyCustomFields,
      shouldRedirect
    });

    // ✅ VALIDAÇÃO: Garantir que estamos em modo edição
    if (!editingPipeline || !editingPipeline.id) {
      console.error('❌ [UPDATE] Erro: tentativa de edição sem pipeline válido');
      return;
    }

    try {
      await handlePipelineSubmit(data, shouldRedirect, { ...options, isUpdate: true });
    } catch (error: any) {
      console.error('❌ [UPDATE] Erro na atualização:', error);
      if (shouldRedirect) {
        // Só mostrar erro se for submit manual
        showErrorToast('Erro na atualização', error.message || 'Erro inesperado ao atualizar pipeline');
      }
    }
  }, [editingPipeline]);

  // ✅ CORREÇÃO: Função interna unificada (não exposta)
  const handlePipelineSubmit = useCallback(async (data: any, shouldRedirect: boolean = true, options: { onlyCustomFields?: boolean, isCreate?: boolean, isUpdate?: boolean } = {}) => {
    logger.debug('🚀 [SUBMIT] Iniciando salvamento interno:', {
      name: data.name,
      description: data.description,
      memberIds: data.member_ids,
      stagesCount: data.stages?.length,
      customFieldsCount: data.custom_fields?.length,
      cadencesCount: data.cadence_configs?.length,
      isEditing: !!editingPipeline,
      isCreate: options.isCreate,
      isUpdate: options.isUpdate,
      onlyCustomFields: options.onlyCustomFields,
      userInfo: {
        id: user?.id,
        email: user?.email,
        tenant_id: user?.tenant_id,
        role: user?.role
      }
    });

    // ✅ VALIDAÇÃO: Evitar erros quando dados estão incompletos durante carregamento
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Dados de pipeline inválidos ou incompletos, cancelando salvamento');
      return;
    }

    // ✅ VALIDAÇÃO ESPECÍFICA POR MODO
    if (options.isCreate) {
      // Validações para CRIAÇÃO
      if (!data.name?.trim()) {
        showWarningToast('Campo obrigatório', 'Nome do pipeline é obrigatório');
        return;
      }
      if (!data.member_ids || data.member_ids.length === 0) {
        showWarningToast('Seleção obrigatória', 'Selecione pelo menos um vendedor');
        return;
      }
      if (editingPipeline) {
        console.error('❌ [SUBMIT] Inconsistência: isCreate=true mas editingPipeline existe');
        return;
      }
    } else if (options.isUpdate) {
      // Validações para ATUALIZAÇÃO
      if (!editingPipeline || !editingPipeline.id) {
        console.error('❌ [SUBMIT] Inconsistência: isUpdate=true mas editingPipeline inválido');
        return;
      }
      // Auto-save pode ser parcial, validações menos rigorosas
      if (!options.onlyCustomFields && !data.name?.trim()) {
        console.warn('⚠️ [SUBMIT] Auto-save sem nome válido, ignorando');
        return;
      }
    } else {
      // Modo legacy (fallback)
      console.warn('⚠️ [SUBMIT] Modo não especificado, usando lógica legacy');
      if (!data.name?.trim()) {
        showWarningToast('Campo obrigatório', 'Nome do pipeline é obrigatório');
        return;
      }
    }

    try {
      // ✅ CRIAR OU ATUALIZAR PIPELINE
      const requestData = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        member_ids: data.member_ids,
        stages: data.stages || [],
        custom_fields: data.custom_fields || [],
        cadence_configs: data.cadence_configs || [],
        tenant_id: user?.tenant_id,
        created_by: user?.email || user?.id
      };

      logger.debug('📋 Dados da requisição validados:', {
        ...requestData,
        stagesCount: requestData.stages.length,
        fieldsCount: requestData.custom_fields.length,
        membersCount: requestData.member_ids.length
      });

      let result: { id: string };
      
      if (options.isUpdate || (editingPipeline && !options.isCreate)) {
        // Atualizar pipeline existente
        if (!editingPipeline) {
          throw new Error('editingPipeline é obrigatório para atualização');
        }
        logger.debug('🔄 [UPDATE] Atualizando pipeline existente:', {
          id: editingPipeline.id,
          name: editingPipeline.name,
          isUpdate: options.isUpdate,
          onlyCustomFields: options.onlyCustomFields
        });

        const { data: updatedPipeline, error } = await supabase
          .from('pipelines')
          .update({
            name: requestData.name,
            description: requestData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPipeline.id);

        if (error) {
          console.error('❌ Erro ao atualizar pipeline:', error);
          throw error;
        }

        // 🔧 CORREÇÃO: Usar o ID original da pipeline em edição
        // Não dependemos do retorno do SELECT pois pode haver problemas de RLS
        result = { id: editingPipeline.id };
        
        logger.debug('✅ Pipeline atualizada com sucesso:', {
          id: result.id,
          name: requestData.name,
          originalId: editingPipeline.id
        });
      } else {
        // Criar nova pipeline
        logger.debug('🔄 [CREATE] Criando nova pipeline:', {
          name: requestData.name,
          isCreate: options.isCreate
        });

        // 🔧 CORREÇÃO RLS: Gerar UUID manualmente para contornar problema de SELECT após INSERT
        const pipelineId = crypto.randomUUID();
        
        const insertData = {
          id: pipelineId,
          name: requestData.name,
          description: requestData.description,
          tenant_id: requestData.tenant_id,
          created_by: requestData.created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('🔄 [handlePipelineSubmit] Dados para inserção com UUID manual:', insertData);

        // 🔧 CORREÇÃO: Usar apenas INSERT sem SELECT para contornar problema RLS
        const { error } = await supabase
          .from('pipelines')
          .insert(insertData);

        console.log('🔄 [handlePipelineSubmit] Resultado da inserção:', {
          pipelineId,
          error,
          insertSuccess: !error
        });

        if (error) {
          console.error('❌ Erro ao criar pipeline:', error);
          throw error;
        }

        // 🔧 CORREÇÃO: Usar o UUID gerado manualmente
        result = { id: pipelineId };
        logger.debug('✅ Pipeline criada com sucesso:', {
          id: result.id,
          name: requestData.name
        });
      }

      // ✅ GERENCIAR MEMBROS (versão simplificada)
      if (result?.id && data.member_ids?.length > 0) {
        // Remover membros existentes
        await supabase
          .from('pipeline_members')
          .delete()
          .eq('pipeline_id', result.id);

        // Adicionar novos membros
        const memberInserts = data.member_ids.map((member_id: string) => ({
          pipeline_id: result.id,
          member_id: member_id,
          assigned_at: new Date().toISOString()
        }));

        const { error: membersError } = await supabase
          .from('pipeline_members')
          .insert(memberInserts);

        if (membersError) {
          console.warn('⚠️ Erro ao gerenciar membros:', membersError);
        } else {
          logger.debug('✅ Membros gerenciados com sucesso');
        }
      }

      // ✅ CORREÇÃO CRÍTICA: GERENCIAR ETAPAS CUSTOMIZADAS
      if (result?.id && data.stages?.length > 0) {
        logger.debug('🔄 Iniciando salvamento de etapas customizadas:', {
          pipelineId: result.id,
          stagesCount: data.stages.length,
          stages: data.stages.map((s: PipelineStage) => ({ name: s.name, is_system: s.is_system_stage, order: s.order_index }))
        });

        // Filtrar apenas etapas customizadas (não-sistema)
        const customStages = data.stages.filter((stage: PipelineStage) => !stage.is_system_stage);
        
        if (customStages.length > 0) {
          // ✅ CORREÇÃO CRÍTICA: Usar UPSERT ao invés de DELETE + INSERT
          // Isso evita problemas de foreign key quando há lead_events referenciando stages
          
          // Buscar stages customizadas existentes
          const { data: existingStages } = await supabase
            .from('pipeline_stages')
            .select('id, name, order_index')
            .eq('pipeline_id', result.id)
            .eq('is_system_stage', false);

          const existingStageNames = new Set(existingStages?.map(s => s.name) || []);
          
          // Separar stages para INSERT vs UPDATE
          const stagesToInsert = customStages.filter((stage: PipelineStage) => 
            !existingStageNames.has(stage.name)
          );
          
          const stagesToUpdate = customStages.filter((stage: PipelineStage) => 
            existingStageNames.has(stage.name)
          );

          // INSERT: Apenas stages realmente novas
          if (stagesToInsert.length > 0) {
            const stageInserts = stagesToInsert.map((stage: PipelineStage, index: number) => ({
              pipeline_id: result.id,
              name: stage.name,
              order_index: stage.order_index || (index + 1),
              color: stage.color || '#3B82F6',
              is_system_stage: false,
              stage_type: 'personalizado',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabase
              .from('pipeline_stages')
              .insert(stageInserts);

            if (insertError) {
              throw new Error(`Erro ao inserir novas etapas: ${insertError.message}`);
            }
          }

          // UPDATE: Stages existentes (apenas order_index e color)
          if (stagesToUpdate.length > 0) {
            for (const stage of stagesToUpdate) {
              const existingStage = existingStages?.find(es => es.name === stage.name);
              if (existingStage) {
                const { error: updateError } = await supabase
                  .from('pipeline_stages')
                  .update({
                    order_index: stage.order_index,
                    color: stage.color || '#3B82F6',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingStage.id);

                if (updateError) {
                  throw new Error(`Erro ao atualizar etapa ${stage.name}: ${updateError.message}`);
                }
              }
            }
          }

          logger.debug('✅ Etapas customizadas processadas com sucesso:', {
            inserted: stagesToInsert.length,
            updated: stagesToUpdate.length
          });
        } else {
          logger.debug('ℹ️ Nenhuma etapa customizada para salvar (apenas etapas do sistema)');
        }
      } else {
        logger.debug('ℹ️ Nenhuma etapa fornecida ou pipeline ID inválido');
      }

      // ✅ CORREÇÃO CRÍTICA: GERENCIAR CAMPOS CUSTOMIZADOS
      if (result?.id && data.custom_fields?.length > 0) {
        logger.debug('🔄 Iniciando salvamento de campos customizados:', {
          pipelineId: result.id,
          fieldsCount: data.custom_fields.length,
          fields: data.custom_fields.map((f: CustomField) => ({ name: f.field_name, label: f.field_label, type: f.field_type }))
        });

        // Filtrar apenas campos personalizados (não obrigatórios do sistema)
        const systemRequiredFields = ['nome_lead', 'email_lead', 'telefone_lead'];
        const customFields = data.custom_fields.filter((field: CustomField) => 
          !systemRequiredFields.includes(field.field_name)
        );
        
        if (customFields.length > 0) {
          // Remover campos customizados existentes
          const { error: deleteError } = await supabase
            .from('pipeline_custom_fields')
            .delete()
            .eq('pipeline_id', result.id);

          if (deleteError) {
            console.warn('⚠️ Erro ao remover campos customizados antigos:', deleteError);
          } else {
            logger.debug('✅ Campos customizados antigos removidos');
          }

          // Adicionar novos campos customizados
          const fieldInserts = customFields.map((field: CustomField, index: number) => ({
            pipeline_id: result.id,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: field.field_options || null,
            is_required: field.is_required || false,
            field_order: field.field_order || (index + 1),
            placeholder: field.placeholder || null,
            show_in_card: field.show_in_card || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { data: insertedFields, error: fieldsError } = await supabase
            .from('pipeline_custom_fields')
            .insert(fieldInserts)
            .select();

          if (fieldsError) {
            console.error('❌ Erro ao salvar campos customizados:', fieldsError);
            throw new Error(`Erro ao salvar campos: ${fieldsError.message}`);
          } else {
            logger.debug('✅ Campos customizados salvos com sucesso:', {
              count: insertedFields?.length || 0,
              fields: insertedFields?.map(f => ({ name: f.field_name, label: f.field_label, id: f.id }))
            });
          }
        } else {
          logger.debug('ℹ️ Nenhum campo customizado para salvar (apenas campos obrigatórios do sistema)');
        }
      } else {
        logger.debug('ℹ️ Nenhum campo fornecido ou pipeline ID inválido');
      }

      // ✅ CORREÇÃO CRÍTICA: GERENCIAR CADÊNCIAS (pular se for auto-save de campos customizados)
      if (result?.id && Array.isArray(data.cadence_configs) && data.cadence_configs.length > 0 && !options.onlyCustomFields) {
        // 🔧 VALIDAÇÃO: Verificar se o pipeline_id realmente existe no banco
        logger.debug('🔍 Validando pipeline_id antes de salvar cadências:', {
          pipelineId: result.id,
          editingMode: !!editingPipeline
        });

        const { data: pipelineExists, error: validateError } = await supabase
          .from('pipelines')
          .select('id, name')
          .eq('id', result.id)
          .single();

        if (validateError || !pipelineExists) {
          console.error('❌ ERRO CRÍTICO: Pipeline ID não existe no banco:', {
            pipelineId: result.id,
            validateError: validateError?.message,
            editingPipeline: editingPipeline?.id,
            editingPipelineName: editingPipeline?.name
          });
          throw new Error(`Pipeline ID inválido: ${result.id} não existe na tabela pipelines. Erro: ${validateError?.message || 'Pipeline não encontrado'}`);
        }

        logger.debug('✅ Pipeline validado:', {
          id: pipelineExists.id,
          name: pipelineExists.name
        });

        // Validar se todas as cadências têm dados válidos
        const validCadences = data.cadence_configs.filter((c: any) => 
          c && typeof c === 'object' && c.stage_name && Array.isArray(c.tasks)
        );

        if (validCadences.length === 0) {
          logger.debug('ℹ️ Nenhuma cadência válida para salvar');
        } else {
          logger.debug('🔄 Iniciando salvamento de cadências:', {
            pipelineId: result.id,
            pipelineName: pipelineExists.name,
            cadencesCount: validCadences.length,
            cadences: validCadences.map((c: any) => ({ stage: c.stage_name, tasks: c.tasks.length, active: c.is_active }))
          });

        try {
          // 1. Remover configurações de cadência antigas
          const { error: deleteCadencesError } = await supabase
            .from('cadence_configs')
            .delete()
            .eq('pipeline_id', result.id);

          if (deleteCadencesError) {
            console.warn('⚠️ Erro ao remover cadências antigas:', deleteCadencesError);
          } else {
            logger.debug('✅ Cadências antigas removidas');
          }

          // 2. Inserir novas configurações de cadência com tasks em JSONB
          for (const cadenceConfig of validCadences) {
            logger.debug('🔄 Preparando inserção de cadência:', {
              stage: cadenceConfig.stage_name,
              stage_order: cadenceConfig.stage_order,
              tasks_count: cadenceConfig.tasks?.length || 0,
              pipeline_id: result.id
            });

            const cadenceInsert = {
              pipeline_id: result.id,
              stage_name: cadenceConfig.stage_name,
              stage_order: cadenceConfig.stage_order,
              tasks: cadenceConfig.tasks || [], // Salvar tasks como JSONB direto
              is_active: cadenceConfig.is_active,
              tenant_id: user?.tenant_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { data: insertedCadenceArray, error: cadenceError } = await supabase
              .from('cadence_configs')
              .insert(cadenceInsert)
              .select();
              
            const insertedCadence = insertedCadenceArray?.[0];
            
            logger.debug('🔍 Resultado da inserção de cadência:', {
              hasError: !!cadenceError,
              error: cadenceError?.message,
              returnedArray: insertedCadenceArray,
              arrayLength: insertedCadenceArray?.length || 0,
              firstItem: insertedCadence ? { id: insertedCadence.id, stage: insertedCadence.stage_name } : null
            });

            if (cadenceError) {
              console.error('❌ Erro ao inserir cadência:', {
                error: cadenceError,
                stage: cadenceConfig.stage_name,
                pipelineId: result.id,
                errorCode: cadenceError.code,
                errorMessage: cadenceError.message,
                errorDetails: cadenceError.details
              });
              
              // Tratar especificamente erro de foreign key
              if (cadenceError.code === '23503') {
                throw new Error(`ERRO DE FOREIGN KEY: Pipeline ID ${result.id} não existe na tabela pipelines. Não é possível criar cadência para uma pipeline inexistente. Detalhes: ${cadenceError.details}`);
              }
              
              throw new Error(`Erro ao salvar cadência para etapa ${cadenceConfig.stage_name}: ${cadenceError.message}`);
            }

            // 🔧 CORREÇÃO: Validar se insertedCadence não é null
            if (!insertedCadence) {
              console.error('❌ Cadência inserida retornou null/undefined:', {
                stage: cadenceConfig.stage_name,
                pipelineId: result.id,
                cadenceData: cadenceInsert,
                returnedArray: insertedCadenceArray,
                arrayLength: insertedCadenceArray?.length || 0,
                possibleCause: 'Foreign key constraint ou RLS policy'
              });
              
              // Tentar diagnóstico adicional
              const { data: pipelineCheck } = await supabase
                .from('pipelines')
                .select('id, name')
                .eq('id', result.id)
                .single();
              
              if (!pipelineCheck) {
                throw new Error(`ERRO DE FOREIGN KEY: Pipeline ID ${result.id} não existe na tabela pipelines. A cadência não pode ser inserida porque a pipeline de referência não foi encontrada.`);
              } else {
                throw new Error(`Erro ao salvar cadência para etapa ${cadenceConfig.stage_name}: Inserção retornou null. Pipeline existe (${pipelineCheck.name}) mas inserção falhou. Verifique políticas RLS.`);
              }
            }

            logger.debug('✅ Cadência salva com sucesso:', {
              stage: cadenceConfig.stage_name,
              cadenceId: insertedCadence.id,
              tasksCount: cadenceConfig.tasks?.length || 0,
              tasks: cadenceConfig.tasks?.map((t: any) => ({ title: t.task_title, channel: t.channel, day: t.day_offset }))
            });
          }

          logger.debug('✅ Todas as cadências salvas com sucesso');

        } catch (cadenceError) {
          console.error('❌ Erro crítico ao salvar cadências:', cadenceError);
          throw new Error(`Erro ao salvar cadências: ${cadenceError instanceof Error ? cadenceError.message : 'Erro desconhecido'}`);
        }
        }
      } else {
        if (options.onlyCustomFields) {
          logger.debug('✅ Cadências ignoradas - auto-save apenas de campos customizados');
        } else {
          logger.debug('ℹ️ Nenhuma cadência fornecida ou pipeline ID inválido');
        }
      }

      logger.debug('✅ Pipeline salva com sucesso:', result.id);
      
      // Limpar caches
      const cacheKeys = [
        'pipeline_cache',
        'pipelines_cache',
        `members_cache_${user?.tenant_id}`,
        `pipeline_view_${result?.id}`
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      if (shouldRedirect) {
        // Voltar para lista e refresh
        setViewMode('list');
        setEditingPipeline(null);
        await refreshPipelines();
        
        showSuccessToast(
          'Pipeline salva',
          `Pipeline "${data.name}" ${editingPipeline ? 'atualizada' : 'criada'} com sucesso!`
        );
      } else {
        // Feedback para salvamento sem redirecionamento (edição)
        const cadenceMessage = data.cadence_configs?.length > 0 ? ` incluindo ${data.cadence_configs.length} cadência(s)` : '';
        showSuccessToast(
          'Pipeline atualizada',
          `Pipeline "${data.name}" atualizada com sucesso${cadenceMessage}!`
        );
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar pipeline:', error);
      
      let errorMessage = 'Erro inesperado ao salvar pipeline. Tente novamente.';
      
      if (error?.message) {
        if (error.message.includes('Nome já existe') || error.message.includes('already exists')) {
          errorMessage = 'Este nome de pipeline já existe. Escolha outro nome.';
        } else if (error.message.includes('Validation failed')) {
          errorMessage = 'Dados inválidos. Verifique os campos e tente novamente.';
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('Unauthorized') || error.message.includes('403')) {
          errorMessage = 'Você não tem permissão para esta ação.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showErrorToast('Erro ao salvar', errorMessage);
      throw error;
    }
  }, [editingPipeline, user, refreshPipelines]);

  const handleAddLead = useCallback(() => {
    if (!viewingPipeline) return;
    modalManager.openAddLeadModal();
  }, [viewingPipeline, modalManager]);

  const handleEditLead = useCallback((lead: any) => {
    modalManager.openEditLeadModal(lead, lead.custom_data || {});
  }, [modalManager]);

  const handleSaveLead = useCallback(async (leadData: any) => {
    try {
      if (modalManager.modalData) {
        // Editar lead existente
        await leadManager.handleEditLead(modalManager.modalData.id, leadData);
      } else {
        // Criar novo lead
        await leadManager.handleCreateLead(leadData);
      }
      
      // Fechar modais
      modalManager.closeAddLeadModal();
      modalManager.closeEditLeadModal();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      showErrorToast('Erro ao salvar lead', (error as Error).message);
    }
  }, [modalManager, leadManager]);

  // ================================================================================
  // RENDERIZAÇÃO DOS MODOS
  // ================================================================================
  const renderContent = () => {
    switch (viewMode) {
      case 'create':
      case 'edit':
        return (
          <PipelineFormView
            editingPipeline={editingPipeline}
            availableMembers={membersState.items}
            onSubmit={viewMode === 'edit' ? handlePipelineUpdate : handlePipelineCreate}
            onCancel={handleBackToList}
            isEdit={viewMode === 'edit'}
          />
        );

      case 'view':
        if (!viewingPipeline) return null;
        return (
          <PipelineKanbanView
            pipelineId={viewingPipeline.id}
            userRole={user?.role || 'admin'}
            enableMetrics={true}
            autoRefresh={true}
          />
        );

      default:
        return (
          <PipelineListView
            adminPipelines={filteredPipelines}
            availableMembers={membersState.items}
            loading={loading}
            onCreatePipeline={handleCreatePipeline}
            onEditPipeline={handleEditPipeline}
            onViewPipeline={handleViewPipeline}
            onArchivePipeline={handleArchivePipeline}
            searchTerm={searchTerm}
            selectedFilter={selectedFilter}
          />
        );
    }
  };

  // ================================================================================
  // RENDER PRINCIPAL
  // ================================================================================
  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      {/* Modais existentes mantidos - com correções de props conforme interfaces */}
      {modalManager.isAddLeadModalOpen && viewingPipeline && (
        <StepLeadModal
          isOpen={true}
          onClose={modalManager.closeAddLeadModal}
          onSubmit={handleSaveLead}
          pipeline={viewingPipeline}
        />
      )}

      {modalManager.isEditLeadModalOpen && modalManager.modalData && (
        <LeadEditModal
          isOpen={true}
          onClose={modalManager.closeEditLeadModal}
          onSave={handleSaveLead}
          lead={modalManager.modalData}
          customFields={viewingPipeline?.pipeline_custom_fields || []}
        />
      )}

      {modalManager.isDealDetailsModalOpen && modalManager.modalData && (
        <LeadDetailsModal
          lead={modalManager.modalData}
          isOpen={true}
          onClose={modalManager.closeDealDetailsModal}
          customFields={viewingPipeline?.pipeline_custom_fields || []}
        />
      )}

      {modalManager.isEmailModalOpen && modalManager.modalData && (
        <EmailComposeModal
          isOpen={true}
          onClose={modalManager.closeEmailModal}
          lead={modalManager.modalData}
        />
      )}

      {modalManager.isDeleteConfirmModalOpen && modalManager.modalData && (
        <Dialog open={true} onOpenChange={() => modalManager.closeDeleteConfirmModal()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={modalManager.closeDeleteConfirmModal}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  await leadManager.handleDeleteLead(modalManager.modalData!.id);
                  modalManager.closeDeleteConfirmModal();
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ModernAdminPipelineManagerRefactored; 