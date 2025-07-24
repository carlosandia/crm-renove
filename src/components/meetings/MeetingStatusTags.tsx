// =====================================================================================
// COMPONENT: Tags de Status Inline para Reuniões (ENTERPRISE)
// Autor: Claude (Arquiteto Sênior)
// Descrição: Tags clicáveis com workflow inteligente para no-show e reagendamento
// =====================================================================================

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Slash,
  ChevronDown,
  RotateCcw,
  UserX
} from 'lucide-react';
import { 
  MEETING_OUTCOME_LABELS, 
  NO_SHOW_REASON_LABELS,
  type MeetingOutcome,
  type NoShowReason,
  type MeetingWithRelations 
} from '../../shared/schemas/meetings';
import NoShowWorkflowModal from './NoShowWorkflowModal';
import RescheduleModal, { type RescheduleData } from './RescheduleModal';
import { MeetingsAPI } from '../../services/meetingsApi';
import { meetingsQueryKeys } from '../../hooks/useMeetings';

interface MeetingStatusTagsProps {
  meeting: MeetingWithRelations;
  onStatusChange: (meetingId: string, outcome: MeetingOutcome, noShowReason?: NoShowReason, notes?: string) => Promise<void>;
  onMeetingUpdate?: () => void; // Callback para refresh da lista
  className?: string;
}

// AIDEV-NOTE: Configuração visual das tags
const statusConfig = {
  agendada: {
    icon: Calendar,
    colors: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    clickable: true
  },
  realizada: {
    icon: CheckCircle,
    colors: 'bg-green-100 text-green-800 border-green-200',
    clickable: false
  },
  no_show: {
    icon: XCircle,
    colors: 'bg-red-100 text-red-800 border-red-200',
    clickable: false
  },
  reagendada: {
    icon: Clock,
    colors: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    clickable: true
  },
  cancelada: {
    icon: Slash,
    colors: 'bg-gray-100 text-gray-800 border-gray-200',
    clickable: false
  }
};

export const MeetingStatusTags: React.FC<MeetingStatusTagsProps> = ({
  meeting,
  onStatusChange,
  onMeetingUpdate,
  className = ''
}) => {
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const currentStatus = meeting.outcome;
  const config = statusConfig[currentStatus];
  const IconComponent = config.icon;

  // AIDEV-NOTE: Opções disponíveis baseadas no status atual
  const getAvailableOptions = (): MeetingOutcome[] => {
    switch (currentStatus) {
      case 'agendada':
        return ['realizada', 'no_show', 'reagendada', 'cancelada'];
      case 'reagendada':
        return ['realizada', 'no_show', 'cancelada'];
      default:
        return []; // Status finais não podem ser alterados
    }
  };

  // AIDEV-NOTE: Handler para mudança de status (agora com workflow inteligente)
  const handleStatusChange = async (newStatus: MeetingOutcome) => {
    setIsDropdownOpen(false);

    if (newStatus === 'no_show') {
      // Abrir workflow de no-show
      setShowNoShowModal(true);
      return;
    }

    if (newStatus === 'reagendada') {
      // Abrir modal de reagendamento
      setShowRescheduleModal(true);
      return;
    }

    // Para outros status, usar o método original
    setIsUpdating(true);
    try {
      await onStatusChange(meeting.id, newStatus);
      onMeetingUpdate?.();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // AIDEV-NOTE: Handler para completar workflow de no-show
  const handleNoShowComplete = async (result: any) => {
    setIsUpdating(true);
    try {
      if (result.action === 'reschedule') {
        // Primeiro registra no-show, depois abre reagendamento
        await MeetingsAPI.registerNoShow(meeting.id, result.noShowData);
        
        // AIDEV-NOTE: Invalidar cache após no-show para mostrar mudança
        await queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(meeting.lead_master_id)
        });
        await queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(meeting.pipeline_lead_id)
        });
        
        setShowNoShowModal(false);
        setShowRescheduleModal(true);
      } else {
        // Finaliza no-show
        await MeetingsAPI.registerNoShow(meeting.id, result.noShowData);
        
        // AIDEV-NOTE: Invalidar cache após no-show final
        await queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(meeting.lead_master_id)
        });
        await queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(meeting.pipeline_lead_id)
        });
        
        setShowNoShowModal(false);
        onMeetingUpdate?.();
      }
    } catch (error) {
      console.error('Erro ao processar no-show:', error);
      alert('Erro ao processar no-show. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  // AIDEV-NOTE: Handler para reagendamento
  const handleReschedule = async (rescheduleData: RescheduleData) => {
    setIsUpdating(true);
    try {
      const result = await MeetingsAPI.rescheduleMeeting(meeting.id, rescheduleData);
      
      // AIDEV-NOTE: Invalidar cache para atualizar lista imediatamente
      // Usar IDs da reunião original e nova para garantir que ambas sejam atualizadas
      const originalMeeting = result.original_meeting;
      const newMeeting = result.new_meeting;
      
      // Invalidar cache para lead_master_id e pipeline_lead_id para capturar ambos os casos
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(originalMeeting.lead_master_id)
        }),
        queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(originalMeeting.pipeline_lead_id)
        }),
        queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(newMeeting.lead_master_id)
        }),
        queryClient.invalidateQueries({
          queryKey: meetingsQueryKeys.lead(newMeeting.pipeline_lead_id)
        })
      ]);
      
      setShowRescheduleModal(false);
      onMeetingUpdate?.();
      
      console.log('✅ [Reagendamento] Cache invalidado e nova reunião criada:', {
        originalId: originalMeeting.id,
        newId: newMeeting.id,
        leadMasterId: newMeeting.lead_master_id,
        pipelineLeadId: newMeeting.pipeline_lead_id
      });
    } catch (error) {
      console.error('Erro ao reagendar:', error);
      alert('Erro ao reagendar reunião. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableOptions = getAvailableOptions();
  const canChange = config.clickable && availableOptions.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Tag principal */}
      <button
        onClick={() => canChange && setIsDropdownOpen(!isDropdownOpen)}
        disabled={!canChange || isUpdating}
        className={`
          inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
          ${config.colors}
          ${canChange ? 'cursor-pointer' : 'cursor-default'}
          ${isUpdating ? 'opacity-50' : ''}
        `}
        title={canChange ? 'Clique para alterar status' : 'Status não pode ser alterado'}
      >
        <IconComponent className="w-3 h-3" />
        <span>{MEETING_OUTCOME_LABELS[currentStatus]}</span>
        {canChange && (
          <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown de opções */}
      {isDropdownOpen && canChange && (
        <>
          {/* Overlay para fechar dropdown */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Menu dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[160px]">
            <div className="py-1">
              {availableOptions.map((option) => {
                const optionConfig = statusConfig[option];
                const OptionIcon = optionConfig.icon;
                
                return (
                  <button
                    key={option}
                    onClick={() => handleStatusChange(option)}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <OptionIcon className="w-4 h-4 text-gray-500" />
                    <span>{MEETING_OUTCOME_LABELS[option]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal de No-Show Workflow */}
      <NoShowWorkflowModal
        isOpen={showNoShowModal}
        onClose={() => setShowNoShowModal(false)}
        meetingId={meeting.id}
        meetingData={{
          planned_at: meeting.planned_at,
          owner_name: meeting.owner_name
        }}
        onComplete={handleNoShowComplete}
      />

      {/* Modal de Reagendamento */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        meetingId={meeting.id}
        meetingData={{
          planned_at: meeting.planned_at,
          owner_name: meeting.owner_name
        }}
        onReschedule={handleReschedule}
        isSubmitting={isUpdating}
      />
    </div>
  );
};