import React, { Suspense, useEffect, useState, lazy, useRef, useCallback } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { usePipelineData } from '../../hooks/usePipelineData';
import { usePipelineCache } from '../../hooks/usePipelineCache'; // ✅ FASE 2: Import cache inteligente
import { useMembers } from '../../hooks/useMembers';
import { PipelineErrorBoundary } from '../ErrorBoundaries';
import { Pipeline, Lead } from '../../types/Pipeline';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { useAutoCleanupEventManager } from '../../services/EventManager';
// ✅ FASE 2: Import enterprise-grade mutation hook
import { useArchivePipelineMutation } from '../../hooks/useArchivePipelineMutation';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../../lib/queryKeys';
import { api } from '../../lib/api';

// Lazy loading dos componentes principais
// ModernAdminPipelineManagerRefactored removido - usando PipelineKanbanView como substituto
const PipelineKanbanView = lazy(() => import('./PipelineKanbanView'));

// Import para modal de edição
const PipelineModal = lazy(() => import('./PipelineModal'));
const LeadDetailsModal = lazy(() => import('./LeadDetailsModal'));
const StepLeadModal = lazy(() => import('./StepLeadModal'));

interface UnifiedPipelineManagerProps {
  className?: string;
  searchTerm?: string;
  selectedFilter?: 'all' | 'active' | 'archived';
  // ✅ CORREÇÃO: Props de cache para eliminar duplo carregamento
  selectedPipeline?: any;
  onPipelineChange?: (pipeline: any) => void;
  cacheLoading?: boolean;
}

/**
 * Componente unificado de gerenciamento de Pipeline
 * Detecta automaticamente o role do usuário e renderiza a interface apropriada
 * 
 * - Admin/Super Admin: Interface administrativa completa (CRUD de pipelines)
 * - Member: Interface operacional (visualização e trabalho com leads)
 */
