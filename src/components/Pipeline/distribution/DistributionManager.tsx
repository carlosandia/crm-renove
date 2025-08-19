import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Shuffle, 
  RotateCcw,
  UserPlus,
  Settings,
  Clock,
  UserCheck,
  AlertTriangle,
  Save,
  RefreshCw,
  TestTube,
  Loader2
} from 'lucide-react';

// ✅ NOVO: Import do seletor de horários específicos
import WorkingHoursSelector from './WorkingHoursSelector';
import type { WorkingHoursConfig } from '../../../types/workingHours';


// Constants
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';
import { useDistributionManager } from '../../../hooks/useDistributionApi';
import { toast } from 'sonner';

// ✅ OTIMIZAÇÃO: Importar configurações de logging
import { COMPONENT_LOGGING_CONFIG } from '../../../config/logging';

// ================================================================================
// LOGGER CONSTANTE (FORA DO HOOK PARA EVITAR WARNING EXHAUSTIVE-DEPS)
// ================================================================================
// AIDEV-NOTE: Logger movido para fora do hook para eliminar warning react-hooks/exhaustive-deps
const logger = {
  debug: (operation: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`🔧 [DistributionManager.${operation}]`, data);
    }
  },
  error: (operation: string, error: any) => {
    console.error(`❌ [DistributionManager.${operation}]`, error);
  }
};

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
import type { 
  DistributionRule, 
  SaveDistributionRuleRequest
} from '../../../services/distributionApi';

import type {
  UseDistributionManagerReturn as ApiDistributionManagerReturn 
} from '../../../hooks/useDistributionApi';

interface DistributionManagerProps {
  pipelineId: string;
  onRuleChange?: (rule: DistributionRule, isNavigationChange?: boolean) => void;
}

export interface UseLocalDistributionManagerProps {
  pipelineId: string;
  onRuleChange?: (rule: DistributionRule, isNavigationChange?: boolean) => void;
}

export interface UseLocalDistributionManagerReturn {
  // Estado local
  localRule: DistributionRule | null;
  rule: DistributionRule | null; // Alias para facilitar acesso
  hasUnsavedChanges: boolean;
  
  // Dados da API
  apiData: ApiDistributionManagerReturn;
  
  // ✅ NOVO: Estado de inicialização para sincronização com componente pai
  isInitializing: boolean;
  
  // Handlers locais
  handleModeChange: (e: React.MouseEvent, mode: 'manual' | 'rodizio') => void;
  handleToggleActive: () => void;
  handleToggleWorkingHours: () => void;
  handleWorkingHoursConfigChange: (config: WorkingHoursConfig) => void;
  handleToggleSkipInactive: () => void;
  handleToggleFallback: () => void;
  
  // ✅ EXPOSTO: Ações de persistência para sistema centralizado
  handleSave: () => Promise<void>;
  handleReset: () => void;
  handleTest: () => Promise<void>;
  handleResetDistribution: () => Promise<void>;
}

