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
  onRuleChange?: (rule: DistributionRule) => void;
}

export interface UseLocalDistributionManagerProps {
  pipelineId: string;
  onRuleChange?: (rule: DistributionRule) => void;
}

export interface UseLocalDistributionManagerReturn {
  // Estado local
  localRule: DistributionRule | null;
  rule: DistributionRule | null; // Alias para facilitar acesso
  hasUnsavedChanges: boolean;
  
  // Dados da API
  apiData: ApiDistributionManagerReturn;
  
  // Handlers locais
  handleModeChange: (mode: 'manual' | 'rodizio') => void;
  handleToggleActive: () => void;
  handleToggleWorkingHours: () => void;
  handleToggleSkipInactive: () => void;
  handleToggleFallback: () => void;
  
  // Ações de persistência
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

  // 🔧 CORREÇÃO: Inicializar com dados da API quando disponível (modo edição)
  useEffect(() => {
    if (hasValidPipelineId && apiData.rule && !localRule) {
      setLocalRule(apiData.rule);
    }
  }, [apiData.rule, localRule, hasValidPipelineId]);

  // 🔧 CORREÇÃO: Memoizar verificação de mudanças para evitar comparações desnecessárias
  const hasUnsavedChanges = React.useMemo(() => {
    return localRule && apiData.rule ? 
      JSON.stringify(localRule) !== JSON.stringify(apiData.rule) : false;
  }, [localRule, apiData.rule]);

  // 🔧 CORREÇÃO: Memoizar callback de notificação
  const notifyRuleChange = React.useCallback((rule: DistributionRule) => {
    if (onRuleChange) {
      onRuleChange(rule);
    }
  }, [onRuleChange]);

  // Notificar mudanças via callback
  useEffect(() => {
    if (localRule) {
      notifyRuleChange(localRule);
    }
  }, [localRule, notifyRuleChange]);

  // Handlers para mudanças locais
  const handleModeChange = (mode: 'manual' | 'rodizio') => {
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
      const saveData: SaveDistributionRuleRequest = {
        mode: localRule.mode,
        is_active: localRule.is_active,
        working_hours_only: localRule.working_hours_only,
        skip_inactive_members: localRule.skip_inactive_members,
        fallback_to_manual: localRule.fallback_to_manual
      };
      
      await apiData.saveRule(saveData);
      
      // Sincronizar estado local com dados salvos
      if (apiData.rule) {
        setLocalRule(apiData.rule);
      }
    } catch (error) {
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
    handleModeChange,
    handleToggleActive,
    handleToggleWorkingHours,
    handleToggleSkipInactive,
    handleToggleFallback,
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

  return (
    <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
      <SectionHeader
        icon={RotateCcw}
        title="Distribuição de Leads"
        action={
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                  Não salvo
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Descartar
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting || localRule.mode === 'manual'}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-1" />
              )}
              Testar
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        }
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
                variant={localRule.mode === 'manual' ? 'default' : 'outline'}
                onClick={() => handleModeChange('manual')}
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
                variant={localRule.mode === 'rodizio' ? 'default' : 'outline'}
                onClick={() => handleModeChange('rodizio')}
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

      {/* Seção de estatísticas básicas */}
      {apiData.stats && (
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
                <div className="pt-4">
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
                    Limpa o histórico e reinicia a distribuição
                  </p>
                </div>
              )}
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}
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