// ============================================
// SISTEMA DE PERSISTÊNCIA DE ESTADO CENTRALIZADO
// ============================================

/**
 * Sistema centralizado para persistir estados de visualização, tabs, filtros
 * e outros estados importantes em todos os módulos do CRM
 */

// 🔧 LOGS CONDICIONAIS: Baseado em VITE_LOG_LEVEL
import { logger } from '../utils/logger';
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

export interface ModuleState {
  [key: string]: any;
}

export interface PersistenceConfig {
  storageKey: string;
  defaultState: ModuleState;
  validationRules?: {
    [key: string]: (value: any) => boolean;
  };
}

/**
 * Classe para gerenciar persistência de estado de módulos
 */
export class StatePersistenceManager {
  private static instance: StatePersistenceManager;
  
  static getInstance(): StatePersistenceManager {
    if (!StatePersistenceManager.instance) {
      StatePersistenceManager.instance = new StatePersistenceManager();
    }
    return StatePersistenceManager.instance;
  }

  /**
   * Salvar estado no localStorage
   */
  saveState(config: PersistenceConfig, state: ModuleState): void {
    try {
      const stateToSave = JSON.stringify(state);
      localStorage.setItem(config.storageKey, stateToSave);
      
      // 🔧 LOG CONDICIONAL: Apenas em modo debug
      if (isDebugMode) {
        console.log(`💾 Estado salvo para ${config.storageKey}:`, state);
      }
    } catch (error) {
      console.error(`❌ Erro ao salvar estado para ${config.storageKey}:`, error);
    }
  }

  /**
   * Recuperar estado do localStorage
   */
  loadState(config: PersistenceConfig): ModuleState {
    try {
      const savedState = localStorage.getItem(config.storageKey);
      
      if (!savedState) {
        // 🔧 LOG CONDICIONAL: Apenas em modo debug
        if (isDebugMode) {
          console.log(`📦 Nenhum estado salvo para ${config.storageKey} - usando padrão`);
        }
        return config.defaultState;
      }

      const parsedState = JSON.parse(savedState);
      
      // Validar estado se houver regras
      if (config.validationRules) {
        const isValid = this.validateState(parsedState, config.validationRules);
        if (!isValid) {
          // 🔧 LOG CONDICIONAL: Apenas em modo debug
          if (isDebugMode) {
            console.log(`⚠️ Estado inválido para ${config.storageKey} - usando padrão`);
          }
          return config.defaultState;
        }
      }

      // 🔧 LOG CONDICIONAL: Apenas em modo debug
      if (isDebugMode) {
        console.log(`🔄 Estado recuperado para ${config.storageKey}:`, parsedState);
      }
      return { ...config.defaultState, ...parsedState };
    } catch (error) {
      console.error(`❌ Erro ao carregar estado para ${config.storageKey}:`, error);
      return config.defaultState;
    }
  }

  /**
   * Validar estado carregado
   */
  private validateState(state: ModuleState, rules: { [key: string]: (value: any) => boolean }): boolean {
    for (const [key, validator] of Object.entries(rules)) {
      if (state[key] !== undefined && !validator(state[key])) {
        // 🔧 LOG CONDICIONAL: Apenas em modo debug
        if (isDebugMode) {
          logger.warn(`StatePersistence validação falhou para ${key}`, state[key]);
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Limpar estado específico
   */
  clearState(storageKey: string): void {
    try {
      localStorage.removeItem(storageKey);
      // 🔧 LOG CONDICIONAL: Apenas em modo debug
      if (isDebugMode) {
        console.log(`🗑️ Estado limpo para ${storageKey}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao limpar estado para ${storageKey}:`, error);
    }
  }

  /**
   * Limpar todos os estados do módulo (útil no logout)
   */
  clearAllModuleStates(): void {
    const keys = Object.keys(localStorage);
    const moduleKeys = keys.filter(key => key.startsWith('crm_'));
    
    moduleKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`❌ Erro ao limpar ${key}:`, error);
      }
    });
    
    // 🔧 LOG CONDICIONAL: Apenas em modo debug
    if (isDebugMode) {
      console.log(`🗑️ ${moduleKeys.length} estados de módulos limpos`);
    }
  }
}

/**
 * Hook personalizado para persistência de estado
 */
import { useState, useEffect, useCallback } from 'react';

export function useStatePersistence<T extends ModuleState>(config: PersistenceConfig) {
  const manager = StatePersistenceManager.getInstance();
  
  const [state, setState] = useState<T>(() => {
    return manager.loadState(config) as T;
  });

  // Função para atualizar estado com persistência automática
  const updateState = useCallback((newState: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      const updatedState = typeof newState === 'function' ? newState(prev) : { ...prev, ...newState };
      manager.saveState(config, updatedState);
      return updatedState;
    });
  }, [config, manager]);

  // Função para resetar para o estado padrão
  const resetState = useCallback(() => {
    const defaultState = config.defaultState as T;
    setState(defaultState);
    manager.saveState(config, defaultState);
  }, [config, manager]);

  return {
    state,
    updateState,
    resetState,
    saveState: (stateToSave: T) => manager.saveState(config, stateToSave),
    loadState: () => manager.loadState(config) as T
  };
}

