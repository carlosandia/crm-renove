import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Thermometer,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Save
} from 'lucide-react';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
interface TemperatureConfig {
  hot_days: number;
  warm_days: number;
  cold_days: number;
}

interface UseTemperatureConfigProps {
  initialConfig?: TemperatureConfig;
  onConfigChange?: (config: TemperatureConfig) => void;
}

interface UseTemperatureConfigReturn {
  temperatureConfig: TemperatureConfig;
  setTemperatureConfig: React.Dispatch<React.SetStateAction<TemperatureConfig>>;
  editingConfig: TemperatureConfig | null;
  setEditingConfig: React.Dispatch<React.SetStateAction<TemperatureConfig | null>>;
  showEditModal: boolean;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleEditTemperature: () => void;
  handleSaveTemperature: () => void;
  handleResetToDefault: () => void;
  getTemperatureLevel: (days: number) => { level: string; color: string; icon: JSX.Element };
}

// ================================================================================
// CONSTANTES
// ================================================================================
const DEFAULT_CONFIG: TemperatureConfig = {
  hot_days: 3,
  warm_days: 7,
  cold_days: 14
};

// ================================================================================
// HOOKS CUSTOMIZADOS
// ================================================================================
export function useTemperatureConfig({ 
  initialConfig, 
  onConfigChange 
}: UseTemperatureConfigProps = {}): UseTemperatureConfigReturn {
  const [temperatureConfig, setTemperatureConfig] = useState<TemperatureConfig>(
    initialConfig || DEFAULT_CONFIG
  );
  const [editingConfig, setEditingConfig] = useState<TemperatureConfig | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(temperatureConfig);
    }
  }, [temperatureConfig, onConfigChange]);

  const getTemperatureLevel = (days: number) => {
    if (days <= temperatureConfig.hot_days) {
      return {
        level: 'Quente',
        color: 'text-red-500',
        icon: <TrendingUp className="h-4 w-4 text-red-500" />
      };
    } else if (days <= temperatureConfig.warm_days) {
      return {
        level: 'Morno',
        color: 'text-yellow-500',
        icon: <Minus className="h-4 w-4 text-yellow-500" />
      };
    } else {
      return {
        level: 'Frio',
        color: 'text-blue-500',
        icon: <TrendingDown className="h-4 w-4 text-blue-500" />
      };
    }
  };

  const handleEditTemperature = () => {
    setEditingConfig({ ...temperatureConfig });
    setShowEditModal(true);
  };

  const handleSaveTemperature = () => {
    if (!editingConfig) return;

    // Validar sequência lógica
    if (editingConfig.hot_days >= editingConfig.warm_days || 
        editingConfig.warm_days >= editingConfig.cold_days) {
      alert('Os períodos devem seguir ordem crescente: Quente < Morno < Frio');
      return;
    }

    setTemperatureConfig(editingConfig);
    setShowEditModal(false);
    setEditingConfig(null);
  };

  const handleResetToDefault = () => {
    setEditingConfig(DEFAULT_CONFIG);
  };

  return {
    temperatureConfig,
    setTemperatureConfig,
    editingConfig,
    setEditingConfig,
    showEditModal,
    setShowEditModal,
    handleEditTemperature,
    handleSaveTemperature,
    handleResetToDefault,
    getTemperatureLevel
  };
}

// ================================================================================
// COMPONENTE DE RENDERIZAÇÃO DE CONFIGURAÇÃO DE TEMPERATURA
// ================================================================================
interface TemperatureConfigRenderProps {
  temperatureManager: UseTemperatureConfigReturn;
}

export function TemperatureConfigRender({ temperatureManager }: TemperatureConfigRenderProps) {
  const {
    temperatureConfig,
    editingConfig,
    setEditingConfig,
    showEditModal,
    setShowEditModal,
    handleEditTemperature,
    handleSaveTemperature,
    handleResetToDefault,
    getTemperatureLevel
  } = temperatureManager;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-red-500" />
            Configuração de Temperatura
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Defina os períodos para classificação da temperatura dos leads.
          </p>
        </div>
        <Button onClick={handleEditTemperature} size="sm" variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configurar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <BlurFade delay={0.1} inView>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-red-500" />
                <h4 className="font-medium text-red-500">Quente</h4>
              </div>
              <p className="text-2xl font-bold">{temperatureConfig.hot_days}</p>
              <p className="text-sm text-muted-foreground">dias ou menos</p>
            </CardContent>
          </AnimatedCard>
        </BlurFade>

        <BlurFade delay={0.2} inView>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Minus className="h-5 w-5 text-yellow-500" />
                <h4 className="font-medium text-yellow-500">Morno</h4>
              </div>
              <p className="text-2xl font-bold">{temperatureConfig.warm_days}</p>
              <p className="text-sm text-muted-foreground">dias ou menos</p>
            </CardContent>
          </AnimatedCard>
        </BlurFade>

        <BlurFade delay={0.3} inView>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium text-blue-500">Frio</h4>
              </div>
              <p className="text-2xl font-bold">{temperatureConfig.cold_days}+</p>
              <p className="text-sm text-muted-foreground">dias ou mais</p>
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      </div>

      <BlurFade delay={0.4} inView>
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                A temperatura é calculada automaticamente baseada no tempo que o lead permanece na etapa atual:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong className="text-red-500">Quente:</strong> Lead criado recentemente, alta prioridade</li>
                <li><strong className="text-yellow-500">Morno:</strong> Lead com tempo moderado, atenção necessária</li>
                <li><strong className="text-blue-500">Frio:</strong> Lead há muito tempo parado, revisar estratégia</li>
              </ul>
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configurar Temperatura</DialogTitle>
            <DialogDescription>
              Defina os períodos em dias para cada nível de temperatura.
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="hotDays" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Quente (até X dias)
                </Label>
                <Input
                  id="hotDays"
                  type="number"
                  min="1"
                  value={editingConfig.hot_days}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    hot_days: parseInt(e.target.value) || 1
                  })}
                />
              </div>

              <div>
                <Label htmlFor="warmDays" className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-yellow-500" />
                  Morno (até X dias)
                </Label>
                <Input
                  id="warmDays"
                  type="number"
                  min="1"
                  value={editingConfig.warm_days}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    warm_days: parseInt(e.target.value) || 1
                  })}
                />
              </div>

              <div>
                <Label htmlFor="coldDays" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  Frio (X dias ou mais)
                </Label>
                <Input
                  id="coldDays"
                  type="number"
                  min="1"
                  value={editingConfig.cold_days}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    cold_days: parseInt(e.target.value) || 1
                  })}
                />
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDefault}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restaurar Padrão
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTemperature}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export const TemperatureConfig: React.FC<UseTemperatureConfigProps> = (props) => {
  const temperatureManager = useTemperatureConfig(props);

  return (
    <TemperatureConfigRender
      temperatureManager={temperatureManager}
    />
  );
};

// ================================================================================
// COMPONENTE PARA BOTÃO DE ACESSO RÁPIDO
// ================================================================================
interface TemperatureQuickAccessProps {
  days: number;
}

export function TemperatureQuickAccess({ days }: TemperatureQuickAccessProps) {
  const temperatureManager = useTemperatureConfig();
  const { getTemperatureLevel } = temperatureManager;
  const temp = getTemperatureLevel(days);

  return (
    <div className={`flex items-center gap-1 ${temp.color}`}>
      {temp.icon}
      <span className="text-sm font-medium">{temp.level}</span>
    </div>
  );
}

export default TemperatureConfig; 