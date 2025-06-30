import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Separator } from '../../ui/separator';
import { BlurFade } from '../../ui/blur-fade';
import { 
  GitBranch, 
  Users, 
  Target, 
  Thermometer, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { usePipelineData } from '../../../hooks/usePipelineData';
import { useAuth } from '../../../contexts/AuthContext';

interface PipelineIntegrationConfig {
  auto_assign_pipeline: string;
  default_stage: string;
  lead_temperature: 'hot' | 'warm' | 'cold';
  auto_assign_member: boolean;
  custom_stage_mapping?: Record<string, string>;
  temperature_rules: {
    hot_threshold: number;
    warm_threshold: number;
  };
}

interface PipelineIntegrationProps {
  initialConfig?: Partial<PipelineIntegrationConfig>;
  onConfigChange: (config: PipelineIntegrationConfig) => void;
  disabled?: boolean;
}

export const PipelineIntegration: React.FC<PipelineIntegrationProps> = ({
  initialConfig,
  onConfigChange,
  disabled = false
}) => {
  const { user } = useAuth();
  const { pipelines, loading: pipelinesLoading } = usePipelineData();
  
  const [config, setConfig] = useState<PipelineIntegrationConfig>({
    auto_assign_pipeline: 'default',
    default_stage: 'lead',
    lead_temperature: 'warm',
    auto_assign_member: true,
    temperature_rules: {
      hot_threshold: 80,
      warm_threshold: 50
    },
    ...initialConfig
  });

  const [selectedPipeline, setSelectedPipeline] = useState<string>(config.auto_assign_pipeline);
  const [availableStages, setAvailableStages] = useState<any[]>([]);

  // ATUALIZAR CONFIG QUANDO MUDANÇAS ACONTECEREM
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  // CARREGAR ESTÁGIOS DA PIPELINE SELECIONADA
  useEffect(() => {
    if (selectedPipeline && selectedPipeline !== 'default' && pipelines) {
      const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);
      const pipelineStages = selectedPipelineData?.stages || [];
      setAvailableStages(pipelineStages);
      
      // Auto-selecionar primeiro estágio se disponível
      if (pipelineStages.length > 0 && !config.default_stage) {
        updateConfig({ default_stage: pipelineStages[0].id });
      }
    } else {
      // Estágios padrão do sistema
      setAvailableStages([
        { id: 'lead', name: 'Lead', order: 1 },
        { id: 'qualified', name: 'Qualificado', order: 2 },
        { id: 'proposal', name: 'Proposta', order: 3 },
        { id: 'negotiation', name: 'Negociação', order: 4 },
        { id: 'closed_won', name: 'Closed Won', order: 5 },
        { id: 'closed_lost', name: 'Closed Lost', order: 6 }
      ]);
    }
  }, [selectedPipeline, pipelines]);

  const updateConfig = (updates: Partial<PipelineIntegrationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    updateConfig({ 
      auto_assign_pipeline: pipelineId,
      default_stage: '' // Reset estágio ao trocar pipeline
    });
  };

  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case 'hot': return 'text-red-600 bg-red-50 border-red-200';
      case 'warm': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cold': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTemperatureIcon = (temp: string) => {
    switch (temp) {
      case 'hot': return '🔥';
      case 'warm': return '🌡️';
      case 'cold': return '❄️';
      default: return '📊';
    }
  };

  if (pipelinesLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Carregando pipelines...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <BlurFade delay={0.1}>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Integração com Pipeline</h3>
              <p className="text-sm text-muted-foreground">
                Configure como os leads serão atribuídos e organizados no pipeline
              </p>
            </div>
            {config.auto_assign_member && (
              <Badge variant="secondary" className="ml-auto">
                <RefreshCw className="w-3 h-3 mr-1" />
                Rodízio Ativo
              </Badge>
            )}
          </div>

          {/* SELEÇÃO DE PIPELINE */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="pipeline-select">Pipeline de Destino</Label>
              <Select 
                value={selectedPipeline} 
                onValueChange={handlePipelineChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      Pipeline Padrão
                    </div>
                  </SelectItem>
                  {pipelines && pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        {pipeline.name}
                        <Badge variant="outline" className="text-xs">
                          {pipeline.stages?.length || 0} estágios
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* INFORMAÇÕES DA PIPELINE SELECIONADA */}
            {selectedPipeline !== 'default' && pipelines && (
              <div className="p-3 bg-accent/50 rounded-lg border">
                {(() => {
                  const pipeline = pipelines.find(p => p.id === selectedPipeline);
                  return pipeline ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pipeline.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {pipeline.description || 'Pipeline configurada'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{availableStages.length} estágios</Badge>
                        {(pipeline as any).is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </Card>
      </BlurFade>

      {/* CONFIGURAÇÃO DE ESTÁGIO */}
      <BlurFade delay={0.2}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Estágio Inicial</h4>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="stage-select">Estágio de Entrada</Label>
              <Select 
                value={config.default_stage} 
                onValueChange={(value) => updateConfig({ default_stage: value })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio inicial" />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        {stage.name}
                        <Badge variant="outline" className="text-xs">
                          #{stage.order || 1}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PREVIEW DOS ESTÁGIOS */}
            {availableStages.length > 0 && (
              <div className="p-3 bg-accent/30 rounded-lg">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Fluxo da Pipeline
                </Label>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {availableStages
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-2 flex-shrink-0">
                      <div className={`
                        px-2 py-1 rounded text-xs border
                        ${stage.id === config.default_stage 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background border-border'
                        }
                      `}>
                        {stage.name}
                      </div>
                      {index < availableStages.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </BlurFade>

      {/* CONFIGURAÇÃO DE TEMPERATURA */}
      <BlurFade delay={0.3}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Thermometer className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Temperatura do Lead</h4>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Temperatura Padrão</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { value: 'hot', label: 'Quente', description: 'Alta intenção de compra' },
                  { value: 'warm', label: 'Morno', description: 'Interesse demonstrado' },
                  { value: 'cold', label: 'Frio', description: 'Prospecção inicial' }
                ].map(temp => (
                  <button
                    key={temp.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateConfig({ lead_temperature: temp.value as any })}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${config.lead_temperature === temp.value 
                        ? getTemperatureColor(temp.value) 
                        : 'border-border hover:border-border-accent'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getTemperatureIcon(temp.value)}</span>
                      <span className="font-medium">{temp.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{temp.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CONFIGURAÇÕES AVANÇADAS DE TEMPERATURA */}
            <Separator />
            <div>
              <Label className="text-sm font-medium">Regras de Temperatura Automática</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Configure pontuações para classificação automática de temperatura
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hot-threshold" className="text-xs">
                    Limite Quente (pontos)
                  </Label>
                  <Input
                    id="hot-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={config.temperature_rules?.hot_threshold || 80}
                    onChange={(e) => updateConfig({
                      temperature_rules: {
                        ...config.temperature_rules,
                        hot_threshold: parseInt(e.target.value) || 80
                      }
                    })}
                    disabled={disabled}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="warm-threshold" className="text-xs">
                    Limite Morno (pontos)
                  </Label>
                  <Input
                    id="warm-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={config.temperature_rules?.warm_threshold || 50}
                    onChange={(e) => updateConfig({
                      temperature_rules: {
                        ...config.temperature_rules,
                        warm_threshold: parseInt(e.target.value) || 50
                      }
                    })}
                    disabled={disabled}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* SISTEMA DE RODÍZIO */}
      <BlurFade delay={0.4}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Sistema de Rodízio (Round-Robin)</h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-assign-member"
                checked={config.auto_assign_member}
                onChange={(e) => updateConfig({ auto_assign_member: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4"
              />
              <div>
                <Label htmlFor="auto-assign-member" className="cursor-pointer">
                  Ativar distribuição automática de leads
                </Label>
                <p className="text-xs text-muted-foreground">
                  Leads serão distribuídos automaticamente entre vendedores ativos
                </p>
              </div>
            </div>

            {config.auto_assign_member && (
              <div className="p-3 bg-accent/30 rounded-lg border">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Como funciona o rodízio:</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      <li>• Lead1 → Vendedor A</li>
                      <li>• Lead2 → Vendedor B</li>
                      <li>• Lead3 → Vendedor C</li>
                      <li>• Lead4 → Vendedor A (volta ao início)</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sistema considera apenas vendedores ativos vinculados à pipeline.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </BlurFade>

      {/* RESUMO DA CONFIGURAÇÃO */}
      <BlurFade delay={0.5}>
        <Card className="p-4 bg-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Resumo da Integração</span>
          </div>
          
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Pipeline:</span> {
                selectedPipeline === 'default' 
                  ? 'Pipeline Padrão' 
                  : pipelines?.find(p => p.id === selectedPipeline)?.name || 'Pipeline Selecionada'
              }
            </p>
            <p>
              <span className="font-medium">Estágio:</span> {
                availableStages.find(s => s.id === config.default_stage)?.name || 'Lead'
              }
            </p>
            <p className="flex items-center gap-2">
              <span className="font-medium">Temperatura:</span> 
              <span className="flex items-center gap-1">
                {getTemperatureIcon(config.lead_temperature)}
                {config.lead_temperature === 'hot' ? 'Quente' : 
                 config.lead_temperature === 'warm' ? 'Morno' : 'Frio'}
              </span>
            </p>
            <p>
              <span className="font-medium">Rodízio:</span> {config.auto_assign_member ? 'Ativo' : 'Desativado'}
            </p>
          </div>
        </Card>
      </BlurFade>
    </div>
  );
}; 