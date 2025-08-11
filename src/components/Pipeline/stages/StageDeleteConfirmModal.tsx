import React, { useState } from 'react';
import { createPortal } from 'react-dom';
// Removido AlertDialog components - usando modal customizado
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  AlertTriangle,
  Trash2,
  Users,
  FileText,
  Clock,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react';

export interface StageData {
  id?: string;
  name: string;
  order_index: number;
  color?: string;
  is_system_stage?: boolean;
  temperature_score?: number;
  max_days_allowed?: number;
}

interface StageDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stage: StageData | null;
  opportunitiesCount?: number; // Número de oportunidades na etapa
  isLoading?: boolean;
  // ✅ NOVOS PROPS: Dados de validação robusta
  validation?: {
    canDelete: boolean;
    reasons: string[];
    warnings: string[];
    severity: 'low' | 'medium' | 'high';
  };
}

const StageDeleteConfirmModal: React.FC<StageDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  stage,
  opportunitiesCount = 0,
  isLoading = false,
  validation
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isTypingCorrect, setIsTypingCorrect] = useState(false);

  // ✅ VALIDAÇÃO: Nome da etapa para confirmação
  const expectedText = stage?.name || '';
  const isValidConfirmation = confirmText.toLowerCase().trim() === expectedText.toLowerCase().trim();

  // ✅ RESET ao abrir/fechar modal
  React.useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setIsTypingCorrect(false);
    }
  }, [isOpen]);

  // ✅ ATUALIZAR validação em tempo real
  React.useEffect(() => {
    setIsTypingCorrect(isValidConfirmation);
  }, [confirmText, isValidConfirmation]);

  if (!stage) return null;

  // 🔍 DEBUG: Log quando o modal está sendo renderizado
  console.log('🔴 [StageDeleteConfirmModal] RENDERIZANDO MODAL:', {
    isOpen,
    stageName: stage.name,
    hasStage: !!stage,
    timestamp: new Date().toISOString()
  });

  const handleConfirm = () => {
    if (!isValidConfirmation || isLoading) return;
    onConfirm();
  };

  // 🚀 MODAL SIMPLIFICADO: Usar estrutura manual para garantir visibilidade
  const modalContent = isOpen ? (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ zIndex: 99999 }}
    >
      {/* Overlay manual */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div 
        className="relative z-[100000] max-w-lg w-full mx-4 bg-white rounded-lg shadow-2xl border-4 border-red-500" 
        style={{ zIndex: 100000 }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Confirmar Exclusão de Etapa
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Esta ação é permanente e não pode ser desfeita
                </p>
              </div>
            </div>
          </div>

        <div className="py-4 space-y-4">
          {/* ✅ INFORMAÇÕES DA ETAPA */}
          <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-200/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: stage.color || '#3B82F6' }}
                />
                <span className="font-medium text-gray-900">{stage.name}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Posição {stage.order_index}
              </Badge>
            </div>
            
            {/* ✅ ESTATÍSTICAS DA ETAPA */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{opportunitiesCount} oportunidades</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FileText className="h-4 w-4" />
                <span>Etapa customizada</span>
              </div>
            </div>
          </div>

          {/* ✅ AVISOS DE VALIDAÇÃO ROBUSTA */}
          {validation?.warnings && validation.warnings.length > 0 && (
            <div className="space-y-3">
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                validation.severity === 'high' 
                  ? 'bg-red-50/80 border-red-200' 
                  : validation.severity === 'medium'
                  ? 'bg-orange-50/80 border-orange-200'
                  : 'bg-yellow-50/80 border-yellow-200'
              }`}>
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  validation.severity === 'high' 
                    ? 'text-red-600' 
                    : validation.severity === 'medium'
                    ? 'text-orange-600'
                    : 'text-yellow-600'
                }`} />
                <div className="text-sm">
                  <p className={`font-medium mb-1 ${
                    validation.severity === 'high' 
                      ? 'text-red-800' 
                      : validation.severity === 'medium'
                      ? 'text-orange-800'
                      : 'text-yellow-800'
                  }`}>
                    Avisos importantes:
                  </p>
                  <ul className={`space-y-1 ${
                    validation.severity === 'high' 
                      ? 'text-red-700' 
                      : validation.severity === 'medium'
                      ? 'text-orange-700'
                      : 'text-yellow-700'
                  }`}>
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ✅ AVISOS E IMPACTOS PADRÃO */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50/80 rounded-lg border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 mb-1">Impactos da exclusão:</p>
                <ul className="space-y-1 text-amber-700">
                  <li>• A etapa "{stage.name}" será removida permanentemente</li>
                  {opportunitiesCount > 0 && (
                    <li>• {opportunitiesCount} oportunidades serão movidas para a primeira etapa</li>
                  )}
                  <li>• A numeração das etapas seguintes será reorganizada</li>
                  <li>• Histórico de mudanças será mantido para auditoria</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ✅ CONFIRMAÇÃO POR DIGITAÇÃO */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
              Para confirmar, digite o nome da etapa: 
              <span className="font-bold text-red-600 ml-1">"{stage.name}"</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Digite: ${stage.name}`}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                  confirmText.length > 0 
                    ? isValidConfirmation 
                      ? 'border-green-300 bg-green-50/50' 
                      : 'border-red-300 bg-red-50/50'
                    : 'border-gray-300 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
              {confirmText.length > 0 && (
                <div className="absolute right-3 top-2.5">
                  {isValidConfirmation ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {confirmText.length > 0 && !isValidConfirmation && (
              <p className="text-xs text-red-600">
                O texto digitado não confere com o nome da etapa
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2"
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={!isValidConfirmation || isLoading}
            className={`px-4 py-2 min-w-[120px] ${
              isValidConfirmation && !isLoading
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Excluindo...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span>Excluir Etapa</span>
              </div>
            )}
          </Button>
        </div>
        
        </div>
      </div>
    </div>
  ) : null;

  // 🎯 RETURN: Usar createPortal para garantir que o modal apareça acima de tudo
  return createPortal(modalContent, document.body);
};

export default StageDeleteConfirmModal;