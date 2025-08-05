/**
 * ============================================
 * 📋 LISTA DE HISTÓRICO DE MOTIVOS
 * ============================================
 * 
 * Componente para exibir histórico de motivos aplicados a um lead
 * AIDEV-NOTE: Usado no LeadDetailsModal para mostrar timeline
 */

import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { useOutcomeHistory } from '../hooks';
import { OutcomeHistoryProps } from '../types';

const OutcomeHistoryList: React.FC<OutcomeHistoryProps> = ({
  leadId,
  showTitle = true,
  maxItems
}) => {
  // ============================================
  // HOOKS
  // ============================================
  
  const { history, isLoading, isError } = useOutcomeHistory({ leadId });

  // ============================================
  // DATA PROCESSING
  // ============================================

  const displayHistory = maxItems 
    ? history.slice(0, maxItems) 
    : history;

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderIcon = (outcomeType: 'ganho' | 'perdido' | 'won' | 'lost') => {
    if (outcomeType === 'ganho' || outcomeType === 'won') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const renderTitle = (outcomeType: 'ganho' | 'perdido' | 'won' | 'lost') => {
    if (outcomeType === 'ganho' || outcomeType === 'won') {
      return 'Ganho';
    } else {
      return 'Perdido';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <h4 className="text-sm font-medium text-gray-900">Histórico de Motivos</h4>
        )}
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Carregando histórico...</span>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (isError) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <h4 className="text-sm font-medium text-gray-900">Histórico de Motivos</h4>
        )}
        <div className="text-center py-6">
          <p className="text-sm text-red-600">Erro ao carregar histórico</p>
        </div>
      </div>
    );
  }

  // ============================================
  // EMPTY STATE
  // ============================================

  if (history.length === 0) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <h4 className="text-sm font-medium text-gray-900">Histórico de Motivos</h4>
        )}
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">Nenhum motivo aplicado ainda</p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Histórico de Motivos</h4>
          {maxItems && history.length > maxItems && (
            <span className="text-xs text-gray-500">
              Mostrando {maxItems} de {history.length}
            </span>
          )}
        </div>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {displayHistory.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-lg p-3 bg-gray-50"
          >
            {/* HEADER DO ITEM */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {renderIcon(item.outcome_type)}
                <span className={`text-sm font-medium ${
                  item.outcome_type === 'won' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {renderTitle(item.outcome_type)}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(item.applied_at)}</span>
              </div>
            </div>

            {/* MOTIVO */}
            <div className="mb-2">
              <p className="text-sm text-gray-900 font-medium">
                {item.reason_text}
              </p>
            </div>

            {/* OBSERVAÇÕES */}
            {item.notes && (
              <div className="mb-2">
                <div className="flex items-start space-x-1">
                  <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    {item.notes}
                  </p>
                </div>
              </div>
            )}

            {/* USUÁRIO QUE APLICOU */}
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>Aplicado por {(item as any).applied_by_name || 'Usuário desconhecido'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* INDICADOR DE MAIS ITENS */}
      {maxItems && history.length > maxItems && (
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            +{history.length - maxItems} item(ns) mais antigo(s)
          </p>
        </div>
      )}
    </div>
  );
};

export default OutcomeHistoryList;