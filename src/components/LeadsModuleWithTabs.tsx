import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LeadsList from './Leads/LeadsList';
import LeadDetailsModal from './Leads/LeadDetailsModal';
import LeadFormModal from './Leads/LeadFormModal';
import PendingLeadsTab from './Pipeline/PendingLeadsTab';
import { Search, Plus, Filter, Users, TrendingUp, Clock } from 'lucide-react';

interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  assigned_to?: string;
  estimated_value?: number;
  created_by: string;
  job_title?: string;
  last_contact_date?: string;
  next_action_date?: string;
  lead_score?: number;
  probability?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const LeadsModuleWithTabs: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadMaster[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<LeadMaster | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadMaster | null>(null);

  // Estado para controle de abas (apenas para admin)
  const [activeTab, setActiveTab] = useState<'leads' | 'pending'>('leads');

  // Carregar leads
  const loadLeads = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('leads_master')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      // Se for member, ver apenas seus leads
      if (user.role === 'member') {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar leads:', error);
        return;
      }

      setLeads(data || []);
      setFilteredLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar leads
  useEffect(() => {
    let filtered = leads;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(lead =>
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.phone && lead.phone.includes(searchTerm)) ||
        (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Filtro por temperatura
    if (temperatureFilter !== 'all') {
      filtered = filtered.filter(lead => lead.lead_temperature === temperatureFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, statusFilter, temperatureFilter]);

  // Carregar leads ao montar componente
  useEffect(() => {
    loadLeads();
  }, [user?.tenant_id]);

  // Handlers
  const handleViewDetails = (lead: LeadMaster) => {
    setSelectedLead(lead);
    setIsDetailsModalOpen(true);
  };

  const handleEditLead = (lead: LeadMaster) => {
    setEditingLead(lead);
    setIsFormModalOpen(true);
  };

  const handleCreateLead = () => {
    setEditingLead(null);
    setIsFormModalOpen(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lead?')) return;

    try {
      const { error } = await supabase
        .from('leads_master')
        .delete()
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao excluir lead:', error);
        alert('Erro ao excluir lead');
        return;
      }

      await loadLeads();
      alert('Lead excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      alert('Erro ao excluir lead');
    }
  };

  const handleSaveLead = async () => {
    setIsFormModalOpen(false);
    setEditingLead(null);
    await loadLeads();
  };

  // Estatísticas rápidas
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.lead_temperature === 'hot').length;
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="text-white text-lg" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Gestão de Leads</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gerencie todos os seus leads e oportunidades
              </p>
            </div>
          </div>
          
          {(user.role === 'admin' || user.role === 'super_admin') && (
            <button
              onClick={handleCreateLead}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span>Novo Lead</span>
            </button>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Users size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total de Leads</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalLeads}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-red-600" />
              <span className="text-sm font-medium text-gray-600">Leads Quentes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{hotLeads}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Valor Total Est.</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              R$ {totalValue.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Sistema de Abas - Apenas para Admin */}
      {user.role === 'admin' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('leads')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'leads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users size={16} />
                  <span>Todos os Leads</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span>Pendentes</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-6">
            {activeTab === 'leads' && (
              <>
                {/* Filtros e Busca */}
                <div className="mb-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Busca */}
                    <div className="flex-1 relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nome, email, telefone ou empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-4">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="active">Ativo</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                      </select>

                      <select
                        value={temperatureFilter}
                        onChange={(e) => setTemperatureFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Todas Temperaturas</option>
                        <option value="hot">Quente</option>
                        <option value="warm">Morno</option>
                        <option value="cold">Frio</option>
                      </select>
                    </div>
                  </div>

                  {/* Contador de resultados */}
                  <div className="mt-4 text-sm text-gray-600">
                    Mostrando {filteredLeads.length} de {totalLeads} leads
                  </div>
                </div>

                {/* Lista de Leads */}
                <LeadsList
                  leads={filteredLeads}
                  loading={loading}
                  onViewDetails={handleViewDetails}
                  onEditLead={handleEditLead}
                  onDeleteLead={handleDeleteLead}
                  currentUserRole={user.role}
                />
              </>
            )}

            {activeTab === 'pending' && (
              <PendingLeadsTab />
            )}
          </div>
        </div>
      )}

      {/* Para Members - Apenas a lista normal de leads */}
      {user.role === 'member' && (
        <>
          {/* Filtros e Busca */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email, telefone ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtros */}
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativo</option>
                  <option value="converted">Convertido</option>
                  <option value="lost">Perdido</option>
                </select>

                <select
                  value={temperatureFilter}
                  onChange={(e) => setTemperatureFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas Temperaturas</option>
                  <option value="hot">Quente</option>
                  <option value="warm">Morno</option>
                  <option value="cold">Frio</option>
                </select>
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filteredLeads.length} de {totalLeads} leads
            </div>
          </div>

          {/* Lista de Leads */}
          <div className="bg-white rounded-xl border border-gray-200">
            <LeadsList
              leads={filteredLeads}
              loading={loading}
              onViewDetails={handleViewDetails}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              currentUserRole={user.role}
            />
          </div>
        </>
      )}

      {/* Modals */}
      {isDetailsModalOpen && selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onEdit={handleEditLead}
        />
      )}

      {isFormModalOpen && (
        <LeadFormModal
          lead={editingLead}
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveLead}
          tenantId={user.tenant_id}
        />
      )}
    </div>
  );
};

export default LeadsModuleWithTabs;
