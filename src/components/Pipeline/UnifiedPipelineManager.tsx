import React, { Suspense, useEffect, useState, lazy, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelineData } from '../../hooks/usePipelineData';
import { usePipelineCache } from '../../hooks/usePipelineCache'; // ✅ FASE 2: Import cache inteligente
import { useMembers } from '../../hooks/useMembers';
import SafeErrorBoundary from '../SafeErrorBoundary';
import { Pipeline } from '../../types/Pipeline';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { useAutoCleanupEventManager } from '../../services/EventManager';
// ✅ FASE 2: Import enterprise-grade mutation hook
import { useArchivePipelineMutation } from '../../hooks/useArchivePipelineMutation';

// Lazy loading dos componentes principais
const ModernAdminPipelineManagerRefactored = lazy(() => import('../ModernAdminPipelineManagerRefactored'));
const PipelineKanbanView = lazy(() => import('./PipelineKanbanView'));

// Import para modal de edição
const PipelineModal = lazy(() => import('./PipelineModal'));

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
  const { user, authenticatedFetch } = useAuth();
  const { pipelines, loading, refreshPipelines } = usePipelineData();
  const { members, loading: membersLoading } = useMembers();
  
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

  // Determinar interface baseada no role (MOVIDO PARA CIMA)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isMember = user?.role === 'member';

  // ================================================================================
  // HANDLERS PARA EDIÇÃO E ARQUIVAMENTO DE PIPELINE (UNIFICADOS)
  // ================================================================================
  
  const handleCreatePipeline = useCallback(() => {
    console.log('➕ [UnifiedPipelineManager] Abrindo modal de criação');
    setEditingPipeline(null);
    setShowCreateModal(true);
  }, []);

  const handleEditPipeline = useCallback((pipeline: Pipeline) => {
    console.log('✏️ [UnifiedPipelineManager] Editando pipeline:', pipeline.name);
    setEditingPipeline(pipeline);
    setShowEditModal(true);
  }, []);

  const handleDuplicatePipeline = useCallback(async (pipeline: Pipeline) => {
    try {
      console.log('🔄 [UnifiedPipelineManager] Duplicando pipeline:', pipeline.name);
      
      // Validação de permissão
      if (!isAdmin) {
        throw new Error('Apenas administradores podem duplicar pipelines');
      }

      if (!pipeline?.id || !user?.tenant_id) {
        throw new Error('Pipeline não encontrada para duplicação');
      }

      const response = await authenticatedFetch(`/pipelines/${pipeline.id}/duplicate`, {
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
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      // Atualizar lista de pipelines
      await refreshPipelines();
      
      console.log('✅ [UnifiedPipelineManager] Pipeline duplicada com sucesso:', result.pipeline?.name);
      
    } catch (error: any) {
      console.error('❌ [UnifiedPipelineManager] Erro ao duplicar pipeline:', error);
      throw error;
    }
  }, [isAdmin, user?.tenant_id, authenticatedFetch, refreshPipelines]);

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

  const handlePipelineCreate = useCallback(async (pipelineData: any) => {
    try {
      console.log('💾 [UnifiedPipelineManager] Criando nova pipeline:', pipelineData);
      
      const response = await authenticatedFetch('/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...pipelineData,
          tenant_id: user?.tenant_id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar pipeline');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      // ✅ OTIMIZADO: Cache simplificado + sem timeout desnecessário
      localStorage.removeItem(`pipelines_${user?.tenant_id}`);
      
      // Fechar modal e refresh direto
      setShowCreateModal(false);
      await refreshPipelines();
      
      showSuccessToast('Sucesso', 'Pipeline criada com sucesso!');
      
    } catch (error: any) {
      console.error('❌ [UnifiedPipelineManager] Erro ao criar pipeline:', error);
      showErrorToast('Erro ao criar', `Erro ao criar pipeline: ${error.message}`);
    }
  }, [user, authenticatedFetch, refreshPipelines]);

  const handlePipelineUpdate = useCallback(async (pipelineData: any, shouldRedirect = true, options = {}) => {
    try {
      // ✅ LOGS DETALHADOS PARA DEBUG
      console.log('✏️ [UnifiedPipelineManager] Atualizando pipeline - INÍCIO:', {
        id: editingPipeline?.id,
        name: pipelineData.name,
        shouldRedirect,
        options,
        optionsType: typeof options,
        optionsKeys: Object.keys(options || {}),
        timestamp: new Date().toISOString()
      });
      
      if (!editingPipeline?.id) {
        throw new Error('ID da pipeline não encontrado');
      }
      
      // ✅ DETECÇÃO ROBUSTA DE AUTOSAVE
      const safeOptions = options || {};
      const isAutoSave = Boolean(
        safeOptions.onlyCustomFields === true || 
        safeOptions.isAutoSave === true ||
        safeOptions.isUpdate === true
      );
      
      console.log('🔍 [UnifiedPipelineManager] Análise de autosave:', {
        isAutoSave,
        onlyCustomFields: safeOptions.onlyCustomFields,
        isAutoSaveFlag: safeOptions.isAutoSave,
        isUpdate: safeOptions.isUpdate,
        shouldCloseModal: !isAutoSave
      });
      
      const response = await authenticatedFetch(`/pipelines/${editingPipeline.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...pipelineData,
          tenant_id: user?.tenant_id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar pipeline');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido');
      }

      // ✅ OTIMIZADO: Cache simplificado
      localStorage.removeItem(`pipelines_${user?.tenant_id}`);
      
      // ✅ CORREÇÃO ROBUSTA: Lógica de fechamento do modal
      if (isAutoSave) {
        // Auto-save silencioso - modal permanece aberto
        console.log('🔄 [UnifiedPipelineManager] Auto-save detectado - modal permanece aberto');
        setIsAutoSaveInProgress(true);
        await refreshPipelines();
        setIsAutoSaveInProgress(false);
        console.log('✅ [UnifiedPipelineManager] Auto-save concluído - modal mantido aberto');
      } else {
        // Submit manual - fechar modal e mostrar sucesso
        console.log('💾 [UnifiedPipelineManager] Submit manual detectado - fechando modal');
        
        // ✅ VERIFICAÇÃO DE PROTEÇÃO: Não fechar se autosave em progresso
        if (isAutoSaveInProgress) {
          console.warn('⚠️ [UnifiedPipelineManager] BLOQUEADO: Tentativa de fechar modal durante autosave');
          await refreshPipelines();
          return;
        }
        
        setShowEditModal(false);
        setEditingPipeline(null);
        await refreshPipelines();
        showSuccessToast('Sucesso', 'Pipeline atualizada com sucesso!');
        console.log('✅ [UnifiedPipelineManager] Submit manual concluído - modal fechado');
      }
      
    } catch (error: any) {
      console.error('❌ [UnifiedPipelineManager] Erro ao atualizar pipeline:', error);
      showErrorToast('Erro ao atualizar', `Erro ao atualizar pipeline: ${error.message}`);
    }
  }, [editingPipeline, user, authenticatedFetch, refreshPipelines]);

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
  const lastViewedPipeline = finalPipeline;
  const setLastViewedPipeline = finalSetPipeline;

  // ✅ CORREÇÃO: Estado de prontidão para evitar renderização prematura
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
    
    // Para admins: usar acesso direto se dados estão prontos
    if (isAdmin) return isDataReady;
    
    return false;
  }, [isMember, isAdmin, isDataReady]);

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
  
  useEffect(() => {
    if (!isAdmin) return;

    const handlePipelineEditEvent = (event: any) => {
      const { pipeline } = event.detail;
      if (pipeline) {
        handleEditPipeline(pipeline);
      }
    };

    const handlePipelineArchiveEvent = (event: any) => {
      const { pipelineId, shouldArchive } = event.detail;
      if (pipelineId) {
        handleArchivePipeline(pipelineId, shouldArchive);
      }
    };

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
  
  useEffect(() => {
    if (!shouldUseDirectAccess || !isAdmin) return;

    const handlePipelineCreateEvent = (event: any) => {
      handleCreatePipeline();
    };

    // ✅ OTIMIZADO: EventManager com conditional registration
    const unsubscribe = eventManager.subscribe('pipeline-create-requested', handlePipelineCreateEvent, 'UnifiedPipelineManager-create');

    return unsubscribe;
  }, [shouldUseDirectAccess, isAdmin, handleCreatePipeline, eventManager]);

  // ================================================================================
  // EVENT LISTENER PARA TROCA DE PIPELINE
  // ================================================================================
  
  useEffect(() => {
    if (!shouldUseDirectAccess) return;

    const handlePipelineViewChanged = (event: any) => {
      const { pipeline } = event.detail;
      
      if (pipeline && pipeline.id) {
        setSelectedPipelineId(pipeline.id);
        finalSetPipeline(pipeline);
        
        // Limpar cache específico para forçar re-render
        const cacheKeys = [
          'pipeline_view_cache',
          `pipeline_leads_${pipeline.id}`,
          `pipeline_metrics_${pipeline.id}`
        ];
        
        cacheKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      }
    };

    // ✅ OTIMIZADO: EventManager otimizado
    const unsubscribe = eventManager.subscribe('pipeline-view-changed', handlePipelineViewChanged, 'UnifiedPipelineManager-view');

    return unsubscribe;
  }, [shouldUseDirectAccess, finalSetPipeline, eventManager]);

  // ✅ CORREÇÃO: Loading unificado que previne duplicação
  const LoadingComponent = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">
          Carregando Pipeline {isAdmin ? '(Admin)' : '(Vendedor)'}...
        </p>
      </div>
    </div>
  );

  // ✅ CORREÇÃO: Estados de loading centralizados
  const isMainLoading = loading || membersLoading || cacheLoading;
  const hasInitialData = pipelines && pipelines.length > 0;

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
      <SafeErrorBoundary 
        fallback={
          <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Erro ao carregar Pipeline
            </h3>
            <p className="text-red-600 text-center mb-4">
              Houve um problema ao carregar o módulo de pipeline.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        }
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
        ) : isAdmin ? (
          // 🔧 ADMIN: Interface administrativa tradicional (CRUD de pipelines) - FALLBACK
          <Suspense fallback={<LoadingComponent />}>
            <ModernAdminPipelineManagerRefactored 
              searchTerm={searchTerm}
              selectedFilter={selectedFilter}
            />
          </Suspense>
        ) : (
          // ⚠️ FALLBACK: Caso não deveria acontecer, mas mantemos por segurança
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500">Interface não disponível para este usuário</p>
            </div>
          </div>
        )}
      </SafeErrorBoundary>
      
      {/* Modal de criação de pipeline */}
      <Suspense fallback={<></>}>
        <PipelineModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          pipeline={null}
          members={members || []}
          onSubmit={handlePipelineCreate}
          isEdit={false}
        />
      </Suspense>

      {/* Modal de edição de pipeline */}
      <Suspense fallback={<></>}>
        <PipelineModal
          isOpen={showEditModal}
          onClose={() => {
            // ✅ PROTEÇÃO: Não fechar durante autosave
            if (isAutoSaveInProgress) {
              console.warn('⚠️ [UnifiedPipelineManager] BLOQUEADO: Tentativa de fechar modal via onClose durante autosave');
              return;
            }
            setShowEditModal(false);
            setEditingPipeline(null);
          }}
          pipeline={editingPipeline}
          members={members || []}
          onSubmit={handlePipelineUpdate}
          isEdit={true}
          onDuplicatePipeline={editingPipeline ? () => handleDuplicatePipeline(editingPipeline) : undefined}
          onArchivePipeline={editingPipeline ? () => handleArchivePipeline(editingPipeline.id, true) : undefined}
          onUnarchivePipeline={editingPipeline ? () => handleUnarchivePipeline(editingPipeline.id) : undefined}
          loading={loading}
        />
      </Suspense>
    </div>
  );
};

export default UnifiedPipelineManager;