// ================================================================================
// HOOKS CUSTOMIZADOS
// ================================================================================
export function useLocalDistributionManager({ 
  pipelineId,
  onRuleChange 
}: UseLocalDistributionManagerProps): UseLocalDistributionManagerReturn {
  
  // ✅ CORREÇÃO: Logger movido para constante externa para eliminar warning exhaustive-deps
  
  // 🔧 CORREÇÃO: Verificar se já foi inicializado para evitar logs excessivos
  const [initialized, setInitialized] = useState(false);
  // ✅ NOVO: Estado para controlar inicialização e evitar callback prematuro
  const [isInitializing, setIsInitializing] = useState(true);
  const isCreationMode = !pipelineId || pipelineId.length === 0;
  const hasValidPipelineId = !!(pipelineId && pipelineId.length > 0);
  
  // 🔧 OTIMIZAÇÃO: Log inicial simplificado
  React.useEffect(() => {
    if (!initialized) {
      logger.debug('initialization', {
        pipelineId: pipelineId?.substring(0, 8) + '...' || 'new',
        hasValidPipelineId,
        isCreationMode
      });
      setInitialized(true);
    }
  }, [pipelineId, hasValidPipelineId, isCreationMode, initialized]);
  
  // ✅ CORREÇÃO: Só usar API se há pipelineId válido
  const apiData = useDistributionManager(hasValidPipelineId ? pipelineId : undefined);
  
  // 🔧 CORREÇÃO: Memoizar defaultRule para evitar re-criação constante
  // AIDEV-NOTE: SEMPRE usar modo 'manual' como padrão para novas pipelines
  const defaultRule = React.useMemo<DistributionRule>(() => ({
    pipeline_id: '', // Será preenchido quando houver pipelineId válido
    mode: 'manual', // ✅ PADRÃO OBRIGATÓRIO: sempre manual inicialmente
    is_active: true,
    working_hours_only: false,
    skip_inactive_members: true,
    fallback_to_manual: true
  }), []);
  
  // ✅ CORREÇÃO: Inicializar estado local com valor padrão em modo criação
  const [localRule, setLocalRule] = useState<DistributionRule | null>(() => {
    // Se não há pipelineId válido (modo criação), inicializar com valor padrão
    if (isCreationMode) {
      return defaultRule;
    }
    
    // Modo edição: inicializar com null para aguardar dados da API
    return null;
  });

  // ✅ CRÍTICO: Correção para modo criação - marcar como não inicializando após estado estar pronto
  useEffect(() => {
    if (isCreationMode && localRule && isInitializing) {
      logger.debug('finalizando-inicializacao', {
        mode: 'creation',
        localRule: localRule.mode
      });
      setIsInitializing(false);
    }
  }, [isCreationMode, localRule, isInitializing]);

  // 🔧 CORREÇÃO: Inicializar com dados da API quando disponível (modo edição)
  useEffect(() => {
    if (hasValidPipelineId && apiData.rule) {
      // ✅ CORREÇÃO: Sempre sincronizar com dados da API quando disponíveis
      if (!localRule) {
        logger.debug('carregando-dados-api', { hasApiRule: !!apiData.rule });
        setLocalRule(apiData.rule);
        setIsInitializing(false);
      } else {
        // ✅ NOVO: Sincronizar dados salvos da API com estado local após refresh
        const shouldForceSync = !localRule.working_hours_start && apiData.rule.working_hours_start;
        if (shouldForceSync) {
          logger.debug('sincronizando-dados-salvos', { hasWorkingHours: !!apiData.rule.working_hours_start });
          setLocalRule(apiData.rule);
        }
      }
    }
  }, [apiData.rule, localRule, hasValidPipelineId, pipelineId]);

  // ✅ CORREÇÃO: Sincronizar apenas quando há salvamento bem-sucedido, não automaticamente
  useEffect(() => {
    if (hasValidPipelineId && apiData.rule && localRule && !isInitializing) {
      // AIDEV-NOTE: Sincronização controlada - apenas após operações de salvamento
      // Verificar se há flag de sincronização pendente (será adicionada no handleSave)
      const shouldSync = sessionStorage.getItem(`sync-pending-${hasValidPipelineId ? pipelineId : 'temp'}`);
      
      if (shouldSync) {
        logger.debug('sincronizando-apos-salvamento', {
          apiMode: apiData.rule.mode,
          localMode: localRule.mode
        });
        setLocalRule(apiData.rule);
        sessionStorage.removeItem(`sync-pending-${hasValidPipelineId ? pipelineId : 'temp'}`);
      }
    }
  }, [apiData.rule, localRule, hasValidPipelineId, isInitializing, pipelineId]);

  // ✅ CORREÇÃO: Função para comparação inteligente de regras de distribuição
  const areRulesEqual = React.useCallback((rule1: DistributionRule | null, rule2: DistributionRule | null): boolean => {
    if (!rule1 || !rule2) return rule1 === rule2;
    
    // Comparar apenas campos relevantes para o usuário (ignorar timestamps e contadores)
    const normalizeRule = (rule: DistributionRule) => ({
      mode: rule.mode,
      is_active: rule.is_active ?? false,
      working_hours_only: rule.working_hours_only ?? false,
      skip_inactive_members: rule.skip_inactive_members ?? false,
      fallback_to_manual: rule.fallback_to_manual ?? false
    });
    
    const normalized1 = normalizeRule(rule1);
    const normalized2 = normalizeRule(rule2);
    
    return JSON.stringify(normalized1) === JSON.stringify(normalized2);
  }, []);

  // 🔧 CORREÇÃO: Memoizar verificação de mudanças com comparação inteligente e proteção contra sincronização prematura
  const hasUnsavedChanges = React.useMemo(() => {
    // Se não há regra local, não há mudanças
    if (!localRule) return false;
    
    // Se não há regra da API ainda (carregando), considerar que há mudanças se regra local não é padrão
    if (!apiData.rule) {
      const isDefaultRule = localRule.mode === 'manual' && 
                           localRule.is_active === true && 
                           localRule.working_hours_only === false && 
                           localRule.skip_inactive_members === true && 
                           localRule.fallback_to_manual === true;
      return !isDefaultRule;
    }
    
    // Comparação inteligente entre regras
    return !areRulesEqual(localRule, apiData.rule);
  }, [localRule, apiData.rule, areRulesEqual]);

  // 🔧 CORREÇÃO: Memoizar callback de notificação com flag de navegação
  const notifyRuleChange = React.useCallback((rule: DistributionRule, isNavigationChange = false) => {
    if (onRuleChange) {
      onRuleChange(rule, isNavigationChange);
    }
  }, [onRuleChange]);

  // ✅ CRÍTICO: Flag para evitar notificações múltiplas da mesma regra
  const [lastNotifiedRule, setLastNotifiedRule] = useState<string | null>(null);
  const [lastModeNotified, setLastModeNotified] = useState<string | null>(null);

  // ✅ CRÍTICO: Notificar mudanças via callback APENAS após inicialização e se realmente mudou
  useEffect(() => {
    if (localRule && !isInitializing) {
      const currentRuleHash = JSON.stringify(localRule);
      if (lastNotifiedRule !== currentRuleHash) {
        // Detectar se é apenas mudança de modo (navegação)
        const isNavigationChange = lastModeNotified !== null && 
                                   lastModeNotified !== localRule.mode && 
                                   lastNotifiedRule !== null;
        
        logger.debug('notificando-mudanca-pos-inicializacao', {
          isNavigationChange,
          lastMode: lastModeNotified,
          currentMode: localRule.mode
        });
        
        notifyRuleChange(localRule, isNavigationChange);
        setLastNotifiedRule(currentRuleHash);
        setLastModeNotified(localRule.mode);
      }
    } else if (localRule && isInitializing) {
      // ✅ REMOVIDO: Se é ignorado, não precisa de log
      // Inicializar modo para comparação futura
      if (localRule.mode && !lastModeNotified) {
        setLastModeNotified(localRule.mode);
      }
    }
  }, [localRule, notifyRuleChange, isInitializing, lastNotifiedRule, lastModeNotified]);

  // Handlers para mudanças locais
  const handleModeChange = (e: React.MouseEvent, mode: 'manual' | 'rodizio') => {
    e.preventDefault();
    e.stopPropagation();
    
    logger.debug('mudando-modo', { 
      from: localRule?.mode, 
      to: mode 
    });
    
    if (localRule) {
      setLocalRule(prev => prev ? { ...prev, mode } : null);
    }
  };

  const handleToggleActive = () => {
    if (localRule) {
      setLocalRule(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
    }
  };

  const handleToggleWorkingHours = () => {
    if (localRule) {
      setLocalRule(prev => prev ? { ...prev, working_hours_only: !prev.working_hours_only } : null);
    }
  };

  // ✅ NOVO: Handler para configuração de horários específicos
  const handleWorkingHoursConfigChange = (config: WorkingHoursConfig) => {
    if (localRule) {
      setLocalRule(prev => prev ? { 
        ...prev, 
        working_hours_only: config.enabled,
        // ✅ Atualizar novos campos do banco de dados
        working_hours_start: config.hours.start,
        working_hours_end: config.hours.end,
        working_days: config.hours.days
      } : null);
    }
  };

  const handleToggleSkipInactive = () => {
    if (localRule) {
      setLocalRule(prev => prev ? { ...prev, skip_inactive_members: !prev.skip_inactive_members } : null);
    }
  };

  const handleToggleFallback = () => {
    if (localRule) {
      setLocalRule(prev => prev ? { ...prev, fallback_to_manual: !prev.fallback_to_manual } : null);
    }
  };

  // Ações de persistência
  const handleSave = async () => {
    if (!localRule) return;
    
    try {
      logger.debug('salvando-regra-local', {
        currentMode: localRule.mode,
        hasWorkingHours: !!localRule.working_hours_start
      });
      
      // AIDEV-NOTE: Marcar que sincronização deve ocorrer após salvamento
      const syncKey = `sync-pending-${hasValidPipelineId ? pipelineId : 'temp'}`;
      sessionStorage.setItem(syncKey, 'true');
      
      const saveData: SaveDistributionRuleRequest = {
        mode: localRule.mode,
        is_active: localRule.is_active,
        working_hours_only: localRule.working_hours_only,
        // ✅ NOVO: Incluir campos de horários específicos no salvamento
        working_hours_start: localRule.working_hours_start,
        working_hours_end: localRule.working_hours_end,
        working_days: localRule.working_days,
        skip_inactive_members: localRule.skip_inactive_members,
        fallback_to_manual: localRule.fallback_to_manual
      };
      
      await apiData.saveRule(saveData);
      logger.debug('regra-salva-com-sucesso', { 
        mode: localRule.mode 
      });
      
      // ✅ MELHORIA: Notificar sucesso via toast
      toast.success('Regra de distribuição salva', {
        description: `Modo ${localRule.mode} configurado com sucesso`
      });
      
    } catch (error) {
      logger.error('erro-ao-salvar', error);
      // Remover flag de sincronização em caso de erro
      const syncKey = `sync-pending-${hasValidPipelineId ? pipelineId : 'temp'}`;
      sessionStorage.removeItem(syncKey);
      
      // ✅ MELHORIA: Notificar erro via toast
      toast.error('Erro ao salvar regra', {
        description: 'Não foi possível salvar as configurações de distribuição'
      });
    }
  };

  const handleReset = () => {
    if (apiData.rule) {
      setLocalRule(apiData.rule);
      toast.info('Alterações descartadas');
    }
  };

  const handleTest = async () => {
    try {
      const result = await apiData.testDistribution();
      logger.debug('teste-distribuicao-concluido', { 
        success: result?.success 
      });
    } catch (error) {
      logger.error('erro-no-teste', error);
    }
  };

  const handleResetDistribution = async () => {
    try {
      await apiData.resetDistribution();
      logger.debug('distribuicao-resetada', { 
        success: true
      });
    } catch (error) {
      logger.error('erro-no-reset', error);
    }
  };

  return {
    localRule,
    rule: localRule, // ✅ CORREÇÃO: Alias para facilitar acesso
    hasUnsavedChanges,
    apiData,
    // ✅ NOVO: Expor estado de inicialização
    isInitializing,
    handleModeChange,
    handleToggleActive,
    handleToggleWorkingHours,
    handleWorkingHoursConfigChange,
    handleToggleSkipInactive,
    handleToggleFallback,
    // ✅ EXPOSTO: Funções de persistência para sistema centralizado
    handleSave,
    handleReset,
    handleTest,
    handleResetDistribution
  };
}

// ================================================================================
// COMPONENTE DE RENDERIZAÇÃO DE DISTRIBUIÇÃO
// ================================================================================
interface DistributionManagerRenderProps {
  distributionManager: UseLocalDistributionManagerReturn;
}

export function DistributionManagerRender({ distributionManager }: DistributionManagerRenderProps) {
  const {
    localRule,
    hasUnsavedChanges,
    apiData,
    handleModeChange,
    handleToggleActive,
    handleToggleWorkingHours,
    handleWorkingHoursConfigChange,
    handleToggleSkipInactive,
    handleToggleFallback,
    handleSave,
    handleReset,
    handleTest,
    handleResetDistribution
  } = distributionManager;

  // Estados de carregamento
  const { isLoading, isSaving, isTesting, isResetting } = apiData;

  // ============================================
  // OTIMIZADO: Logs removidos para evitar HMR excessivo
  // ============================================

  // ✅ CORREÇÃO: Só mostrar loading se realmente não há regra local
  // Em modo criação, localRule deve ser definida imediatamente com valores padrão
  if (!localRule) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
            Carregando Distribuição...
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Buscando configurações de distribuição da pipeline.
          </p>
        </div>
      </div>
    );
  }

  // ✅ SIMPLIFICADO: Log básico de render apenas em desenvolvimento
  if (import.meta.env.DEV) {
    console.log('🎨 [DistributionRender]', {
      mode: localRule.mode,
      hasUnsavedChanges,
      isLoading,
      isSaving
    });
  }

  return (
    <div className="space-y-6">
      {/* ===== SEÇÃO 1: MODO DE DISTRIBUIÇÃO ===== */}
      <BlurFade delay={0.1} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 rounded-lg">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Distribuição de Leads</h3>
              <p className="text-sm text-slate-500">Escolha como os leads serão atribuídos aos vendedores</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={localRule.mode === 'manual' ? 'default' : 'outline'}
                onClick={(e) => handleModeChange(e, 'manual')}
                className="h-20 flex-col gap-2"
                disabled={isSaving}
              >
                <UserPlus className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Manual</div>
                  <div className="text-xs opacity-75">Atribuição manual</div>
                </div>
              </Button>

              <Button
                type="button"
                variant={localRule.mode === 'rodizio' ? 'default' : 'outline'}
                onClick={(e) => handleModeChange(e, 'rodizio')}
                className="h-20 flex-col gap-2"
                disabled={isSaving}
              >
                <Shuffle className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Rodízio</div>
                  <div className="text-xs opacity-75">Distribuição automática</div>
                </div>
              </Button>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Modo atual:</strong> {localRule.mode === 'manual' ? 'Manual' : 'Rodízio Automático'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {localRule.mode === 'manual' 
                  ? 'Leads serão atribuídos manualmente pelos administradores'
                  : 'Leads serão distribuídos automaticamente entre os vendedores ativos'
                }
              </p>
            </div>
          </div>
        </div>
      </BlurFade>

      {localRule.mode === 'rodizio' && (
        <BlurFade delay={0.2} direction="up">
          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Configurações Avançadas</h3>
                <p className="text-sm text-slate-500">Defina regras específicas para o rodízio automático</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* ✅ NOVO: Seletor de Horários Específicos */}
              <WorkingHoursSelector
                value={{
                  enabled: localRule.working_hours_only,
                  hours: {
                    start: localRule.working_hours_start || '09:00:00',
                    end: localRule.working_hours_end || '18:00:00',
                    days: localRule.working_days || [2, 3, 4, 5, 6] // Segunda a Sexta
                  }
                }}
                onChange={handleWorkingHoursConfigChange}
                disabled={isSaving}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  <div>
                    <Label>Pular Vendedores Inativos</Label>
                    <p className="text-xs text-muted-foreground">
                      Não distribuir para vendedores marcados como inativos
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localRule.skip_inactive_members}
                  onCheckedChange={handleToggleSkipInactive}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <div>
                    <Label>Fallback para Manual</Label>
                    <p className="text-xs text-muted-foreground">
                      Se não houver vendedores disponíveis, permitir atribuição manual
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localRule.fallback_to_manual}
                  onCheckedChange={handleToggleFallback}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </BlurFade>
      )}

      {/* ✅ CORREÇÃO: Estatísticas aparecem APENAS no modo Rodízio */}
      {apiData.stats && localRule.mode === 'rodizio' && (
        <BlurFade delay={0.3} direction="up">
          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Estatísticas de Distribuição</h3>
                <p className="text-sm text-slate-500">Métricas sobre a distribuição de leads</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {apiData.stats.total_assignments}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Atribuições
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {apiData.stats.assignment_success_rate}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Taxa de Sucesso
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {apiData.stats.recent_assignments.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recentes
                  </div>
                </div>
              </div>
              
              {localRule.mode === 'rodizio' && (
                <div className="pt-4 flex justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Testar Distribuição
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDistribution}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Resetar Rodízio
                  </Button>
                </div>
              )}
            </div>
          </div>
        </BlurFade>
      )}

      {/* Footer removido - usando sistema centralizado de salvamento */}
    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL CONECTADO
// ================================================================================
interface ConnectedDistributionManagerProps {
  pipelineId: string;
  onRuleChange?: (rule: DistributionRule) => void;
}

export function ConnectedDistributionManager({ 
  pipelineId, 
  onRuleChange 
}: ConnectedDistributionManagerProps) {
  const distributionManager = useLocalDistributionManager({
    pipelineId,
    onRuleChange
  });

  return <DistributionManagerRender distributionManager={distributionManager} />;
}

// ================================================================================
// EXPORTAÇÕES
// ================================================================================
export default ConnectedDistributionManager;

// Manter compatibilidade com versão anterior (sem backend)
export { DistributionManagerRender as DistributionManagerOffline }; 