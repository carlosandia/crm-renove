/**
 * ============================================
 * ⚙️ CONFIGURAÇÃO DE MOTIVOS DE GANHO/PERDA
 * ============================================
 * 
 * Componente para configurar motivos durante criação/edição de pipeline
 * AIDEV-NOTE: Integrado ao wizard de pipeline como 6ª aba
 * AIDEV-NOTE: Agora conectado diretamente à API para salvamento automático
 */

import React, { useState, useEffect } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { Plus, Trash2, CheckCircle, XCircle, Lightbulb, AlertCircle, Save, Loader2, Target } from 'lucide-react';

// Shared components
import { SectionHeader } from '../shared/SectionHeader';

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useDefaultReasons } from '../../../modules/outcome-reasons';
import { useOutcomeReasonsApi } from '../../../hooks/useOutcomeReasonsApi';
import { toast } from 'sonner';
import { OutcomeReason } from '../../../modules/outcome-reasons/types';

// ============================================
// TYPES E INTERFACES
// ============================================

// ✅ CORREÇÃO: Usar tipo Zod como fonte da verdade com campos opcionais para formulário
interface LocalOutcomeReason {
  id?: string;
  reason_text: string;
  display_order: number;
  is_active: boolean;
  // Campos opcionais para compatibilidade API
  tenant_id?: string;
  pipeline_id?: string;
  reason_type?: 'ganho' | 'perdido' | 'won' | 'lost'; // ganho/perdido preferidos, won/lost para compatibilidade
  created_at?: string;
  updated_at?: string;
}

// ✅ CORREÇÃO: Usar OutcomeReason do Zod como base, mas com campos opcionais para compatibilidade de formulário
type FormOutcomeReason = Partial<OutcomeReason> & {
  reason_text: string; // Este campo sempre é obrigatório no formulário
  display_order: number; // Este campo sempre é obrigatório no formulário
  is_active: boolean; // Este campo sempre é obrigatório no formulário
};

interface FormOutcomeReasonsData {
  ganho_reasons: FormOutcomeReason[];
  perdido_reasons: FormOutcomeReason[];
  // ✅ COMPATIBILIDADE: Manter campos antigos durante transição
  won_reasons: FormOutcomeReason[];
  lost_reasons: FormOutcomeReason[];
}

interface OutcomeReasonsConfigurationProps {
  value?: FormOutcomeReasonsData;
  onChange?: (data: FormOutcomeReasonsData) => void;
  pipelineId: string;
  isEditMode?: boolean;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// ✅ CORREÇÃO: Converter dados da API para formato do formulário
const convertApiDataToFormData = (apiData: any): FormOutcomeReasonsData | undefined => {
  if (!apiData) return undefined;
  
  return {
    ganho_reasons: apiData.ganho_reasons || [],
    perdido_reasons: apiData.perdido_reasons || [],
    won_reasons: apiData.won_reasons || [],
    lost_reasons: apiData.lost_reasons || []
  };
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const OutcomeReasonsConfiguration: React.FC<OutcomeReasonsConfigurationProps> = ({
  value,
  onChange,
  pipelineId,
  isEditMode = false
}) => {
  // ============================================
  // HOOKS E ESTADO
  // ============================================
  
  const { data: defaultReasons, isLoading: isLoadingDefaults } = useDefaultReasons();
  
  // ✅ NOVO: Hook para integração com API
  const {
    data: apiData,
    isLoading: isLoadingReasons,
    isMutating,
    createReason,
    updateReason,
    deleteReason,
    reorderReasons,
    bulkSave
  } = useOutcomeReasonsApi({ 
    pipelineId, 
    enabled: !!pipelineId && pipelineId !== 'temp-pipeline' && isEditMode
  });

  // Estado local para controle de edições
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // ✅ CORREÇÃO: Usar padrão values para sincronização automática
  const defaultFormData = React.useMemo(() => {
    return value || { 
      ganho_reasons: [], 
      perdido_reasons: [],
      won_reasons: [],
      lost_reasons: []
    };
  }, [value]);

  // ✅ Dados para sincronização (apenas em modo edição)
  const formValues = React.useMemo(() => {
    if (isEditMode && apiData && !isLoadingReasons) {
      return convertApiDataToFormData(apiData);
    }
    return undefined;
  }, [isEditMode, apiData, isLoadingReasons]);

  const { control, watch, setValue, getValues, reset } = useForm<FormOutcomeReasonsData>({
    defaultValues: defaultFormData,
    values: formValues // ✅ Sincronização automática sem useEffect
  });

  // Field arrays para motivos de ganho e perda
  const { 
    fields: ganhoFields, 
    append: appendGanho, 
    remove: removeGanho,
    move: moveGanho
  } = useFieldArray({
    control,
    name: 'ganho_reasons'
  });

  const { 
    fields: perdidoFields, 
    append: appendPerdido, 
    remove: removePerdido,
    move: movePerdido
  } = useFieldArray({
    control,
    name: 'perdido_reasons'
  });

  // ✅ COMPATIBILIDADE: Field arrays para nomenclatura antiga (ainda usados por algumas funções)
  const { 
    fields: wonFields, 
    append: appendWon, 
    remove: removeWon,
    move: moveWon
  } = useFieldArray({
    control,
    name: 'won_reasons'
  });

  const { 
    fields: lostFields, 
    append: appendLost, 
    remove: removeLost,
    move: moveLost
  } = useFieldArray({
    control,
    name: 'lost_reasons'
  });

  // ✅ NOVO: Salvamento automático direto na API
  const saveChanges = React.useCallback(async () => {
    if (!pipelineId || !hasUnsavedChanges) return;
    
    try {
      const currentValues = getValues();
      await bulkSave(currentValues);
      
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      
      // Notificar componente pai se houver callback
      if (onChange) {
        onChange(currentValues);
      }
    } catch (error) {
      console.error('Erro ao salvar motivos:', error);
      toast.error('Erro ao salvar motivos');
    }
  }, [pipelineId, hasUnsavedChanges, getValues, bulkSave, onChange]);

  // 🔧 PADRÃO CRM: Salvamento automático com debounce
  const debouncedSave = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        if (!isEditMode) return; // Só salvar em modo edição
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveChanges();
        }, 1000); // Debounce de 1 segundo
      };
    }, [saveChanges, isEditMode]),
    [saveChanges, isEditMode]
  );

  // 🔧 PADRÃO CRM: Salvamento imediato no onBlur
  const handleBlurSave = React.useCallback(() => {
    if (isEditMode) {
      saveChanges();
    } else if (onChange) {
      // Modo criação - apenas notificar pai
      const currentValues = getValues();
      onChange(currentValues);
    }
  }, [isEditMode, saveChanges, onChange, getValues]);

  // ============================================
  // HANDLERS PARA REORDENAÇÃO
  // ============================================

  const moveReasonUp = (type: 'ganho' | 'perdido', index: number) => {
    if (index === 0) return;
    
    if (type === 'ganho') {
      moveGanho(index, index - 1);
    } else {
      movePerdido(index, index - 1);
    }
    
    updateDisplayOrder();
    setHasUnsavedChanges(true);
    
    if (isEditMode) {
      debouncedSave();
    }
  };

  const moveReasonDown = (type: 'ganho' | 'perdido', index: number) => {
    const maxIndex = type === 'ganho' ? ganhoFields.length - 1 : perdidoFields.length - 1;
    if (index === maxIndex) return;
    
    if (type === 'ganho') {
      moveGanho(index, index + 1);
    } else {
      movePerdido(index, index + 1);
    }
    
    updateDisplayOrder();
    setHasUnsavedChanges(true);
    
    if (isEditMode) {
      debouncedSave();
    }
  };

  const updateDisplayOrder = () => {
    const currentData = getValues();
    
    // Atualizar ordem dos motivos de ganho
    const updatedGanhoReasons = currentData.ganho_reasons.map((reason, index) => ({
      ...reason,
      display_order: index
    }));

    // Atualizar ordem dos motivos de perda
    const updatedPerdidoReasons = currentData.perdido_reasons.map((reason, index) => ({
      ...reason,
      display_order: index
    }));

    setValue('ganho_reasons', updatedGanhoReasons);
    setValue('perdido_reasons', updatedPerdidoReasons);
  };

  // ============================================
  // HANDLERS PARA CRUD
  // ============================================

  // ✅ CORREÇÃO CRÍTICA: Criar funções específicas fora do useCallback para evitar hooks condicionais
  const addGanhoReason = React.useCallback(async () => {
    const newReason: FormOutcomeReason = {
      reason_text: '',
      display_order: ganhoFields.length,
      is_active: true
    };

    appendGanho(newReason);
    setHasUnsavedChanges(true);
    
    if (isEditMode) {
      debouncedSave();
    }
  }, [ganhoFields.length, appendGanho, isEditMode, debouncedSave]);

  const addPerdidoReason = React.useCallback(async () => {
    const newReason: FormOutcomeReason = {
      reason_text: '',
      display_order: perdidoFields.length,
      is_active: true
    };

    appendPerdido(newReason);
    setHasUnsavedChanges(true);
    
    if (isEditMode) {
      debouncedSave();
    }
  }, [perdidoFields.length, appendPerdido, isEditMode, debouncedSave]);

  const addDefaultReasons = React.useCallback(async () => {
    if (!defaultReasons) return;

    // Adicionar motivos padrão de ganho
    defaultReasons.ganho.forEach((reasonText, index) => {
      const newReason: FormOutcomeReason = {
        reason_text: reasonText,
        display_order: ganhoFields.length + index,
        is_active: true
      };
      appendGanho(newReason);
    });

    // Adicionar motivos padrão de perda
    defaultReasons.perdido.forEach((reasonText, index) => {
      const newReason: FormOutcomeReason = {
        reason_text: reasonText,
        display_order: perdidoFields.length + index,
        is_active: true
      };
      appendPerdido(newReason);
    });
    
    setHasUnsavedChanges(true);
    
    // Auto-save em modo edição
    if (isEditMode) {
      // Salvar imediatamente motivos padrão
      setTimeout(() => saveChanges(), 100);
    }
  }, [defaultReasons, ganhoFields.length, perdidoFields.length, appendGanho, appendPerdido, isEditMode, saveChanges]);

  // ============================================
  // REASON ITEM COMPONENT
  // ============================================

  // 🔧 CORREÇÃO SIMPLIFICADA: ReasonItem sem drag and drop
  // AIDEV-NOTE: Implementa onBlur pattern para salvamento seguindo melhores práticas
  const ReasonItem: React.FC<{
    field: any;
    index: number;
    type: 'ganho' | 'perdido' | 'won' | 'lost';
    removeFunction: (index: number) => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }> = React.memo(({ field, index, type, removeFunction, canMoveUp, canMoveDown }) => {
    const fieldName = `${type === 'ganho' || type === 'won' ? 'ganho' : 'perdido'}_reasons.${index}.reason_text` as const;

    return (
      <div className="flex items-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all">
        <div className="flex flex-col space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveReasonUp(type === 'ganho' || type === 'won' ? 'ganho' : 'perdido', index)}
            disabled={!canMoveUp}
            className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            ▲
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveReasonDown(type === 'ganho' || type === 'won' ? 'ganho' : 'perdido', index)}
            disabled={!canMoveDown}
            className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            ▼
          </Button>
        </div>

        <div className="flex-1">
          <Controller
            name={fieldName}
            control={control}
            defaultValue={field.reason_text || ''}
            rules={{
              required: 'Motivo é obrigatório',
              maxLength: { value: 200, message: 'Máximo 200 caracteres' }
            }}
            render={({ field: controllerField, fieldState: { error } }) => (
              <div className="relative">
                <Input
                  {...controllerField}
                  placeholder={(type === 'ganho' || type === 'won') ? 'Ex: Preço competitivo' : 'Ex: Orçamento insuficiente'}
                  className={`border-none focus:ring-0 p-0 text-sm ${
                    error ? 'border-red-300 focus:border-red-500' : ''
                  }`}
                  autoComplete="off"
                  onChange={(e) => {
                    controllerField.onChange(e);
                    setHasUnsavedChanges(true);
                    
                    if (isEditMode) {
                      debouncedSave();
                    }
                  }}
                  onBlur={(e) => {
                    controllerField.onBlur();
                    handleBlurSave();
                  }}
                />
                {error && (
                  <span className="text-xs text-red-500 mt-1">
                    {error.message}
                  </span>
                )}
              </div>
            )}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            removeFunction(index);
            setHasUnsavedChanges(true);
            
            if (isEditMode) {
              setTimeout(() => saveChanges(), 50);
            } else {
              setTimeout(handleBlurSave, 50);
            }
          }}
          className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  });

  ReasonItem.displayName = 'ReasonItem';

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderReasonItem = (
    field: any, 
    index: number, 
    type: 'ganho' | 'perdido' | 'won' | 'lost',
    fields: any[],
    removeFunction: (index: number) => void
  ) => (
    <ReasonItem
      key={field.id}
      field={field}
      index={index}
      type={type}
      removeFunction={removeFunction}
      canMoveUp={index > 0}
      canMoveDown={index < fields.length - 1}
    />
  );

  const renderSection = (
    title: string,
    description: string,
    icon: React.ReactNode,
    type: 'ganho' | 'perdido',
    fields: any[],
    addFunction: () => void,
    removeFunction: (index: number) => void
  ) => {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            {icon}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 min-h-[120px] p-3 border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg">
            {fields.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">Nenhum motivo configurado</p>
                <p className="text-xs text-gray-400 mt-1">
                  Adicione novos motivos usando o botão abaixo
                </p>
              </div>
            ) : (
              fields.map((field, index) => 
                renderReasonItem(field, index, type, fields, removeFunction)
              )
            )}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFunction}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Motivo</span>
            </Button>

            <Badge variant="secondary" className="text-xs">
              {fields.length} motivo(s)
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================
  // EFFECTS
  // ============================================
  
  // ✅ CORREÇÃO: Reset único quando dados chegam pela primeira vez
  useEffect(() => {
    if (isEditMode && apiData && !isLoadingReasons && !isDataLoaded) {
      setHasUnsavedChanges(false);
      setIsDataLoaded(true);
    }
  }, [isEditMode, apiData, isLoadingReasons, isDataLoaded]);

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  if (isLoadingDefaults || (isEditMode && isLoadingReasons)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">
            {isLoadingDefaults ? 'Carregando configurações...' : 'Carregando motivos...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
      <SectionHeader
        icon={Target}
        title="Configuração de Motivos"
        action={
          isEditMode && (
            <div className="flex items-center space-x-2">
              {isMutating ? (
                <div className="flex items-center space-x-1 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Salvando...</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center space-x-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Mudanças não salvas</span>
                </div>
              ) : lastSaveTime ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Salvo automaticamente</span>
                </div>
              ) : null}
            </div>
          )
        }
      />

      {/* BOTÃO MOTIVOS PADRÃO */}
      {defaultReasons && (ganhoFields.length === 0 && perdidoFields.length === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900">Começar com motivos padrão</h4>
              <p className="text-sm text-blue-700 mt-1">
                Adicione motivos padrão baseados nas melhores práticas para começar rapidamente.
              </p>
              <Button
                type="button"
                onClick={addDefaultReasons}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Motivos Padrão
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MOTIVOS DE GANHO */}
        {renderSection(
          'Motivos de Ganho',
          'Configure os motivos quando um lead é conquistado',
          <CheckCircle className="w-5 h-5 text-green-600" />,
          'ganho',
          ganhoFields,
          addGanhoReason,
          removeGanho
        )}

        {/* MOTIVOS DE PERDA */}
        {renderSection(
          'Motivos de Perda',
          'Configure os motivos quando um lead é perdido',
          <XCircle className="w-5 h-5 text-red-600" />,
          'perdido',
          perdidoFields,
          addPerdidoReason,
          removePerdido
        )}
      </div>

    </div>
  );
};

export default OutcomeReasonsConfiguration;