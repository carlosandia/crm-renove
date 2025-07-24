// =====================================================================================
// COMPONENT: Aba Google Calendar Expandida
// Autor: Claude (Arquiteto Sênior)
// Descrição: Aba que combina Google Calendar + gestão de reuniões 
// =====================================================================================

import React, { useState } from 'react';
import { Calendar, Plus, Zap, Settings } from 'lucide-react';
import { Lead } from '../../types/Pipeline';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';
import { useLeadMeetings } from '../../hooks/useMeetings';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';
import { MeetingsHistory } from './MeetingsHistory';

interface EnhancedGoogleCalendarTabProps {
  lead: Lead;
  onClose: () => void;
}

export const EnhancedGoogleCalendarTab: React.FC<EnhancedGoogleCalendarTabProps> = ({
  lead,
  onClose
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'meetings' | 'calendar'>('meetings');
  
  const {
    hasIntegration,
    isConnecting,
    isLoading,
    connectCalendar,
    activeIntegration
  } = useGoogleCalendar();

  // AIDEV-NOTE: Buscar reuniões reais da API para calcular métricas
  const { data: meetingsData } = useLeadMeetings(lead.id, { limit: 100 });
  const meetings = meetingsData?.meetings || [];

  // AIDEV-NOTE: Calcular métricas reais baseadas nas reuniões da API
  const metrics = {
    agendadas: meetings.filter(m => m.outcome === 'agendada').length,
    realizadas: meetings.filter(m => m.outcome === 'realizada').length,
    noShow: meetings.filter(m => m.outcome === 'no_show').length
  };

  // AIDEV-NOTE: Extrair dados do lead para os componentes
  const leadData = lead.custom_data || {};
  const leadName = leadData.nome_lead || leadData.nome_contato || leadData.contato || leadData.nome || 'Lead';
  const companyName = leadData.empresa || leadData.company || undefined;

  return (
    <div className="space-y-6">
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Reuniões & Calendário
            </h3>
          </div>
          
          {/* Toggle entre seções */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveSection('meetings')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeSection === 'meetings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reuniões
            </button>
            <button
              onClick={() => setActiveSection('calendar')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeSection === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Google Calendar
            </button>
          </div>
        </div>

        {/* Botão de nova reunião */}
        {activeSection === 'meetings' && (
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Reunião</span>
          </button>
        )}
      </div>

      {/* Conteúdo das seções */}
      {activeSection === 'meetings' ? (
        <div className="space-y-6">
          {/* Quick Stats - Dados Reais da API */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Agendadas</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {metrics.agendadas}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Realizadas</p>
                  <p className="text-2xl font-bold text-green-900">
                    {metrics.realizadas}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">No-Show</p>
                  <p className="text-2xl font-bold text-red-900">
                    {metrics.noShow}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Histórico de reuniões */}
          <MeetingsHistory 
            leadId={lead.id}
            className="bg-white border border-gray-200 rounded-lg p-6"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status da integração Google Calendar */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Google Calendar</h4>
                  <p className="text-sm text-gray-500">
                    {hasIntegration 
                      ? 'Conectado e sincronizado' 
                      : 'Conecte para sincronizar eventos'
                    }
                  </p>
                </div>
              </div>

              {/* Status indicator */}
              <div className={`w-3 h-3 rounded-full ${
                hasIntegration ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            </div>

            {!hasIntegration ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">
                    Benefícios da integração:
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Sincronização automática de eventos</li>
                    <li>• Criação de reuniões direto no CRM</li>
                    <li>• Lembretes automáticos</li>
                    <li>• Histórico centralizado</li>
                  </ul>
                </div>

                <button
                  onClick={() => connectCalendar()}
                  disabled={isConnecting || isLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Conectar Google Calendar</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {activeIntegration?.calendar_name || 'Google Calendar'}
                      </p>
                      <p className="text-xs text-green-600">
                        Conectado e sincronizando
                      </p>
                    </div>
                  </div>
                  <Settings className="w-4 h-4 text-green-600" />
                </div>

                {/* TODO: Integração futura - lista de eventos */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    🚧 Em desenvolvimento
                  </p>
                  <p className="text-xs text-blue-600">
                    Sincronização de eventos com Google Calendar será implementada em breve.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions para Google Calendar */}
          {hasIntegration && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                Ações Rápidas
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setActiveSection('meetings');
                    setShowScheduleModal(true);
                  }}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      Agendar Reunião
                    </p>
                    <p className="text-xs text-gray-500">
                      Criar nova reunião
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => window.open('https://calendar.google.com', '_blank')}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      Abrir Google Calendar
                    </p>
                    <p className="text-xs text-gray-500">
                      Ver calendário completo
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de agendamento */}
      {showScheduleModal && (
        <ScheduleMeetingModal
          isOpen={true}
          onClose={() => setShowScheduleModal(false)}
          pipelineLeadId={lead.id}
          leadMasterId={lead.lead_master_id || lead.id} // Fallback para compatibilidade
          leadName={leadName}
          companyName={companyName}
        />
      )}
    </div>
  );
};