/**
 * Configurações pré-definidas para módulos específicos
 */
export const MODULE_PERSISTENCE_CONFIGS = {
  // ModernAdminPipelineManager
  ADMIN_PIPELINE_MANAGER: {
    storageKey: 'crm_admin_pipeline_manager',
    defaultState: {
      viewMode: 'list',
      viewingPipelineId: null,
      editingPipelineId: null,
      searchFilter: '',
      selectedMemberFilter: ''
    },
    validationRules: {
      viewMode: (value: string) => ['list', 'create', 'edit', 'view'].includes(value)
    }
  } as PersistenceConfig,

  // ContactsModule
  CONTACTS_MODULE: {
    storageKey: 'crm_contacts_module',
    defaultState: {
      viewMode: 'table',
      searchTerm: '',
      statusFilter: 'all',
      currentPage: 1
    },
    validationRules: {
      viewMode: (value: string) => ['table', 'cards'].includes(value),
      currentPage: (value: number) => value > 0
    }
  } as PersistenceConfig,

  // IntegrationsModule
  INTEGRATIONS_MODULE: {
    storageKey: 'crm_integrations_module',
    defaultState: {
      activeTab: 'config'
    },
    validationRules: {
      activeTab: (value: string) => ['config', 'conversions', 'security', 'logs', 'calendar', 'email', 'company'].includes(value)
    }
  } as PersistenceConfig,

  // LeadsModuleWithTabs
  LEADS_MODULE_WITH_TABS: {
    storageKey: 'crm_leads_module_tabs',
    defaultState: {
      activeTab: 'leads',
      searchTerm: '',
      statusFilter: 'all',
      temperatureFilter: 'all'
    },
    validationRules: {
      activeTab: (value: string) => ['leads', 'pending'].includes(value)
    }
  } as PersistenceConfig,

  // DealsModule
  DEALS_MODULE: {
    storageKey: 'crm_deals_module',
    defaultState: {
      viewMode: 'pipeline',
      searchTerm: '',
      statusFilter: 'all'
    },
    validationRules: {
      viewMode: (value: string) => ['pipeline', 'table'].includes(value)
    }
  } as PersistenceConfig,

  // FormBuilderModule
  FORM_BUILDER_MODULE: {
    storageKey: 'crm_form_builder_module',
    defaultState: {
      editorMode: 'list',
      currentView: 'list',
      selectedFormId: null
    },
    validationRules: {
      editorMode: (value: string) => ['list', 'editor'].includes(value),
      currentView: (value: string) => ['list', 'builder', 'preview'].includes(value)
    }
  } as PersistenceConfig,

  // AdminDashboard
  ADMIN_DASHBOARD: {
    storageKey: 'crm_admin_dashboard',
    defaultState: {
      activeTab: 'overview'
    }
  } as PersistenceConfig,

  // MemberDashboard
  MEMBER_DASHBOARD: {
    storageKey: 'crm_member_dashboard',
    defaultState: {
      activeTab: 'overview'
    }
  } as PersistenceConfig,

  // NotificationAdminPanel
  NOTIFICATION_ADMIN_PANEL: {
    storageKey: 'crm_notification_admin_panel',
    defaultState: {
      activeTab: 'create'
    },
    validationRules: {
      activeTab: (value: string) => ['create', 'manage', 'analytics'].includes(value)
    }
  } as PersistenceConfig,

  // EmpresasModule
  EMPRESAS_MODULE: {
    storageKey: 'crm_empresas_module',
    defaultState: {
      showForm: false,
      showDetailsModal: false,
      showEditModal: false,
      editModalTab: 'info',
      searchTerm: '',
      statusFilter: 'all',
      currentPage: 1
    },
    validationRules: {
      editModalTab: (value: string) => ['info', 'senha', 'vendedores'].includes(value),
      statusFilter: (value: string) => ['all', 'ativo', 'desativado'].includes(value),
      currentPage: (value: number) => value > 0
    }
  } as PersistenceConfig,

  // CadenceModule
  CADENCE_MODULE: {
    storageKey: 'crm_cadence_module',
    defaultState: {
      selectedPipeline: '',
      showModal: false,
      showTaskForm: false
    }
  } as PersistenceConfig
};

export default StatePersistenceManager; 