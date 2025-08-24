// =====================================================================================
// COMPONENT: HistoryBlock
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Bloco 3 - Histórico Completo (sempre visível)
// =====================================================================================

import React from 'react';
import { Clock, User } from 'lucide-react';
import { Lead } from '../../../types/Pipeline';
import { 
  translateAction, 
  getActionIcon, 
  getActionColor
} from '../../../utils/leadDetailsUtils';
// Importar componente de histórico de outcome reasons
import { OutcomeHistoryList } from '../../../modules/outcome-reasons';

interface HistoryEntry {
  id: string;
  lead_id: string;
  action: string;
  description: string;
  user_name: string;
  user_role?: string;
  user_email?: string;
  created_at: string;
  old_values?: any;
  new_values?: any;
}

interface HistoryBlockProps {
  lead: Lead;
  history: HistoryEntry[];
  historyLoading: boolean;
  loadHistory: () => void;
}

const HistoryBlock: React.FC<HistoryBlockProps> = ({
  lead,
  history,
  historyLoading,
  loadHistory
}) => {
  return (
    <div className="space-y-4 flex flex-col">
      {/* Header do Bloco */}
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">Histórico</h3>
      </div>

      {/* Outcome Reasons History */}
      <div>
        <OutcomeHistoryList 
          leadId={lead.id}
          showTitle={true}
          maxItems={3}
        />
      </div>
      
      {/* Histórico Geral */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-semibold text-gray-900">Histórico Geral</h4>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
            title="Recarregar histórico"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Timeline do histórico - SEM scroll para evitar nested scroll com Kanban */}
        <div className="flex-1 overflow-visible pr-1">
          {historyLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm">Carregando histórico completo...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhuma ação registrada</p>
              <p className="text-xs text-gray-400 mt-1">As ações futuras serão exibidas aqui</p>
            </div>
          ) : (
            <div className="relative">
              {/* Linha da timeline */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              {(history || []).map((entry, index) => {
                const ActionIcon = getActionIcon(entry.action);
                const actionColors = getActionColor(entry.action);
                
                return (
                  <div key={entry.id} className="relative flex items-start space-x-3 pb-3">
                    {/* Ponto da timeline com ícone específico e cor */}
                    <div className={`relative z-10 w-6 h-6 ${actionColors.bg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <ActionIcon className="w-3 h-3 text-white" />
                    </div>
                    
                    {/* Conteúdo enriquecido */}
                    <div className={`flex-1 bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow ${actionColors.bgLight} border-l-2 ${actionColors.bg.replace('bg-', 'border-')}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          <h5 className={`text-xs font-semibold ${actionColors.text}`}>
                            {translateAction(entry.action)}
                          </h5>
                          {/* Badge do tipo de usuário */}
                          {entry.user_role && entry.user_role !== 'system' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              entry.user_role === 'admin' 
                                ? 'bg-purple-100 text-purple-700'
                                : entry.user_role === 'member'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.user_role === 'admin' ? 'Admin' : entry.user_role === 'member' ? 'Member' : entry.user_role}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(entry.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* Descrição com formatação melhorada */}
                      <p className="text-xs text-gray-800 mb-1 leading-relaxed">{entry.description}</p>
                      
                      {/* Informações do usuário */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            entry.user_role === 'admin' ? 'bg-purple-500' :
                            entry.user_role === 'member' ? 'bg-blue-500' : 'bg-gray-500'
                          }`}>
                            {entry.user_name ? entry.user_name.charAt(0).toUpperCase() : 
                              <User className="w-2 h-2" />
                            }
                          </div>
                          <span className="text-xs font-medium text-gray-700">{entry.user_name}</span>
                          {entry.user_email && (
                            <span className="text-xs text-gray-500">({entry.user_email})</span>
                          )}
                        </div>
                        
                        {/* Indicador de tempo relativo */}
                        <span className="text-xs text-gray-400">
                          {(() => {
                            const diffMs = Date.now() - new Date(entry.created_at).getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const diffDays = Math.floor(diffHours / 24);
                            
                            if (diffMins < 1) return 'agora';
                            if (diffMins < 60) return `${diffMins}m atrás`;
                            if (diffHours < 24) return `${diffHours}h atrás`;
                            if (diffDays < 7) return `${diffDays}d atrás`;
                            return 'há mais de 1 semana';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryBlock;