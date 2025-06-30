import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { Badge } from '../../ui/badge';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Save, 
  RefreshCw,
  Plus,
  Trash2,
  Settings
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../../lib/toast';

interface ConversionGoal {
  id: string;
  name: string;
  value: number;
  currency: string;
  category: string;
  isActive: boolean;
  metaPixelId?: string;
  googleConversionId?: string;
}

interface ConversionTracking {
  goals: ConversionGoal[];
  globalSettings: {
    trackingEnabled: boolean;
    defaultCurrency: string;
    debugMode: boolean;
  };
}

const DEFAULT_GOALS: ConversionGoal[] = [
  {
    id: '1',
    name: 'Lead Gerado',
    value: 50,
    currency: 'BRL',
    category: 'lead',
    isActive: true
  },
  {
    id: '2', 
    name: 'Oportunidade Criada',
    value: 200,
    currency: 'BRL',
    category: 'opportunity',
    isActive: true
  }
];

export function useConversionsManager() {
  const [tracking, setTracking] = useState<ConversionTracking>({
    goals: DEFAULT_GOALS,
    globalSettings: {
      trackingEnabled: true,
      defaultCurrency: 'BRL',
      debugMode: false
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  const addGoal = useCallback(() => {
    const newGoal: ConversionGoal = {
      id: Date.now().toString(),
      name: '',
      value: 0,
      currency: tracking.globalSettings.defaultCurrency,
      category: 'custom',
      isActive: true
    };
    
    setTracking(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));
  }, [tracking.globalSettings.defaultCurrency]);

  const updateGoal = useCallback((goalId: string, updates: Partial<ConversionGoal>) => {
    setTracking(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === goalId ? { ...goal, ...updates } : goal
      )
    }));
  }, []);

  const removeGoal = useCallback((goalId: string) => {
    setTracking(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal.id !== goalId)
    }));
  }, []);

  const updateGlobalSettings = useCallback((updates: Partial<ConversionTracking['globalSettings']>) => {
    setTracking(prev => ({
      ...prev,
      globalSettings: { ...prev.globalSettings, ...updates }
    }));
  }, []);

  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccessToast('Configuração de conversões salva!');
    } catch (error) {
      showErrorToast('Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    tracking,
    isSaving,
    addGoal,
    updateGoal,
    removeGoal,
    updateGlobalSettings,
    saveConfig
  };
}

interface ConversionsManagerRenderProps {
  conversionsManager: ReturnType<typeof useConversionsManager>;
}

export function ConversionsManagerRender({ conversionsManager }: ConversionsManagerRenderProps) {
  const {
    tracking,
    isSaving,
    addGoal,
    updateGoal,
    removeGoal,
    updateGlobalSettings,
    saveConfig
  } = conversionsManager;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Gerenciamento de Conversões
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure metas de conversão e rastreamento de valor
        </p>
      </div>

      <BlurFade delay={0.1} inView>
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações Globais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Rastreamento Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar rastreamento de conversões
                </p>
              </div>
              <Switch
                checked={tracking.globalSettings.trackingEnabled}
                onCheckedChange={(enabled) => updateGlobalSettings({ trackingEnabled: enabled })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultCurrency">Moeda Padrão</Label>
                <Select
                  value={tracking.globalSettings.defaultCurrency}
                  onValueChange={(currency) => updateGlobalSettings({ defaultCurrency: currency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL - Real</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Modo Debug</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={tracking.globalSettings.debugMode}
                    onCheckedChange={(debug) => updateGlobalSettings({ debugMode: debug })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {tracking.globalSettings.debugMode ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <AnimatedCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Metas de Conversão
                </CardTitle>
                <CardDescription>
                  Configure valores para diferentes tipos de conversão
                </CardDescription>
              </div>
              <Button onClick={addGoal} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Meta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tracking.goals.map((goal) => (
                <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={goal.isActive}
                        onCheckedChange={(active) => updateGoal(goal.id, { isActive: active })}
                      />
                      <Badge variant={goal.isActive ? "default" : "secondary"}>
                        {goal.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => removeGoal(goal.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Nome da Meta</Label>
                      <Input
                        value={goal.name}
                        onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                        placeholder="Ex: Lead Gerado"
                      />
                    </div>

                    <div>
                      <Label>Valor</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={goal.value}
                          onChange={(e) => updateGoal(goal.id, { value: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="flex-1"
                        />
                        <Select
                          value={goal.currency}
                          onValueChange={(currency) => updateGoal(goal.id, { currency })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BRL">BRL</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Categoria</Label>
                      <Select
                        value={goal.category}
                        onValueChange={(category) => updateGoal(goal.id, { category })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="opportunity">Oportunidade</SelectItem>
                          <SelectItem value="sale">Venda</SelectItem>
                          <SelectItem value="custom">Customizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Meta Pixel ID (opcional)</Label>
                      <Input
                        value={goal.metaPixelId || ''}
                        onChange={(e) => updateGoal(goal.id, { metaPixelId: e.target.value })}
                        placeholder="123456789"
                      />
                    </div>
                    <div>
                      <Label>Google Conversion ID (opcional)</Label>
                      <Input
                        value={goal.googleConversionId || ''}
                        onChange={(e) => updateGoal(goal.id, { googleConversionId: e.target.value })}
                        placeholder="AW-123456789"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {tracking.goals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma meta configurada</p>
                  <p className="text-sm">Clique em "Nova Meta" para começar</p>
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>

      <BlurFade delay={0.3} inView>
        <div className="flex items-center gap-2">
          <Button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
          
          {tracking.globalSettings.trackingEnabled && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <BarChart3 className="h-4 w-4" />
              <span>Rastreamento ativo para {tracking.goals.filter(g => g.isActive).length} metas</span>
            </div>
          )}
        </div>
      </BlurFade>
    </div>
  );
}

export default ConversionsManagerRender; 