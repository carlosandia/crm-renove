import React, { useState, useEffect } from 'react';
import { Pipeline, PipelineStage } from '../../types/Pipeline';
import { User } from '../../types/User';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';

// Magic UI components
import { AnimatedCard } from '../ui/animated-card';
import { BlurFade } from '../ui/blur-fade';
import { ShimmerButton } from '../ui/shimmer-button';

// Subcomponentes especializados
import { useStageManager, StageManagerRender } from './stages';
import { useCustomFieldsManager, CustomFieldsManagerRender } from './fields';
import { useCadenceManager, CadenceManagerRender } from './cadence';
import { useDistributionManager, DistributionManagerRender } from './distribution';
import { useTemperatureConfig, TemperatureConfigRender } from './temperature';

// Icons
import { 
  Settings, 
  Target, 
  Sliders, 
  Zap, 
  Save,
  ArrowLeft,
  Database,
  RotateCcw,
  Thermometer
} from 'lucide-react';

// Interfaces
interface CustomField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card: boolean;
}

interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

interface CadenceConfig {
  id?: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
}

interface DistributionRule {
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  skip_inactive_members: boolean;
  fallback_to_manual: boolean;
}

interface TemperatureConfig {
  hot_days: number;
  warm_days: number;
  cold_days: number;
}

interface PipelineFormData {
  name: string;
  description: string;
  member_ids: string[];
  stages: Omit<PipelineStage, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>[];
  custom_fields: CustomField[];
  cadence_configs: CadenceConfig[];
  distribution_rule?: DistributionRule;
  temperature_config?: TemperatureConfig;
}

interface ModernPipelineCreatorProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: PipelineFormData) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
}

const ModernPipelineCreatorRefactored: React.FC<ModernPipelineCreatorProps> = ({
  members,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
}) => {
  const { user } = useAuth();
  
  // Estados principais
  const [formData, setFormData] = useState<PipelineFormData>({
    name: '',
    description: '',
    member_ids: [],
    stages: [],
    custom_fields: [],
    cadence_configs: [],
    distribution_rule: {
      mode: 'manual',
      is_active: true,
      working_hours_only: false,
      skip_inactive_members: true,
      fallback_to_manual: true
    },
    temperature_config: {
      hot_days: 3,
      warm_days: 7,
      cold_days: 14
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Inicializar managers especializados
  const stageManager = useStageManager({
    initialStages: formData.stages,
    onStagesChange: (stages) => setFormData(prev => ({ ...prev, stages }))
  });

  const fieldsManager = useCustomFieldsManager({
    initialFields: formData.custom_fields,
    onFieldsChange: (custom_fields) => setFormData(prev => ({ ...prev, custom_fields }))
  });

  const cadenceManager = useCadenceManager({
    initialCadences: formData.cadence_configs,
    availableStages: stageManager.stages,
    onCadencesChange: (cadence_configs) => setFormData(prev => ({ ...prev, cadence_configs }))
  });

  const distributionManager = useDistributionManager({
    initialRule: formData.distribution_rule,
    onRuleChange: (distribution_rule) => setFormData(prev => ({ ...prev, distribution_rule }))
  });

  const temperatureManager = useTemperatureConfig({
    initialConfig: formData.temperature_config,
    onConfigChange: (temperature_config) => setFormData(prev => ({ ...prev, temperature_config }))
  });

  // Carregar dados do pipeline se estiver editando
  useEffect(() => {
    if (pipeline) {
      loadPipelineData();
    }
  }, [pipeline]);

  const loadPipelineData = async () => {
    if (!pipeline) return;
    
    setLoading(true);
    try {
      // Carregar dados básicos
      setFormData(prev => ({
        ...prev,
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: pipeline.member_ids || []
      }));

      // Carregar etapas
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('order_index');

      if (stages) {
        const stageData = stages.map(stage => ({
          name: stage.name,
          color: stage.color,
          temperature_score: stage.temperature_score,
          max_days_allowed: stage.max_days_allowed,
          time_unit: stage.time_unit || 'days',
          order_index: stage.order_index,
          is_system: stage.is_system || false,
          description: stage.description || ''
        }));
        setFormData(prev => ({ ...prev, stages: stageData }));
      }

      // Carregar campos customizados
      const { data: fields } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('field_order');

      if (fields) {
        setFormData(prev => ({ ...prev, custom_fields: fields }));
      }

      // Carregar configurações de cadência
      const { data: cadences } = await supabase
        .from('cadence_configs')
        .select(`
          *,
          cadence_tasks (*)
        `)
        .eq('pipeline_id', pipeline.id);

      if (cadences) {
        const cadenceData = cadences.map(cadence => ({
          id: cadence.id,
          stage_name: cadence.stage_name,
          stage_order: cadence.stage_order,
          tasks: cadence.cadence_tasks || [],
          is_active: cadence.is_active
        }));
        setFormData(prev => ({ ...prev, cadence_configs: cadenceData }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados do pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('Nome do pipeline é obrigatório');
      return false;
    }
    
    if (formData.member_ids.length === 0) {
      alert('Selecione pelo menos um vendedor');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erro ao salvar pipeline:', error);
      alert('Erro ao salvar pipeline. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  const renderBasicTab = () => (
    <BlurFade delay={0.1} inView>
      <div className="space-y-6">
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Configure o nome, descrição e vendedores do pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pipeline-name">Nome do Pipeline *</Label>
              <Input
                id="pipeline-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Vendas Consultivas"
              />
            </div>

            <div>
              <Label htmlFor="pipeline-description">Descrição</Label>
              <Textarea
                id="pipeline-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito e funcionamento do pipeline..."
                rows={3}
              />
            </div>

            <div>
              <Label>Vendedores Vinculados *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={formData.member_ids.includes(member.id)}
                      onCheckedChange={() => handleMemberToggle(member.id)}
                    />
                    <Label htmlFor={`member-${member.id}`} className="text-sm">
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Configuração rápida de temperatura */}
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-red-500" />
              Configuração de Temperatura
            </CardTitle>
            <CardDescription>
              Configure rápidamente os períodos de temperatura ou use a aba dedicada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemperatureConfigRender temperatureManager={temperatureManager} />
          </CardContent>
        </AnimatedCard>
      </div>
    </BlurFade>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">
            Configure todas as etapas e automações do seu pipeline de vendas
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="stages" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Etapas
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="cadence" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Cadência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            {renderBasicTab()}
          </TabsContent>

          <TabsContent value="stages">
            <StageManagerRender stageManager={stageManager} />
          </TabsContent>

          <TabsContent value="fields">
            <CustomFieldsManagerRender fieldsManager={fieldsManager} />
          </TabsContent>

          <TabsContent value="distribution">
            <DistributionManagerRender distributionManager={distributionManager} />
          </TabsContent>

          <TabsContent value="cadence">
            <CadenceManagerRender 
              cadenceManager={cadenceManager} 
              availableStages={stageManager.stages.map(s => ({ 
                name: s.name, 
                order_index: s.order_index 
              }))} 
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <ShimmerButton
            type="submit"
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Salvando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {submitText}
              </div>
            )}
          </ShimmerButton>
        </div>
      </form>
    </div>
  );
};

export default ModernPipelineCreatorRefactored; 