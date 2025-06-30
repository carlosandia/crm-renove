import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Separator } from '../../ui/separator';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Settings, 
  GitBranch, 
  Repeat, 
  Calendar, 
  BarChart3, 
  Shield, 
  Play,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { FormType, FormTypeConfig } from './FormTypeDefinitions';

interface FormTypeConfiguratorProps {
  formType: FormType;
  initialConfig?: Partial<FormTypeConfig>;
  onConfigChange: (config: FormTypeConfig) => void;
  onPreview?: () => void;
  onSave?: () => void;
}

export const FormTypeConfigurator: React.FC<FormTypeConfiguratorProps> = ({
  formType,
  initialConfig,
  onConfigChange,
  onPreview,
  onSave
}) => {
  const [config, setConfig] = useState<FormTypeConfig>({
    ...formType.config,
    ...initialConfig
  });

  const [activeTab, setActiveTab] = useState('basic');

  // ATUALIZAR CONFIG QUANDO MUDANÇAS ACONTECEREM
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<FormTypeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updatePipelineIntegration = (updates: Partial<NonNullable<FormTypeConfig['pipelineIntegration']>>) => {
    setConfig(prev => ({
      ...prev,
      pipelineIntegration: {
        ...prev.pipelineIntegration,
        ...updates
      }
    }));
  };

  const updateCadenceIntegration = (updates: Partial<NonNullable<FormTypeConfig['cadenceIntegration']>>) => {
    setConfig(prev => ({
      ...prev,
      cadenceIntegration: {
        ...prev.cadenceIntegration,
        ...updates
      }
    }));
  };

  const updateCalendarIntegration = (updates: Partial<NonNullable<FormTypeConfig['calendarIntegration']>>) => {
    setConfig(prev => ({
      ...prev,
      calendarIntegration: {
        ...prev.calendarIntegration,
        ...updates
      }
    }));
  };

  const updateConfigByType = (configType: string, updates: any) => {
    setConfig(prev => ({
      ...prev,
      [configType]: {
        ...(prev[configType as keyof FormTypeConfig] as any || {}),
        ...updates
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* HEADER COM INFORMAÇÕES DO TIPO */}
      <BlurFade delay={0.1}>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <formType.icon {...({ className: "w-6 h-6 text-primary" } as any)} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{formType.name}</h2>
              <p className="text-muted-foreground">{formType.description}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{formType.category}</Badge>
              {config.tenant_restrictions?.is_premium && (
                <Badge variant="secondary">Premium</Badge>
              )}
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* CONFIGURAÇÕES EM TABS */}
      <BlurFade delay={0.2}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="cadence" className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Cadência
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Avançado
            </TabsTrigger>
          </TabsList>

          {/* TAB BÁSICO */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayType">Tipo de Exibição</Label>
                  <Select 
                    value={config.displayType} 
                    onValueChange={(value) => updateConfig({ displayType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Inline (Incorporado)</SelectItem>
                      <SelectItem value="popup">Popup (Modal)</SelectItem>
                      <SelectItem value="slide-in">Slide-in (Lateral)</SelectItem>
                      <SelectItem value="fullscreen">Fullscreen (Tela Cheia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CONFIGURAÇÕES ESPECÍFICAS POR TIPO */}
                {formType.id === 'exit_intent' && (
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Configurações Exit-Intent
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Sensibilidade (1-10)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={config.exitIntent?.sensitivity || 5}
                          onChange={(e) => updateConfigByType('exitIntent', {
                            ...config.exitIntent,
                            sensitivity: parseInt(e.target.value)
                          })}
                        />
                      </div>
                      <div>
                        <Label>Delay (ms)</Label>
                        <Input
                          type="number"
                          value={config.exitIntent?.delay || 500}
                          onChange={(e) => updateConfigByType('exitIntent', {
                            ...config.exitIntent,
                            delay: parseInt(e.target.value)
                          })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formType.id === 'scroll_trigger' && (
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium">Configurações Scroll Trigger</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Percentual de Scroll (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={config.scrollTrigger?.triggerPercentage || 50}
                          onChange={(e) => updateConfigByType('scrollTrigger', {
                            ...config.scrollTrigger,
                            triggerPercentage: parseInt(e.target.value)
                          })}
                        />
                      </div>
                      <div>
                        <Label>Direção</Label>
                        <Select 
                          value={config.scrollTrigger?.direction || 'down'}
                          onValueChange={(value) => updateConfigByType('scrollTrigger', {
                            ...config.scrollTrigger,
                            direction: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="down">Para Baixo</SelectItem>
                            <SelectItem value="up">Para Cima</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {formType.id === 'time_delayed' && (
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium">Configurações Time Delay</h4>
                    
                    <div>
                      <Label>Delay (segundos)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={config.timeDelay?.delay || 30}
                        onChange={(e) => updateConfigByType('timeDelay', {
                          ...config.timeDelay,
                          delay: parseInt(e.target.value)
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB PIPELINE */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Integração com Pipeline</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Pipeline Padrão</Label>
                    <Select 
                      value={config.pipelineIntegration?.auto_assign_pipeline || 'default'}
                      onValueChange={(value) => updatePipelineIntegration({ auto_assign_pipeline: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Pipeline Padrão</SelectItem>
                        <SelectItem value="whatsapp">Pipeline WhatsApp</SelectItem>
                        <SelectItem value="website">Pipeline Website</SelectItem>
                        <SelectItem value="social">Pipeline Redes Sociais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estágio Inicial</Label>
                    <Select 
                      value={config.pipelineIntegration?.default_stage || 'lead'}
                      onValueChange={(value) => updatePipelineIntegration({ default_stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="qualified">Qualificado</SelectItem>
                        <SelectItem value="proposal">Proposta</SelectItem>
                        <SelectItem value="negotiation">Negociação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Temperatura do Lead</Label>
                    <Select 
                      value={config.pipelineIntegration?.lead_temperature || 'warm'}
                      onValueChange={(value) => updatePipelineIntegration({ lead_temperature: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">🔥 Quente</SelectItem>
                        <SelectItem value="warm">🌡️ Morno</SelectItem>
                        <SelectItem value="cold">❄️ Frio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="auto_assign_member"
                      checked={config.pipelineIntegration?.auto_assign_member || false}
                      onChange={(e) => updatePipelineIntegration({ auto_assign_member: e.target.checked })}
                    />
                    <Label htmlFor="auto_assign_member">
                      Usar sistema de rodízio (Round-Robin)
                    </Label>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB CADÊNCIA */}
          <TabsContent value="cadence" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Repeat className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Cadência Automática</h3>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    id="auto_start_cadence"
                    checked={config.cadenceIntegration?.auto_start_cadence || false}
                    onChange={(e) => updateCadenceIntegration({ auto_start_cadence: e.target.checked })}
                  />
                  <Label htmlFor="auto_start_cadence">
                    Iniciar cadência automaticamente após preenchimento
                  </Label>
                </div>

                {config.cadenceIntegration?.auto_start_cadence && (
                  <div className="space-y-4">
                    <div>
                      <Label>Cadência</Label>
                      <Select 
                        value={config.cadenceIntegration?.cadence_id || 'default'}
                        onValueChange={(value) => updateCadenceIntegration({ cadence_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Cadência Padrão</SelectItem>
                          <SelectItem value="hot_lead">Lead Quente</SelectItem>
                          <SelectItem value="nurturing">Nutrição</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Delay para início (horas)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="168"
                        value={config.cadenceIntegration?.delay_hours || 2}
                        onChange={(e) => updateCadenceIntegration({ delay_hours: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB CALENDAR */}
          <TabsContent value="calendar" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Integração com Agenda</h3>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    id="enable_scheduling"
                    checked={config.calendarIntegration?.enable_scheduling || false}
                    onChange={(e) => updateCalendarIntegration({ enable_scheduling: e.target.checked })}
                  />
                  <Label htmlFor="enable_scheduling">
                    Habilitar agendamento integrado
                  </Label>
                </div>

                {config.calendarIntegration?.enable_scheduling && (
                  <div className="space-y-4">
                    <div>
                      <Label>Provider</Label>
                      <Select 
                        value={config.calendarIntegration?.calendar_provider || 'google'}
                        onValueChange={(value) => updateCalendarIntegration({ calendar_provider: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google">Google Calendar</SelectItem>
                          <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Slots Disponíveis</Label>
                      <Select 
                        value={config.calendarIntegration?.available_slots || 'business_hours'}
                        onValueChange={(value) => updateCalendarIntegration({ available_slots: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business_hours">Horário Comercial</SelectItem>
                          <SelectItem value="custom">Customizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="auto_confirm"
                        checked={config.calendarIntegration?.auto_confirm || false}
                        onChange={(e) => updateCalendarIntegration({ auto_confirm: e.target.checked })}
                      />
                      <Label htmlFor="auto_confirm">
                        Confirmação automática de agendamentos
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB AVANÇADO */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Analytics & LGPD</h3>
                </div>

                {/* ANALYTICS */}
                <div className="space-y-4">
                  <h4 className="font-medium">Analytics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="track_views"
                        checked={config.analytics?.track_views || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          analytics: { ...prev.analytics, track_views: e.target.checked }
                        }))}
                      />
                      <Label htmlFor="track_views">Rastrear visualizações</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="track_interactions"
                        checked={config.analytics?.track_interactions || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          analytics: { ...prev.analytics, track_interactions: e.target.checked }
                        }))}
                      />
                      <Label htmlFor="track_interactions">Rastrear interações</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="track_conversions"
                        checked={config.analytics?.track_conversions || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          analytics: { ...prev.analytics, track_conversions: e.target.checked }
                        }))}
                      />
                      <Label htmlFor="track_conversions">Rastrear conversões</Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* LGPD/GDPR */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    LGPD / GDPR
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="gdpr_compliant"
                        checked={config.privacy?.gdpr_compliant || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, gdpr_compliant: e.target.checked }
                        }))}
                      />
                      <Label htmlFor="gdpr_compliant">Compatível com LGPD/GDPR</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="cookie_consent_required"
                        checked={config.privacy?.cookie_consent_required || false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          privacy: { ...prev.privacy, cookie_consent_required: e.target.checked }
                        }))}
                      />
                      <Label htmlFor="cookie_consent_required">Consentimento de cookies obrigatório</Label>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </BlurFade>

      {/* FOOTER COM AÇÕES */}
      <BlurFade delay={0.3}>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Configurações serão aplicadas ao formulário
            </div>
            
            <div className="flex gap-2">
              {onPreview && (
                <Button variant="outline" onClick={onPreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}
              {onSave && (
                <Button onClick={onSave}>
                  <Play className="w-4 h-4 mr-2" />
                  Continuar
                </Button>
              )}
            </div>
          </div>
        </Card>
      </BlurFade>
    </div>
  );
}; 