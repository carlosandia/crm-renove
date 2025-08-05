import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { AnimatedCard } from '../../ui/animated-card';
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

// Shared components
import { SectionHeader } from '../shared/SectionHeader';

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';
import { useDistributionManager } from '../../../hooks/useDistributionApi';
import { toast } from 'sonner';

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
  
  // 🔧 CORREÇÃO: Verificar se já foi inicializado para evitar logs excessivos
  const [initialized, setInitialized] = useState(false);
  // ✅ NOVO: Estado para controlar inicialização e evitar callback prematuro
  const [isInitializing, setIsInitializing] = useState(true);
  const isCreationMode = !pipelineId || pipelineId.length === 0;
  const hasValidPipelineId = !!(pipelineId && pipelineId.length > 0);
  
  // ============================================
  // OTIMIZADO: Logs removidos para evitar HMR excessivo
  // ============================================
  React.useEffect(() => {
    if (!initialized) {
      setInitialized(true);
    }
  }, [pipelineId, hasValidPipelineId, isCreationMode, initialized]);
  
  // ✅ CORREÇÃO: Só usar API se há pipelineId válido
  const apiData = useDistributionManager(hasValidPipelineId ? pipelineId : undefined);
  
  // 🔧 CORREÇÃO: Memoizar defaultRule para evitar re-criação constante
  const defaultRule = React.useMemo<DistributionRule>(() => ({
    pipeline_id: '', // Será preenchido quando houver pipelineId válido
    mode: 'manual',
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
      console.log('🔄 [useLocalDistributionManager] Modo criação detectado - finalizando inicialização');
      setIsInitializing(false);
    }
  }, [isCreationMode, localRule, isInitializing]);

  // 🔧 CORREÇÃO: Inicializar com dados da API quando disponível (modo edição)
  useEffect(() => {
    if (hasValidPipelineId && apiData.rule && !localRule) {
      console.log('🔄 [useLocalDistributionManager] Carregando dados da API (inicialização)');
      setLocalRule(apiData.rule);
      // ✅ CRÍTICO: Marcar fim da inicialização após configurar dados da API
      setIsInitializing(false);
    }
  }, [apiData.rule, localRule, hasValidPipelineId]);

  // ✅ NOVO: Sincronizar estado local quando dados da API são atualizados após salvamento
  useEffect(() => {
    if (hasValidPipelineId && apiData.rule && localRule && !isInitializing) {
      // Verificar se os dados da API são diferentes do estado local
      const apiMode = apiData.rule.mode;
      const localMode = localRule.mode;
      
      if (apiMode !== localMode) {
        console.log('🔄 [useLocalDistributionManager] Detectada mudança nos dados da API, sincronizando:', {
          apiMode,
          localMode,
          timestamp: new Date().toISOString()
        });
        setLocalRule(apiData.rule);
      }
    }
  }, [apiData.rule, localRule, hasValidPipelineId, isInitializing]);

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

  // 🔧 CORREÇÃO: Memoizar verificação de mudanças com comparação inteligente
  const hasUnsavedChanges = React.useMemo(() => {
    return localRule && apiData.rule ? 
      !areRulesEqual(localRule, apiData.rule) : false;
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
        
        console.log('📤 [useLocalDistributionManager] Notificando mudança (pós-inicialização)', {
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
    console.log('🔄 [handleModeChange] Mudando modo:', { from: localRule?.mode, to: mode });
    
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
      console.log('🔄 [handleSave] Salvando regra local:', {
        currentMode: localRule.mode,
        localRule
      });
      
      const saveData: SaveDistributionRuleRequest = {
        mode: localRule.mode,
        is_active: localRule.is_active,
        working_hours_only: localRule.working_hours_only,
        skip_inactive_members: localRule.skip_inactive_members,
        fallback_to_manual: localRule.fallback_to_manual
      };
      
      await apiData.saveRule(saveData);
      
      console.log('✅ [handleSave] Regra salva com sucesso, aguardando dados atualizados...');
      
      // ✅ CORREÇÃO CRÍTICA: Aguardar dados atualizados da API e sincronizar
      // Usar setTimeout para aguardar invalidação e refetch completarem
      setTimeout(() => {
        if (apiData.rule) {
          console.log('🔄 [handleSave] Sincronizando estado local com dados da API:', {
            apiMode: apiData.rule.mode,
            localMode: localRule.mode
          });
          setLocalRule(apiData.rule);
        } else {
          console.warn('⚠️ [handleSave] Dados da API ainda não disponíveis após salvamento');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ [handleSave] Erro ao salvar:', error);
      // Erro já tratado no hook da API
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
      await apiData.testDistribution();
    } catch (error) {
      // Erro já tratado no hook da API
    }
  };

  const handleResetDistribution = async () => {
    try {
      await apiData.resetDistribution();
    } catch (error) {
      // Erro já tratado no hook da API
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

  // ✅ NOVO: Log de debug para verificar estado no render
  console.log('🎨 [DistributionManagerRender] Estado atual:', {
    localRuleMode: localRule.mode,
    apiRuleMode: apiData.rule?.mode,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    timestamp: new Date().toISOString()
  });

  return (
    <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
      <SectionHeader
        icon={RotateCcw}
        title="Distribuição de Leads"
      />

      <BlurFade delay={0.1} inView>
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-base">Modo de Distribuição</CardTitle>
            <CardDescription>
              Escolha como os leads serão atribuídos aos vendedores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      {localRule.mode === 'rodizio' && (
        <BlurFade delay={0.05} inView>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Defina regras específicas para o rodízio automático
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <Label>Apenas em Horário Comercial</Label>
                    <p className="text-xs text-muted-foreground">
                      Distribuir leads apenas durante horário de trabalho
                    </p>
                  </div>
                </div>
                <Switch
                  checked={localRule.working_hours_only}
                  onCheckedChange={handleToggleWorkingHours}
                  disabled={isSaving}
                />
              </div>

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
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}

      {/* ✅ CORREÇÃO: Estatísticas aparecem APENAS no modo Rodízio */}
      {apiData.stats && localRule.mode === 'rodizio' && (
        <BlurFade delay={0.08} inView>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Estatísticas de Distribuição
              </CardTitle>
              <CardDescription>
                Métricas sobre a distribuição de leads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="pt-4 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={isTesting}
                    className="w-full"
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
                    className="w-full"
                  >
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Resetar Rodízio
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Testa a distribuição atual ou limpa o histórico
                  </p>
                </div>
              )}
            </CardContent>
          </AnimatedCard>
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