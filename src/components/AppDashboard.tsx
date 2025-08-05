import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import RoleBasedMenu from './RoleBasedMenu';
import CRMLayout from './CRMLayout';
import { usePipelineSubHeader, useLeadsSubHeader } from '../hooks/useSubHeaderContent';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineCache } from '../hooks/usePipelineCache'; // ✅ FASE 2: Importar cache inteligente
import PipelineSpecificSubHeader from './SubHeader/PipelineSpecificSubHeader';
import { logger } from '../utils/logger';
import { CheckCircle, Users, BarChart3, Settings, X } from 'lucide-react';

const AppDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pipelines, loading: pipelinesLoading, refreshPipelines } = usePipelineData();
  
  // 🚀 ESTADO LOCAL: Para atualizações imediatas do dropdown
  const [localPipelines, setLocalPipelines] = useState(pipelines);
  
  // ✅ THROTTLING: Ref para controlar logs duplicados
  const lastLoggedPipeline = useRef<string | null>(null);
  
  // 🔄 SINCRONIZAR: Estado local com dados do hook
  useEffect(() => {
    setLocalPipelines(pipelines);
  }, [pipelines]);
  
  // 🎯 SUBHEADER: Pipelines reais filtradas por tenant do usuário (MOVIDO PARA CIMA)
  const userPipelines = useMemo(() => {
    if (pipelinesLoading || !user || !localPipelines) return [];
    
    // Filtrar pipelines do tenant do usuário
    return localPipelines.filter(pipeline => pipeline.tenant_id === user.tenant_id);
  }, [localPipelines, user, pipelinesLoading]);
  
  // ⚡ LISTENER: Atualização imediata do dropdown após arquivamento
  useEffect(() => {
    const handlePipelineArchiveUpdate = (event: CustomEvent) => {
      const { pipelineId, is_archived, archived_at } = event.detail;
      
      console.log(`⚡ [AppDashboard] Recebeu atualização imediata:`, {
        pipelineId,
        is_archived,
        archived_at,
        localPipelinesLength: localPipelines?.length || 0
      });
      
      // Atualizar pipeline específica no array local imediatamente
      setLocalPipelines(prevPipelines => {
        if (!prevPipelines) return prevPipelines;
        
        return prevPipelines.map(pipeline => {
          if (pipeline.id === pipelineId) {
            const updated = {
              ...pipeline,
              is_archived,
              archived_at,
              is_active: !is_archived // Manter consistência
            };
            
            console.log(`🎯 [AppDashboard] Pipeline atualizada no dropdown:`, {
              name: pipeline.name,
              before: { is_archived: pipeline.is_archived, archived_at: pipeline.archived_at },
              after: { is_archived: updated.is_archived, archived_at: updated.archived_at }
            });
            
            return updated;
          }
          return pipeline;
        });
      });
    };

    window.addEventListener('pipeline-archive-updated', handlePipelineArchiveUpdate as EventListener);
    
    return () => {
      window.removeEventListener('pipeline-archive-updated', handlePipelineArchiveUpdate as EventListener);
    };
  }, [localPipelines]);
  
  
  // 🔄 CORREÇÃO PONTUAL: Listener para pipeline duplicada - atualização imediata do dropdown
  useEffect(() => {
    const handlePipelineDuplicated = (event: CustomEvent) => {
      const { pipeline } = event.detail;
      
      console.log('🔄 [CORREÇÃO-DROPDOWN] Pipeline duplicada recebida:', {
        name: pipeline.name,
        id: pipeline.id.substring(0, 8),
        localPipelinesLength: localPipelines?.length || 0
      });
      
      // Adicionar nova pipeline ao estado local imediatamente
      setLocalPipelines(prevPipelines => {
        if (!prevPipelines) return [pipeline];
        
        // Verificar se já existe para evitar duplicatas
        const exists = prevPipelines.find(p => p.id === pipeline.id);
        if (exists) {
          console.log('🔄 [CORREÇÃO-DROPDOWN] Pipeline já existe, pulando adição');
          return prevPipelines;
        }
        
        // Adicionar no início da lista (mais recente primeiro)
        const updated = [pipeline, ...prevPipelines];
        
        console.log('✅ [CORREÇÃO-DROPDOWN] Pipeline adicionada ao dropdown imediatamente:', {
          name: pipeline.name,
          totalPipelines: updated.length,
          action: 'immediate-local-update'
        });
        
        return updated;
      });
    };

    window.addEventListener('pipeline-duplicated', handlePipelineDuplicated as EventListener);
    
    return () => {
      window.removeEventListener('pipeline-duplicated', handlePipelineDuplicated as EventListener);
    };
  }, [localPipelines]);
  
  // 🎉 DETECÇÃO: Verificar se é um admin recém-ativado (CORREÇÃO CRÍTICA #3)
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    message: string;
    isNewActivation: boolean;
    autoLoginAttempts?: number;
    tokensStored?: boolean;
    activationMethod?: 'location' | 'event';
  } | null>(null);
  
  // 🔄 PERSISTÊNCIA: Recuperar módulo ativo do localStorage ou usar padrão baseado no role
  const getDefaultModule = (userRole: string) => {
    switch (userRole) {
      case 'super_admin':
        return 'Dashboard Admin';
      case 'admin':
        return 'Dashboard Admin';
      case 'member':
        return 'Meu Dashboard';
      default:
        return 'Dashboard Admin';
    }
  };

  // 📋 VALIDAÇÃO: Módulos válidos por role
  const getValidModulesForRole = (userRole: string): string[] => {
    switch (userRole) {
      case 'super_admin':
        return ['Dashboard Admin', 'Relatório', 'Feedback', 'Clientes', 'Configurações da Plataforma', 'Notificações'];
      case 'admin':
        return ['Dashboard Admin', 'Vendedores', 'Gestão de pipeline', 'Gestão de formulários', 'Acompanhamento', 'Leads', 'Integrações'];
      case 'member':
        return ['Meu Dashboard', 'Pipeline', 'Gestão de pipeline', 'Leads', 'Acompanhamento'];
      default:
        return ['Dashboard Admin'];
    }
  };

  // 🔍 VALIDAÇÃO: Verificar se módulo salvo é válido para o role atual
  const isModuleValidForRole = (moduleName: string, userRole: string): boolean => {
    const validModules = getValidModulesForRole(userRole);
    return validModules.includes(moduleName);
  };

  // 🔄 PERSISTÊNCIA: Estado com recuperação automática otimizada
  const [activeModule, setActiveModule] = useState(() => {
    // Durante a inicialização, usar um valor padrão temporário
    // O valor correto será definido no useEffect quando o user estiver disponível
    return 'Dashboard Admin';
  });

  // 🔄 PERSISTÊNCIA: Salvar módulo ativo sempre que mudar (useCallback para evitar re-renders)
  const handleNavigateWithPersistence = useCallback((moduleName: string) => {
    console.log(`📍 Navegando para: ${moduleName}`);
    
    try {
      // Salvar no localStorage
      localStorage.setItem('crm_active_module', moduleName);
      
      // Atualizar estado
      setActiveModule(moduleName);
      
      console.log(`✅ Módulo '${moduleName}' salvo com sucesso`);
    } catch (error) {
      console.error('Erro ao salvar módulo ativo:', error);
      // Mesmo com erro, atualizar o estado
      setActiveModule(moduleName);
    }
  }, []);

  // ✅ FASE 2: Cache inteligente de pipeline para acesso direto 
  const { 
    lastViewedPipeline, 
    setLastViewedPipeline, 
    clearCache,
    isLoading: cacheLoading 
  } = usePipelineCache({
    tenantId: user?.tenant_id || '',
    pipelines: userPipelines, // ✅ CORRIGIDO: Agora userPipelines está definido antes
    fallbackToPipelineId: undefined // Pode ser usado para pipeline específica
  });

  // ⚡ LISTENER: Atualização instantânea quando pipeline é editada (MOVIDO APÓS usePipelineCache)
  useEffect(() => {
    const handlePipelineUpdated = (event: CustomEvent) => {
      const { pipeline, source, timestamp } = event.detail;
      
      console.log('⚡ [AppDashboard] Pipeline atualizada - forçando atualização instantânea:', {
        name: pipeline.name,
        description: pipeline.description,
        source,
        timestamp
      });
      
      // ✅ Forçar atualização do lastViewedPipeline se for a mesma
      if (lastViewedPipeline && lastViewedPipeline.id === pipeline.id) {
        setLastViewedPipeline(pipeline);
        console.log('⚡ [AppDashboard] LastViewedPipeline sincronizada instantaneamente');
      }
      
      // ✅ Forçar refresh das pipelines para atualizar SubHeader
      refreshPipelines();
    };

    window.addEventListener('pipeline-updated', handlePipelineUpdated as EventListener);
    
    return () => {
      window.removeEventListener('pipeline-updated', handlePipelineUpdated as EventListener);
    };
  }, [lastViewedPipeline, setLastViewedPipeline, refreshPipelines]);

  // 🎯 SUBHEADER: Estados para módulo de Pipelines
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'archived'>('active');
  
  // 🎯 SUBHEADER: Estados para visualização de pipeline simplificados
  const [pipelineSearchTerm, setPipelineSearchTerm] = useState('');

  // 🎯 SUBHEADER: Estados para módulo de Leads
  const [leadsSearchTerm, setLeadsSearchTerm] = useState('');
  const [leadsSelectedFilter, setLeadsSelectedFilter] = useState<'all' | 'assigned' | 'not_assigned' | 'without_opportunity'>('all');
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [leadsWithOpportunities, setLeadsWithOpportunities] = useState<Set<string>>(new Set());

  // ✅ REMOVIDO: userPipelines já definido no topo do componente

  // 🎯 SUBHEADER: Handlers para Pipelines
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((filterId: string) => {
    setSelectedFilter(filterId as 'all' | 'active' | 'archived');
  }, []);

  const handleCreatePipeline = useCallback(() => {
    console.log('🎯 [AppDashboard] Solicitando criação de nova pipeline via evento');
    
    // Enviar evento customizado para comunicar com o componente de pipeline
    const createPipelineEvent = new CustomEvent('pipeline-create-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'subheader-button'
      }
    });
    
    window.dispatchEvent(createPipelineEvent);
  }, []);

  // 🎯 SUBHEADER: Handlers para Leads
  const handleLeadsSearchChange = useCallback((value: string) => {
    setLeadsSearchTerm(value);
  }, []);

  const handleLeadsFilterChange = useCallback((filterId: string) => {
    setLeadsSelectedFilter(filterId as 'all' | 'assigned' | 'not_assigned' | 'without_opportunity');
  }, []);

  const handleCreateLead = useCallback(() => {
    console.log('🎯 [AppDashboard] Solicitando criação de novo lead via evento');
    
    // Enviar evento customizado para comunicar com o componente de leads
    const createLeadEvent = new CustomEvent('lead-create-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'subheader-button'
      }
    });
    
    window.dispatchEvent(createLeadEvent);
  }, []);

  const handleImportLeads = useCallback(() => {
    console.log('📥 [AppDashboard] Solicitando importação de leads via evento');
    
    const importLeadsEvent = new CustomEvent('leads-import-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'subheader-menu'
      }
    });
    
    window.dispatchEvent(importLeadsEvent);
  }, []);

  const handleExportLeads = useCallback(() => {
    console.log('📤 [AppDashboard] Solicitando exportação de leads via evento');
    
    const exportLeadsEvent = new CustomEvent('leads-export-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'subheader-menu'
      }
    });
    
    window.dispatchEvent(exportLeadsEvent);
  }, []);

  // ✅ FASE 4: Handlers para pipeline management no subheader
  const handleCreatePipelineFromSubHeader = useCallback(() => {
    console.log('➕ [AppDashboard] Criando nova pipeline via subheader');
    
    const createPipelineEvent = new CustomEvent('pipeline-create-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'subheader-dropdown'
      }
    });
    
    window.dispatchEvent(createPipelineEvent);
  }, []);

  const handleEditPipelineFromSubHeader = useCallback((pipeline: any) => {
    console.log('✏️ [AppDashboard] Editando pipeline via subheader:', pipeline.name);
    
    const editPipelineEvent = new CustomEvent('pipeline-edit-requested', {
      detail: {
        pipeline,
        timestamp: new Date().toISOString(),
        source: 'subheader-dropdown'
      }
    });
    
    window.dispatchEvent(editPipelineEvent);
  }, []);

  const handleArchivePipelineFromSubHeader = useCallback((pipeline: any) => {
    console.log('📁 [AppDashboard] Arquivando pipeline via subheader:', pipeline.name);
    
    const archivePipelineEvent = new CustomEvent('pipeline-archive-requested', {
      detail: {
        pipelineId: pipeline.id,
        shouldArchive: true,
        pipeline,
        timestamp: new Date().toISOString(),
        source: 'subheader-dropdown'
      }
    });
    
    window.dispatchEvent(archivePipelineEvent);
  }, []);

  const handleUnarchivePipelineFromSubHeader = useCallback((pipeline: any) => {
    console.log('📂 [AppDashboard] Desarquivando pipeline via subheader:', pipeline.name);
    
    const unarchivePipelineEvent = new CustomEvent('pipeline-archive-requested', {
      detail: {
        pipelineId: pipeline.id,
        shouldArchive: false,
        pipeline,
        timestamp: new Date().toISOString(),
        source: 'subheader-dropdown'
      }
    });
    
    window.dispatchEvent(unarchivePipelineEvent);
  }, []);

  // 🎯 SUBHEADER: Gerar conteúdo do subheader baseado no módulo ativo
  const pipelinesToShow = useMemo(() => 
    activeModule === 'Gestão de pipeline' ? userPipelines : [], 
    [activeModule, userPipelines]
  );

  const pipelineSubHeaderContent = usePipelineSubHeader({
    pipelines: pipelinesToShow,
    searchTerm,
    selectedFilter,
    onSearchChange: handleSearchChange,
    onFilterChange: handleFilterChange,
    onCreatePipeline: handleCreatePipeline
  });

  const leadsSubHeaderContent = useLeadsSubHeader({
    leads: leadsData,
    leadsWithOpportunities: leadsWithOpportunities,
    searchTerm: leadsSearchTerm,
    selectedFilter: leadsSelectedFilter,
    onSearchChange: handleLeadsSearchChange,
    onFilterChange: handleLeadsFilterChange,
    onCreateLead: handleCreateLead,
    onImportClick: handleImportLeads,
    onExportClick: handleExportLeads
  });

  // ✅ FASE 2: Pipeline específico simplificado - APENAS cache inteligente para acesso direto
  const pipelineSpecificSubHeader = useMemo(() => {
    // Aguardar carregamento do cache e pipelines
    if (cacheLoading || pipelinesLoading || !user) {
      return null;
    }

    // ✅ FASE 2: LÓGICA UNIFICADA - Acesso direto ao pipeline com cache inteligente (Members E Admins)
    if ((activeModule === 'Pipeline' || activeModule === 'Gestão de pipeline') && userPipelines.length > 0) {
      // ✅ AGUARDAR: Cache deve estar completamente carregado
      if (cacheLoading) {
        console.log('⏳ [AppDashboard] Aguardando cache carregar antes de criar SubHeader');
        return null; // Aguarda cache carregar para evitar conflitos de inicialização
      }
      
      // ✅ DECISÃO INTELIGENTE: Cache válido > primeira disponível
      const pipeline = lastViewedPipeline && userPipelines.find(p => p.id === lastViewedPipeline.id) 
        ? lastViewedPipeline 
        : userPipelines[0];
      
      if (!pipeline) {
        console.warn('🎯 [AppDashboard] Nenhuma pipeline disponível para acesso direto');
        return null;
      }
      
      // ✅ THROTTLING: Log apenas se pipeline mudou para reduzir spam
      const pipelineLogKey = `subheader-${pipeline.id}`;
      if (!lastLoggedPipeline.current || lastLoggedPipeline.current !== pipeline.id) {
        console.log('🎯 [AppDashboard] Criando SubHeader com cache inteligente unificado:', {
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          activeModule,
          userRole: user.role,
          fromCache: !!lastViewedPipeline,
          cacheMatched: lastViewedPipeline?.id === pipeline.id,
          totalPipelines: userPipelines.length,
          logic: 'unified-cache-direct'
        });
        lastLoggedPipeline.current = pipeline.id;
      }
      
      return (
        <PipelineSpecificSubHeader
          selectedPipeline={pipeline}
          pipelines={userPipelines}
          isLoading={pipelinesLoading}
          onPipelineChange={(newPipeline) => {
            console.log('🔄 [AppDashboard] Pipeline alterada pelo usuário via SubHeader:', {
              from: pipeline.id,
              to: newPipeline.id,
              userRole: user.role,
              action: 'user-selection'
            });
            
            // ✅ IMEDIATO: Salvar no cache (sempre respeitar escolha do usuário)
            setLastViewedPipeline(newPipeline as any);
            
            // ✅ EVENTO: Notificar componentes filhos sobre a mudança
            window.dispatchEvent(new CustomEvent('pipeline-view-changed', { 
              detail: { 
                pipeline: newPipeline,
                source: 'user-selection-subheader',
                userRole: user.role
              } 
            }));
          }}
          onSearchChange={(value) => {
            setPipelineSearchTerm(value);
            window.dispatchEvent(new CustomEvent('pipeline-search-changed', {
              detail: { searchTerm: value }
            }));
          }}
          onDateRangeChange={(dateRange) => {
            console.log('🗓️ [AppDashboard] Filtro de data alterado:', dateRange);
            window.dispatchEvent(new CustomEvent('pipeline-date-filter-changed', {
              detail: { dateRange }
            }));
          }}
          onCreateOpportunity={() => {
            console.log('➕ [AppDashboard] Solicitação de criação de oportunidade');
            window.dispatchEvent(new CustomEvent('create-opportunity-requested', {
              detail: { 
                pipelineId: pipeline.id,
                timestamp: new Date().toISOString()
              }
            }));
          }}
          // ✅ FASE 4: Novos handlers para pipeline management
          onCreatePipeline={handleCreatePipelineFromSubHeader}
          onEditPipeline={handleEditPipelineFromSubHeader}
          onArchivePipeline={handleArchivePipelineFromSubHeader}
          onUnarchivePipeline={handleUnarchivePipelineFromSubHeader}
          searchValue={pipelineSearchTerm}
          searchPlaceholder="Buscar oportunidades, leads..."
        />
      );
    }
    
    // Caso sem pipeline disponível ou contexto inválido
    console.log('🎯 [AppDashboard] SubHeader não será criado:', {
      activeModule,
      userPipelinesLength: userPipelines.length,
      cacheLoading,
      pipelinesLoading,
      hasUser: !!user,
      logic: 'no-pipeline-context'
    });
    
    return null;
  }, [
    // ✅ CORREÇÃO: DEPENDÊNCIAS OTIMIZADAS - removidas funções estáveis
    userPipelines, 
    pipelineSearchTerm, 
    activeModule,
    lastViewedPipeline,
    // setLastViewedPipeline removida - função estável do useCallback
    cacheLoading,
    pipelinesLoading,
    user,
    // ✅ FASE 4: Incluir novos handlers
    handleCreatePipelineFromSubHeader,
    handleEditPipelineFromSubHeader,
    handleArchivePipelineFromSubHeader,
    handleUnarchivePipelineFromSubHeader
  ]);

  // ✅ FASE 2: Selecionar o subheader correto com acesso direto ao pipeline
  const subHeaderContent = useMemo(() => {
    switch (activeModule) {
      case 'Gestão de pipeline':
        // ✅ FASE 2: Sempre usar acesso direto ao pipeline (sem lista intermediária)
        return pipelineSpecificSubHeader;
      case 'Pipeline':
        return pipelineSpecificSubHeader;
      case 'Leads':
        return leadsSubHeaderContent;
      default:
        return undefined;
    }
  }, [activeModule, pipelineSpecificSubHeader, leadsSubHeaderContent]);

  // 🎉 CORREÇÃO CRÍTICA #3: Detecção melhorada de admins recém-ativados
  useEffect(() => {
    // 📍 MÉTODO 1: Detecção via location.state (redirecionamento direto)
    if (location.state?.isNewActivation && location.state?.welcomeMessage) {
      console.log('🎉 [CRITICAL-FIX-3] Admin recém-ativado detectado via location.state');
      setWelcomeData({
        message: location.state.welcomeMessage,
        isNewActivation: location.state.isNewActivation,
        autoLoginAttempts: location.state.autoLoginAttempts || 1,
        activationMethod: 'location'
      });
      setShowWelcomeMessage(true);
      
      // Limpar o state da location para evitar mostrar novamente
      navigate('/dashboard', { replace: true });
    }
  }, [location.state, navigate]);

  // 🎧 CORREÇÃO CRÍTICA #3: Listener para evento admin-activated
  useEffect(() => {
    const handleAdminActivated = (event: CustomEvent) => {
      console.log('🎉 [CRITICAL-FIX-3] Evento admin-activated recebido:', event.detail);
      
      const { adminEmail, tokensStored, attempt } = event.detail;
      
      // Verificar se é o usuário atual
      if (user && user.email === adminEmail) {
        console.log('✅ [CRITICAL-FIX-3] Evento corresponde ao usuário atual, exibindo boas-vindas');
        
        setWelcomeData({
          message: `Bem-vindo ao CRM! Sua conta foi ativada com sucesso e você foi logado automaticamente.`,
          isNewActivation: true,
          autoLoginAttempts: attempt,
          tokensStored: tokensStored,
          activationMethod: 'event'
        });
        setShowWelcomeMessage(true);
      } else {
        console.log('ℹ️ [CRITICAL-FIX-3] Evento não corresponde ao usuário atual, ignorando');
      }
    };

    // Registrar listener
    window.addEventListener('admin-activated', handleAdminActivated as EventListener);
    console.log('🎧 [CRITICAL-FIX-3] Listener admin-activated registrado');

    // Cleanup
    return () => {
      window.removeEventListener('admin-activated', handleAdminActivated as EventListener);
      console.log('🧹 [CRITICAL-FIX-3] Listener admin-activated removido');
    };
  }, [user?.email]);

  // 🎧 Listener para receber dados de leads do LeadsModule
  useEffect(() => {
    const handleLeadsDataUpdated = (event: CustomEvent) => {
      console.log('📊 [AppDashboard] Dados de leads recebidos:', event.detail);
      setLeadsData(event.detail.leads || []);
      
      // 🎯 Converter array de volta para Set
      if (event.detail.leadsWithOpportunities) {
        setLeadsWithOpportunities(new Set(event.detail.leadsWithOpportunities));
        console.log('🎯 [AppDashboard] leadsWithOpportunities recebido:', event.detail.leadsWithOpportunities.length, 'leads com oportunidades');
      }
    };

    // Registrar listener
    window.addEventListener('leads-data-updated', handleLeadsDataUpdated as EventListener);
    console.log('🎧 [AppDashboard] Listener leads-data-updated registrado');

    // Cleanup
    return () => {
      window.removeEventListener('leads-data-updated', handleLeadsDataUpdated as EventListener);
      console.log('🧹 [AppDashboard] Listener leads-data-updated removido');
    };
  }, []);

  // ✅ FASE 2: REMOVIDO - Listeners de pipeline-view-entered/exited causavam ciclo infinito
  // Agora usando apenas cache inteligente sem eventos conflitantes

  // 📡 Enviar filtros de leads para o LeadsModule quando mudarem
  useEffect(() => {
    if (activeModule === 'Leads') {
      const leadsFiltersEvent = new CustomEvent('leads-filters-updated', {
        detail: {
          searchTerm: leadsSearchTerm,
          selectedFilter: leadsSelectedFilter,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(leadsFiltersEvent);
      console.log('🔍 [AppDashboard] Filtros de leads enviados:', { searchTerm: leadsSearchTerm, selectedFilter: leadsSelectedFilter });
    }
  }, [leadsSearchTerm, leadsSelectedFilter, activeModule]);

  // 🔄 PERSISTÊNCIA: Sincronizar com mudanças de usuário (corrigido para evitar loop)
  useEffect(() => {
    if (user) {
      const savedModule = localStorage.getItem('crm_active_module');
      const defaultModule = getDefaultModule(user.role);
      
      console.log(`🔄 Usuário disponível (${user.role})`);
      console.log(`📦 Módulo salvo: ${savedModule || 'nenhum'}`);
      console.log(`🎯 Módulo padrão para role: ${defaultModule}`);
      
      // Verificar se o módulo salvo é válido para o role atual
      if (savedModule && isModuleValidForRole(savedModule, user.role)) {
        console.log(`✅ Módulo salvo '${savedModule}' é válido para role '${user.role}' - mantendo`);
        setActiveModule(savedModule);
      } else {
        if (savedModule) {
          console.log(`⚠️ Módulo salvo '${savedModule}' não é válido para role '${user.role}' - usando padrão`);
        }
        console.log(`🔄 Definindo módulo padrão: ${defaultModule}`);
        localStorage.setItem('crm_active_module', defaultModule);
        setActiveModule(defaultModule);
      }
    }
  }, [user?.id, user?.role]); // Dependências específicas para evitar loops

  // 🧹 LIMPEZA: Limpar módulo ativo no logout
  const handleLogout = async () => {
    try {
      logger.info('Iniciando processo de logout', 'AppDashboard');
      
      // Limpar módulo ativo do localStorage
      localStorage.removeItem('crm_active_module');
      console.log('🧹 Módulo ativo limpo do localStorage');
      
      await logout();
      logger.info('Logout concluído, redirecionando', 'AppDashboard');
      navigate('/login');
    } catch (error) {
      logger.error('Erro durante logout', 'AppDashboard', error);
      // Forçar redirecionamento mesmo em caso de erro
      window.location.href = '/login';
    }
  };

  // 🎉 CORREÇÃO CRÍTICA #3: Modal de boas-vindas melhorado para novos admins
  const WelcomeModal = () => {
    if (!showWelcomeMessage || !welcomeData) return null;

          return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-8 text-white text-center relative">
            <button
              onClick={() => {
                console.log('🔄 [CRITICAL-FIX-3] Modal de boas-vindas fechado pelo usuário');
                setShowWelcomeMessage(false);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold">🎉 Bem-vindo ao CRM!</h2>
            <p className="text-green-100 mt-2">Sua conta foi ativada com sucesso</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                {welcomeData.message}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Como administrador, você tem acesso a todas as funcionalidades do sistema.
              </p>
              
              {/* 🔧 CORREÇÃO CRÍTICA #3: Informações contextuais de ativação */}
              {(welcomeData.autoLoginAttempts || welcomeData.tokensStored || welcomeData.activationMethod) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">ℹ️ Detalhes da Ativação</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    {welcomeData.activationMethod && (
                      <p>• Método: {welcomeData.activationMethod === 'event' ? 'Auto-detecção por evento' : 'Redirecionamento direto'}</p>
                    )}
                    {welcomeData.autoLoginAttempts && (
                      <p>• Login automático: Sucesso na {welcomeData.autoLoginAttempts}ª tentativa</p>
                    )}
                    {typeof welcomeData.tokensStored === 'boolean' && (
                      <p>• Tokens de segurança: {welcomeData.tokensStored ? '✅ Armazenados' : '⚠️ Não armazenados'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 🔧 CORREÇÃO CRÍTICA #3: Quick Actions melhorados */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🚀 Primeiros passos recomendados:</h3>
              
              <button
                onClick={() => {
                  console.log('🎯 [CRITICAL-FIX-3] Quick action: Navegando para Vendedores');
                  setShowWelcomeMessage(false);
                  handleNavigateWithPersistence('Vendedores');
                }}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:shadow-md text-left group"
              >
                <Users className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-blue-900">Gerenciar Vendedores</p>
                  <p className="text-sm text-blue-700">Adicione e configure sua equipe de vendas</p>
                </div>
              </button>

              <button
                onClick={() => {
                  console.log('🎯 [CRITICAL-FIX-3] Quick action: Navegando para Pipeline');
                  setShowWelcomeMessage(false);
                  handleNavigateWithPersistence('Gestão de pipeline');
                }}
                className="w-full flex items-center space-x-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200 hover:shadow-md text-left group"
              >
                <BarChart3 className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-purple-900">Configurar Pipeline</p>
                  <p className="text-sm text-purple-700">Defina as etapas do seu processo de vendas</p>
                </div>
              </button>

              <button
                onClick={() => {
                  console.log('🎯 [CRITICAL-FIX-3] Quick action: Navegando para Integrações');
                  setShowWelcomeMessage(false);
                  handleNavigateWithPersistence('Integrações');
                }}
                className="w-full flex items-center space-x-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200 hover:shadow-md text-left group"
              >
                <Settings className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-green-900">Configurar Integrações</p>
                  <p className="text-sm text-green-700">Conecte suas ferramentas favoritas</p>
                </div>
              </button>
            </div>

            {/* 🔧 CORREÇÃO CRÍTICA #3: Botão principal melhorado */}
            <button
              onClick={() => {
                console.log('✅ [CRITICAL-FIX-3] Modal de boas-vindas concluído - usuário pronto para usar o CRM');
                setShowWelcomeMessage(false);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              ✨ Começar a usar o CRM
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
    <CRMLayout 
      user={user} 
      onLogout={handleLogout}
      activeModule={activeModule}
      onNavigate={handleNavigateWithPersistence}
      subHeaderContent={subHeaderContent}
    >
      <RoleBasedMenu 
        selectedItem={activeModule}
        userRole={user?.role || 'member'}
        searchTerm={searchTerm}
        selectedFilter={selectedFilter}
        // ✅ CORREÇÃO: Props de cache para UnifiedPipelineManager
        selectedPipeline={lastViewedPipeline}
        onPipelineChange={setLastViewedPipeline}
        cacheLoading={cacheLoading}
      />
    </CRMLayout>
      
      {/* Modal de boas-vindas */}
      <WelcomeModal />
    </>
  );
};

export default AppDashboard;

