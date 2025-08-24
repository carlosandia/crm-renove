/**
 * ============================================
 * 🎯 SIMPLE MOTIVES MANAGER - ETAPA 3
 * ============================================
 * 
 * ✅ ETAPA 3: Gerenciador SIMPLIFICADO de motivos (era super-engenharia)
 * AIDEV-NOTE: Sistema ultra-simples seguindo padrão da aba Básico
 * AIDEV-NOTE: Apenas form state básico + onChange direto para parent
 */

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Target, ChevronUp, ChevronDown } from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';

// Shared Components
import { BlurFade } from '../../ui/blur-fade';

// Types
import { 
  FormOutcomeReasonsData, 
  FormOutcomeReason,
  DEFAULT_OUTCOME_REASONS 
} from '../../../shared/types/simple-outcome-reasons';

// ============================================
// INTERFACES SIMPLIFICADAS
// ============================================

interface SimpleMotivesManagerProps {
  outcomeReasons?: FormOutcomeReasonsData;
  onOutcomeReasonsChange: (outcomeReasons: FormOutcomeReasonsData) => void;
  isEditMode?: boolean;
}

// ✅ ETAPA 3: Interface simplificada para ref handle
export interface SimpleMotivesManagerRef {
  forceFlushAllFields: () => void;
}

// ============================================
// COMPONENTE PRINCIPAL SIMPLIFICADO
// ============================================

const SimpleMotivesManager = forwardRef<SimpleMotivesManagerRef, SimpleMotivesManagerProps>(({
  outcomeReasons,
  onOutcomeReasonsChange,
  isEditMode = false
}, ref) => {
  // ✅ ETAPA 3: Estados ultra-simples - apenas o essencial
  const [ganhoFields, setGanhoFields] = useState<FormOutcomeReason[]>([]);
  const [perdidoFields, setPerdidoFields] = useState<FormOutcomeReason[]>([]);

  // ✅ ETAPA 3: Sincronização simples com props
  useEffect(() => {
    if (outcomeReasons?.ganho_reasons && Array.isArray(outcomeReasons.ganho_reasons)) {
      setGanhoFields(outcomeReasons.ganho_reasons);
    }
    if (outcomeReasons?.perdido_reasons && Array.isArray(outcomeReasons.perdido_reasons)) {
      setPerdidoFields(outcomeReasons.perdido_reasons);
    }
  }, [outcomeReasons]);

  // ✅ ETAPA 3: Ref handle ultra-simples
  useImperativeHandle(ref, () => ({
    forceFlushAllFields: () => {
      // ✅ Não há nada para flush no sistema simplificado - onChange direto
    }
  }), []);

  // ============================================
  // HANDLERS ULTRA-SIMPLES
  // ============================================

  const addGanhoReason = () => {
    if (ganhoFields.length >= 20) return; // Limite simples

    const newReason: FormOutcomeReason = {
      reason_text: '',
      reason_type: 'ganho',
      display_order: ganhoFields.length,
      is_active: true
    };

    const updatedGanhoFields = [...ganhoFields, newReason];
    setGanhoFields(updatedGanhoFields);
    
    onOutcomeReasonsChange({
      ganho_reasons: updatedGanhoFields,
      perdido_reasons: perdidoFields
    });
  };

  const addPerdidoReason = () => {
    if (perdidoFields.length >= 20) return; // Limite simples

    const newReason: FormOutcomeReason = {
      reason_text: '',
      reason_type: 'perdido',
      display_order: perdidoFields.length,
      is_active: true
    };

    const updatedPerdidoFields = [...perdidoFields, newReason];
    setPerdidoFields(updatedPerdidoFields);
    
    onOutcomeReasonsChange({
      ganho_reasons: ganhoFields,
      perdido_reasons: updatedPerdidoFields
    });
  };

  const removeGanho = (index: number) => {
    if (index < 0 || index >= ganhoFields.length) return; // Validação simples

    const updatedGanhoFields = ganhoFields.filter((_, i) => i !== index);
    setGanhoFields(updatedGanhoFields);
    
    onOutcomeReasonsChange({
      ganho_reasons: updatedGanhoFields,
      perdido_reasons: perdidoFields
    });
  };

  const removePerdido = (index: number) => {
    if (index < 0 || index >= perdidoFields.length) return; // Validação simples

    const updatedPerdidoFields = perdidoFields.filter((_, i) => i !== index);
    setPerdidoFields(updatedPerdidoFields);
    
    onOutcomeReasonsChange({
      ganho_reasons: ganhoFields,
      perdido_reasons: updatedPerdidoFields
    });
  };

  const addDefaultReasons = () => {
    if (!DEFAULT_OUTCOME_REASONS) return; // Validação simples

    const newGanhoReasons = DEFAULT_OUTCOME_REASONS.ganho_reasons.map((reason, index) => ({
      reason_text: reason.reason_text,
      reason_type: 'ganho' as const,
      display_order: ganhoFields.length + index,
      is_active: true
    }));

    const newPerdidoReasons = DEFAULT_OUTCOME_REASONS.perdido_reasons.map((reason, index) => ({
      reason_text: reason.reason_text,
      reason_type: 'perdido' as const,
      display_order: perdidoFields.length + index,
      is_active: true
    }));

    const updatedGanhoFields = [...ganhoFields, ...newGanhoReasons];
    const updatedPerdidoFields = [...perdidoFields, ...newPerdidoReasons];
    
    setGanhoFields(updatedGanhoFields);
    setPerdidoFields(updatedPerdidoFields);
    
    onOutcomeReasonsChange({
      ganho_reasons: updatedGanhoFields,
      perdido_reasons: updatedPerdidoFields
    });
  };

  // ✅ ETAPA 3: Handlers de reordenação simplificados
  const moveReasonUp = (type: 'ganho' | 'perdido', index: number) => {
    if (index === 0) return;
    
    const fields = type === 'ganho' ? ganhoFields : perdidoFields;
    const newFields = [...fields];
    
    // Trocar posições
    [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    
    // Atualizar display_order
    const updatedFields = newFields.map((field, i) => ({ ...field, display_order: i }));
    
    if (type === 'ganho') {
      setGanhoFields(updatedFields);
      onOutcomeReasonsChange({ ganho_reasons: updatedFields, perdido_reasons: perdidoFields });
    } else {
      setPerdidoFields(updatedFields);
      onOutcomeReasonsChange({ ganho_reasons: ganhoFields, perdido_reasons: updatedFields });
    }
  };

  const moveReasonDown = (type: 'ganho' | 'perdido', index: number) => {
    const fields = type === 'ganho' ? ganhoFields : perdidoFields;
    if (index === fields.length - 1) return;
    
    const newFields = [...fields];
    
    // Trocar posições
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    
    // Atualizar display_order
    const updatedFields = newFields.map((field, i) => ({ ...field, display_order: i }));
    
    if (type === 'ganho') {
      setGanhoFields(updatedFields);
      onOutcomeReasonsChange({ ganho_reasons: updatedFields, perdido_reasons: perdidoFields });
    } else {
      setPerdidoFields(updatedFields);
      onOutcomeReasonsChange({ ganho_reasons: ganhoFields, perdido_reasons: updatedFields });
    }
  };

  // ✅ ETAPA 3: Função updateReasonText ultra-simples (era sistema complexo)
  const updateReasonText = (type: 'ganho' | 'perdido', index: number, newText: string) => {
    if (type === 'ganho') {
      const updatedFields = ganhoFields.map((field, i) => 
        i === index ? { ...field, reason_text: newText } : field
      );
      setGanhoFields(updatedFields);
      onOutcomeReasonsChange({ ganho_reasons: updatedFields, perdido_reasons: perdidoFields });
    } else {
      const updatedFields = perdidoFields.map((field, i) => 
        i === index ? { ...field, reason_text: newText } : field
      );
      setPerdidoFields(updatedFields);
      onOutcomeReasonsChange({ ganho_reasons: ganhoFields, perdido_reasons: updatedFields });
    }
  };

  // ✅ ETAPA 3: ReasonItem ULTRA-SIMPLES (era sistema complexo com debounce/flush/logs)
  const ReasonItem: React.FC<{
    field: FormOutcomeReason;
    index: number;
    type: 'ganho' | 'perdido';
    removeFunction: (index: number) => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }> = ({ field, index, type, removeFunction, canMoveUp, canMoveDown }) => {
    return (
      <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all">
        {/* Controles de Reordenação */}
        <div className="flex flex-col space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveReasonUp(type, index)}
            disabled={!canMoveUp}
            className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => moveReasonDown(type, index)}
            disabled={!canMoveDown}
            className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        {/* Campo de Texto Simples */}
        <div className="flex-1">
          <Input
            value={field.reason_text || ''}
            onChange={(e) => updateReasonText(type, index, e.target.value)}
            placeholder={type === 'ganho' ? 'Ex: Preço competitivo' : 'Ex: Orçamento insuficiente'}
            className="border-none focus:ring-0 p-0 text-sm transition-all duration-300 hover:border-blue-300 focus:border-blue-500"
            autoComplete="off"
            maxLength={200}
          />
        </div>

        {/* Botão Remover */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeFunction(index)}
          className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  // ============================================
  // RENDER SECTION FUNCTION
  // ============================================

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
      <BlurFade delay={type === 'ganho' ? 0.1 : 0.15} direction="up" blur="2px" as="section">
        <Card className="bg-gradient-to-r from-slate-50 to-white border-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${type === 'ganho' ? 'bg-green-50' : 'bg-red-50'}`}>
                {icon}
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
                <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de Motivos */}
            <div className="space-y-2 min-h-[120px] p-3 border-2 border-dashed border-slate-200 bg-slate-50 rounded-lg">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Nenhum motivo configurado</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adicione novos motivos usando o botão abaixo
                  </p>
                </div>
              ) : (
                fields.map((field, index) => (
                  <ReasonItem
                    key={`${type}-${index}-${field.reason_text?.substring(0, 10) || 'empty'}`}
                    field={field}
                    index={index}
                    type={type}
                    removeFunction={removeFunction}
                    canMoveUp={index > 0}
                    canMoveDown={index < fields.length - 1}
                  />
                ))
              )}
            </div>

            {/* Controles */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFunction}
                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
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
      </BlurFade>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================


  // ✅ ETAPA 3: Sistema de logging complexo removido - componente simplificado

  return (
    <div className="space-y-6">

      {/* Header */}
      <BlurFade delay={0.05} direction="up" blur="2px">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Configuração de Motivos</h3>
            <p className="text-sm text-slate-500">Configure os motivos de ganho e perdido para esta pipeline</p>
          </div>
        </div>
      </BlurFade>

      {/* Botão Motivos Padrão */}
      {(ganhoFields.length === 0 && perdidoFields.length === 0) && (
        <BlurFade delay={0.08} direction="up" blur="2px">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">Começar com motivos padrão</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Adicione motivos padrão baseados nas melhores práticas para começar rapidamente.
                </p>
                <Button
                  type="button"
                  onClick={addDefaultReasons}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Motivos Padrão
                </Button>
              </div>
            </div>
          </div>
        </BlurFade>
      )}

      {/* Seções de Motivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Motivos de Ganho */}
        {renderSection(
          'Motivos de Ganho',
          'Configure os motivos quando um lead é conquistado',
          <CheckCircle className="w-5 h-5 text-green-600" />,
          'ganho',
          ganhoFields,
          addGanhoReason,
          removeGanho
        )}

        {/* Motivos de Perdido */}
        {renderSection(
          'Motivos de Perdido',
          'Configure os motivos quando um lead é perdido',
          <XCircle className="w-5 h-5 text-red-600" />,
          'perdido',
          perdidoFields,
          addPerdidoReason,
          removePerdido
        )}
      </div>

      {/* Info sobre salvamento */}
      <BlurFade delay={0.2} direction="up" blur="2px">
        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-200">
          {isEditMode ? (
            <>Os motivos serão salvos automaticamente quando você salvar a pipeline</>
          ) : (
            <>Configure os motivos e finalize a criação da pipeline para salvar</>
          )}
        </div>
      </BlurFade>
    </div>
  );
});

// ✅ ETAPA 1: DisplayName para debugging no React DevTools
SimpleMotivesManager.displayName = 'SimpleMotivesManager';

export default SimpleMotivesManager;