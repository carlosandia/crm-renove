// =====================================================================================
// COMPONENT: Histórico de Reuniões
// Autor: Claude (Arquiteto Sênior)
// Descrição: Lista e gestão de reuniões do lead com filters e actions
// =====================================================================================

import React, { useState } from 'react';
import { 
  Calendar, 
  Trash2, 
  Filter,
  AlertCircle,
  User,
  StickyNote
} from 'lucide-react';
import { useLeadMeetings, useDeleteMeeting, useQuickStatusUpdate } from '../../hooks/useMeetings';
import { MeetingStatusTags } from './MeetingStatusTags';
import { 
  MEETING_OUTCOME_LABELS,
  NO_SHOW_REASON_LABELS,
  type MeetingOutcome,
  type NoShowReason,
  type MeetingWithRelations 
} from '../../shared/schemas/meetings';
import { MeetingsUtils } from '../../services/meetingsApi';

interface MeetingsHistoryProps {
  leadId: string; // pipeline_lead_id ou lead_master_id
  className?: string;
}

// AIDEV-NOTE: Ícones removidos - agora usamos MeetingStatusTags

export const MeetingsHistory: React.FC<MeetingsHistoryProps> = ({
  leadId,
  className = ''
}) => {
  const [outcomeFilter, setOutcomeFilter] = useState<MeetingOutcome | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // AIDEV-NOTE: Buscar reuniões com filtros
  const { 
    data: meetingsData, 
    isLoading, 
    error 
  } = useLeadMeetings(leadId, {
    ...(outcomeFilter && { outcome: outcomeFilter }),
    limit: 20
  });

  const deleteMeetingMutation = useDeleteMeeting();
  const quickStatusUpdate = useQuickStatusUpdate();

  const meetings = meetingsData?.meetings || [];

  // AIDEV-NOTE: Handle delete meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    if (confirm('Tem certeza que deseja excluir esta reunião? Esta ação não pode ser desfeita.')) {
      try {
        await deleteMeetingMutation.mutateAsync(meetingId);
      } catch (error) {
        // Erro já tratado pelo hook
      }
    }
  };

  // AIDEV-NOTE: Handle status change rápido (sem modal)
  const handleStatusChange = async (meetingId: string, outcome: MeetingOutcome, noShowReason?: NoShowReason, notes?: string) => {
    try {
      await quickStatusUpdate.mutateAsync({
        meetingId,
        outcome,
        noShowReason,
        notes
      });
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  // AIDEV-NOTE: Formatação da data para exibição (compacta, sem "Hoje")
  const formatMeetingDate = (datetime: string) => {
    const date = new Date(datetime);
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600">
          Erro ao carregar reuniões. Tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header com filtros */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">
          Histórico de Reuniões ({meetings.length})
        </h4>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value as MeetingOutcome)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                {Object.entries(MEETING_OUTCOME_LABELS).map(([outcome, label]) => (
                  <option key={outcome} value={outcome}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Lista de reuniões */}
      {meetings.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma reunião encontrada</p>
          <p className="text-sm text-gray-400 mt-1">
            {outcomeFilter 
              ? `Nenhuma reunião com status "${MEETING_OUTCOME_LABELS[outcomeFilter]}"` 
              : 'Agende a primeira reunião com este lead'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting) => {
            const isOverdue = MeetingsUtils.isOverdue(meeting.planned_at, meeting.outcome);
            
            return (
              <div
                key={meeting.id}
                className={`border rounded-lg p-3 transition-all hover:shadow-sm ${
                  isOverdue 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* AIDEV-NOTE: Layout compacto - uma linha principal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Status Tag Clicável */}
                    <MeetingStatusTags
                      meeting={meeting}
                      onStatusChange={handleStatusChange}
                      className="flex-shrink-0"
                    />
                    
                    {/* Data/Hora */}
                    <span className="text-sm font-medium text-gray-900 flex-shrink-0">
                      {formatMeetingDate(meeting.planned_at)}
                    </span>
                    
                    {/* Usuário */}
                    <div className="flex items-center text-sm text-gray-600 min-w-0">
                      <User className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {meeting.owner_name || 'Responsável não informado'}
                      </span>
                    </div>
                    
                    {/* Badge Atrasada (se aplicável) */}
                    {isOverdue && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-700 bg-red-100 flex-shrink-0">
                        Atrasada
                      </span>
                    )}
                  </div>

                  {/* Ação de deletar */}
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id)}
                    disabled={deleteMeetingMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                    title="Excluir reunião"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* AIDEV-NOTE: Segunda linha - Observações (se houver) */}
                {(meeting.notes || (meeting.outcome === 'no_show' && meeting.no_show_reason)) && (
                  <div className="mt-2 pl-3">
                    {/* No-show reason */}
                    {meeting.outcome === 'no_show' && meeting.no_show_reason && (
                      <p className="text-xs text-red-600 mb-1">
                        <strong>Motivo:</strong> {NO_SHOW_REASON_LABELS[meeting.no_show_reason]}
                      </p>
                    )}
                    
                    {/* Notes */}
                    {meeting.notes && (
                      <div className="flex items-start space-x-1.5 text-xs text-gray-600">
                        <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{meeting.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};