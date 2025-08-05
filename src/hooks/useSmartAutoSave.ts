import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger, loggers } from '../utils/logger';
import { showSuccessToast, showErrorToast } from './useToast';

// AIDEV-NOTE: Sistema de auto-save inteligente por abas seguindo padrões da indústria
// Baseado em melhores práticas do Salesforce, HubSpot e Pipedrive

export type TabName = 'basic' | 'stages' | 'fields' | 'distribution' | 'cadence' | 'qualification' | 'motives';

export interface TabState {
  hasChanges: boolean;
  lastSaved: Date | null;
  pendingData: any;
  errorCount: number;
}

export interface TabStates {
  [key: string]: TabState;
}

export interface AutoSaveOptions {
  enableEmergencyBackup?: boolean;
  emergencyBackupInterval?: number; // ms
  showSaveToasts?: boolean;
  retryAttempts?: number;
  retryDelay?: number; // ms
}

const DEFAULT_OPTIONS: AutoSaveOptions = {
  enableEmergencyBackup: true,
  emergencyBackupInterval: 30000, // 30s
  showSaveToasts: true,
  retryAttempts: 3,
  retryDelay: 1000 // 1s
};

export const useSmartAutoSave = (
  pipelineId: string | undefined,
  saveFunction: (tabName: TabName, data: any) => Promise<void>,
  options: AutoSaveOptions = {}
) => {
  // ✅ CORREÇÃO: Usar ref da função para evitar dependências instáveis
  const saveFunctionRef = useRef(saveFunction);
  saveFunctionRef.current = saveFunction;
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [tabStates, setTabStates] = useState<TabStates>({});
  const [currentTab, setCurrentTab] = useState<TabName>('basic');
  const [isSaving, setIsSaving] = useState(false);
  // ✅ CORREÇÃO CRÍTICA: Estado de inicialização para evitar setState durante render
  const [isInitializing, setIsInitializing] = useState(true);
  const emergencyBackupInterval = useRef<NodeJS.Timeout | null>(null);
  const beforeUnloadHandlerSet = useRef(false);
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ CORREÇÃO: Inicializar estados das abas
  const initializeTabStates = useCallback(() => {
    const initialStates: TabStates = {};
    const tabs: TabName[] = ['basic', 'stages', 'fields', 'distribution', 'cadence', 'qualification', 'motives'];
    
    tabs.forEach(tab => {
      initialStates[tab] = {
        hasChanges: false,
        lastSaved: null,
        pendingData: {},
        errorCount: 0
      };
    });
    
    setTabStates(initialStates);
  }, []);

  // ✅ CORREÇÃO CRÍTICA: Marcar aba como modificada com guards de loading
  const markTabDirty = useCallback((tabName: TabName, data: any) => {
    // ✅ GUARD 1: Bloquear durante inicialização para evitar setState durante render
    if (isInitializing) {
      logger.debug(`Auto-save bloqueado durante inicialização: ${tabName}`, {
        domain: 'smart-autosave',
        tab: tabName,
        reason: 'component-initializing'
      });
      return;
    }

    // ✅ GUARD 2: Verificar se pipeline ID existe
    if (!pipelineId) {
      logger.debug(`Auto-save bloqueado sem pipeline ID: ${tabName}`, {
        domain: 'smart-autosave',
        tab: tabName,
        reason: 'no-pipeline-id'
      });
      return;
    }

    // ✅ DEBOUNCE: Cancelar auto-save anterior se existir
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current);
    }

    // ✅ DEBOUNCE: Aguardar 1.5s antes de marcar como dirty
    autoSaveDebounceRef.current = setTimeout(() => {
      setTabStates(prev => ({
        ...prev,
        [tabName]: {
          ...prev[tabName],
          hasChanges: true,
          pendingData: data
        }
      }));

      logger.debug(`Aba marcada como modificada: ${tabName}`, {
        domain: 'smart-autosave',
        tab: tabName,
        hasData: !!data,
        debounced: true
      });
    }, 1500);
  }, [isInitializing, pipelineId]);

  // ✅ NOVO: Marcar aba como limpa (para callback externo)
  const markTabClean = useCallback((tabName: TabName) => {
    setTabStates(prev => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        hasChanges: false,
        lastSaved: new Date(),
        pendingData: {},
        errorCount: 0
      }
    }));
    
    logger.debug(`Aba marcada como limpa externamente: ${tabName}`, {
      domain: 'smart-autosave',
      tab: tabName,
      source: 'external-callback'
    });
  }, []);

  // ✅ NOVO: Marcar erro na aba (para callback externo)
  const markTabError = useCallback((tabName: TabName, error: any) => {
    setTabStates(prev => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        errorCount: prev[tabName].errorCount + 1
      }
    }));
    
    logger.error(`Erro marcado externamente para aba ${tabName}`, {
      domain: 'smart-autosave',
      tab: tabName,
      error: error instanceof Error ? error.message : error,
      source: 'external-callback'
    });
  }, []);

  // ✅ CORREÇÃO: Salvar aba específica com retry
  const saveTab = useCallback(async (tabName: TabName, data?: any): Promise<boolean> => {
    if (!pipelineId) {
      logger.warn('Tentativa de auto-save sem pipeline ID', { domain: 'smart-autosave' });
      return false;
    }

    const tabState = tabStatesRef.current[tabName];
    if (!tabState?.hasChanges && !data) {
      logger.debug(`Aba ${tabName} não tem mudanças para salvar`, { domain: 'smart-autosave' });
      return true;
    }

    const dataToSave = data || tabState?.pendingData;
    if (!dataToSave || Object.keys(dataToSave).length === 0) {
      logger.debug(`Aba ${tabName} não tem dados para salvar`, { domain: 'smart-autosave' });
      return true;
    }

    setIsSaving(true);
    let attempts = 0;
    const maxAttempts = optsRef.current.retryAttempts || 3;

    while (attempts < maxAttempts) {
      try {
        loggers.autoSave.completed(`Salvando aba ${tabName} (tentativa ${attempts + 1})`, {
          pipelineId: pipelineId.substring(0, 8),
          tab: tabName,
          attempt: attempts + 1,
          maxAttempts
        }, Date.now());

        await saveFunctionRef.current(tabName, dataToSave);

        // ✅ SUCESSO: Marcar como salvo usando função interna
        markTabClean(tabName);

        if (optsRef.current.showSaveToasts) {
          showSuccessToast(
            'Auto-save',
            `Mudanças da aba "${getTabDisplayName(tabName)}" salvas automaticamente`
          );
        }

        setIsSaving(false);
        return true;

      } catch (error: any) {
        attempts++;
        logger.error(`Erro ao salvar aba ${tabName} (tentativa ${attempts})`, {
          domain: 'smart-autosave',
          error: error.message,
          tab: tabName,
          attempt: attempts
        });

        if (attempts < maxAttempts) {
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, optsRef.current.retryDelay));
        } else {
          // ✅ FALHA: Marcar erro usando função interna
          markTabError(tabName, error);

          if (optsRef.current.showSaveToasts) {
            showErrorToast(
              'Erro no auto-save',
              `Erro ao salvar aba "${getTabDisplayName(tabName)}". Dados preservados localmente.`
            );
          }
        }
      }
    }

    setIsSaving(false);
    return false;
  }, [pipelineId, markTabClean, markTabError]); // ✅ OTIMIZADO: removido saveFunction (agora usa ref)

  // ✅ CORREÇÃO: Mudar de aba com auto-save
  const changeTab = useCallback(async (newTab: TabName): Promise<boolean> => {
    const currentTabValue = currentTabRef.current;
    if (newTab === currentTabValue) return true;

    logger.info(`Mudando de aba: ${currentTabValue} → ${newTab}`, {
      domain: 'smart-autosave',
      fromTab: currentTabValue,
      toTab: newTab,
      hasChanges: tabStatesRef.current[currentTabValue]?.hasChanges
    });

    // Auto-save da aba atual se houver mudanças
    if (tabStatesRef.current[currentTabValue]?.hasChanges) {
      const saveSuccess = await saveTab(currentTabValue);
      if (!saveSuccess) {
        // Se falhar, perguntar ao usuário se quer continuar
        const shouldContinue = window.confirm(
          `Erro ao salvar mudanças da aba "${getTabDisplayName(currentTabValue)}". Deseja continuar mesmo assim? As mudanças serão perdidas.`
        );
        if (!shouldContinue) {
          return false;
        }
      }
    }

    setCurrentTab(newTab);
    return true;
  }, [saveTab]); // ✅ OTIMIZAÇÃO: Removido currentTab, usar ref

  // ✅ CORREÇÃO: Salvar todas as abas pendentes usando ref
  const saveAllPendingTabs = useCallback(async (): Promise<boolean> => {
    const currentTabStates = tabStatesRef.current;
    const pendingTabs = Object.keys(currentTabStates).filter(
      tab => currentTabStates[tab].hasChanges
    ) as TabName[];

    if (pendingTabs.length === 0) {
      logger.debug('Nenhuma aba pendente para salvar', { domain: 'smart-autosave' });
      return true;
    }

    logger.info(`Salvando ${pendingTabs.length} abas pendentes`, {
      domain: 'smart-autosave',
      pendingTabs
    });

    const savePromises = pendingTabs.map(tab => saveTab(tab));
    const results = await Promise.allSettled(savePromises);
    
    const failures = results.filter((result, index) => 
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)
    );

    if (failures.length > 0) {
      logger.warn(`${failures.length} abas falharam ao salvar`, {
        domain: 'smart-autosave',
        totalTabs: pendingTabs.length,
        failures: failures.length
      });
      return false;
    }

    return true;
  }, [saveTab]);

  // ✅ CORREÇÃO: Emergency backup usando ref para evitar dependências
  const createEmergencyBackup = useCallback(() => {
    if (!pipelineId || !optsRef.current.enableEmergencyBackup) return;

    const currentTabStates = tabStatesRef.current;
    const pendingData = Object.keys(currentTabStates)
      .filter(tab => currentTabStates[tab].hasChanges)
      .reduce((acc, tab) => {
        acc[tab] = currentTabStates[tab].pendingData;
        return acc;
      }, {} as Record<string, any>);

    if (Object.keys(pendingData).length === 0) return;

    const emergencyData = {
      pipelineId,
      timestamp: Date.now(),
      currentTab: currentTabRef.current,
      pendingData,
      version: '1.0'
    };

    try {
      localStorage.setItem(
        `pipeline_emergency_${pipelineId}`,
        JSON.stringify(emergencyData)
      );

      logger.debug('Backup de emergência criado', {
        domain: 'smart-autosave',
        pipelineId: pipelineId.substring(0, 8),
        tabsWithChanges: Object.keys(pendingData).length
      });
    } catch (error) {
      logger.error('Erro ao criar backup de emergência', {
        domain: 'smart-autosave',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [pipelineId]); // ✅ OTIMIZAÇÃO: Removido currentTab e opts, usar refs

  // ✅ CORREÇÃO: Recovery de emergency backup
  const checkForEmergencyRecovery = useCallback((): any | null => {
    if (!pipelineId) return null;

    try {
      const emergencyData = localStorage.getItem(`pipeline_emergency_${pipelineId}`);
      if (!emergencyData) return null;

      const parsed = JSON.parse(emergencyData);
      const ageMinutes = (Date.now() - parsed.timestamp) / (1000 * 60);

      // Só considerar backup se for recente (menos de 1 hora)
      if (ageMinutes > 60) {
        localStorage.removeItem(`pipeline_emergency_${pipelineId}`);
        return null;
      }

      logger.info('Backup de emergência encontrado', {
        domain: 'smart-autosave',
        ageMinutes: Math.round(ageMinutes),
        tabsWithData: Object.keys(parsed.pendingData).length
      });

      return parsed;
    } catch (error) {
      logger.error('Erro ao recuperar backup de emergência', {
        domain: 'smart-autosave',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }, [pipelineId]);

  // ✅ CORREÇÃO: Limpar emergency backup
  const clearEmergencyBackup = useCallback(() => {
    if (!pipelineId) return;
    localStorage.removeItem(`pipeline_emergency_${pipelineId}`);
  }, [pipelineId]);

  // ✅ CORREÇÃO: Refs para evitar dependências instáveis
  const tabStatesRef = useRef(tabStates);
  const optsRef = useRef(opts);
  const currentTabRef = useRef(currentTab);
  tabStatesRef.current = tabStates;
  optsRef.current = opts;
  currentTabRef.current = currentTab;

  const handleBeforeUnload = useCallback(async (event: BeforeUnloadEvent) => {
    const currentTabStates = tabStatesRef.current;
    const pendingTabs = Object.keys(currentTabStates).filter(
      tab => currentTabStates[tab].hasChanges
    );

    if (pendingTabs.length > 0) {
      // Criar backup de emergência
      createEmergencyBackup();
      
      // Tentar salvar rapidamente (sem await para não bloquear)
      saveAllPendingTabs();
      
      // Mostrar aviso padrão do browser
      event.preventDefault();
      event.returnValue = 'Você tem mudanças não salvas. Tem certeza que deseja sair?';
      return event.returnValue;
    }
  }, [createEmergencyBackup, saveAllPendingTabs]);

  // ✅ CORREÇÃO CRÍTICA: Delayed Auto-Save Pattern - aguardar inicialização completa
  useEffect(() => {
    // Aguardar 3 segundos para garantir que componente terminou de carregar
    const initializationTimer = setTimeout(() => {
      setIsInitializing(false);
      logger.info('Auto-save habilitado após inicialização', {
        domain: 'smart-autosave',
        pipelineId: pipelineId?.substring(0, 8),
        delay: '3000ms'
      });
    }, 3000);

    return () => {
      clearTimeout(initializationTimer);
      // ✅ CLEANUP: Limpar debounce pending ao desmontar
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current);
      }
    };
  }, [pipelineId]);

  // ✅ CORREÇÃO: Setup de efeitos
  useEffect(() => {
    initializeTabStates();
  }, [initializeTabStates]);

  useEffect(() => {
    if (!beforeUnloadHandlerSet.current) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      beforeUnloadHandlerSet.current = true;
    }

    return () => {
      if (beforeUnloadHandlerSet.current) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        beforeUnloadHandlerSet.current = false;
      }
    };
  }, [handleBeforeUnload]);

  useEffect(() => {
    if (opts.enableEmergencyBackup && opts.emergencyBackupInterval) {
      emergencyBackupInterval.current = setInterval(
        createEmergencyBackup,
        opts.emergencyBackupInterval
      );

      return () => {
        if (emergencyBackupInterval.current) {
          clearInterval(emergencyBackupInterval.current);
        }
      };
    }
  }, [createEmergencyBackup, opts.enableEmergencyBackup, opts.emergencyBackupInterval]);

  // ✅ CORREÇÃO: Event listener para auto-save success via evento personalizado
  useEffect(() => {
    const handleAutoSaveSuccess = (event: any) => {
      const { tabName } = event.detail;
      if (tabName) {
        markTabClean(tabName);
        logger.debug(`Auto-save success via evento para aba: ${tabName}`, {
          domain: 'smart-autosave',
          tabName,
          source: 'custom-event'
        });
      }
    };

    window.addEventListener('autosave-success', handleAutoSaveSuccess);
    return () => {
      window.removeEventListener('autosave-success', handleAutoSaveSuccess);
    };
  }, [markTabClean]);

  // ✅ CORREÇÃO CRÍTICA: Memoizar objeto retornado para evitar loop infinito
  return useMemo(() => ({
    // Estado
    tabStates,
    currentTab,
    isSaving,
    isInitializing, // ✅ NOVO: Expor estado de inicialização
    
    // Ações principais
    markTabDirty,
    markTabClean, // ✅ NOVO: Expor função para callback externo
    markTabError, // ✅ NOVO: Expor função para callback externo
    changeTab,
    saveTab,
    saveAllPendingTabs,
    
    // Emergency recovery
    checkForEmergencyRecovery,
    clearEmergencyBackup,
    createEmergencyBackup,
    
    // Utilities
    hasUnsavedChanges: Object.values(tabStates).some(state => state.hasChanges),
    getPendingTabsCount: () => Object.values(tabStates).filter(state => state.hasChanges).length
  }), [
    // Estados que afetam o retorno
    tabStates,
    currentTab,
    isSaving,
    isInitializing, // ✅ NOVO: Incluir na dependência
    // Funções estáveis
    markTabDirty,
    markTabClean, // ✅ NOVO: Incluir na dependência
    markTabError, // ✅ NOVO: Incluir na dependência
    changeTab,
    saveTab,
    saveAllPendingTabs,
    checkForEmergencyRecovery,
    clearEmergencyBackup,
    createEmergencyBackup
  ]);
};

// ✅ CORREÇÃO: Utility para nomes de exibição das abas
function getTabDisplayName(tabName: TabName): string {
  const displayNames: Record<TabName, string> = {
    basic: 'Básico',
    stages: 'Etapas',
    fields: 'Campos',
    distribution: 'Distribuição',
    cadence: 'Cadência',
    qualification: 'Qualificação',
    motives: 'Motivos'
  };
  return displayNames[tabName] || tabName;
}

export default useSmartAutoSave;