import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showSuccessToast, showErrorToast } from '../hooks/useToast';
import LeadsListEnhanced from './Leads/LeadsListEnhanced';
import LeadDetailsModal from './Leads/LeadDetailsModal';
import LeadFormModal from './Leads/LeadFormModal';
import PendingLeadsTab from './Pipeline/PendingLeadsTab';
import LeadsImportModal from './Leads/LeadsImportModal';
import LeadsExportModal from './Leads/LeadsExportModal';
import { filterLeadsWithoutOpportunity } from '../utils/leadOpportunityUtils';

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
  valor?: number;
  pipeline_leads_count?: number;
}

const LeadsModule: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadMaster[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadMaster | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadMaster | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 🔍 Estados para filtragem vindos do subheader
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // ✅ Estado local para leads atualizados (sincronização com LeadDetailsModal)
  const [localLeads, setLocalLeads] = useState<LeadMaster[]>([]);

  // 🎯 Estado para controlar quais leads têm oportunidades (mesma lógica do LeadsListEnhanced)
  const [leadsWithOpportunities, setLeadsWithOpportunities] = useState<Set<string>>(new Set());

  // ✅ Sincronizar leads locais com estado principal
  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  // ✅ Callback para atualizar lead específico
  const handleLeadUpdated = useCallback((updatedLead: LeadMaster) => {
    console.log('📡 [LeadsModule] Recebido lead atualizado:', updatedLead.id);
    setLocalLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === updatedLead.id ? updatedLead : lead
      )
    );
    
    // Atualizar também o estado principal para persistir mudanças
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === updatedLead.id ? updatedLead : lead
      )
    );
    
    // Se o lead selecionado foi atualizado, atualizar também
    if (selectedLead?.id === updatedLead.id) {
      setSelectedLead(updatedLead);
    }
  }, [selectedLead]);

  // 🎯 Verificar quais leads já têm oportunidades (mesma lógica do LeadsListEnhanced)
  const checkLeadsWithOpportunities = async () => {
    try {
      const leadIds = localLeads.map(lead => lead.id);
      
      // Buscar leads que já foram convertidos ou têm oportunidades na pipeline
      const { data: pipelineLeads, error } = await supabase
        .from('pipeline_leads')
        .select('custom_data')
        .not('custom_data->lead_master_id', 'is', null);

      if (error) throw error;

      const leadsWithOpps = new Set<string>();
      
      // Verificar leads convertidos
      localLeads.forEach(lead => {
        if (lead.status === 'converted') {
          leadsWithOpps.add(lead.id);
        }
      });

      // Verificar leads com oportunidades na pipeline
      pipelineLeads?.forEach((pipelineLead: any) => {
        const leadMasterId = pipelineLead.custom_data?.lead_master_id;
        if (leadMasterId) {
          leadsWithOpps.add(leadMasterId);
        }
      });

      setLeadsWithOpportunities(leadsWithOpps);
      console.log('🎯 [LeadsModule] checkLeadsWithOpportunities concluído:', leadsWithOpps.size, 'leads com oportunidades');
      
      // 📡 Enviar dados atualizados para o AppDashboard incluindo leadsWithOpportunities
      sendLeadsDataToAppDashboard(localLeads, leadsWithOpps);
    } catch (error) {
      console.error('❌ [LeadsModule] Erro ao verificar oportunidades:', error);
    }
  };

  // 📡 Função para enviar dados de leads para AppDashboard
  const sendLeadsDataToAppDashboard = (leads: LeadMaster[], leadsWithOpps: Set<string>) => {
    const leadsDataEvent = new CustomEvent('leads-data-updated', {
      detail: {
        leads: leads,
        leadsWithOpportunities: Array.from(leadsWithOpps), // Converter Set para Array para serialização
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(leadsDataEvent);
    console.log('📊 [LeadsModule] Dados completos enviados para AppDashboard:', leads.length, 'leads,', leadsWithOpps.size, 'com oportunidades');
  };

  // Carregar leads
  const loadLeads = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      console.log('🔍 Carregando leads para tenant_id:', user.tenant_id, 'role:', user.role);
      
      let query = supabase
        .from('leads_master')
        .select('*')
        .eq('tenant_id', user.tenant_id);

      // Se for member, ver apenas seus leads
      if (user.role === 'member') {
        console.log('👤 Aplicando filtro de member para assigned_to:', user.id);
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar leads:', error);
        return;
      }

      console.log('✅ Leads carregados:', data?.length || 0, 'leads encontrados');
      if (data && data.length > 0) {
        console.log('📋 Primeiros 3 leads:', data.slice(0, 3));
      }

      setLeads(data || []);
      setFilteredLeads(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Verificar oportunidades quando leads mudam
  useEffect(() => {
    if (localLeads.length > 0) {
      checkLeadsWithOpportunities();
    }
  }, [localLeads]);

  // 🔍 Aplicar filtragem baseada nos filtros do subheader
  useEffect(() => {
    let filtered = localLeads;

    // Aplicar filtro por categoria
    switch (selectedFilter) {
      case 'assigned':
        // Lead tem um vendedor atribuído
        filtered = filtered.filter(lead => lead.assigned_to);
        break;
      case 'not_assigned':
        // Lead não tem vendedor atribuído
        filtered = filtered.filter(lead => !lead.assigned_to);
        break;
      case 'without_opportunity':
        // 🎯 Lead sem oportunidade (nunca registrou oportunidade) - usa mesma lógica da tag
        filtered = filterLeadsWithoutOpportunity(filtered, leadsWithOpportunities);
        break;
      case 'all':
      default:
        // Todos os leads
        break;
    }

    // Aplicar filtro por busca
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(lead =>
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchLower) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
        (lead.phone && lead.phone.includes(searchTerm)) ||
        (lead.company && lead.company.toLowerCase().includes(searchLower))
      );
    }

    console.log('🔍 [LeadsModule] Aplicando filtros:', { selectedFilter, searchTerm, totalLeads: localLeads.length, filteredLeads: filtered.length });
    setFilteredLeads(filtered);
  }, [localLeads, searchTerm, selectedFilter]);

  // Carregar leads ao montar componente
  useEffect(() => {
    loadLeads();
  }, [user?.tenant_id]);

  // 🎧 Listener para evento lead-create-requested do subheader
  useEffect(() => {
    const handleLeadCreateRequested = (event: CustomEvent) => {
      console.log('🎯 [LeadsModule] Evento lead-create-requested recebido:', event.detail);
      handleCreateLead();
    };

    // Registrar listener
    window.addEventListener('lead-create-requested', handleLeadCreateRequested as EventListener);
    console.log('🎧 [LeadsModule] Listener lead-create-requested registrado');

    // Cleanup
    return () => {
      window.removeEventListener('lead-create-requested', handleLeadCreateRequested as EventListener);
      console.log('🧹 [LeadsModule] Listener lead-create-requested removido');
    };
  }, []);

  // 🎧 Listener para filtros vindos do subheader
  useEffect(() => {
    const handleLeadsFiltersUpdated = (event: CustomEvent) => {
      console.log('🔍 [LeadsModule] Filtros recebidos do subheader:', event.detail);
      setSearchTerm(event.detail.searchTerm || '');
      setSelectedFilter(event.detail.selectedFilter || 'all');
    };

    // Registrar listener
    window.addEventListener('leads-filters-updated', handleLeadsFiltersUpdated as EventListener);
    console.log('🎧 [LeadsModule] Listener leads-filters-updated registrado');

    // Cleanup
    return () => {
      window.removeEventListener('leads-filters-updated', handleLeadsFiltersUpdated as EventListener);
      console.log('🧹 [LeadsModule] Listener leads-filters-updated removido');
    };
  }, []);

  // 🎧 Listeners para import/export vindos do subheader
  useEffect(() => {
    const handleImportRequested = (event: CustomEvent) => {
      console.log('📥 [LeadsModule] Evento leads-import-requested recebido:', event.detail);
      setIsImportModalOpen(true);
    };

    const handleExportRequested = (event: CustomEvent) => {
      console.log('📤 [LeadsModule] Evento leads-export-requested recebido:', event.detail);
      setIsExportModalOpen(true);
    };

    // Registrar listeners
    window.addEventListener('leads-import-requested', handleImportRequested as EventListener);
    window.addEventListener('leads-export-requested', handleExportRequested as EventListener);
    console.log('🎧 [LeadsModule] Listeners import/export registrados');

    // Cleanup
    return () => {
      window.removeEventListener('leads-import-requested', handleImportRequested as EventListener);
      window.removeEventListener('leads-export-requested', handleExportRequested as EventListener);
      console.log('🧹 [LeadsModule] Listeners import/export removidos');
    };
  }, []);

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
        showErrorToast('Erro ao excluir', 'Erro ao excluir lead');
        return;
      }

      await loadLeads();
      showSuccessToast('Lead excluído', 'Lead excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      showErrorToast('Erro ao excluir', 'Erro ao excluir lead');
    }
  };

  const handleSaveLead = async () => {
    setIsFormModalOpen(false);
    setEditingLead(null);
    await loadLeads();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Lista de Leads */}
      <div className="bg-white">
        <LeadsListEnhanced
          leads={filteredLeads} // Usar leads filtrados baseados no subheader
          loading={loading}
          onViewDetails={handleViewDetails}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
          currentUserRole={user.role}
          onLeadUpdate={loadLeads}
        />
      </div>

      {/* Modals */}
      {isDetailsModalOpen && selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onEdit={handleEditLead}
          onLeadUpdated={handleLeadUpdated}
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

      {/* Import Modal */}
      <LeadsImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={loadLeads}
      />

      {/* Export Modal */}
      <LeadsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default LeadsModule;
