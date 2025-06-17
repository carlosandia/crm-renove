import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { Pipeline, Lead, PipelineStage, CustomField } from '../types/Pipeline';
import { supabase } from '../lib/supabase';

export const usePipelineData = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Novos estados para filtros e controles do admin
  const [showOnlyMyPipelines, setShowOnlyMyPipelines] = useState(false);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]); // Todas as pipelines carregadas
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);

  // Memoizar a função loadMemberPipelines para evitar recriações desnecessárias
  const loadMemberPipelines = useCallback(async () => {
    if (!user?.id || !user?.tenant_id) {
      console.log('❌ [PIPELINE] Usuário ou tenant não identificado');
      setLoading(false);
      return;
    }

    console.log('🔄 [PIPELINE] Carregando pipelines para:', user.role, user.email);

    try {
      setLoading(true);

      // SE FOR SUPER ADMIN, criar dados mock para teste
      if (user.role === 'super_admin') {
        console.log('🔧 [PIPELINE] Carregando dados mock para Super Admin');
        const mockPipeline: Pipeline = {
          id: 'mock-pipeline-1',
          name: 'Pipeline de Vendas',
          description: 'Pipeline principal de vendas',
          tenant_id: user.tenant_id || 'default',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pipeline_stages: [
            {
              id: 'stage-1',
              name: 'Prospecção',
              order_index: 1,
              temperature_score: 10,
              max_days_allowed: 7,
              color: '#3B82F6',
              is_system_stage: false
            },
            {
              id: 'stage-2',
              name: 'Qualificação',
              order_index: 2,
              temperature_score: 30,
              max_days_allowed: 5,
              color: '#F59E0B',
              is_system_stage: false
            },
            {
              id: 'stage-3',
              name: 'Proposta',
              order_index: 3,
              temperature_score: 60,
              max_days_allowed: 3,
              color: '#EF4444',
              is_system_stage: false
            },
            {
              id: 'stage-4',
              name: 'Ganho',
              order_index: 4,
              temperature_score: 100,
              max_days_allowed: 1,
              color: '#10B981',
              is_system_stage: true
            }
          ],
          pipeline_custom_fields: [],
          pipeline_members: []
        };

        const mockLeads: Lead[] = [
          {
            id: 'lead-1',
            pipeline_id: 'mock-pipeline-1',
            stage_id: 'stage-1',
            custom_data: {
              empresa: 'Tech Solutions Ltd',
              contato: 'João Silva',
              valor: 25000
            },
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            moved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active' as const
          },
          {
            id: 'lead-2',
            pipeline_id: 'mock-pipeline-1',
            stage_id: 'stage-2',
            custom_data: {
              empresa: 'Inovação Digital',
              contato: 'Maria Santos',
              valor: 15000
            },
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            moved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active' as const
          },
          {
            id: 'lead-3',
            pipeline_id: 'mock-pipeline-1',
            stage_id: 'stage-4',
            custom_data: {
              empresa: 'StartupXYZ',
              contato: 'Pedro Costa',
              valor: 50000
            },
            created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            moved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active' as const
          }
        ];

        setPipelines([mockPipeline]);
        setSelectedPipeline(mockPipeline);
        setLeads(mockLeads);
        setLoading(false);
        console.log('✅ [PIPELINE] Dados mock carregados para Super Admin');
        return;
      }
      
      // SE FOR ADMIN - carregar TODAS as pipelines do tenant
      if (user.role === 'admin') {
        console.log('👤 [PIPELINE] Carregando TODAS as pipelines do tenant para admin');
        
        const { data: adminPipelines, error: adminError } = await supabase
          .from('pipelines')
          .select(`
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at,
            tenant_id,
            pipeline_stages (
              id,
              pipeline_id,
              name,
              order_index,
              temperature_score,
              max_days_allowed,
              color,
              is_system_stage,
              created_at,
              updated_at
            ),
            pipeline_custom_fields (
              id,
              pipeline_id,
              field_name,
              field_label,
              field_type,
              is_required,
              field_order,
              field_options,
              placeholder,
              show_in_card,
              created_at,
              updated_at
            ),
            pipeline_members (
              id,
              pipeline_id,
              member_id,
              created_at,
              updated_at,
              users!pipeline_members_member_id_fkey (
                id,
                first_name,
                last_name,
                email
              )
            )
          `)
          .eq('tenant_id', user.tenant_id)
          .order('created_at', { ascending: false });

        if (adminError) {
          console.error('❌ [PIPELINE] Erro ao carregar pipelines do admin:', adminError.message);
          setPipelines([]);
          setSelectedPipeline(null);
          setLoading(false);
          return;
        }

        console.log('✅ [PIPELINE] Carregadas pipelines do admin:', adminPipelines?.length || 0);
        
        if (adminPipelines && adminPipelines.length > 0) {
          // Para admin, armazenar todas as pipelines em allPipelines
          setAllPipelines(adminPipelines);
          setPipelines(adminPipelines);
          setSelectedPipeline(adminPipelines[0]);
          
          // Extrair vendedores disponíveis
          setAvailableVendors(extractAvailableVendors(adminPipelines));
        } else {
          setAllPipelines([]);
          setPipelines([]);
          setSelectedPipeline(null);
          setAvailableVendors([]);
        }
        
        setLoading(false);
        return;
      }

      // SE FOR MEMBER - carregar pipelines onde foi atribuído via pipeline_members
      if (user.role === 'member') {
        console.log('👤 [PIPELINE] Carregando pipelines atribuídas ao member');
        
        const { data: memberPipelines, error: memberError } = await supabase
          .from('pipeline_members')
          .select(`
            id,
            pipeline_id,
            member_id,
            created_at,
            pipelines!inner (
              id,
              name,
              description,
              created_by,
              created_at,
              updated_at,
              tenant_id,
              pipeline_stages (
                id,
                pipeline_id,
                name,
                order_index,
                temperature_score,
                max_days_allowed,
                color,
                is_system_stage,
                created_at,
                updated_at
              ),
              pipeline_custom_fields (
                id,
                pipeline_id,
                field_name,
                field_label,
                field_type,
                is_required,
                field_order,
                field_options,
                placeholder,
                show_in_card,
                created_at,
                updated_at
              ),
              pipeline_members (
                id,
                pipeline_id,
                member_id,
                created_at,
                updated_at
              )
            )
          `)
          .eq('member_id', user.id);

        if (memberError) {
          console.error('❌ [PIPELINE] Erro ao carregar pipelines do member:', memberError.message);
          setPipelines([]);
          setSelectedPipeline(null);
          setLoading(false);
          return;
        }

        // Extrair as pipelines dos links
        const linkedPipelines = (memberPipelines || []).map((link: any) => link.pipelines);
        
        console.log('✅ [PIPELINE] Carregadas pipelines do member:', linkedPipelines.length);
        
        if (linkedPipelines && linkedPipelines.length > 0) {
          setPipelines(linkedPipelines);
          setSelectedPipeline(linkedPipelines[0]);
        } else {
          setPipelines([]);
          setSelectedPipeline(null);
        }
        
        setLoading(false);
        return;
      }

      // FALLBACK - caso não seja nenhum dos roles acima
      console.log('❌ [PIPELINE] Role não suportado:', user.role);
      setPipelines([]);
      setSelectedPipeline(null);
      setLoading(false);

    } catch (error) {
      console.error('💥 [PIPELINE] Erro inesperado:', error);
      setPipelines([]);
      setSelectedPipeline(null);
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.role, user?.tenant_id]);

  // Memoizar a função loadLeads
  const loadLeads = useCallback(async (pipelineId: string) => {
    // Se for pipeline mock, não fazer requisição
    if (pipelineId === 'mock-pipeline-1') {
      return;
    }

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/leads`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      } else {
        console.error('Erro ao carregar leads:', response.statusText);
        setLeads([]);
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setLeads([]);
    }
  }, []);

  // useEffect para carregar pipelines apenas quando o usuário mudar
  useEffect(() => {
    if (user && (user.role === 'member' || user.role === 'admin' || user.role === 'super_admin')) {
      loadMemberPipelines();
    }
  }, [user?.id, user?.role, loadMemberPipelines]);

  // useEffect para carregar leads apenas quando a pipeline selecionada mudar
  useEffect(() => {
    if (selectedPipeline?.id) {
      loadLeads(selectedPipeline.id);
    } else {
      setLeads([]); // Limpar leads se não há pipeline selecionada
    }
  }, [selectedPipeline?.id, loadLeads]);

  const handleCreateLead = useCallback(async (stageId: string, formData: Record<string, any>) => {
    if (!selectedPipeline) return;

    try {
      const response = await fetch(`/api/pipelines/${selectedPipeline.id}/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stage_id: stageId,
          custom_data: formData,
          created_by: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newLead: Lead = {
          ...data.lead,
          moved_at: new Date().toISOString()
        };
        setLeads(prev => [newLead, ...prev]);
        return newLead;
      } else {
        console.error('Erro ao criar lead:', response.statusText);
        // Fallback para criação local
        const newLead: Lead = {
          id: `lead-${Date.now()}`,
          pipeline_id: selectedPipeline.id,
          stage_id: stageId || selectedPipeline.pipeline_stages?.[0]?.id || 'stage-1',
          custom_data: formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          moved_at: new Date().toISOString(),
          status: 'active'
        };
        
        setLeads(prev => [newLead, ...prev]);
        return newLead;
      }
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      // Fallback para criação local
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        pipeline_id: selectedPipeline.id,
        stage_id: stageId || selectedPipeline.pipeline_stages?.[0]?.id || 'stage-1',
        custom_data: formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        moved_at: new Date().toISOString(),
        status: 'active'
      };
      
      setLeads(prev => [newLead, ...prev]);
      return newLead;
    }
  }, [selectedPipeline, user?.id]);

  const updateLeadStage = useCallback(async (leadId: string, newStageId: string) => {
    try {
      if (!selectedPipeline) return;

      const response = await fetch(`/api/pipelines/${selectedPipeline.id}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stage_id: newStageId
        })
      });

      if (response.ok) {
        setLeads(prev => prev.map(l => 
          l.id === leadId 
            ? { ...l, stage_id: newStageId, moved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : l
        ));
      } else {
        console.error('Erro ao atualizar lead:', response.statusText);
        // Fallback para atualização local
        setLeads(prev => prev.map(l => 
          l.id === leadId 
            ? { ...l, stage_id: newStageId, moved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : l
        ));
      }
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      // Fallback para atualização local
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { ...l, stage_id: newStageId, moved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : l
      ));
    }
  }, [selectedPipeline]);

  const updateLeadData = useCallback(async (leadId: string, updatedData: any) => {
    try {
      if (!selectedPipeline) return;

      const response = await fetch(`/api/pipelines/${selectedPipeline.id}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          custom_data: updatedData
        })
      });

      if (response.ok) {
        setLeads(prev => prev.map(l => 
          l.id === leadId 
            ? { ...l, custom_data: { ...l.custom_data, ...updatedData }, updated_at: new Date().toISOString() }
            : l
        ));
      } else {
        console.error('Erro ao atualizar dados do lead:', response.statusText);
        // Fallback para atualização local
        setLeads(prev => prev.map(l => 
          l.id === leadId 
            ? { ...l, custom_data: { ...l.custom_data, ...updatedData }, updated_at: new Date().toISOString() }
            : l
        ));
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do lead:', error);
      // Fallback para atualização local
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { ...l, custom_data: { ...l.custom_data, ...updatedData }, updated_at: new Date().toISOString() }
          : l
      ));
    }
  }, [selectedPipeline]);

  // Função para extrair vendedores únicos das pipelines
  const extractAvailableVendors = useCallback((pipelineList: Pipeline[]) => {
    const vendorsMap = new Map();
    
    pipelineList.forEach(pipeline => {
      pipeline.pipeline_members?.forEach(member => {
        if (member.users) {
          vendorsMap.set(member.member_id, {
            id: member.member_id,
            name: `${member.users.first_name} ${member.users.last_name}`,
            email: member.users.email
          });
        }
      });
    });
    
    return Array.from(vendorsMap.values());
  }, []);

  // Função para filtrar pipelines baseado nos filtros ativos
  const getFilteredPipelines = useCallback(() => {
    let filtered = allPipelines;
    
    // Se admin quer ver apenas suas pipelines
    if (user?.role === 'admin' && showOnlyMyPipelines) {
      filtered = filtered.filter(p => p.created_by === user.id);
    }
    
    // Filtro por vendedor
    if (selectedVendorFilter) {
      filtered = filtered.filter(p => 
        p.pipeline_members?.some(m => m.member_id === selectedVendorFilter)
      );
    }
    
    // Filtro por busca (nome ou descrição)
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.description?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [allPipelines, showOnlyMyPipelines, selectedVendorFilter, searchFilter, user]);

  // Atualizar pipelines filtradas quando filtros mudam
  useEffect(() => {
    if (user?.role === 'admin' && allPipelines.length > 0) {
      const filtered = getFilteredPipelines();
      setPipelines(filtered);
      
      // Se a pipeline selecionada não está mais na lista filtrada, selecionar a primeira
      if (selectedPipeline && !filtered.find(p => p.id === selectedPipeline.id)) {
        setSelectedPipeline(filtered[0] || null);
      }
      
      // Atualizar lista de vendedores disponíveis
      setAvailableVendors(extractAvailableVendors(filtered));
    }
  }, [allPipelines, getFilteredPipelines, selectedPipeline, user, extractAvailableVendors]);

  // Atualizar allPipelines quando dados são carregados
  useEffect(() => {
    if (user?.role === 'admin') {
      setAllPipelines(pipelines);
    }
  }, [pipelines, user?.role]);

  // Funções de controle dos filtros
  const toggleMyPipelinesOnly = useCallback(() => {
    setShowOnlyMyPipelines(prev => !prev);
  }, []);

  const setVendorFilter = useCallback((vendorId: string) => {
    setSelectedVendorFilter(vendorId);
  }, []);

  const setSearchFilterValue = useCallback((search: string) => {
    setSearchFilter(search);
  }, []);

  const setStatusFilterValue = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const clearAllFilters = useCallback(() => {
    setShowOnlyMyPipelines(false);
    setSelectedVendorFilter('');
    setSearchFilter('');
    setStatusFilter('');
  }, []);

  return {
    pipelines,
    selectedPipeline,
    setSelectedPipeline,
    loading,
    leads,
    setLeads,
    handleCreateLead,
    updateLeadStage,
    updateLeadData,
    // Novos controles de filtro
    showOnlyMyPipelines,
    selectedVendorFilter,
    searchFilter,
    statusFilter,
    availableVendors,
    toggleMyPipelinesOnly,
    setVendorFilter,
    setSearchFilterValue,
    setStatusFilterValue,
    clearAllFilters,
    // Dados para admin
    allPipelines: user?.role === 'admin' ? allPipelines : pipelines
  };
};
