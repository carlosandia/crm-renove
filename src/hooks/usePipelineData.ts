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

  // Memoizar a função loadMemberPipelines para evitar recriações desnecessárias
  const loadMemberPipelines = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔄 [PIPELINE] Carregando pipelines vinculadas para:', user?.email);
      
      // VERIFICAR SE USUÁRIO EXISTE
      if (!user?.id) {
        console.warn('⚠️ [PIPELINE] Usuário não identificado');
        setPipelines([]);
        setSelectedPipeline(null);
        setLoading(false);
        return;
      }

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
          pipeline_custom_fields: [
            {
              id: 'field-1',
              field_name: 'empresa',
              field_label: 'Empresa',
              field_type: 'text',
              is_required: true,
              field_order: 1,
              field_options: undefined,
              placeholder: 'Nome da empresa',
              show_in_card: true
            },
            {
              id: 'field-2',
              field_name: 'contato',
              field_label: 'Contato',
              field_type: 'text',
              is_required: true,
              field_order: 2,
              field_options: undefined,
              placeholder: 'Nome do contato',
              show_in_card: true
            },
            {
              id: 'field-3',
              field_name: 'valor',
              field_label: 'Valor',
              field_type: 'number',
              is_required: false,
              field_order: 3,
              field_options: undefined,
              placeholder: 'Valor esperado',
              show_in_card: true
            }
          ],
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
            status: 'active'
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
            status: 'active'
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
            status: 'active'
          }
        ];

        setPipelines([mockPipeline]);
        setSelectedPipeline(mockPipeline);
        setLeads(mockLeads);
        setLoading(false);
        console.log('✅ [PIPELINE] Dados mock carregados para Super Admin');
        return;
      }
      
      // CARREGAR APENAS PIPELINES VINCULADAS (user_pipeline_links)
      const { data: userLinks, error: linkError } = await supabase
        .from('user_pipeline_links')
        .select(`
          id,
          pipeline_id,
          created_at,
          pipelines (
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
        .eq('user_id', user?.id);

      // Log apenas se houver erro ou resultado vazio
      if (linkError || !userLinks || userLinks.length === 0) {
        console.log('📊 [PIPELINE] Query resultado:', { error: linkError, count: userLinks?.length || 0 });
      }

      if (linkError) {
        console.error('❌ [PIPELINE] Erro ao carregar pipelines vinculadas:', linkError.message);
        
        // FALLBACK: Tentar carregar dados de forma separada
        if (linkError.code === 'PGRST200' || linkError.message?.includes('foreign key')) {
          console.log('🔄 [PIPELINE] Usando fallback...');
          
          try {
            // 1. Primeiro buscar apenas os vínculos
            const { data: links, error: linksError } = await supabase
              .from('user_pipeline_links')
              .select('pipeline_id')
              .eq('user_id', user?.id);

            if (linksError || !links || links.length === 0) {
              setPipelines([]);
              setSelectedPipeline(null);
              setLoading(false);
              return;
            }

            const pipelineIds = links.map(link => link.pipeline_id);

            // 2. Buscar pipelines básicas
            const { data: pipelinesData, error: pipelinesError } = await supabase
              .from('pipelines')
              .select('*')
              .in('id', pipelineIds);

            if (pipelinesError || !pipelinesData) {
              setPipelines([]);
              setSelectedPipeline(null);
              setLoading(false);
              return;
            }

            // 3. Buscar stages para cada pipeline
            const { data: stagesData } = await supabase
              .from('pipeline_stages')
              .select('*')
              .in('pipeline_id', pipelineIds)
              .order('order_index', { ascending: true });

            // 4. Buscar custom fields para cada pipeline
            const { data: fieldsData } = await supabase
              .from('pipeline_custom_fields')
              .select('*')
              .in('pipeline_id', pipelineIds)
              .order('field_order', { ascending: true });

            // 5. Buscar members para cada pipeline
            const { data: membersData } = await supabase
              .from('pipeline_members')
              .select('*')
              .in('pipeline_id', pipelineIds);

            // 6. Montar os dados completos
            const completePipelines = pipelinesData.map(pipeline => ({
              ...pipeline,
              pipeline_stages: (stagesData || []).filter(stage => stage.pipeline_id === pipeline.id),
              pipeline_custom_fields: (fieldsData || []).filter(field => field.pipeline_id === pipeline.id),
              pipeline_members: (membersData || []).filter(member => member.pipeline_id === pipeline.id)
            }));

            console.log('✅ [PIPELINE] Carregadas via fallback:', completePipelines.length, 'pipelines');

            if (completePipelines.length > 0) {
              setPipelines(completePipelines);
              setSelectedPipeline(completePipelines[0]);
              setLoading(false);
              return;
            }

          } catch (fallbackError) {
            console.error('💥 [PIPELINE] Erro no fallback:', fallbackError);
          }
        }
        
        // Para erros, deixar vazio
        setPipelines([]);
        setSelectedPipeline(null);
        setLoading(false);
        return;
      }

      // Extrair as pipelines dos links
      const linkedPipelines = (userLinks || []).map((link: any) => link.pipelines);
      
      // Log apenas resultado final
      if (linkedPipelines && linkedPipelines.length > 0) {
        console.log('✅ [PIPELINE] Carregadas:', linkedPipelines.length, 'pipelines vinculadas');
      }
      
      // SE HOUVER PIPELINES VINCULADAS: usar apenas elas
      if (linkedPipelines && linkedPipelines.length > 0) {
        // Organizar etapas por order_index
        const pipelinesWithSortedStages = linkedPipelines.map(pipeline => ({
          ...pipeline,
          pipeline_stages: (pipeline.pipeline_stages || []).sort((a, b) => a.order_index - b.order_index),
          pipeline_custom_fields: (pipeline.pipeline_custom_fields || []).sort((a, b) => a.field_order - b.field_order)
        }));

        setPipelines(pipelinesWithSortedStages);
        
        // Selecionar primeira pipeline vinculada
        if (pipelinesWithSortedStages.length > 0) {
          setSelectedPipeline(pipelinesWithSortedStages[0]);
        }
        
        setLoading(false);
        return;
      }

      // SE NÃO HOUVER PIPELINES VINCULADAS: deixar vazio (SEM MOCK)
      console.log('ℹ️ [PIPELINE] Nenhuma pipeline vinculada encontrada');
      
      setPipelines([]);
      setSelectedPipeline(null);
      setLoading(false);
      
    } catch (error) {
      console.error('💥 [PIPELINE] Erro inesperado:', error.message || error);
      // Em caso de erro, deixar vazio
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

  return {
    pipelines,
    selectedPipeline,
    setSelectedPipeline,
    loading,
    leads,
    setLeads,
    handleCreateLead,
    updateLeadStage,
    updateLeadData
  };
};
