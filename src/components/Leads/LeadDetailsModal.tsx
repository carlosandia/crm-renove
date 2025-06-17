
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { X, Edit, Phone, Mail, Building, Calendar, TrendingUp, DollarSign, Activity, FileText, Plus } from 'lucide-react';
import LeadOpportunityModal from './LeadOpportunityModal';
import LeadActivityModal from './LeadActivityModal';
import LeadNoteModal from './LeadNoteModal';

interface Lead {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_source?: string;
  campaign_name?: string;
  estimated_value: number;
  lead_score: number;
  lead_temperature: string;
  probability: number;
  status: string;
  created_at: string;
  last_contact_date?: string;
  next_action_date?: string;
}

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ lead, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const { data: opportunities = [] } = useQuery({
    queryKey: ['lead-opportunities', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_opportunities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['lead-activities', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['lead-notes', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const getTemperatureColor = (temperature: string) => {
    switch (temperature) {
      case 'very_hot': return 'bg-red-100 text-red-800';
      case 'hot': return 'bg-orange-100 text-orange-800';
      case 'warm': return 'bg-yellow-100 text-yellow-800';
      case 'cold': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'won': return 'bg-purple-100 text-purple-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTemperature = (temp: string) => {
    const labels = {
      'very_hot': 'Muito Quente',
      'hot': 'Quente',
      'warm': 'Morno',
      'cold': 'Frio'
    };
    return labels[temp as keyof typeof labels] || temp;
  };

  const totalOpportunityValue = opportunities.reduce((sum, opp) => sum + (opp.opportunity_value || 0), 0);
  const wonOpportunities = opportunities.filter(opp => opp.status === 'won');
  const totalWonValue = wonOpportunities.reduce((sum, opp) => sum + (opp.opportunity_value || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {lead.first_name} {lead.last_name}
              </h2>
              <p className="text-gray-600">{lead.job_title} {lead.company && `• ${lead.company}`}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTemperatureColor(lead.lead_temperature)}`}>
                {formatTemperature(lead.lead_temperature)}
              </span>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                Score: {lead.lead_score}/100
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'opportunities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Oportunidades ({opportunities.length})
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'activities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Atividades ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notas ({notes.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Valor Total</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {totalOpportunityValue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Valor Ganho</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {totalWonValue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Oportunidades</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {opportunities.length}
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Lead há</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                  </div>
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Informações de Contato</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{lead.email}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{lead.phone}</span>
                      </div>
                    )}
                    {lead.company && (
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{lead.company}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Dados Comerciais</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor Estimado:</span>
                      <span className="font-medium">
                        {lead.estimated_value?.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }) || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Probabilidade:</span>
                      <span className="font-medium">{lead.probability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Score:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lead.lead_score}/100</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${lead.lead_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {lead.lead_source && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fonte:</span>
                        <span className="font-medium">{lead.lead_source}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Datas Importantes */}
              {(lead.last_contact_date || lead.next_action_date) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Datas Importantes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.last_contact_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Último Contato:</span>
                        <span className="font-medium">
                          {new Date(lead.last_contact_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {lead.next_action_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Próxima Ação:</span>
                        <span className="font-medium">
                          {new Date(lead.next_action_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Oportunidades</h3>
                <button
                  onClick={() => setShowOpportunityModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nova Oportunidade
                </button>
              </div>

              {opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma oportunidade registrada ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{opportunity.opportunity_name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(opportunity.status)}`}>
                          {opportunity.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Valor:</span>
                          <div className="font-medium">
                            {opportunity.opportunity_value?.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }) || '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Probabilidade:</span>
                          <div className="font-medium">{opportunity.probability}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Criada em:</span>
                          <div className="font-medium">
                            {new Date(opportunity.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        {opportunity.expected_close_date && (
                          <div>
                            <span className="text-gray-600">Previsão:</span>
                            <div className="font-medium">
                              {new Date(opportunity.expected_close_date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        )}
                      </div>
                      {(opportunity.lost_reason || opportunity.lost_notes) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {opportunity.lost_reason && (
                            <div className="text-sm">
                              <span className="text-gray-600">Motivo da perda:</span>
                              <div className="text-red-600">{opportunity.lost_reason}</div>
                            </div>
                          )}
                          {opportunity.lost_notes && (
                            <div className="text-sm mt-1">
                              <span className="text-gray-600">Observações:</span>
                              <div className="text-gray-900">{opportunity.lost_notes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Atividades</h3>
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nova Atividade
                </button>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma atividade registrada ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{activity.activity_title}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Tipo: {activity.activity_type}
                      </div>
                      {activity.activity_description && (
                        <div className="text-sm text-gray-900">
                          {activity.activity_description}
                        </div>
                      )}
                      {activity.due_date && (
                        <div className="text-sm text-gray-600 mt-2">
                          Vencimento: {new Date(activity.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Notas</h3>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nova Nota
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma nota registrada ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        {note.note_title && (
                          <h4 className="font-medium text-gray-900">{note.note_title}</h4>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {note.note_content}
                      </div>
                      {note.is_private && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full mt-2">
                          Privada
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {showOpportunityModal && (
        <LeadOpportunityModal
          leadId={lead.id}
          onClose={() => setShowOpportunityModal(false)}
          onSave={() => setShowOpportunityModal(false)}
        />
      )}

      {showActivityModal && (
        <LeadActivityModal
          leadId={lead.id}
          onClose={() => setShowActivityModal(false)}
          onSave={() => setShowActivityModal(false)}
        />
      )}

      {showNoteModal && (
        <LeadNoteModal
          leadId={lead.id}
          onClose={() => setShowNoteModal(false)}
          onSave={() => setShowNoteModal(false)}
        />
      )}
    </div>
  );
};

export default LeadDetailsModal;
