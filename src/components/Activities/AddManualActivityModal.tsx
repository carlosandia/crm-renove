import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  X, 
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Presentation,
  Users,
  MapPin,
  Activity,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  Save
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCreateManualActivity } from '../../hooks/useCombinedActivities';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';

// ===================================
// SCHEMA DE VALIDAÇÃO
// ===================================

const manualActivitySchema = z.object({
  activity_type: z.enum([
    'call', 'email', 'meeting', 'note', 'whatsapp', 
    'proposal', 'presentation', 'demo', 'followup', 'visit'
  ], {
    required_error: 'Selecione o tipo de atividade'
  }),
  title: z.string()
    .min(1, 'Título é obrigatório')
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(255, 'Título muito longo'),
  description: z.string()
    .max(1000, 'Descrição muito longa')
    .optional(),
  outcome: z.enum(['positive', 'neutral', 'negative'], {
    required_error: 'Selecione o resultado'
  }),
  completed_at: z.string()
    .refine((date) => !isNaN(Date.parse(date)), 'Data inválida'),
  duration_minutes: z.number()
    .min(1, 'Duração deve ser pelo menos 1 minuto')
    .max(1440, 'Duração não pode exceder 24 horas')
    .optional()
    .or(z.literal(0))
    .transform(val => val === 0 ? undefined : val)
});

type ManualActivityFormData = z.infer<typeof manualActivitySchema>;

// ===================================
// INTERFACES
// ===================================

interface AddManualActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  pipelineId: string;
  leadName?: string;
  onSuccess?: () => void;
}

// ===================================
// CONSTANTES
// ===================================

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Ligação', icon: Phone, color: 'text-blue-600' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'text-green-600' },
  { value: 'meeting', label: 'Reunião', icon: Calendar, color: 'text-purple-600' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
  { value: 'note', label: 'Nota/Observação', icon: FileText, color: 'text-gray-600' },
  { value: 'presentation', label: 'Apresentação', icon: Presentation, color: 'text-indigo-600' },
  { value: 'demo', label: 'Demonstração', icon: Users, color: 'text-cyan-600' },
  { value: 'proposal', label: 'Proposta', icon: FileText, color: 'text-orange-600' },
  { value: 'visit', label: 'Visita', icon: MapPin, color: 'text-red-600' },
  { value: 'followup', label: 'Follow-up', icon: Activity, color: 'text-yellow-600' }
] as const;

const OUTCOME_OPTIONS = [
  { 
    value: 'positive', 
    label: 'Positivo', 
    description: 'Lead demonstrou interesse, engajou positivamente',
    icon: ThumbsUp,
    color: 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
  },
  { 
    value: 'neutral', 
    label: 'Neutro', 
    description: 'Sem resposta clara, precisa de mais acompanhamento',
    icon: Minus,
    color: 'text-yellow-600 border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
  },
  { 
    value: 'negative', 
    label: 'Negativo', 
    description: 'Lead não demonstrou interesse ou recusou',
    icon: ThumbsDown,
    color: 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
  }
] as const;

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export const AddManualActivityModal: React.FC<AddManualActivityModalProps> = ({
  isOpen,
  onClose,
  leadId,
  pipelineId,
  leadName = 'Lead',
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createActivityMutation = useCreateManualActivity();

  // Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<ManualActivityFormData>({
    resolver: zodResolver(manualActivitySchema),
    defaultValues: {
      activity_type: 'call',
      outcome: 'neutral',
      completed_at: new Date().toISOString().slice(0, 16) // formato datetime-local
    }
  });

  const watchedActivityType = watch('activity_type');
  const watchedOutcome = watch('outcome');

  // Função para submeter o formulário
  const onSubmit = async (data: ManualActivityFormData) => {
    try {
      setIsSubmitting(true);

      await createActivityMutation.mutateAsync({
        lead_id: leadId,
        pipeline_id: pipelineId,
        activity_type: data.activity_type,
        title: data.title,
        description: data.description || undefined,
        outcome: data.outcome,
        completed_at: new Date(data.completed_at).toISOString(),
        duration_minutes: data.duration_minutes
      });

      showSuccessToast('Atividade manual criada com sucesso!');
      
      // Reset form e fechar modal
      reset();
      onSuccess?.();
      onClose();

    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao criar atividade manual');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para fechar modal com confirmação se há dados
  const handleClose = () => {
    reset();
    onClose();
  };

  // Obter informações do tipo selecionado
  const selectedActivityType = ACTIVITY_TYPES.find(type => type.value === watchedActivityType);
  const selectedOutcome = OUTCOME_OPTIONS.find(opt => opt.value === watchedOutcome);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Nova Atividade Manual
              </h2>
              <p className="text-sm text-gray-500">
                Registrar atividade realizada para {leadName}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Tipo de Atividade */}
          <div className="space-y-3">
            <Label htmlFor="activity_type" className="text-sm font-medium">
              Tipo de Atividade *
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACTIVITY_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue('activity_type', type.value)}
                    className={cn(
                      "p-3 border-2 rounded-lg flex items-center gap-2 text-left transition-all",
                      watchedActivityType === type.value
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", type.color)} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.activity_type && (
              <p className="text-sm text-red-600">{errors.activity_type.message}</p>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Título da Atividade *
            </Label>
            <Input
              id="title"
              placeholder={`Ex: Ligação de follow-up para ${leadName}`}
              {...register('title')}
              className={cn(
                errors.title && "border-red-500 focus:border-red-500"
              )}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição (Opcional)
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva o que foi discutido, resultados, próximos passos..."
              rows={3}
              {...register('description')}
              className={cn(
                errors.description && "border-red-500 focus:border-red-500"
              )}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Data e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data/Hora */}
            <div className="space-y-2">
              <Label htmlFor="completed_at" className="text-sm font-medium">
                Data/Hora da Atividade *
              </Label>
              <Input
                id="completed_at"
                type="datetime-local"
                {...register('completed_at')}
                className={cn(
                  errors.completed_at && "border-red-500 focus:border-red-500"
                )}
              />
              {errors.completed_at && (
                <p className="text-sm text-red-600">{errors.completed_at.message}</p>
              )}
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <Label htmlFor="duration_minutes" className="text-sm font-medium">
                Duração (minutos)
              </Label>
              <Input
                id="duration_minutes"
                type="number"
                min="1"
                max="1440"
                placeholder="Ex: 15"
                {...register('duration_minutes', { 
                  valueAsNumber: true,
                  setValueAs: (v) => v === '' ? undefined : Number(v)
                })}
                className={cn(
                  errors.duration_minutes && "border-red-500 focus:border-red-500"
                )}
              />
              {errors.duration_minutes && (
                <p className="text-sm text-red-600">{errors.duration_minutes.message}</p>
              )}
            </div>
          </div>

          {/* Resultado da Atividade */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Resultado da Atividade *
            </Label>
            <div className="space-y-3">
              {OUTCOME_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('outcome', option.value)}
                    className={cn(
                      "w-full p-4 border-2 rounded-lg text-left transition-all",
                      watchedOutcome === option.value
                        ? option.color.replace('hover:', '')
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.outcome && (
              <p className="text-sm text-red-600">{errors.outcome.message}</p>
            )}
          </div>

          {/* Preview do que será criado */}
          {selectedActivityType && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preview:</h4>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  selectedOutcome?.value === 'positive' 
                    ? "bg-green-100 border-green-500" 
                    : selectedOutcome?.value === 'negative'
                    ? "bg-red-100 border-red-500"
                    : "bg-yellow-100 border-yellow-500"
                )}>
                  <selectedActivityType.icon className={cn("w-4 h-4", selectedActivityType.color)} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {watch('title') || 'Título da atividade aparecerá aqui'}
                  </div>
                  {watch('description') && (
                    <div className="text-sm text-gray-600 mt-1">
                      {watch('description')}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Agora
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-xs border",
                      selectedOutcome?.color || "border-gray-200 text-gray-600"
                    )}>
                      Manual
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? 'Criando...' : 'Criar Atividade'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddManualActivityModal;