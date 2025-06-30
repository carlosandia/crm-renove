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
  AlertTriangle
} from 'lucide-react';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
interface DistributionRule {
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  skip_inactive_members: boolean;
  fallback_to_manual: boolean;
}

interface UseDistributionManagerProps {
  initialRule?: DistributionRule;
  onRuleChange?: (rule: DistributionRule) => void;
}

interface UseDistributionManagerReturn {
  distributionRule: DistributionRule;
  setDistributionRule: React.Dispatch<React.SetStateAction<DistributionRule>>;
  handleModeChange: (mode: 'manual' | 'rodizio') => void;
  handleToggleActive: () => void;
  handleToggleWorkingHours: () => void;
  handleToggleSkipInactive: () => void;
  handleToggleFallback: () => void;
}

const DEFAULT_RULE: DistributionRule = {
  mode: 'manual',
  is_active: true,
  working_hours_only: false,
  skip_inactive_members: true,
  fallback_to_manual: true
};

// ================================================================================
// HOOKS CUSTOMIZADOS
// ================================================================================
export function useDistributionManager({ 
  initialRule, 
  onRuleChange 
}: UseDistributionManagerProps = {}): UseDistributionManagerReturn {
  const [distributionRule, setDistributionRule] = useState<DistributionRule>(
    initialRule || DEFAULT_RULE
  );

  useEffect(() => {
    if (onRuleChange) {
      onRuleChange(distributionRule);
    }
  }, [distributionRule, onRuleChange]);

  const handleModeChange = (mode: 'manual' | 'rodizio') => {
    setDistributionRule(prev => ({ ...prev, mode }));
  };

  const handleToggleActive = () => {
    setDistributionRule(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  const handleToggleWorkingHours = () => {
    setDistributionRule(prev => ({ ...prev, working_hours_only: !prev.working_hours_only }));
  };

  const handleToggleSkipInactive = () => {
    setDistributionRule(prev => ({ ...prev, skip_inactive_members: !prev.skip_inactive_members }));
  };

  const handleToggleFallback = () => {
    setDistributionRule(prev => ({ ...prev, fallback_to_manual: !prev.fallback_to_manual }));
  };

  return {
    distributionRule,
    setDistributionRule,
    handleModeChange,
    handleToggleActive,
    handleToggleWorkingHours,
    handleToggleSkipInactive,
    handleToggleFallback
  };
}

// ================================================================================
// COMPONENTE DE RENDERIZAÇÃO DE DISTRIBUIÇÃO
// ================================================================================
interface DistributionManagerRenderProps {
  distributionManager: UseDistributionManagerReturn;
}

export function DistributionManagerRender({ distributionManager }: DistributionManagerRenderProps) {
  const {
    distributionRule,
    handleModeChange,
    handleToggleActive,
    handleToggleWorkingHours,
    handleToggleSkipInactive,
    handleToggleFallback
  } = distributionManager;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-orange-500" />
          Distribuição de Leads
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure como os novos leads serão distribuídos entre os vendedores.
        </p>
      </div>

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
                variant={distributionRule.mode === 'manual' ? 'default' : 'outline'}
                onClick={() => handleModeChange('manual')}
                className="h-20 flex-col gap-2"
              >
                <UserPlus className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Manual</div>
                  <div className="text-xs opacity-75">Atribuição manual</div>
                </div>
              </Button>

              <Button
                variant={distributionRule.mode === 'rodizio' ? 'default' : 'outline'}
                onClick={() => handleModeChange('rodizio')}
                className="h-20 flex-col gap-2"
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
                <strong>Modo atual:</strong> {distributionRule.mode === 'manual' ? 'Manual' : 'Rodízio Automático'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {distributionRule.mode === 'manual' 
                  ? 'Leads serão atribuídos manualmente pelos administradores'
                  : 'Leads serão distribuídos automaticamente entre os vendedores ativos'
                }
              </p>
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      {distributionRule.mode === 'rodizio' && (
        <BlurFade delay={0.2} inView>
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
                  checked={distributionRule.working_hours_only}
                  onCheckedChange={handleToggleWorkingHours}
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
                  checked={distributionRule.skip_inactive_members}
                  onCheckedChange={handleToggleSkipInactive}
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
                  checked={distributionRule.fallback_to_manual}
                  onCheckedChange={handleToggleFallback}
                />
              </div>
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}
    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export default DistributionManagerRender; 