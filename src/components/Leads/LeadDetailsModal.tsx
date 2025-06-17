
import React, { useState, useEffect } from 'react';
import { X, Edit, Mail, Phone, Building, Calendar, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  estimated_value?: number;
  lead_score?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface LeadOpportunity {
  id: string;
  opportunity_name: string;
  opportunity_value: number;
  status: string;
  probability: number;
  expected_close_date?: string;
  closed_at?: string;
  lost_reason?: string;
  lost_notes?: string;
  created_at: string;
}

interface LeadActivity {
  id: string;
  activity_title: string;
  activity_type: string;
  activity_description?: string;
  completed: boolean;
  due_date?: string;
  created_at: string;
}

interface LeadNote {
  id: string;
  note_title?: string;
  note_content: string;
  is_private: boolean;
  created_at: string;
}

interface LeadDetailsModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  lead,
  isOpen,
  onClose,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'opportunities' | 'activities' | 'notes'>('info');
  const [opportunities, setOpportunities] = useState<LeadOpportunity[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados relacionados
  const loadRelatedData = async () => {
    if (!lead.id) return;

    setLoading(true);
    try {
      // Carregar oportunidades
      const { data: opportunitiesData } = await supabase
        .from('lead_opportunities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      // Carregar atividades
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      // Carregar notas
      const { data: notesData } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      setOpportunities(opportunitiesData || []);
      setActivities(activitiesData || []);
      setNotes(notesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados relacionados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead.id) {
      loadRelatedData();
    }
  }, [isOpen, lead.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTemperatureColor = (temperature?: string) => {
    switch (temperature) {
      case 'hot': return 'text-red-600 bg-red-100';
      case 'warm': return 'text-yellow-600 bg-yellow-100';
      case 'cold': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'converted': return 'text-purple-600 bg-purple-100';
      case 'lost': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const totalOpportunityValue = opportunities.reduce((sum, opp) => sum + opp.opportunity_value, 0);
  const wonOpportunities = opportunities.filter(opp => opp.status === 'won');
  const lostOpportunities = opportunities.filter(opp => opp.status === 'lost');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {lead.first_name} {lead.last_name}
              </h2>
              <p className="opacity-90 mt-1">
                {lead.company && `${lead.company} • `}
                {lead.job_title || 'Lead'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(lead)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
                title="Editar lead"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={onClose}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'info', label: 'Informações', icon: Mail },
              { id: 'opportunities', label: 'Oportunidades', icon: DollarSign },
              { id: 'activities', label: 'Atividades', icon: Activity },
              { id: 'notes', label: 'Notas', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-900">{lead.email}</span>
                  </div>
                  
                  {lead.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-900">{lead.phone}</span>
                    </div>
                  )}
                  
                  {lead.company && (
                    <div className="flex items-center space-x-2">
                      <Building size={16} className="text-gray-400" />
                      <span className="text-gray-900">{lead.company}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-900">Criado em {formatDate(lead.created_at)}</span>
                  </div>
                </div>

                {/* Status e Temperatura */}
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status === 'active' ? 'Ativo' : 
                       lead.status === 'converted' ? 'Convertido' : 
                       lead.status === 'lost' ? 'Perdido' : 'Ativo'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Temperatura:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getTemperatureColor(lead.lead_temperature)}`}>
                      {lead.lead_temperature === 'hot' ? 'Quente' : 
                       lead.lead_temperature === 'warm' ? 'Morno' : 
                       lead.lead_temperature === 'cold' ? 'Frio' : 'Não definido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas e Origem */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Métricas e Origem</h3>
                
                <div className="space-y-3">
                  {lead.estimated_value && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Valor Estimado:</span>
                      <span className="ml-2 text-lg font-semibold text-green-600">
                        {formatCurrency(lead.estimated_value)}
                      </span>
                    </div>
                  )}
                  
                  {lead.lead_score && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Score:</span>
                      <span className="ml-2 text-lg font-semibold text-blue-600">{lead.lead_score}</span>
                    </div>
                  )}
                  
                  {lead.lead_source && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Origem:</span>
                      <span className="ml-2 text-gray-900">{lead.lead_source}</span>
                    </div>
                  )}
                  
                  {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-500">UTM:</span>
                      <div className="text-sm text-gray-600 space-y-1">
                        {lead.utm_source && <div>Source: {lead.utm_source}</div>}
                        {lead.utm_medium && <div>Medium: {lead.utm_medium}</div>}
                        {lead.utm_campaign && <div>Campaign: {lead.utm_campaign}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600">Total de Oportunidades</div>
                  <div className="text-2xl font-bold text-blue-900">{opportunities.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600">Oportunidades Ganhas</div>
                  <div className="text-2xl font-bold text-green-900">{wonOpportunities.length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-purple-600">Valor Total</div>
                  <div className="text-2xl font-bold text-purple-900">{formatCurrency(totalOpportunityValue)}</div>
                </div>
              </div>

              <div className="space-y-4">
                {opportunities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <DollarSign size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500">Nenhuma oportunidade encontrada</p>
                  </div>
                ) : (
                  opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{opportunity.opportunity_name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          opportunity.status === 'won' ? 'bg-green-100 text-green-800' :
                          opportunity.status === 'lost' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {opportunity.status === 'won' ? 'Ganha' :
                           opportunity.status === 'lost' ? 'Perdida' : 'Ativa'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Valor:</span>
                          <div className="font-medium">{formatCurrency(opportunity.opportunity_value)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Probabilidade:</span>
                          <div className="font-medium">{opportunity.probability}%</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Criada em:</span>
                          <div className="font-medium">{formatDate(opportunity.created_at)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {opportunity.status === 'won' || opportunity.status === 'lost' ? 'Fechada em:' : 'Previsão:'}
                          </span>
                          <div className="font-medium">
                            {opportunity.closed_at ? formatDate(opportunity.closed_at) :
                             opportunity.expected_close_date ? formatDate(opportunity.expected_close_date) : 'N/A'}
                          </div>
                        </div>
                      </div>
                      {opportunity.lost_reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded">
                          <div className="text-sm font-medium text-red-800">Motivo da Perda:</div>
                          <div className="text-sm text-red-700">{opportunity.lost_reason}</div>
                          {opportunity.lost_notes && (
                            <div className="text-sm text-red-600 mt-1">{opportunity.lost_notes}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">Nenhuma atividade encontrada</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{activity.activity_title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {activity.completed ? 'Concluída' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Tipo: {activity.activity_type}
                    </div>
                    {activity.activity_description && (
                      <div className="text-sm text-gray-700 mb-2">{activity.activity_description}</div>
                    )}
                    <div className="text-xs text-gray-500">
                      Criada em {formatDateTime(activity.created_at)}
                      {activity.due_date && ` • Vence em ${formatDateTime(activity.due_date)}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">Nenhuma nota encontrada</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                    {note.note_title && (
                      <h4 className="font-semibold text-gray-900 mb-2">{note.note_title}</h4>
                    )}
                    <div className="text-gray-700 mb-2 whitespace-pre-wrap">{note.note_content}</div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Criada em {formatDateTime(note.created_at)}</span>
                      {note.is_private && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Privada</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsModal;
