import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Calendar, Phone, Mail, MessageSquare, Trash2 } from 'lucide-react';

// AIDEV-NOTE: Componente para gerenciar atividades de lead (lead_activities)
// Integra com combined_activities_view para atividades automáticas e manuais

export interface ActivityConfig {
  id?: string;
  activity_type: 'call' | 'email' | 'task' | 'meeting' | 'note';
  activity_title: string;
  activity_description: string;
  due_date?: string;
  communication_direction?: 'inbound' | 'outbound';
}

interface ActivitiesManagerProps {
  pipelineId?: string;
  activities: ActivityConfig[];
  onActivitiesChange: (activities: ActivityConfig[]) => void;
  isEditMode?: boolean;
}

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Ligação', icon: Phone, color: 'bg-blue-100 text-blue-700' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'bg-green-100 text-green-700' },
  { value: 'task', label: 'Tarefa', icon: Calendar, color: 'bg-orange-100 text-orange-700' },
  { value: 'meeting', label: 'Reunião', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  { value: 'note', label: 'Anotação', icon: MessageSquare, color: 'bg-gray-100 text-gray-700' }
] as const;

export const ActivitiesManager: React.FC<ActivitiesManagerProps> = ({
  pipelineId,
  activities = [],
  onActivitiesChange,
  isEditMode = false
}) => {
  const [newActivity, setNewActivity] = useState<Partial<ActivityConfig>>({
    activity_type: 'task',
    activity_title: '',
    activity_description: ''
  });

  // ✅ CORREÇÃO: Adicionar nova atividade
  const handleAddActivity = useCallback(() => {
    if (!newActivity.activity_title?.trim()) return;

    const activity: ActivityConfig = {
      id: `temp_${Date.now()}`, // ID temporário para identificação
      activity_type: newActivity.activity_type || 'task',
      activity_title: newActivity.activity_title.trim(),
      activity_description: newActivity.activity_description?.trim() || '',
      communication_direction: ['call', 'email'].includes(newActivity.activity_type || '') ? 'outbound' : undefined
    };

    const updatedActivities = [...activities, activity];
    onActivitiesChange(updatedActivities);

    // Limpar formulário
    setNewActivity({
      activity_type: 'task',
      activity_title: '',
      activity_description: ''
    });
  }, [newActivity, activities, onActivitiesChange]);

  // ✅ CORREÇÃO: Remover atividade
  const handleRemoveActivity = useCallback((index: number) => {
    const updatedActivities = activities.filter((_, i) => i !== index);
    onActivitiesChange(updatedActivities);
  }, [activities, onActivitiesChange]);

  // ✅ CORREÇÃO: Atualizar atividade existente
  const handleUpdateActivity = useCallback((index: number, field: keyof ActivityConfig, value: string) => {
    const updatedActivities = activities.map((activity, i) => 
      i === index ? { ...activity, [field]: value } : activity
    );
    onActivitiesChange(updatedActivities);
  }, [activities, onActivitiesChange]);

  const getActivityTypeConfig = (type: string) => 
    ACTIVITY_TYPES.find(t => t.value === type) || ACTIVITY_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Atividades da Pipeline</h3>
          <p className="text-sm text-gray-500">
            Configure atividades padrão que serão sugeridas para leads nesta pipeline
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {activities.length} atividade{activities.length !== 1 ? 's' : ''} configurada{activities.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lista de atividades existentes */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividades Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.map((activity, index) => {
                const typeConfig = getActivityTypeConfig(activity.activity_type);
                const IconComponent = typeConfig.icon;
                
                return (
                  <div key={activity.id || index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                    <div className={`p-2 rounded-full ${typeConfig.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={activity.activity_type}
                          onChange={(e) => handleUpdateActivity(index, 'activity_type', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          {ACTIVITY_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm font-medium text-gray-900">
                          {activity.activity_title}
                        </span>
                      </div>
                      
                      <Input
                        placeholder="Título da atividade"
                        value={activity.activity_title}
                        onChange={(e) => handleUpdateActivity(index, 'activity_title', e.target.value)}
                        className="text-sm"
                      />
                      
                      <Input
                        placeholder="Descrição da atividade"
                        value={activity.activity_description}
                        onChange={(e) => handleUpdateActivity(index, 'activity_description', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveActivity(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário para nova atividade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Nova Atividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Atividade
                </label>
                <select
                  value={newActivity.activity_type}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, activity_type: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  {ACTIVITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título da Atividade *
                </label>
                <Input
                  placeholder="Ex: Ligar para confirmar interesse"
                  value={newActivity.activity_title || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, activity_title: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição da Atividade
              </label>
              <Input
                placeholder="Descrição detalhada da atividade..."
                value={newActivity.activity_description || ''}
                onChange={(e) => setNewActivity(prev => ({ ...prev, activity_description: e.target.value }))}
                className="text-sm"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleAddActivity}
                disabled={!newActivity.activity_title?.trim()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Atividade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre o uso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          ℹ️ Como funciona
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Atividades configuradas aqui serão sugeridas automaticamente para novos leads</li>
          <li>• Cada atividade pode ser personalizada por tipo (ligação, e-mail, tarefa, etc.)</li>
          <li>• Os vendedores poderão ver e completar essas atividades na visualização do lead</li>
        </ul>
      </div>
    </div>
  );
};

export default ActivitiesManager;