const UnifiedPipelineManager: React.FC<UnifiedPipelineManagerProps> = ({ 
  className = '', 
  searchTerm = '', 
  selectedFilter = 'active',
  // ✅ CORREÇÃO: Props de cache (opcionais para compatibilidade)
  selectedPipeline,
  onPipelineChange,
  cacheLoading = false
}) => {
  const { user } = useAuth();
  const { 
    pipelines: allPipelines, 
    loading, 
    refreshPipelines,
    getUserPipelines,
    getAdminCreatedPipelines,
    getMemberLinkedPipelines 
  } = usePipelineData();
  const { members } = useMembers();
  
  // ✅ CORREÇÃO: Log otimizado para evitar spam no console
  if (process.env.NODE_ENV === 'development' && members && Math.random() < 0.05) {
    console.log('🔍 [UnifiedPipelineManager] Hook useMembers resultado:', {
      membersLength: members?.length || 0,
      membersData: members?.slice(0, 5).map(m => ({ 
        id: m.id, 
        name: `${m.first_name} ${m.last_name}`, 
        role: m.role,
        is_active: m.is_active,
        tenant_id: m.tenant_id 
      })) || [],
      userTenant: user?.tenant_id
    });
  }
  
  const queryClient = useQueryClient();
  
  // ✅ FASE 2: Enterprise-grade mutation hook
  const archiveMutation = useArchivePipelineMutation();
  
  // ✅ OTIMIZAÇÃO: EventManager centralizado com auto-cleanup
  const eventManager = useAutoCleanupEventManager('UnifiedPipelineManager');
  
  // Estados para controlar modais de edição e criação
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // ✅ PROTEÇÃO ADICIONAL: Flag para prevenir fechamento indevido
  const [isAutoSaveInProgress, setIsAutoSaveInProgress] = useState(false);
  // 🚀 NOVA FUNCIONALIDADE: Estado de loading para duplicação
  const [duplicatingPipelineId, setDuplicatingPipelineId] = useState<string | null>(null);
  
  // ✅ CORREÇÃO: Estados para LeadDetailsModal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  
  // ✅ NOVO: Estados para StepLeadModal (Nova Oportunidade)
  const [showStepLeadModal, setShowStepLeadModal] = useState(false);
  const [selectedPipelineForLead, setSelectedPipelineForLead] = useState<Pipeline | null>(null);

  // Determinar interface baseada no role (MOVIDO PARA CIMA)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isMember = user?.role === 'member';
  
  // ✅ CONTROLE DE PERMISSÕES: Filtrar pipelines baseado no role
  const pipelines = React.useMemo(() => {
    if (isAdmin) {
      return getAdminCreatedPipelines();
    } else if (isMember) {
      return getMemberLinkedPipelines();
    }
    return getUserPipelines();
  }, [isAdmin, isMember, getAdminCreatedPipelines, getMemberLinkedPipelines, getUserPipelines]);

  // ================================================================================
  // HANDLERS PARA EDIÇÃO E ARQUIVAMENTO DE PIPELINE (UNIFICADOS)
  // ================================================================================
  
  const handleCreatePipeline = useCallback(() => {
    // ✅ CONTROLE DE PERMISSÕES: Apenas admin pode criar pipelines
    if (!isAdmin) {
      showErrorToast('Acesso negado', 'Apenas administradores podem criar pipelines');
      return;
    }
    console.log('➕ [UnifiedPipelineManager] Abrindo modal de criação');
    setEditingPipeline(null);
    setShowCreateModal(true);
  }, [isAdmin]);

  const handleEditPipeline = useCallback((pipeline: Pipeline) => {
    // ✅ CONTROLE DE PERMISSÕES: Admin pode editar, member só pode visualizar
    console.log(`✏️ [UnifiedPipelineManager] ${isAdmin ? 'Editando' : 'Visualizando'} pipeline:`, pipeline.name);
    setEditingPipeline(pipeline);
    setShowEditModal(true);
  }, [isAdmin]);

  const handleDuplicatePipeline = useCallback(async (pipeline: Pipeline) => {
    try {
      console.log('🔄 [UnifiedPipelineManager] Duplicando pipeline:', pipeline.name);
      
      // Validação de permissão
      if (!isAdmin) {
        showErrorToast('Acesso negado', 'Apenas administradores podem duplicar pipelines');
        return;
      }

      if (!pipeline?.id || !user?.tenant_id) {
        showErrorToast('Erro de validação', 'Pipeline não encontrada para duplicação');
        return;
      }

      // 🚀 INICIAR loading state
      setDuplicatingPipelineId(pipeline.id);

      // ✅ CANCELAR queries em andamento para evitar race conditions
      await queryClient.cancelQueries({ queryKey: QueryKeys.pipelines.byTenant(user.tenant_id) });

      const response = await api.post(`/pipelines/${pipeline.id}/duplicate`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro desconhecido');
      }

      // 🎯 TOAST DE SUCESSO DETALHADO
      showSuccessToast(
        '🎉 Pipeline duplicada com sucesso!', 
        `"${pipeline.name}" foi duplicada como "${response.data.pipeline.name}"`
      );

      // Atualizar lista de pipelines
      await refreshPipelines();
      
      // 🔄 CORREÇÃO PONTUAL: Notificar AppDashboard sobre nova pipeline via evento
      console.log('🔄 [CORREÇÃO-DROPDOWN] Notificando AppDashboard sobre pipeline duplicada');
      window.dispatchEvent(new CustomEvent('pipeline-duplicated', {
        detail: {
          pipeline: response.data.pipeline,
          timestamp: new Date().toISOString(),
          source: 'pipeline-duplication'
        }
      }));
      
      // 🚀 NAVEGAÇÃO AUTOMÁTICA: Abrir modal da pipeline duplicada
      console.log('✅ [UnifiedPipelineManager] Abrindo modal da pipeline duplicada:', response.data.pipeline.name);
      setEditingPipeline(response.data.pipeline);
      setShowEditModal(true);
      
      console.log('✅ [UnifiedPipelineManager] Pipeline duplicada com sucesso:', response.data.pipeline?.name);
      
    } catch (error: any) {
      console.error('❌ [UnifiedPipelineManager] Erro ao duplicar pipeline:', error);
      showErrorToast('Erro na duplicação', `Não foi possível duplicar a pipeline: ${error.message}`);
    } finally {
      // 🚀 FINALIZAR loading state
      setDuplicatingPipelineId(null);
    }
  }, [isAdmin, user?.tenant_id, refreshPipelines, queryClient]);

  // ✅ FASE 2: ENTERPRISE-GRADE Archive Handler
  const handleArchivePipeline = useCallback(async (pipelineId: string, shouldArchive: boolean = true) => {
    console.log(`🚀 [ENTERPRISE] ${shouldArchive ? 'Arquivando' : 'Desarquivando'} pipeline com UX moderna:`, {
      pipelineId: pipelineId.substring(0, 8),
      shouldArchive,
      hasPermission: isAdmin,
      optimisticEnabled: true
    });
    
    // ✅ VALIDAÇÃO: Apenas admins podem arquivar
    if (!isAdmin) {
      showErrorToast('Acesso negado', 'Apenas administradores podem arquivar pipelines');
      return;
    }

    // ✅ ENCONTRAR pipeline para passar contexto ao mutation
    const targetPipeline = pipelines.find(p => p.id === pipelineId);
    const pipelineName = targetPipeline?.name || 'Pipeline';

    // ✅ OPTIMISTIC UPDATE: Modal aberto deve ser atualizado instantaneamente
    if (editingPipeline?.id === pipelineId) {
      const optimisticUpdate = {
        ...editingPipeline,
        is_archived: shouldArchive,
        archived_at: shouldArchive ? new Date().toISOString() : null,
        is_active: !shouldArchive
      };
      
      setEditingPipeline(optimisticUpdate);
      
      console.log(`⚡ [MODAL-OPTIMISTIC] Modal atualizado instantaneamente:`, {
        pipelineId: pipelineId.substring(0, 8),
        newState: { is_archived: shouldArchive, is_active: !shouldArchive }
      });
    }

    // ✅ EXECUTAR mutation enterprise-grade com optimistic updates
    archiveMutation.mutate({
      pipelineId,
      shouldArchive,
      pipelineName
    });
    
    console.log(`🎯 [ENTERPRISE] Mutation executada - UI já atualizada via optimistic update`);
  }, [isAdmin, pipelines, editingPipeline, setEditingPipeline, archiveMutation]);

  const handleUnarchivePipeline = useCallback(async (pipelineId: string) => {
    return handleArchivePipeline(pipelineId, false);
  }, [handleArchivePipeline]);

  // ✅ CORREÇÃO: Handler para abrir LeadDetailsModal
  const handleViewDetails = useCallback((lead: Lead) => {
    console.log('📋 [UnifiedPipelineManager] Abrindo LeadDetailsModal para:', lead.first_name + ' ' + lead.last_name);
    setSelectedLead(lead);
    setShowLeadModal(true);
  }, []);

  // ✅ CORREÇÃO CRÍTICA: Memoizar funções onClose para evitar loops infinitos
  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    // ✅ PROTEÇÃO: Não fechar durante autosave
    if (isAutoSaveInProgress) {
      console.warn('⚠️ [UnifiedPipelineManager] BLOQUEADO: Tentativa de fechar modal via onClose durante autosave');
      return;
    }
    setShowEditModal(false);
    setEditingPipeline(null);
  }, [isAutoSaveInProgress]);

  const handlePipelineCreate = useCallback(async (pipelineData: any) => {
    try {
      console.log('💾 [UnifiedPipelineManager] Criando nova pipeline:', pipelineData);
      
      // ✅ CANCELAR queries em andamento para evitar race conditions
      await queryClient.cancelQueries({ queryKey: QueryKeys.pipelines.byTenant(user?.tenant_id!) });
      
      const response = await api.post('/pipelines', {
        ...pipelineData,
        tenant_id: user?.tenant_id
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro desconhecido');
      }

      // ✅ OTIMIZADO: Cache invalidation adequado do TanStack Query
      queryClient.invalidateQueries({ queryKey: QueryKeys.pipelines.byTenant(user?.tenant_id!) });
      
      // Fechar modal e refresh direto
      setShowCreateModal(false);
      await refreshPipelines();
      
      showSuccessToast('Sucesso', 'Pipeline criada com sucesso!');
      
    } catch (error: any) {
      console.error('❌ [UnifiedPipelineManager] Erro ao criar pipeline:', error);
      showErrorToast('Erro ao criar', `Erro ao criar pipeline: ${error.message}`);
    }
  }, [user, refreshPipelines, queryClient]);

  const handlePipelineUpdate = useCallback(async (pipelineData: any, shouldRedirect = true, options = {}) => {
    try {
      // ✅ CORREÇÃO CRÍTICA: Interface adequada para options ANTES de usar
      interface UpdateOptions {
        onlyCustomFields?: boolean;
        isAutoSave?: boolean;
        isUpdate?: boolean;
        tabName?: string;
        onlyTab?: string;
        pipelineId?: string; // ✅ NOVO: ID explícito da pipeline
        correlationId?: string; // ✅ NOVO: Correlation ID para tracking
        isStageAction?: boolean; // ✅ NOVO: Flag para ações de estágio
        isNavigationChange?: boolean; // ✅ NOVO: Flag para mudanças de navegação
      }
      
      const safeOptions: UpdateOptions = options || {};
      
      // ✅ CORREÇÃO CRÍTICA: Resolver stale closure - buscar pipeline atual
      // Se options.pipelineId existe, usar ele; senão buscar do editingPipeline atual
      const targetPipelineId = safeOptions.pipelineId || editingPipeline?.id;
      
      // ✅ LOGS DETALHADOS PARA DEBUG
      console.log('✏️ [UnifiedPipelineManager] Atualizando pipeline - INÍCIO:', {
        editingPipelineId: editingPipeline?.id,
        optionsPipelineId: safeOptions.pipelineId,
        targetPipelineId,
        name: pipelineData.name,
        shouldRedirect,
        options,
        optionsType: typeof options,
        optionsKeys: Object.keys(options || {}),
        timestamp: new Date().toISOString()
      });
      
      if (!targetPipelineId) {
        throw new Error('ID da pipeline não encontrado - verifique se a pipeline está carregada corretamente');
      }
      
      const isAutoSave = Boolean(
        safeOptions.onlyCustomFields === true || 
        safeOptions.isAutoSave === true ||
        safeOptions.isUpdate === true ||
        safeOptions.isStageAction === true ||
        safeOptions.isNavigationChange === true
      );
      
      // ✅ LOGGING ESTRUTURADO: Usar console.debug para logs detalhados
      console.debug('🔍 [UnifiedPipelineManager] Análise de autosave:', {
        correlationId: safeOptions.correlationId,
        isAutoSave,
        targetPipelineId: targetPipelineId.substring(0, 8),
        onlyCustomFields: safeOptions.onlyCustomFields,
        isAutoSaveFlag: safeOptions.isAutoSave,
        isUpdate: safeOptions.isUpdate,
        isStageAction: safeOptions.isStageAction,
        isNavigationChange: safeOptions.isNavigationChange,
        tabName: safeOptions.tabName,
        shouldCloseModal: !isAutoSave,
        timestamp: new Date().toISOString()
      });
      
      // ✅ CANCELAR queries em andamento para evitar race conditions
      await queryClient.cancelQueries({ queryKey: QueryKeys.pipelines.byTenant(user?.tenant_id!) });
      
      // ✅ DEBUG: Log detalhado do payload enviado incluindo member_ids
      console.log('🔍 [UnifiedPipelineManager] Payload enviado para backend:', {
        targetPipelineId,
        name: pipelineData.name,
        description: pipelineData.description,
        member_ids: pipelineData.member_ids,
        member_ids_count: pipelineData.member_ids?.length || 0,
        member_ids_sample: pipelineData.member_ids?.slice(0, 3) || [],
        tenant_id: user?.tenant_id,
        fullPayload: pipelineData
      });

      const response = await api.put(`/pipelines/${targetPipelineId}`, {
        ...pipelineData,
        tenant_id: user?.tenant_id
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro desconhecido');
      }
      
      // ✅ CRÍTICO: Atualizar editingPipeline IMEDIATAMENTE com dados fresh
      const updatedPipeline = response.data.pipeline || { 
        ...editingPipeline, 
        ...pipelineData,
        updated_at: new Date().toISOString() // Forçar timestamp fresh
      };
      
      if (editingPipeline && updatedPipeline) {
        // ⚡ INSTANTÂNEO: Atualizar estado antes de invalidation
        setEditingPipeline(updatedPipeline);
        
        console.log('⚡ [UnifiedPipelineManager] EditingPipeline atualizada INSTANTANEAMENTE:', {
          id: updatedPipeline.id,
          name: updatedPipeline.name,
          description: updatedPipeline.description,
          previous: editingPipeline.name
        });
        
        // ✅ NOVA: Disparar evento para notificar outros componentes
        window.dispatchEvent(new CustomEvent('pipeline-updated', {
          detail: {
            pipeline: updatedPipeline,
            source: 'unified-manager',
            timestamp: new Date().toISOString()
          }
        }));
      }

      // ✅ OTIMIZADO: Cache invalidation mais específico e abrangente
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QueryKeys.pipelines.byTenant(user?.tenant_id!), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['pipeline', targetPipelineId], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['pipelines'], exact: false })
      ]);
      
      // ✅ CORREÇÃO ROBUSTA: Lógica de fechamento do modal
      if (isAutoSave) {
        // Auto-save silencioso - modal permanece aberto
        console.debug('🔄 [UnifiedPipelineManager] Auto-save detectado - modal permanece aberto', {
          correlationId: safeOptions.correlationId,
          tabName: safeOptions.tabName,
          timestamp: new Date().toISOString()
        });
        setIsAutoSaveInProgress(true);
        await refreshPipelines();
        setIsAutoSaveInProgress(false);
        console.debug('✅ [UnifiedPipelineManager] Auto-save concluído - modal mantido aberto', {
          correlationId: safeOptions.correlationId,
          tabName: safeOptions.tabName,
          timestamp: new Date().toISOString()
        });
      } else {
        // Submit manual - verificar se deve fechar modal baseado em shouldRedirect
        console.log('💾 [UnifiedPipelineManager] Submit manual detectado', {
          shouldRedirect,
          willCloseModal: shouldRedirect
        });
        
        // ✅ VERIFICAÇÃO DE PROTEÇÃO: Não fechar se autosave em progresso
        if (isAutoSaveInProgress) {
          console.warn('⚠️ [UnifiedPipelineManager] BLOQUEADO: Tentativa de fechar modal durante autosave');
          await refreshPipelines();
          return;
        }
        
        // Refresh antes de fechar para garantir dados atualizados
        await refreshPipelines();
        
        // ✅ CORREÇÃO CRÍTICA: Só fechar modal se shouldRedirect for true
        if (shouldRedirect) {
          setShowEditModal(false);
          setEditingPipeline(null);
          showSuccessToast('Sucesso', 'Pipeline atualizada com sucesso!');
          console.log('✅ [UnifiedPipelineManager] Submit manual concluído - modal fechado');
        } else {
          // ✅ CORREÇÃO: Não mostrar notificação duplicada - handleSaveChanges já cuida disso
          console.log('✅ [UnifiedPipelineManager] Submit manual concluído - modal MANTIDO ABERTO (sem notificação duplicada)');
        }
      }
      
      // ✅ NOVA: Retornar pipeline atualizada para permitir updates locais
      return updatedPipeline;
      
    } catch (error: any) {
      console.error('❌ [UnifiedPipelineManager] Erro ao atualizar pipeline:', error);
      showErrorToast('Erro ao atualizar', `Erro ao atualizar pipeline: ${error.message}`);
      throw error; // Re-throw para que handleSaveChanges possa capturar
    }
  }, [user, refreshPipelines, queryClient, editingPipeline?.id]); // ✅ CRÍTICO: Adicionar editingPipeline.id

  // ✅ CORREÇÃO: Estado de seleção manual ANTES dos useMemo
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  // ✅ FASE 2: Pipeline cache inteligente para AMBOS admin e member
  const userPipelines = React.useMemo(() => {
    if (loading || !user || !pipelines) return [];
    return pipelines.filter(pipeline => pipeline.tenant_id === user.tenant_id);
  }, [pipelines, user, loading]);

  // ✅ CORREÇÃO CRÍTICA: Cache vem das props ou fallback para hook interno
  // const lastViewedPipeline = selectedPipeline;
  // const setLastViewedPipeline = onPipelineChange || (() => {});
  
  // ✅ FALLBACK: Se não receber props, usar cache interno (compatibilidade)
  const { 
    lastViewedPipeline: fallbackPipeline, 
    setLastViewedPipeline: fallbackSetPipeline, 
    isLoading: fallbackCacheLoading 
  } = usePipelineCache({
    tenantId: user?.tenant_id || '',
    pipelines: userPipelines,
    fallbackToPipelineId: undefined
  });
  
  // ✅ DECISÃO: Props ou fallback
  const finalPipeline = selectedPipeline || fallbackPipeline;
  const finalSetPipeline = onPipelineChange || fallbackSetPipeline;
  const finalCacheLoading = selectedPipeline ? cacheLoading : fallbackCacheLoading;

  // ✅ CORREÇÃO: Estado de prontidão para evitar renderização prematura (memoizado)
  const isDataReady = React.useMemo(() => {
    return !loading && !finalCacheLoading && userPipelines.length > 0;
  }, [loading, finalCacheLoading, userPipelines.length]);

  // ✅ CORREÇÃO: Pipeline selecionada com lógica simplificada e segura
  const selectedPipelineToRender = React.useMemo(() => {
    if (!isDataReady) return null;
    
    // 1. Prioridade: selectedPipelineId (seleção manual)
    if (selectedPipelineId) {
      const manualPipeline = userPipelines.find(p => p.id === selectedPipelineId);
      if (manualPipeline) return manualPipeline;
    }
    
    // 2. Cache: finalPipeline se existir na lista atual
    if (finalPipeline && userPipelines.find(p => p.id === finalPipeline.id)) {
      return finalPipeline;
    }
    
    // 3. Fallback: primeira pipeline disponível
    return userPipelines[0] || null;
  }, [isDataReady, selectedPipelineId, finalPipeline, userPipelines]);

  // ✅ FASE 2: Determinar se deve usar acesso direto ou lista tradicional
  const shouldUseDirectAccess = React.useMemo(() => {
    // Para members: sempre usar acesso direto 
    if (isMember) return true;
    
    // Para admins: sempre usar acesso direto (PipelineKanbanView)
    if (isAdmin) return true;
    
    return false;
  }, [isMember, isAdmin]);

  // ✅ CORREÇÃO CRÍTICA: Controlar inicialização e aguardar cache estar pronto
  const hasInitialized = useRef(false);
  const currentPipelineRef = useRef<any>(null);
  
  // ✅ CORREÇÃO: Inicialização única aguardando todos os dados estarem prontos
  useEffect(() => {
    if (shouldUseDirectAccess && isDataReady && selectedPipelineToRender && !hasInitialized.current) {
      console.log('🎯 [UnifiedPipelineManager] INICIALIZAÇÃO ÚNICA - Dados completamente prontos:', {
        pipelineId: selectedPipelineToRender.id,
        pipelineName: selectedPipelineToRender.name,
        userRole: user?.role,
        isDataReady,
        hasCache: !!finalPipeline,
        cacheValid: !!finalPipeline && !!userPipelines.find(p => p.id === finalPipeline.id),
        usingProps: !!selectedPipeline,
        decision: selectedPipelineId ? 'manual-selection' : 
                 (finalPipeline && userPipelines.find(p => p.id === finalPipeline.id)) ? 'cache-respected' : 'fallback-used'
      });
      
      // ✅ MARCAR como inicializado
      hasInitialized.current = true;
      currentPipelineRef.current = selectedPipelineToRender;
      
      // ✅ DISPARAR evento pipeline-view-entered
      window.dispatchEvent(new CustomEvent('pipeline-view-entered', {
        detail: { 
          pipeline: {
            id: selectedPipelineToRender.id,
            name: selectedPipelineToRender.name,
            tenant_id: selectedPipelineToRender.tenant_id
          },
          source: `UnifiedPipelineManager-${user?.role}-single-init`,
          dataReady: isDataReady
        }
      }));
      
      // ✅ ATUALIZAR cache se necessário
      if (!finalPipeline || !userPipelines.find(p => p.id === finalPipeline.id)) {
        console.log(`💾 [UnifiedPipelineManager] Atualizando cache com pipeline selecionada: ${selectedPipelineToRender.name}`);
        finalSetPipeline(selectedPipelineToRender);
      }
    } else if (shouldUseDirectAccess && !isDataReady) {
      console.log('⏳ [UnifiedPipelineManager] Aguardando dados ficarem prontos:', {
        loading,
        finalCacheLoading,
        userPipelinesLength: userPipelines.length,
        isDataReady
      });
    }
  }, [shouldUseDirectAccess, isDataReady, selectedPipelineToRender, user?.role]);

  // ✅ CORREÇÃO: useEffect separado para cleanup apenas no unmount
  useEffect(() => {
    return () => {
      if (hasInitialized.current && currentPipelineRef.current) {
        console.log('🎯 [UnifiedPipelineManager] COMPONENTE DESMONTANDO - Disparando pipeline-view-exited');
        window.dispatchEvent(new CustomEvent('pipeline-view-exited', {
          detail: { 
            pipelineId: currentPipelineRef.current.id,
            source: 'UnifiedPipelineManager-unmount'
          }
        }));
      }
    };
  }, []); // ✅ CORREÇÃO: Sem dependências - só executa no mount/unmount

  // ================================================================================
  // EVENT LISTENERS PARA EDIÇÃO E ARQUIVAMENTO (CORRIGE ACESSO DIRETO)
  // ================================================================================
  
  // ✅ MEMOIZAÇÃO: Event handlers para evitar re-creation desnecessária
  const handlePipelineEditEvent = useCallback((event: any) => {
    const { pipeline } = event.detail;
    if (pipeline) {
      handleEditPipeline(pipeline);
    }
  }, [handleEditPipeline]);

  const handlePipelineArchiveEvent = useCallback((event: any) => {
    const { pipelineId, shouldArchive } = event.detail;
    if (pipelineId) {
      handleArchivePipeline(pipelineId, shouldArchive);
    }
  }, [handleArchivePipeline]);

  useEffect(() => {
    if (!isAdmin) return;

    // ✅ OTIMIZADO: Usar EventManager com deduplicação automática
    const unsubscribeEdit = eventManager.subscribe('pipeline-edit-requested', handlePipelineEditEvent, 'UnifiedPipelineManager-edit');
    const unsubscribeArchive = eventManager.subscribe('pipeline-archive-requested', handlePipelineArchiveEvent, 'UnifiedPipelineManager-archive');

    return () => {
      unsubscribeEdit();
      unsubscribeArchive();
    };
  }, [handleEditPipeline, handleArchivePipeline, isAdmin, eventManager]);

  // ================================================================================
  // EVENT LISTENER PARA CRIAÇÃO DE PIPELINE
  // ================================================================================
  
  // ✅ MEMOIZAÇÃO: Event handler de criação
  const handlePipelineCreateEvent = useCallback(() => {
    handleCreatePipeline();
  }, [handleCreatePipeline]);

  // ✅ NOVO: Event handler para criação de oportunidade
  const handleCreateOpportunityEvent = useCallback((event: CustomEvent) => {
    const { pipelineId } = event.detail;
    console.log('🎯 [UnifiedPipelineManager] Evento create-opportunity-requested recebido:', { pipelineId });
    
    // Encontrar a pipeline pelo ID
    const pipeline = allPipelines.find(p => p.id === pipelineId);
    if (pipeline) {
      console.log('✅ [UnifiedPipelineManager] Abrindo StepLeadModal para pipeline:', pipeline.name);
      setSelectedPipelineForLead(pipeline);
      setShowStepLeadModal(true);
    } else {
      console.error('❌ [UnifiedPipelineManager] Pipeline não encontrada:', pipelineId);
    }
  }, [allPipelines]);

  // ✅ NOVA ARQUITETURA: Não precisamos mais do handler onSubmit
  // StepLeadModal agora gerencia criação internamente via useCreateOpportunity hook

  useEffect(() => {
    if (!shouldUseDirectAccess || !isAdmin) return;

    // ✅ OTIMIZADO: EventManager com conditional registration
    const unsubscribe = eventManager.subscribe('pipeline-create-requested', handlePipelineCreateEvent, 'UnifiedPipelineManager-create');

    return unsubscribe;
  }, [shouldUseDirectAccess, isAdmin, handleCreatePipeline, eventManager]);

  // ================================================================================
  // EVENT LISTENER PARA CRIAÇÃO DE OPORTUNIDADE
  // ================================================================================
  
  useEffect(() => {
    if (!shouldUseDirectAccess) return;

    // ✅ NOVO: EventManager para create-opportunity-requested
    const unsubscribe = eventManager.subscribe('create-opportunity-requested', handleCreateOpportunityEvent, 'UnifiedPipelineManager-opportunity');

    return unsubscribe;
  }, [shouldUseDirectAccess, handleCreateOpportunityEvent, eventManager]);

  // ================================================================================
  // EVENT LISTENER PARA TROCA DE PIPELINE
  // ================================================================================
  
  // ✅ MEMOIZAÇÃO: Event handler complexo de mudança de view
  const handlePipelineViewChanged = useCallback((event: any) => {
    const { pipeline } = event.detail;
    
    if (pipeline && pipeline.id) {
      setSelectedPipelineId(pipeline.id);
      finalSetPipeline(pipeline);
      
      // ✅ INVALIDAR cache específico usando TanStack Query para forçar re-render
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.pipelineLeads.byPipeline(pipeline.id),
        exact: false
      });
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.pipelineMetrics.byPipeline(pipeline.id),
        exact: false
      });
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.views.pipelineCache(pipeline.id),
        exact: false
      });
    }
  }, [finalSetPipeline, queryClient]);

  useEffect(() => {
    if (!shouldUseDirectAccess) return;

    // ✅ OTIMIZADO: EventManager otimizado
    const unsubscribe = eventManager.subscribe('pipeline-view-changed', handlePipelineViewChanged, 'UnifiedPipelineManager-view');

    return unsubscribe;
  }, [shouldUseDirectAccess, finalSetPipeline, eventManager, queryClient]);

  // ✅ CORREÇÃO CRÍTICA: LoadingComponent como componente React válido
  const LoadingComponent = React.useCallback(() => {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
        </div>
      </div>
    );
  }, [isAdmin]);

  // ✅ OTIMIZAÇÃO: Verificação inline de dados prontos quando necessário

  // Validação de permissões
  if (!user || (!isAdmin && !isMember)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-yellow-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Acesso Restrito</h3>
          <p className="text-yellow-600">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <PipelineErrorBoundary
        pipelineId={selectedPipelineToRender?.id}
        pipelineName={selectedPipelineToRender?.name}
        showErrorDetails={process.env.NODE_ENV === 'development'}
      >
        {shouldUseDirectAccess ? (
          // ✅ CORREÇÃO: ACESSO DIRETO - aguardar dados estarem prontos
          <Suspense fallback={<LoadingComponent />}>
            {!isDataReady ? (
              // ✅ CORREÇÃO: Usando loading centralizado sem duplicação
              <></>
            ) : selectedPipelineToRender ? (
              // ✅ CORREÇÃO: Só renderiza quando tem pipeline definida e dados prontos
              <PipelineKanbanView
                pipelineId={selectedPipelineToRender.id}
                userRole={user?.role as 'admin' | 'member' | 'super_admin'}
                enableMetrics={isAdmin}
                autoRefresh={true}
                onViewDetails={handleViewDetails}
                key={selectedPipelineToRender.id} // Force re-render when pipeline changes
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-500">
                    {isAdmin ? 'Nenhuma pipeline criada ainda.' : 'Nenhuma pipeline atribuída a você.'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    {isAdmin ? 'Crie sua primeira pipeline usando o botão + no cabeçalho.' : 'Entre em contato com o administrador.'}
                  </p>
                </div>
              </div>
            )}
          </Suspense>
        ) : (
          // ⚠️ FALLBACK: Caso não deveria acontecer, mas mantemos por segurança
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500">Interface não disponível para este usuário</p>
            </div>
          </div>
        )}
      </PipelineErrorBoundary>
      
      {/* Modal de criação de pipeline */}
      <Suspense fallback={<></>}>
        <PipelineModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
          pipeline={null}
          members={(members || []) as any[]}
          onSubmit={handlePipelineCreate}
          isEdit={false}
        />
      </Suspense>

      {/* Modal de edição de pipeline */}
      <Suspense fallback={<></>}>
        <PipelineModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          pipeline={editingPipeline}
          members={(members || []) as any[]}
          onSubmit={handlePipelineUpdate}
          isEdit={true}
          onDuplicatePipeline={editingPipeline ? () => handleDuplicatePipeline(editingPipeline) : undefined}
          duplicatingPipelineId={duplicatingPipelineId}
          onArchivePipeline={editingPipeline ? () => handleArchivePipeline(editingPipeline.id, true) : undefined}
          onUnarchivePipeline={editingPipeline ? () => handleUnarchivePipeline(editingPipeline.id) : undefined}
          loading={loading}
        />
      </Suspense>

      {/* Modal de detalhes do lead com error handling */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      }>
        <PipelineErrorBoundary
          pipelineId={selectedPipelineToRender?.id}
          pipelineName={selectedPipelineToRender?.name}
        >
          <LeadDetailsModal
            isOpen={showLeadModal && !!selectedLead}
            onClose={() => {
              setShowLeadModal(false);
              setSelectedLead(null);
            }}
            lead={selectedLead}
            customFields={selectedPipelineToRender?.pipeline_custom_fields || []}
            pipelineId={selectedPipelineToRender?.id || ''}
          />
        </PipelineErrorBoundary>
      </Suspense>

      {/* ✅ NOVO: Modal para criar nova oportunidade */}
      <Suspense fallback={<></>}>
        <StepLeadModal
          isOpen={showStepLeadModal && !!selectedPipelineForLead}
          onClose={() => {
            setShowStepLeadModal(false);
            setSelectedPipelineForLead(null);
          }}
          pipeline={selectedPipelineForLead}
          members={members as any[]}
          onSubmit={() => {}} // ✅ NOVA ARQUITETURA: Prop mantida para compatibilidade, mas não usada
        />
      </Suspense>
    </div>
  );
};

export default UnifiedPipelineManager;