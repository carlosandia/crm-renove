import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

interface TemperatureConfig {
  id: string;
  pipeline_id: string;
  tenant_id: string;
  hot_threshold: number;
  warm_threshold: number;
  cold_threshold: number;
  hot_color: string;
  warm_color: string;
  cold_color: string;
  frozen_color: string;
  hot_icon: string;
  warm_icon: string;
  cold_icon: string;
  frozen_icon: string;
}

interface TemperatureConfigManagerProps {
  pipelineId: string;
  tenantId: string;
  onConfigUpdated?: () => void;
}

function TemperatureConfigManager({ pipelineId, tenantId, onConfigUpdated }: TemperatureConfigManagerProps) {
  const [config, setConfig] = useState<TemperatureConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const defaultConfig: Partial<TemperatureConfig> = {
    hot_threshold: 24,
    warm_threshold: 72,
    cold_threshold: 168,
    hot_color: '#ef4444',
    warm_color: '#f97316',
    cold_color: '#3b82f6',
    frozen_color: '#6b7280',
    hot_icon: '🔥',
    warm_icon: '🌡️',
    cold_icon: '❄️',
    frozen_icon: '🧊'
  };

  useEffect(() => {
    loadConfig();
  }, [pipelineId, tenantId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temperature_config')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
      } else {
        // Criar configuração padrão se não existir
        setConfig({
          id: '',
          pipeline_id: pipelineId,
          tenant_id: tenantId,
          ...defaultConfig
        } as TemperatureConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de temperatura:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações de temperatura',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);

      const configData = {
        pipeline_id: pipelineId,
        tenant_id: tenantId,
        hot_threshold: config.hot_threshold,
        warm_threshold: config.warm_threshold,
        cold_threshold: config.cold_threshold,
        hot_color: config.hot_color,
        warm_color: config.warm_color,
        cold_color: config.cold_color,
        frozen_color: config.frozen_color,
        hot_icon: config.hot_icon,
        warm_icon: config.warm_icon,
        cold_icon: config.cold_icon,
        frozen_icon: config.frozen_icon,
        updated_at: new Date().toISOString()
      };

      let result;
      if (config.id) {
        // Atualizar existente
        result = await supabase
          .from('temperature_config')
          .update(configData)
          .eq('id', config.id)
          .select()
          .single();
      } else {
        // Criar novo
        result = await supabase
          .from('temperature_config')
          .insert(configData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig(result.data);
      setIsEditing(false);
      toast({
        title: 'Sucesso',
        description: 'Configurações de temperatura salvas com sucesso!',
        variant: 'success'
      });
      
      // Atualizar temperaturas de todos os leads desta pipeline
      await updateAllTemperatures();
      
      if (onConfigUpdated) onConfigUpdated();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações de temperatura',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAllTemperatures = async () => {
    try {
      const { error } = await supabase.rpc('update_all_temperatures');
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar temperaturas:', error);
    }
  };

  const handleInputChange = (field: keyof TemperatureConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const getTemperaturePreview = (level: string) => {
    if (!config) return null;
    
    const levelConfig = {
      hot: { color: config.hot_color, icon: config.hot_icon, label: 'Quente' },
      warm: { color: config.warm_color, icon: config.warm_icon, label: 'Morno' },
      cold: { color: config.cold_color, icon: config.cold_icon, label: 'Frio' },
      frozen: { color: config.frozen_color, icon: config.frozen_icon, label: 'Gelado' }
    }[level];

    if (!levelConfig) return null;

    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: levelConfig.color, 
          color: levelConfig.color,
          backgroundColor: `${levelConfig.color}10`
        }}
        className="flex items-center gap-1"
      >
        <span>{levelConfig.icon}</span>
        <span>{levelConfig.label}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Temperatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          🌡️ Configuração de Temperatura
        </CardTitle>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  loadConfig(); // Recarregar dados originais
                }}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={saveConfig}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Configurações de Tempo */}
        <div>
          <h4 className="font-medium mb-3">Limites de Tempo (em horas)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hot_threshold">🔥 Quente (até)</Label>
              <Input
                id="hot_threshold"
                type="number"
                value={config.hot_threshold}
                onChange={(e) => handleInputChange('hot_threshold', parseInt(e.target.value))}
                disabled={!isEditing}
                min="1"
                max="23"
              />
              <span className="text-xs text-gray-500">Até {config.hot_threshold}h</span>
            </div>
            
            <div>
              <Label htmlFor="warm_threshold">🌡️ Morno (até)</Label>
              <Input
                id="warm_threshold"
                type="number"
                value={config.warm_threshold}
                onChange={(e) => handleInputChange('warm_threshold', parseInt(e.target.value))}
                disabled={!isEditing}
                min={config.hot_threshold + 1}
                max="167"
              />
              <span className="text-xs text-gray-500">De {config.hot_threshold}h até {config.warm_threshold}h</span>
            </div>
            
            <div>
              <Label htmlFor="cold_threshold">❄️ Frio (até)</Label>
              <Input
                id="cold_threshold"
                type="number"
                value={config.cold_threshold}
                onChange={(e) => handleInputChange('cold_threshold', parseInt(e.target.value))}
                disabled={!isEditing}
                min={config.warm_threshold + 1}
              />
              <span className="text-xs text-gray-500">De {config.warm_threshold}h até {config.cold_threshold}h</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            🧊 Gelado: Acima de {config.cold_threshold}h
          </p>
        </div>

        {/* Preview das Temperaturas */}
        <div>
          <h4 className="font-medium mb-3">Preview das Temperaturas</h4>
          <div className="flex flex-wrap gap-2">
            {getTemperaturePreview('hot')}
            {getTemperaturePreview('warm')}
            {getTemperaturePreview('cold')}
            {getTemperaturePreview('frozen')}
          </div>
        </div>

        {/* Configurações Visuais (apenas para usuários avançados) */}
        {isEditing && (
          <details className="border rounded p-4">
            <summary className="cursor-pointer font-medium">Configurações Avançadas</summary>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hot_color">Cor Quente</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hot_color"
                      type="color"
                      value={config.hot_color}
                      onChange={(e) => handleInputChange('hot_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={config.hot_color}
                      onChange={(e) => handleInputChange('hot_color', e.target.value)}
                      placeholder="#ef4444"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="hot_icon">Ícone Quente</Label>
                  <Input
                    id="hot_icon"
                    value={config.hot_icon}
                    onChange={(e) => handleInputChange('hot_icon', e.target.value)}
                    placeholder="🔥"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warm_color">Cor Morno</Label>
                  <div className="flex gap-2">
                    <Input
                      id="warm_color"
                      type="color"
                      value={config.warm_color}
                      onChange={(e) => handleInputChange('warm_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={config.warm_color}
                      onChange={(e) => handleInputChange('warm_color', e.target.value)}
                      placeholder="#f97316"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="warm_icon">Ícone Morno</Label>
                  <Input
                    id="warm_icon"
                    value={config.warm_icon}
                    onChange={(e) => handleInputChange('warm_icon', e.target.value)}
                    placeholder="🌡️"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cold_color">Cor Frio</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cold_color"
                      type="color"
                      value={config.cold_color}
                      onChange={(e) => handleInputChange('cold_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={config.cold_color}
                      onChange={(e) => handleInputChange('cold_color', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cold_icon">Ícone Frio</Label>
                  <Input
                    id="cold_icon"
                    value={config.cold_icon}
                    onChange={(e) => handleInputChange('cold_icon', e.target.value)}
                    placeholder="❄️"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frozen_color">Cor Gelado</Label>
                  <div className="flex gap-2">
                    <Input
                      id="frozen_color"
                      type="color"
                      value={config.frozen_color}
                      onChange={(e) => handleInputChange('frozen_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={config.frozen_color}
                      onChange={(e) => handleInputChange('frozen_color', e.target.value)}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="frozen_icon">Ícone Gelado</Label>
                  <Input
                    id="frozen_icon"
                    value={config.frozen_icon}
                    onChange={(e) => handleInputChange('frozen_icon', e.target.value)}
                    placeholder="🧊"
                  />
                </div>
              </div>
            </div>
          </details>
        )}

        {/* Informações Adicionais */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">Como funciona?</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• A temperatura é calculada automaticamente baseada no tempo na etapa "Novos Leads"</li>
            <li>• Leads começam como "Quente" e esfriam com o tempo</li>
            <li>• Ao mover para outras etapas, a temperatura para de ser calculada automaticamente</li>
            <li>• Ao retornar para "Novos Leads", o cronômetro reinicia</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default TemperatureConfigManager; 