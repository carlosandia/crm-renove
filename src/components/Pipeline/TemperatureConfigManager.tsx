import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useTemperatureAPI, TemperatureConfig } from '../../hooks/useTemperatureAPI';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';

interface TemperatureConfigManagerProps {
  pipelineId: string;
  tenantId: string;
  onConfigUpdated?: () => void;
}

function TemperatureConfigManager({ pipelineId, tenantId, onConfigUpdated }: TemperatureConfigManagerProps) {
  const [editingConfig, setEditingConfig] = useState<TemperatureConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { 
    config, 
    loading, 
    saving, 
    error, 
    loadConfig, 
    saveConfig 
  } = useTemperatureAPI({ 
    pipelineId,
    autoLoad: true 
  });

  // Mostrar error se houver
  if (error) {
    showErrorToast('Erro', error);
  }

  // Função para iniciar edição
  const handleStartEdit = () => {
    if (config) {
      setEditingConfig({ ...config });
      setIsEditing(true);
    }
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingConfig(null);
  };

  // Função para salvar configuração
  const handleSaveConfig = async () => {
    if (!editingConfig) return;

    // Validar sequência lógica
    if (editingConfig.hot_threshold >= editingConfig.warm_threshold || 
        editingConfig.warm_threshold >= editingConfig.cold_threshold) {
      showErrorToast('Configuração inválida', 'Os períodos devem seguir ordem crescente: Quente < Morno < Frio');
      return;
    }

    const success = await saveConfig(editingConfig);
    if (success) {
      setIsEditing(false);
      setEditingConfig(null);
      showSuccessToast('Sucesso', 'Configurações de temperatura salvas com sucesso!');
      
      if (onConfigUpdated) {
        onConfigUpdated();
      }
    }
  };

  const handleInputChange = (field: keyof TemperatureConfig, value: any) => {
    if (!editingConfig) return;
    setEditingConfig({ ...editingConfig, [field]: value });
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
              onClick={handleStartEdit}
            >
              Editar
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSaveConfig}
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
                value={isEditing ? editingConfig?.hot_threshold : config?.hot_threshold}
                onChange={(e) => handleInputChange('hot_threshold', parseInt(e.target.value))}
                disabled={!isEditing}
                min="1"
                max="23"
              />
              <span className="text-xs text-gray-500">Até {isEditing ? editingConfig?.hot_threshold : config?.hot_threshold}h</span>
            </div>
            
            <div>
              <Label htmlFor="warm_threshold">🌡️ Morno (até)</Label>
              <Input
                id="warm_threshold"
                type="number"
                value={isEditing ? editingConfig?.warm_threshold : config?.warm_threshold}
                onChange={(e) => handleInputChange('warm_threshold', parseInt(e.target.value))}
                disabled={!isEditing}
                min={(isEditing ? editingConfig?.hot_threshold : config?.hot_threshold) ? (isEditing ? editingConfig!.hot_threshold + 1 : config!.hot_threshold + 1) : 1}
                max="167"
              />
              <span className="text-xs text-gray-500">De {isEditing ? editingConfig?.hot_threshold : config?.hot_threshold}h até {isEditing ? editingConfig?.warm_threshold : config?.warm_threshold}h</span>
            </div>
            
            <div>
              <Label htmlFor="cold_threshold">❄️ Frio (até)</Label>
              <Input
                id="cold_threshold"
                type="number"
                value={isEditing ? editingConfig?.cold_threshold : config?.cold_threshold}
                onChange={(e) => handleInputChange('cold_threshold', parseInt(e.target.value))}
                disabled={!isEditing}
                min={(isEditing ? editingConfig?.warm_threshold : config?.warm_threshold) ? (isEditing ? editingConfig!.warm_threshold + 1 : config!.warm_threshold + 1) : 1}
              />
              <span className="text-xs text-gray-500">De {isEditing ? editingConfig?.warm_threshold : config?.warm_threshold}h até {isEditing ? editingConfig?.cold_threshold : config?.cold_threshold}h</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            🧊 Gelado: Acima de {isEditing ? editingConfig?.cold_threshold : config?.cold_threshold}h
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
                      value={editingConfig?.hot_color}
                      onChange={(e) => handleInputChange('hot_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={editingConfig?.hot_color}
                      onChange={(e) => handleInputChange('hot_color', e.target.value)}
                      placeholder="#ef4444"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="hot_icon">Ícone Quente</Label>
                  <Input
                    id="hot_icon"
                    value={editingConfig?.hot_icon}
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
                      value={editingConfig?.warm_color}
                      onChange={(e) => handleInputChange('warm_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={editingConfig?.warm_color}
                      onChange={(e) => handleInputChange('warm_color', e.target.value)}
                      placeholder="#f97316"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="warm_icon">Ícone Morno</Label>
                  <Input
                    id="warm_icon"
                    value={editingConfig?.warm_icon}
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
                      value={editingConfig?.cold_color}
                      onChange={(e) => handleInputChange('cold_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={editingConfig?.cold_color}
                      onChange={(e) => handleInputChange('cold_color', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cold_icon">Ícone Frio</Label>
                  <Input
                    id="cold_icon"
                    value={editingConfig?.cold_icon}
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
                      value={editingConfig?.frozen_color}
                      onChange={(e) => handleInputChange('frozen_color', e.target.value)}
                      className="w-16 h-8"
                    />
                    <Input
                      value={editingConfig?.frozen_color}
                      onChange={(e) => handleInputChange('frozen_color', e.target.value)}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="frozen_icon">Ícone Gelado</Label>
                  <Input
                    id="frozen_icon"
                    value={editingConfig?.frozen_icon}
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