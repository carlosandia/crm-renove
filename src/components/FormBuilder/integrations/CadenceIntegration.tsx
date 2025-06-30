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
  Repeat, 
  Clock, 
  Play, 
  Pause,
  Target,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface CadenceStep {
  id: string;
  step_number: number;
  step_type: 'email' | 'call' | 'whatsapp' | 'task' | 'sms';
  delay_days: number;
  delay_hours: number;
  title: string;
  description?: string;
  is_active: boolean;
}

interface CadenceConfig {
  auto_start_cadence: boolean;
  cadence_id: string;
  delay_hours: number;
  custom_triggers?: string[];
  skip_weekends?: boolean;
  respect_timezone?: boolean;
  stop_on_reply?: boolean;
}

interface CadenceIntegrationProps {
  initialConfig?: Partial<CadenceConfig>;
  onConfigChange: (config: CadenceConfig) => void;
  disabled?: boolean;
}

export const CadenceIntegration: React.FC<CadenceIntegrationProps> = ({
  initialConfig,
  onConfigChange,
  disabled = false
}) => {
  const { user } = useAuth();
  
  const [config, setConfig] = useState<CadenceConfig>({
    auto_start_cadence: false,
    cadence_id: 'default',
    delay_hours: 2,
    skip_weekends: true,
    respect_timezone: true,
    stop_on_reply: true,
    ...initialConfig
  });

  const [availableCadences, setAvailableCadences] = useState<any[]>([]);
  const [cadenceSteps, setCadenceSteps] = useState<CadenceStep[]>([]);
  const [loading, setLoading] = useState(true);

  // CARREGAR CADÊNCIAS DISPONÍVEIS
  useEffect(() => {
    loadAvailableCadences();
  }, [user?.tenant_id]);

  // CARREGAR STEPS DA CADÊNCIA SELECIONADA
  useEffect(() => {
    if (config.cadence_id && config.cadence_id !== 'default') {
      loadCadenceSteps(config.cadence_id);
    } else {
      // Steps padrão baseados no mercado
      setCadenceSteps([
        {
          id: '1',
          step_number: 1,
          step_type: 'call',
          delay_days: 0,
          delay_hours: 0,
          title: 'Ligação de Boas-vindas',
          description: 'Primeira ligação para estabelecer contato',
          is_active: true
        },
        {
          id: '2',
          step_number: 2,
          step_type: 'email',
          delay_days: 1,
          delay_hours: 0,
          title: 'Email de Follow-up',
          description: 'Email com informações relevantes',
          is_active: true
        },
        {
          id: '3',
          step_number: 3,
          step_type: 'whatsapp',
          delay_days: 3,
          delay_hours: 0,
          title: 'WhatsApp Check-in',
          description: 'Mensagem casual via WhatsApp',
          is_active: true
        },
        {
          id: '4',
          step_number: 4,
          step_type: 'email',
          delay_days: 7,
          delay_hours: 0,
          title: 'Proposta Comercial',
          description: 'Envio da proposta formal',
          is_active: true
        },
        {
          id: '5',
          step_number: 5,
          step_type: 'call',
          delay_days: 14,
          delay_hours: 0,
          title: 'Ligação de Fechamento',
          description: 'Ligação final para fechamento',
          is_active: true
        }
      ]);
    }
  }, [config.cadence_id]);

  // ATUALIZAR CONFIG QUANDO MUDANÇAS ACONTECEREM
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const loadAvailableCadences = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      
      // Tentar carregar cadências do sistema
      const { data: cadences, error } = await supabase
        .from('cadence_configs')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.warn('Erro ao carregar cadências, usando padrões:', error);
      }

      // Cadências padrão + cadências customizadas
      const defaultCadences = [
        {
          id: 'default',
          name: 'Cadência Padrão',
          description: 'Sequência padrão de follow-up (5 etapas)',
          steps_count: 5,
          duration_days: 14,
          is_active: true
        },
        {
          id: 'hot_lead',
          name: 'Lead Quente',
          description: 'Cadência acelerada para leads quentes',
          steps_count: 3,
          duration_days: 7,
          is_active: true
        },
        {
          id: 'nurturing',
          name: 'Nutrição',
          description: 'Cadência longa para nutrição de leads',
          steps_count: 8,
          duration_days: 30,
          is_active: true
        },
        {
          id: 'follow_up',
          name: 'Follow-up Simples',
          description: 'Follow-up básico com 3 pontos de contato',
          steps_count: 3,
          duration_days: 5,
          is_active: true
        }
      ];

      setAvailableCadences([
        ...defaultCadences,
        ...(cadences || [])
      ]);

    } catch (error) {
      console.error('Erro ao carregar cadências:', error);
      setAvailableCadences([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCadenceSteps = async (cadenceId: string) => {
    try {
      const { data: steps, error } = await supabase
        .from('cadence_steps')
        .select('*')
        .eq('cadence_id', cadenceId)
        .eq('is_active', true)
        .order('step_number');

      if (error) {
        console.warn('Erro ao carregar steps da cadência:', error);
        return;
      }

      setCadenceSteps(steps || []);
    } catch (error) {
      console.error('Erro ao carregar steps:', error);
    }
  };

  const updateConfig = (updates: Partial<CadenceConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'email': return Mail;
      case 'call': return Phone;
      case 'whatsapp': return MessageCircle;
      case 'sms': return MessageCircle;
      case 'task': return Target;
      default: return Settings;
    }
  };

  const getStepColor = (stepType: string) => {
    switch (stepType) {
      case 'email': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'call': return 'text-green-600 bg-green-50 border-green-200';
      case 'whatsapp': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'sms': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'task': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatStepDelay = (days: number, hours: number) => {
    if (days === 0 && hours === 0) return 'Imediato';
    if (days === 0) return `${hours}h`;
    if (hours === 0) return `${days}d`;
    return `${days}d ${hours}h`;
  };

  const getTotalDuration = () => {
    if (cadenceSteps.length === 0) return 0;
    const lastStep = cadenceSteps[cadenceSteps.length - 1];
    return lastStep.delay_days;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Repeat className="w-5 h-5 animate-spin text-primary" />
          <span>Carregando cadências...</span>
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
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Cadência Automática</h3>
              <p className="text-sm text-muted-foreground">
                Configure follow-ups automáticos após preenchimento do formulário
              </p>
            </div>
            {config.auto_start_cadence && (
              <Badge variant="secondary" className="ml-auto">
                <Play className="w-3 h-3 mr-1" />
                Auto-start Ativo
              </Badge>
            )}
          </div>

          {/* ATIVAÇÃO DA CADÊNCIA */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-start-cadence"
                checked={config.auto_start_cadence}
                onChange={(e) => updateConfig({ auto_start_cadence: e.target.checked })}
                disabled={disabled}
                className="w-4 h-4"
              />
              <div>
                <Label htmlFor="auto-start-cadence" className="cursor-pointer">
                  Iniciar cadência automaticamente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cadência iniciará automaticamente após preenchimento do formulário
                </p>
              </div>
            </div>

            {config.auto_start_cadence && (
              <div className="p-3 bg-accent/30 rounded-lg border">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Fluxo automático:</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lead preenche formulário → Delay configurado → Primeira ação da cadência → 
                      Sequência de follow-ups baseada na cadência selecionada
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </BlurFade>

      {/* SELEÇÃO DE CADÊNCIA */}
      {config.auto_start_cadence && (
        <BlurFade delay={0.2}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Seleção de Cadência</h4>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cadence-select">Cadência de Follow-up</Label>
                <Select 
                  value={config.cadence_id} 
                  onValueChange={(value) => updateConfig({ cadence_id: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma cadência" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCadences.map(cadence => (
                      <SelectItem key={cadence.id} value={cadence.id}>
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{cadence.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cadence.steps_count} etapas • {cadence.duration_days} dias
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* INFORMAÇÕES DA CADÊNCIA SELECIONADA */}
              {config.cadence_id && (
                <div className="p-3 bg-accent/50 rounded-lg border">
                  {(() => {
                    const cadence = availableCadences.find(c => c.id === config.cadence_id);
                    return cadence ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cadence.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cadence.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cadence.steps_count} etapas</Badge>
                          <Badge variant="outline">{cadence.duration_days} dias</Badge>
                          {cadence.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
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
      )}

      {/* CONFIGURAÇÕES DE DELAY */}
      {config.auto_start_cadence && (
        <BlurFade delay={0.3}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Configurações de Timing</h4>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="delay-hours">Delay para início (horas)</Label>
                <Input
                  id="delay-hours"
                  type="number"
                  min="0"
                  max="168"
                  value={config.delay_hours}
                  onChange={(e) => updateConfig({ delay_hours: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo de espera antes da primeira ação da cadência
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Opções Avançadas</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="skip-weekends"
                      checked={config.skip_weekends}
                      onChange={(e) => updateConfig({ skip_weekends: e.target.checked })}
                      disabled={disabled}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="skip-weekends" className="cursor-pointer text-sm">
                      Pular fins de semana
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="respect-timezone"
                      checked={config.respect_timezone}
                      onChange={(e) => updateConfig({ respect_timezone: e.target.checked })}
                      disabled={disabled}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="respect-timezone" className="cursor-pointer text-sm">
                      Respeitar fuso horário do lead
                    </Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="stop-on-reply"
                      checked={config.stop_on_reply}
                      onChange={(e) => updateConfig({ stop_on_reply: e.target.checked })}
                      disabled={disabled}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="stop-on-reply" className="cursor-pointer text-sm">
                      Parar cadência em caso de resposta
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </BlurFade>
      )}

      {/* PREVIEW DA CADÊNCIA */}
      {config.auto_start_cadence && cadenceSteps.length > 0 && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Preview da Cadência</h4>
              <Badge variant="outline" className="ml-auto">
                {cadenceSteps.length} etapas • {getTotalDuration()} dias
              </Badge>
            </div>

            <div className="space-y-3">
              {cadenceSteps.map((step, index) => {
                const StepIcon = getStepIcon(step.step_type);
                
                return (
                  <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {step.step_number}
                      </div>
                      <div className={`p-1 rounded border ${getStepColor(step.step_type)}`}>
                        <StepIcon className="w-3 h-3" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{step.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {step.step_type}
                        </Badge>
                      </div>
                      {step.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium">
                        {formatStepDelay(step.delay_days, step.delay_hours)}
                      </p>
                      {index === 0 && config.delay_hours > 0 && (
                        <p className="text-xs text-muted-foreground">
                          +{config.delay_hours}h inicial
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TIMELINE VISUAL */}
            <div className="mt-4 p-3 bg-accent/20 rounded-lg">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Timeline da Cadência
              </Label>
              <div className="flex items-center gap-1 overflow-x-auto">
                <div className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs flex-shrink-0">
                  Lead
                </div>
                <span className="text-muted-foreground">→</span>
                {config.delay_hours > 0 && (
                  <>
                    <div className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs flex-shrink-0">
                      +{config.delay_hours}h
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                {cadenceSteps.slice(0, 4).map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="px-2 py-1 bg-accent border rounded text-xs flex-shrink-0">
                      {step.step_type}
                    </div>
                    {index < 3 && index < cadenceSteps.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </React.Fragment>
                ))}
                {cadenceSteps.length > 4 && (
                  <div className="px-2 py-1 bg-muted rounded text-xs">
                    +{cadenceSteps.length - 4} mais
                  </div>
                )}
              </div>
            </div>
          </Card>
        </BlurFade>
      )}

      {/* RESUMO DA CONFIGURAÇÃO */}
      <BlurFade delay={0.5}>
        <Card className="p-4 bg-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Resumo da Cadência</span>
          </div>
          
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Status:</span> {
                config.auto_start_cadence ? 'Cadência Ativa' : 'Cadência Desativada'
              }
            </p>
            {config.auto_start_cadence && (
              <>
                <p>
                  <span className="font-medium">Cadência:</span> {
                    availableCadences.find(c => c.id === config.cadence_id)?.name || 'Não selecionada'
                  }
                </p>
                <p>
                  <span className="font-medium">Delay inicial:</span> {config.delay_hours}h
                </p>
                <p>
                  <span className="font-medium">Duração total:</span> {getTotalDuration()} dias
                </p>
                <p>
                  <span className="font-medium">Opções:</span> {
                    [
                      config.skip_weekends && 'Pula fins de semana',
                      config.respect_timezone && 'Respeita fuso horário',
                      config.stop_on_reply && 'Para se houver resposta'
                    ].filter(Boolean).join(', ') || 'Nenhuma'
                  }
                </p>
              </>
            )}
          </div>
        </Card>
      </BlurFade>
    </div>
  );
}; 