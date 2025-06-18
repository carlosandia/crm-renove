import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, Users, Target, Layers, Award, AlertTriangle, Edit, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
// import { usePipelines } from '../../hooks/usePipelines';
// import { useMembers } from '../../hooks/useMembers';
import PipelineList from './PipelineList';

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  required: boolean;
  options?: string[];
}

interface KanbanStage {
  id: string;
  name: string;
  order: number;
  color: string;
  type: 'active' | 'win' | 'loss';
}

interface WinLossReason {
  id: string;
  name: string;
  type: 'win' | 'loss';
}

interface RealVendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role: string;
}

interface RealPipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  pipeline_members?: any[];
  stages?: KanbanStage[];
  leads_count?: number;
}

const PipelineModule: React.FC = () => {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<any>(null);
  const [realVendedores, setRealVendedores] = useState<RealVendedor[]>([]);
  const [realPipelines, setRealPipelines] = useState<RealPipeline[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [loadingPipelines, setLoadingPipelines] = useState(true);

  // Estados do formulário de edição
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    member_ids: [] as string[],
    custom_fields: [] as CustomField[],
    stages: [] as KanbanStage[],
    win_reasons: [] as WinLossReason[],
    loss_reasons: [] as WinLossReason[]
  });

  // Buscar vendedores reais do banco de dados
  useEffect(() => {
    const fetchRealVendedores = async () => {
      if (!user?.tenant_id) return;

      try {
        setLoadingVendedores(true);
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, is_active, role')
          .eq('role', 'member')
          .eq('tenant_id', user.tenant_id)
          .order('first_name', { ascending: true });

        if (error) {
          console.error('Erro ao buscar vendedores:', error);
          setRealVendedores(mockMembers);
        } else {
          console.log('Vendedores carregados do banco:', data);
          setRealVendedores(data || []);
        }
      } catch (err) {
        console.error('Erro inesperado ao buscar vendedores:', err);
        setRealVendedores(mockMembers);
      } finally {
        setLoadingVendedores(false);
      }
    };

    fetchRealVendedores();
  }, [user?.tenant_id]);

  // Buscar pipelines reais do banco de dados
  useEffect(() => {
    const fetchRealPipelines = async () => {
      if (!user?.tenant_id) return;

      try {
        setLoadingPipelines(true);
        
        // Buscar pipelines primeiro
        const { data: pipelinesData, error: pipelinesError } = await supabase
          .from('pipelines')
          .select('*')
          .eq('tenant_id', user.tenant_id)
          .order('created_at', { ascending: false });

        if (pipelinesError) {
          console.error('Erro ao buscar pipelines:', pipelinesError);
          setRealPipelines(mockPipelines);
        } else {
          // Para cada pipeline, buscar membros, leads e dados salvos
          const pipelinesWithDetails = await Promise.all(
            (pipelinesData || []).map(async (pipeline) => {
              // Buscar membros da pipeline
              const { data: pipelineMembers } = await supabase
                .from('pipeline_members')
                .select('id, member_id, assigned_at')
                .eq('pipeline_id', pipeline.id);

              // Para cada membro, buscar dados do usuário
              const membersWithUserData = await Promise.all(
                (pipelineMembers || []).map(async (pm) => {
                  const { data: userData } = await supabase
                    .from('users')
                    .select('id, first_name, last_name, email')
                    .eq('id', pm.member_id)
                    .single();

                  return {
                    ...pm,
                    users: userData,
                    member: userData
                  };
                })
              );

              // Buscar contagem de leads
              const { count } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('pipeline_id', pipeline.id);

              // Buscar campos customizados salvos
              const { data: customFields } = await supabase
                .from('pipeline_custom_fields')
                .select('*')
                .eq('pipeline_id', pipeline.id)
                .order('field_order');

              // Buscar etapas salvas
              const { data: stages } = await supabase
                .from('pipeline_stages')
                .select('*')
                .eq('pipeline_id', pipeline.id)
                .order('order_index');

              // Buscar motivos de ganho/perda salvos
              const { data: winReasons } = await supabase
                .from('pipeline_win_loss_reasons')
                .select('*')
                .eq('pipeline_id', pipeline.id)
                .eq('reason_type', 'win');

              const { data: lossReasons } = await supabase
                .from('pipeline_win_loss_reasons')
                .select('*')
                .eq('pipeline_id', pipeline.id)
                .eq('reason_type', 'loss');

              // Converter dados para formato esperado
              const convertedCustomFields = (customFields || []).map(field => ({
                id: field.id,
                name: field.field_label,
                type: field.field_type as any,
                required: field.is_required,
                options: field.field_options || []
              }));

              const convertedStages = (stages || []).length > 0 
                ? stages?.map(stage => ({
                    id: stage.id,
                    name: stage.name,
                    order: stage.order_index + 1,
                    color: stage.color,
                    type: stage.temperature_score === 100 ? 'win' : stage.temperature_score === 0 ? 'loss' : 'active'
                  }))
                : mockStages;

              const convertedWinReasons = (winReasons || []).map(reason => ({
                id: reason.id,
                name: reason.reason_name,
                type: 'win' as const
              }));

              const convertedLossReasons = (lossReasons || []).map(reason => ({
                id: reason.id,
                name: reason.reason_name,
                type: 'loss' as const
              }));

              return {
                ...pipeline,
                pipeline_members: membersWithUserData,
                leads_count: count || 0,
                stages: convertedStages,
                custom_fields: convertedCustomFields,
                win_reasons: convertedWinReasons.length > 0 ? convertedWinReasons : [
                  { id: '1', name: 'Preço competitivo', type: 'win' },
                  { id: '2', name: 'Qualidade do produto', type: 'win' },
                  { id: '3', name: 'Bom atendimento', type: 'win' }
                ],
                loss_reasons: convertedLossReasons.length > 0 ? convertedLossReasons : [
                  { id: '1', name: 'Preço alto', type: 'loss' },
                  { id: '2', name: 'Concorrência', type: 'loss' },
                  { id: '3', name: 'Não tem orçamento', type: 'loss' }
                ]
              };
            })
          );

          console.log('Pipelines carregadas do banco:', pipelinesWithDetails);
          setRealPipelines(pipelinesWithDetails);
        }
      } catch (err) {
        console.error('Erro inesperado ao buscar pipelines:', err);
        setRealPipelines(mockPipelines);
      } finally {
        setLoadingPipelines(false);
      }
    };

    fetchRealPipelines();
  }, [user?.tenant_id]);

  // Dados mock para fallback
  const mockStages = [
    { id: '1', name: 'Prospecção', order: 1, color: '#3B82F6', type: 'active' as const },
    { id: '2', name: 'Qualificação', order: 2, color: '#8B5CF6', type: 'active' as const },
    { id: '3', name: 'Proposta', order: 3, color: '#F59E0B', type: 'active' as const },
    { id: '4', name: 'Fechamento', order: 4, color: '#10B981', type: 'win' as const },
    { id: '5', name: 'Perdido', order: 5, color: '#EF4444', type: 'loss' as const }
  ];

  const mockPipelines: RealPipeline[] = [
    {
      id: '1',
      name: 'Pipeline Vendas B2B',
      description: 'Pipeline principal para vendas B2B',
      tenant_id: user?.tenant_id || 'demo-tenant',
      created_by: user?.id || user?.email || 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      pipeline_members: [],
      leads_count: 24,
      stages: mockStages
    },
    {
      id: '2',
      name: 'Pipeline Leads Qualificados',
      description: 'Pipeline para leads já qualificados',
      tenant_id: user?.tenant_id || 'demo-tenant',
      created_by: user?.id || user?.email || 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      pipeline_members: [],
      leads_count: 18,
      stages: mockStages
    },
    {
      id: '3',
      name: 'Pipeline E-commerce',
      description: 'Pipeline para vendas online',
      tenant_id: user?.tenant_id || 'demo-tenant',
      created_by: user?.id || user?.email || 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      pipeline_members: [],
      leads_count: 42,
      stages: mockStages
    }
  ];

  const mockMembers = [
    {
      id: '1',
      first_name: 'João',
      last_name: 'Silva',
      email: 'joao@empresa.com',
      role: 'member',
      is_active: true
    },
    {
      id: '2',
      first_name: 'Maria',
      last_name: 'Santos',
      email: 'maria@empresa.com',
      role: 'admin',
      is_active: true
    },
    {
      id: '3',
      first_name: 'Pedro',
      last_name: 'Costa',
      email: 'pedro@empresa.com',
      role: 'member',
      is_active: true
    },
    {
      id: '4',
      first_name: 'Ana',
      last_name: 'Oliveira',
      email: 'ana@empresa.com',
      role: 'member',
      is_active: false
    }
  ];

  // Estados do formulário expandido
  const [pipelineForm, setPipelineForm] = useState({
    name: '',
    description: '',
    member_ids: [] as string[],
    custom_fields: [] as CustomField[],
    stages: [
      { id: '1', name: 'Prospecção', order: 1, color: '#3B82F6', type: 'active' as const },
      { id: '2', name: 'Qualificação', order: 2, color: '#8B5CF6', type: 'active' as const },
      { id: '3', name: 'Proposta', order: 3, color: '#F59E0B', type: 'active' as const },
      { id: '4', name: 'Fechamento', order: 4, color: '#10B981', type: 'win' as const },
      { id: '5', name: 'Perdido', order: 5, color: '#EF4444', type: 'loss' as const }
    ] as KanbanStage[],
    win_reasons: [
      { id: '1', name: 'Preço competitivo', type: 'win' as const },
      { id: '2', name: 'Qualidade do produto', type: 'win' as const },
      { id: '3', name: 'Bom atendimento', type: 'win' as const }
    ] as WinLossReason[],
    loss_reasons: [
      { id: '1', name: 'Preço alto', type: 'loss' as const },
      { id: '2', name: 'Concorrência', type: 'loss' as const },
      { id: '3', name: 'Não tem orçamento', type: 'loss' as const }
    ] as WinLossReason[]
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'members' | 'fields' | 'stages' | 'reasons'>('basic');

  // Usar vendedores e pipelines reais se disponíveis, senão usar mock
  const vendedoresParaUsar = realVendedores.length > 0 ? realVendedores : mockMembers;
  const pipelinesParaUsar = realPipelines.length > 0 ? realPipelines : mockPipelines;
  
  // Filtrar apenas vendedores ativos
  const activeMembers = vendedoresParaUsar.filter(member => member.is_active);

  // Calcular métricas
  const totalPipelines = pipelinesParaUsar.filter(p => p.is_active).length;
  const totalLeads = pipelinesParaUsar.reduce((sum, pipeline) => sum + (pipeline.leads_count || 0), 0);
  const totalMembers = activeMembers.length;

  // Função para recarregar pipelines
  const reloadPipelines = async () => {
    if (!user?.tenant_id) return;

    try {
      // Buscar pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (!pipelinesError && pipelinesData) {
        // Para cada pipeline, buscar membros, leads e dados salvos
        const pipelinesWithDetails = await Promise.all(
          pipelinesData.map(async (pipeline) => {
            // Buscar membros da pipeline
            const { data: pipelineMembers } = await supabase
              .from('pipeline_members')
              .select('id, member_id, assigned_at')
              .eq('pipeline_id', pipeline.id);

            // Para cada membro, buscar dados do usuário
            const membersWithUserData = await Promise.all(
              (pipelineMembers || []).map(async (pm) => {
                const { data: userData } = await supabase
                  .from('users')
                  .select('id, first_name, last_name, email')
                  .eq('id', pm.member_id)
                  .single();

                return {
                  ...pm,
                  users: userData,
                  member: userData
                };
              })
            );

            // Buscar contagem de leads
            const { count } = await supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('pipeline_id', pipeline.id);

            // Buscar campos customizados salvos
            const { data: customFields } = await supabase
              .from('pipeline_custom_fields')
              .select('*')
              .eq('pipeline_id', pipeline.id)
              .order('field_order');

            // Buscar etapas salvas
            const { data: stages } = await supabase
              .from('pipeline_stages')
              .select('*')
              .eq('pipeline_id', pipeline.id)
              .order('order_index');

            // Buscar motivos de ganho/perda salvos
            const { data: winReasons } = await supabase
              .from('pipeline_win_loss_reasons')
              .select('*')
              .eq('pipeline_id', pipeline.id)
              .eq('reason_type', 'win');

            const { data: lossReasons } = await supabase
              .from('pipeline_win_loss_reasons')
              .select('*')
              .eq('pipeline_id', pipeline.id)
              .eq('reason_type', 'loss');

            // Converter dados para formato esperado
            const convertedCustomFields = (customFields || []).map(field => ({
              id: field.id,
              name: field.field_label,
              type: field.field_type as any,
              required: field.is_required,
              options: field.field_options || []
            }));

            const convertedStages = (stages || []).length > 0 
              ? stages?.map(stage => ({
                  id: stage.id,
                  name: stage.name,
                  order: stage.order_index + 1,
                  color: stage.color,
                  type: stage.temperature_score === 100 ? 'win' : stage.temperature_score === 0 ? 'loss' : 'active'
                }))
              : mockStages;

            const convertedWinReasons = (winReasons || []).map(reason => ({
              id: reason.id,
              name: reason.reason_name,
              type: 'win' as const
            }));

            const convertedLossReasons = (lossReasons || []).map(reason => ({
              id: reason.id,
              name: reason.reason_name,
              type: 'loss' as const
            }));

            return {
              ...pipeline,
              pipeline_members: membersWithUserData,
              leads_count: count || 0,
              stages: convertedStages,
              custom_fields: convertedCustomFields,
              win_reasons: convertedWinReasons.length > 0 ? convertedWinReasons : [
                { id: '1', name: 'Preço competitivo', type: 'win' },
                { id: '2', name: 'Qualidade do produto', type: 'win' },
                { id: '3', name: 'Bom atendimento', type: 'win' }
              ],
              loss_reasons: convertedLossReasons.length > 0 ? convertedLossReasons : [
                { id: '1', name: 'Preço alto', type: 'loss' },
                { id: '2', name: 'Concorrência', type: 'loss' },
                { id: '3', name: 'Não tem orçamento', type: 'loss' }
              ]
            };
          })
        );
        setRealPipelines(pipelinesWithDetails);
      }
    } catch (error) {
      console.error('Erro ao recarregar pipelines:', error);
    }
  };

  // Função real para criar pipeline
  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pipelineForm.name.trim()) {
      alert('Nome da pipeline é obrigatório');
      return;
    }

    try {
      console.log('🚀 Criando pipeline completa:', pipelineForm);

      // 1. Criar pipeline no banco
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert([
          {
            name: pipelineForm.name,
            description: pipelineForm.description,
            tenant_id: user?.tenant_id,
            created_by: user?.email // Sempre usar email para consistência
          }
        ])
        .select()
        .single();

      if (pipelineError) {
        throw pipelineError;
      }

      console.log('✅ Pipeline criada:', pipelineData.id);

      // 2. Criar etapas (incluindo fixas + customizadas)
      const allStages = [];
      
      // Etapa fixa: Novo lead (sempre primeira)
      allStages.push({
        pipeline_id: pipelineData.id,
        name: 'Novo lead',
        order_index: 0,
        temperature_score: 10,
        max_days_allowed: 7,
        color: '#3B82F6'
      });

      // Etapas customizadas
      pipelineForm.stages.forEach((stage, index) => {
        if (stage.name.trim()) {
          allStages.push({
            pipeline_id: pipelineData.id,
            name: stage.name,
            order_index: index + 1,
            temperature_score: 50,
            max_days_allowed: 7,
            color: stage.color
          });
        }
      });

      // Etapas fixas finais: Ganho e Perdido
      const nextIndex = pipelineForm.stages.length + 1;
      allStages.push({
        pipeline_id: pipelineData.id,
        name: 'Ganho',
        order_index: nextIndex,
        temperature_score: 100,
        max_days_allowed: 0,
        color: '#22C55E'
      });

      allStages.push({
        pipeline_id: pipelineData.id,
        name: 'Perdido',
        order_index: nextIndex + 1,
        temperature_score: 0,
        max_days_allowed: 0,
        color: '#EF4444'
      });

      console.log('📝 Criando etapas:', allStages.map(s => `${s.order_index}: ${s.name}`));

      if (allStages.length > 0) {
        const { error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(allStages);

        if (stagesError) {
          console.error('❌ Erro ao criar etapas:', stagesError);
          throw stagesError;
        }
        console.log('✅ Etapas criadas com sucesso');
      }

      // 3. Criar campos customizados
      const allFields: any[] = [];

      // Campos obrigatórios (sempre presentes)
      const requiredFields = [
        { field_name: 'nome', field_label: 'Nome', field_type: 'text', is_required: true, field_order: 1, placeholder: 'Digite o nome completo' },
        { field_name: 'email', field_label: 'Email', field_type: 'email', is_required: true, field_order: 2, placeholder: 'exemplo@email.com' },
        { field_name: 'telefone', field_label: 'Telefone', field_type: 'phone', is_required: true, field_order: 3, placeholder: '(11) 99999-9999' },
        { field_name: 'valor', field_label: 'Valor', field_type: 'number', is_required: true, field_order: 4, placeholder: '0.00' }
      ];

      requiredFields.forEach(field => {
        allFields.push({
          pipeline_id: pipelineData.id,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: null,
          is_required: field.is_required,
          field_order: field.field_order,
          placeholder: field.placeholder,
          show_in_card: true
        });
      });

      // Campos customizados adicionais
      pipelineForm.custom_fields.forEach((field, index) => {
        if (field.name.trim()) {
          // Verificar se não é um campo obrigatório duplicado
          const isRequiredField = requiredFields.some(rf => rf.field_name === field.name.toLowerCase());
          if (!isRequiredField) {
            allFields.push({
              pipeline_id: pipelineData.id,
              field_name: field.name.toLowerCase().replace(/\s+/g, '_'),
              field_label: field.name,
              field_type: field.type,
              field_options: field.options || null,
              is_required: field.required,
              field_order: index + 5, // Começar depois dos campos obrigatórios
              placeholder: `Digite ${field.name.toLowerCase()}`,
              show_in_card: true
            });
          }
        }
      });

      console.log('📋 Criando campos:', allFields.map(f => `${f.field_order}: ${f.field_label}`));

      if (allFields.length > 0) {
        const { error: fieldsError } = await supabase
          .from('pipeline_custom_fields')
          .insert(allFields);

        if (fieldsError) {
          console.error('❌ Erro ao criar campos:', fieldsError);
          throw fieldsError;
        }
        console.log('✅ Campos criados com sucesso');
      }

      // 4. Adicionar membros à pipeline se selecionados
      if (pipelineForm.member_ids.length > 0) {
        const membersToAdd = pipelineForm.member_ids.map(memberId => ({
          pipeline_id: pipelineData.id,
          member_id: memberId
        }));

        const { error: membersError } = await supabase
          .from('pipeline_members')
          .insert(membersToAdd);

        if (membersError) {
          console.error('❌ Erro ao adicionar membros:', membersError);
        } else {
          console.log('✅ Membros adicionados com sucesso');
        }
      }

      alert(`✅ Pipeline "${pipelineForm.name}" criada com sucesso!

📊 Resumo:
• ${allStages.length} etapas criadas
• ${allFields.length} campos configurados
• ${pipelineForm.member_ids.length} vendedores vinculados

🎯 A pipeline está pronta para uso!`);

      setShowCreateForm(false);
      setPipelineForm({
        name: '',
        description: '',
        member_ids: [],
        custom_fields: [],
        stages: [],
        win_reasons: [
          { id: '1', name: 'Preço competitivo', type: 'win' },
          { id: '2', name: 'Qualidade do produto', type: 'win' },
          { id: '3', name: 'Bom atendimento', type: 'win' }
        ],
        loss_reasons: [
          { id: '1', name: 'Preço alto', type: 'loss' },
          { id: '2', name: 'Concorrência', type: 'loss' },
          { id: '3', name: 'Não tem orçamento', type: 'loss' }
        ]
      });
      
      // Recarregar pipelines
      await reloadPipelines();
      
    } catch (error: any) {
      console.error('💥 Erro ao criar pipeline:', error);
      alert(`❌ Erro ao criar pipeline: ${error.message}`);
    }
  };

  // Função real para desativar pipeline
  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm('Tem certeza que deseja desativar esta pipeline?')) return;

    try {
      // Tentar usar is_active se existir, senão deletar a pipeline
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', pipelineId);

      if (error) {
        throw error;
      }

      alert('✅ Pipeline removida com sucesso!');
      await reloadPipelines();
    } catch (error: any) {
      console.error('Erro ao remover pipeline:', error);
      alert(`❌ Erro ao remover pipeline: ${error.message}`);
    }
  };

  // Função para abrir modal de edição
  const handleEditPipeline = (pipelineId: string) => {
    const pipeline = pipelinesParaUsar.find(p => p.id === pipelineId);
    if (pipeline) {
      setEditingPipeline(pipeline);
      
      // Inicializar form de edição com dados da pipeline
      setEditForm({
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: pipeline.pipeline_members?.map((pm: any) => pm.member_id || pm.id) || [],
        custom_fields: (pipeline as any).custom_fields || [],
        stages: (pipeline as any).stages || mockStages,
        win_reasons: (pipeline as any).win_reasons || [
          { id: '1', name: 'Preço competitivo', type: 'win' },
          { id: '2', name: 'Qualidade do produto', type: 'win' },
          { id: '3', name: 'Bom atendimento', type: 'win' }
        ],
        loss_reasons: (pipeline as any).loss_reasons || [
          { id: '1', name: 'Preço alto', type: 'loss' },
          { id: '2', name: 'Concorrência', type: 'loss' },
          { id: '3', name: 'Não tem orçamento', type: 'loss' }
        ]
      });
      
      setShowEditModal(true);
    }
  };

  // Função para salvar edições da pipeline
  const handleSaveEditPipeline = async () => {
    if (!editingPipeline || !editForm.name.trim()) {
      alert('Nome da pipeline é obrigatório');
      return;
    }

    try {
      console.log('Salvando edições da pipeline:', editForm);

      // 1. Atualizar dados básicos da pipeline
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({
          name: editForm.name,
          description: editForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPipeline.id);

      if (updateError) {
        throw updateError;
      }

      // 2. Atualizar membros da pipeline
      // Primeiro remover todos os membros existentes
      const { error: deleteError } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', editingPipeline.id);

      if (deleteError) {
        console.error('Erro ao remover membros antigos:', deleteError);
      }

      // Adicionar novos membros
      if (editForm.member_ids.length > 0) {
        const membersToAdd = editForm.member_ids.map(memberId => ({
          pipeline_id: editingPipeline.id,
          member_id: memberId
        }));

        const { error: membersError } = await supabase
          .from('pipeline_members')
          .insert(membersToAdd);

        if (membersError) {
          console.error('Erro ao adicionar novos membros:', membersError);
        }
      }

      // 3. Salvar campos customizados
      if (editForm.custom_fields.length > 0) {
        // Primeiro remover campos existentes
        await supabase
          .from('pipeline_custom_fields')
          .delete()
          .eq('pipeline_id', editingPipeline.id);

        // Inserir novos campos
        const fieldsToInsert = editForm.custom_fields
          .filter(field => field.name.trim()) // Só salvar campos com nome
          .map((field, index) => ({
            pipeline_id: editingPipeline.id,
            field_name: field.name.toLowerCase().replace(/\s+/g, '_'),
            field_label: field.name,
            field_type: field.type,
            field_options: field.options || [],
            is_required: field.required,
            field_order: index + 1,
            placeholder: `Digite ${field.name.toLowerCase()}`
          }));

        if (fieldsToInsert.length > 0) {
          const { error: fieldsError } = await supabase
            .from('pipeline_custom_fields')
            .insert(fieldsToInsert);

          if (fieldsError) {
            console.error('Erro ao salvar campos customizados:', fieldsError);
          }
        }
      }

      // 4. Salvar etapas
      if (editForm.stages.length > 0) {
        // Primeiro remover etapas existentes
        await supabase
          .from('pipeline_stages')
          .delete()
          .eq('pipeline_id', editingPipeline.id);

        // Inserir novas etapas
        const stagesToInsert = editForm.stages
          .filter(stage => stage.name.trim()) // Só salvar etapas com nome
          .map((stage, index) => ({
            pipeline_id: editingPipeline.id,
            name: stage.name,
            order_index: index,
            color: stage.color,
            temperature_score: stage.type === 'win' ? 100 : stage.type === 'loss' ? 0 : 50,
            max_days_allowed: 7
          }));

        if (stagesToInsert.length > 0) {
          const { error: stagesError } = await supabase
            .from('pipeline_stages')
            .insert(stagesToInsert);

          if (stagesError) {
            console.error('Erro ao salvar etapas:', stagesError);
          }
        }
      }

      // 5. Salvar motivos de ganho/perda
      console.log('💾 Salvando motivos - Win:', editForm.win_reasons, 'Loss:', editForm.loss_reasons);

      // Verificar se a tabela existe primeiro
      try {
        const { data: testData, error: testError } = await supabase
          .from('pipeline_win_loss_reasons')
          .select('id')
          .limit(1);
        
        if (testError && testError.code === '42P01') {
          throw new Error('❌ TABELA NÃO EXISTE: A tabela "pipeline_win_loss_reasons" não foi criada no banco de dados. Por favor, execute o script SQL no Supabase SQL Editor:\n\nCREATE TABLE pipeline_win_loss_reasons (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,\n  reason_name VARCHAR(255) NOT NULL,\n  reason_type VARCHAR(10) NOT NULL CHECK (reason_type IN (\'win\', \'loss\')),\n  is_active BOOLEAN DEFAULT true,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);\n\nALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "pipeline_win_loss_reasons_all_access" ON pipeline_win_loss_reasons FOR ALL USING (true) WITH CHECK (true);');
        }
      } catch (error: any) {
        console.error('❌ Erro ao verificar tabela pipeline_win_loss_reasons:', error);
        throw error;
      }

      // Salvar motivos de ganho
      if (editForm.win_reasons.length > 0) {
        const winReasons = editForm.win_reasons
          .filter(reason => reason.name.trim())
          .map(reason => ({
            pipeline_id: editingPipeline.id,
            reason_name: reason.name,
            reason_type: 'win',
            is_active: true
          }));

        console.log('💾 Motivos de ganho para salvar:', winReasons);

        if (winReasons.length > 0) {
          // Remover motivos de ganho existentes
          const { error: deleteWinError } = await supabase
            .from('pipeline_win_loss_reasons')
            .delete()
            .eq('pipeline_id', editingPipeline.id)
            .eq('reason_type', 'win');

          if (deleteWinError) {
            console.error('❌ Erro ao deletar motivos de ganho existentes:', deleteWinError);
          }

          // Inserir novos motivos
          const { data: insertedWinReasons, error: insertWinError } = await supabase
            .from('pipeline_win_loss_reasons')
            .insert(winReasons)
            .select();

          if (insertWinError) {
            console.error('❌ Erro ao inserir motivos de ganho:', insertWinError);
            throw new Error(`Erro ao salvar motivos de ganho: ${insertWinError.message}`);
          } else {
            console.log('✅ Motivos de ganho salvos:', insertedWinReasons);
          }
        }
      }

      // Salvar motivos de perda
      if (editForm.loss_reasons.length > 0) {
        const lossReasons = editForm.loss_reasons
          .filter(reason => reason.name.trim())
          .map(reason => ({
            pipeline_id: editingPipeline.id,
            reason_name: reason.name,
            reason_type: 'loss',
            is_active: true
          }));

        console.log('💾 Motivos de perda para salvar:', lossReasons);

        if (lossReasons.length > 0) {
          // Remover motivos de perda existentes
          const { error: deleteLossError } = await supabase
            .from('pipeline_win_loss_reasons')
            .delete()
            .eq('pipeline_id', editingPipeline.id)
            .eq('reason_type', 'loss');

          if (deleteLossError) {
            console.error('❌ Erro ao deletar motivos de perda existentes:', deleteLossError);
          }

          // Inserir novos motivos
          const { data: insertedLossReasons, error: insertLossError } = await supabase
            .from('pipeline_win_loss_reasons')
            .insert(lossReasons)
            .select();

          if (insertLossError) {
            console.error('❌ Erro ao inserir motivos de perda:', insertLossError);
            throw new Error(`Erro ao salvar motivos de perda: ${insertLossError.message}`);
          } else {
            console.log('✅ Motivos de perda salvos:', insertedLossReasons);
          }
        }
      }

      alert('✅ Pipeline atualizada com sucesso! Todos os dados foram salvos.');
      setShowEditModal(false);
      setEditingPipeline(null);
      await reloadPipelines();
      
    } catch (error: any) {
      console.error('Erro ao salvar pipeline:', error);
      alert(`❌ Erro ao salvar pipeline: ${error.message}`);
    }
  };

  // Funções para gerenciar campos customizados na edição
  const addCustomFieldEdit = () => {
    const newField: CustomField = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: false,
      options: []
    };
    setEditForm(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, newField]
    }));
  };

  const updateCustomFieldEdit = (fieldId: string, updates: Partial<CustomField>) => {
    setEditForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeCustomFieldEdit = (fieldId: string) => {
    setEditForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter(field => field.id !== fieldId)
    }));
  };

  // Funções para gerenciar etapas na edição
  const addStageEdit = () => {
    const newStage: KanbanStage = {
      id: Date.now().toString(),
      name: '',
      order: editForm.stages.length + 1,
      color: '#3B82F6',
      type: 'active'
    };
    setEditForm(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
  };

  const updateStageEdit = (stageId: string, updates: Partial<KanbanStage>) => {
    setEditForm(prev => ({
      ...prev,
      stages: prev.stages?.map(stage =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      )
    }));
  };

  const removeStageEdit = (stageId: string) => {
    setEditForm(prev => ({
      ...prev,
      stages: prev.stages.filter(stage => stage.id !== stageId)
        .map((stage, index) => ({ ...stage, order: index + 1 }))
    }));
  };

  // Funções para gerenciar motivos de ganho na edição
  const addWinReasonEdit = () => {
    const newReason: WinLossReason = {
      id: Date.now().toString(),
      name: '',
      type: 'win'
    };
    setEditForm(prev => ({
      ...prev,
      win_reasons: [...prev.win_reasons, newReason]
    }));
  };

  const updateWinReasonEdit = (reasonId: string, name: string) => {
    setEditForm(prev => ({
      ...prev,
      win_reasons: prev.win_reasons.map(reason =>
        reason.id === reasonId ? { ...reason, name } : reason
      )
    }));
  };

  const removeWinReasonEdit = (reasonId: string) => {
    setEditForm(prev => ({
      ...prev,
      win_reasons: prev.win_reasons.filter(reason => reason.id !== reasonId)
    }));
  };

  // Funções para gerenciar motivos de perda na edição
  const addLossReasonEdit = () => {
    const newReason: WinLossReason = {
      id: Date.now().toString(),
      name: '',
      type: 'loss'
    };
    setEditForm(prev => ({
      ...prev,
      loss_reasons: [...prev.loss_reasons, newReason]
    }));
  };

  const updateLossReasonEdit = (reasonId: string, name: string) => {
    setEditForm(prev => ({
      ...prev,
      loss_reasons: prev.loss_reasons.map(reason =>
        reason.id === reasonId ? { ...reason, name } : reason
      )
    }));
  };

  const removeLossReasonEdit = (reasonId: string) => {
    setEditForm(prev => ({
      ...prev,
      loss_reasons: prev.loss_reasons.filter(reason => reason.id !== reasonId)
    }));
  };

  // Função para atualizar membro na edição
  const toggleMemberEdit = (memberId: string) => {
    setEditForm(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  // Funções para campos customizados na criação
  const addCustomField = () => {
    const newField: CustomField = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      required: false,
      options: []
    };
    setPipelineForm(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, newField]
    }));
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    setPipelineForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeCustomField = (fieldId: string) => {
    setPipelineForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter(field => field.id !== fieldId)
    }));
  };

  // Funções para etapas na criação
  const addStage = () => {
    const newStage: KanbanStage = {
      id: Date.now().toString(),
      name: '',
      order: pipelineForm.stages.length + 1,
      color: '#3B82F6',
      type: 'active'
    };
    setPipelineForm(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
  };

  const updateStage = (stageId: string, updates: Partial<KanbanStage>) => {
    setPipelineForm(prev => ({
      ...prev,
      stages: prev.stages?.map(stage =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      )
    }));
  };

  const removeStage = (stageId: string) => {
    setPipelineForm(prev => ({
      ...prev,
      stages: prev.stages.filter(stage => stage.id !== stageId)
        .map((stage, index) => ({ ...stage, order: index + 1 }))
    }));
  };

  // Funções para motivos de ganho na criação
  const addWinReason = () => {
    const newReason: WinLossReason = {
      id: Date.now().toString(),
      name: '',
      type: 'win'
    };
    setPipelineForm(prev => ({
      ...prev,
      win_reasons: [...prev.win_reasons, newReason]
    }));
  };

  const updateWinReason = (reasonId: string, name: string) => {
    setPipelineForm(prev => ({
      ...prev,
      win_reasons: prev.win_reasons.map(reason =>
        reason.id === reasonId ? { ...reason, name } : reason
      )
    }));
  };

  const removeWinReason = (reasonId: string) => {
    setPipelineForm(prev => ({
      ...prev,
      win_reasons: prev.win_reasons.filter(reason => reason.id !== reasonId)
    }));
  };

  // Funções para motivos de perda na criação
  const addLossReason = () => {
    const newReason: WinLossReason = {
      id: Date.now().toString(),
      name: '',
      type: 'loss'
    };
    setPipelineForm(prev => ({
      ...prev,
      loss_reasons: [...prev.loss_reasons, newReason]
    }));
  };

  const updateLossReason = (reasonId: string, name: string) => {
    setPipelineForm(prev => ({
      ...prev,
      loss_reasons: prev.loss_reasons.map(reason =>
        reason.id === reasonId ? { ...reason, name } : reason
      )
    }));
  };

  const removeLossReason = (reasonId: string) => {
    setPipelineForm({
      ...pipelineForm,
      loss_reasons: pipelineForm.loss_reasons.filter(reason => reason.id !== reasonId)
    });
  };

  // Implementar funções para adicionar e remover membros das pipelines
  const handleAddMember = async (pipelineId: string, memberId: string) => {
    if (!user?.tenant_id) {
      alert('❌ Erro: Tenant não identificado');
      return;
    }

    try {
      console.log('🔗 Adicionando membro à pipeline:', { pipelineId, memberId });

      // Buscar dados do membro para exibir nome
      const memberData = vendedoresParaUsar.find(m => m.id === memberId);
      const memberName = memberData ? `${memberData.first_name} ${memberData.last_name}` : 'Vendedor';

      // Verificar se o membro já está vinculado
      const { data: existingMembership, error: checkError } = await supabase
        .from('pipeline_members')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .eq('member_id', memberId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingMembership) {
        alert(`⚠️ ${memberName} já está vinculado a esta pipeline`);
        return;
      }

      // Buscar email do membro para garantir compatibilidade
      const { data: memberUser, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', memberId)
        .single();

      if (userError || !memberUser) {
        throw new Error('Usuário não encontrado');
      }

      // Adicionar membro à pipeline usando EMAIL (para compatibilidade com busca)
      const { error: insertError } = await supabase
        .from('pipeline_members')
        .insert([{
          pipeline_id: pipelineId,
          member_id: memberUser.email, // ✅ USAR EMAIL em vez de ID
          assigned_at: new Date().toISOString()
        }]);

      console.log('🔗 Vinculação criada:', {
        pipeline_id: pipelineId,
        member_id: memberUser.email,
        member_name: memberName
      });

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Membro adicionado com sucesso');
      
      // Mostrar feedback positivo com nome
      alert(`✅ ${memberName} foi vinculado à pipeline com sucesso!`);
      
      // Recarregar as pipelines para atualizar a interface
      await reloadPipelines();

    } catch (error: any) {
      console.error('❌ Erro ao adicionar membro:', error);
      alert(`❌ Erro ao vincular vendedor: ${error.message}`);
    }
  };

  const handleRemoveMember = async (pipelineId: string, memberId: string) => {
    if (!user?.tenant_id) {
      alert('❌ Erro: Tenant não identificado');
      return;
    }

    // Buscar dados do membro para exibir nome
    const memberData = vendedoresParaUsar.find(m => m.id === memberId);
    const memberName = memberData ? `${memberData.first_name} ${memberData.last_name}` : 'Vendedor';

    // Confirmar ação com nome do vendedor
    if (!confirm(`Tem certeza que deseja remover ${memberName} desta pipeline?`)) {
      return;
    }

    try {
      console.log('🔓 Removendo membro da pipeline:', { pipelineId, memberId });

      // Remover membro da pipeline
      const { error } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('member_id', memberId);

      if (error) {
        throw error;
      }

      console.log('✅ Membro removido com sucesso');
      
      // Mostrar feedback positivo com nome
      alert(`✅ ${memberName} foi removido da pipeline com sucesso!`);
      
      // Recarregar as pipelines para atualizar a interface
      await reloadPipelines();

    } catch (error: any) {
      console.error('❌ Erro ao remover membro:', error);
      alert(`❌ Erro ao remover vendedor: ${error.message}`);
    }
  };

  console.log('📊 PipelineModule - Estado atual:', {
    loadingVendedores,
    loadingPipelines,
    vendedoresCount: vendedoresParaUsar.length,
    pipelinesCount: pipelinesParaUsar.length,
    showCreateForm
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Criador de Pipeline</h1>
                <p className="text-sm text-gray-500">Gerencie e crie suas pipelines de vendas</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner de funcionalidades implementadas (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-green-50 border border-green-200 mx-4 mt-4 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div>
              <h4 className="font-semibold text-green-800">Funcionalidades de Vendedores Implementadas!</h4>
              <p className="text-sm text-green-700">
                • Botão ➕ para vincular vendedores às pipelines funcionando
                • Botão ❌ para remover vendedores das pipelines funcionando
                • Feedback visual com nome dos vendedores
                • Validação para evitar duplicatas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showCreateForm ? (
          <PipelineList
            pipelines={pipelinesParaUsar}
            members={vendedoresParaUsar}
            onEdit={handleEditPipeline}
            onDelete={handleDeletePipeline}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onCreateNew={() => setShowCreateForm(true)}
          />
        ) : (
          /* Formulário de Criação Completo */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Criar Nova Pipeline</h2>
                    <p className="text-sm text-gray-600">Configure sua pipeline de vendas completa</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Navegação por abas */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'basic', label: 'Básico', icon: Target },
                  { id: 'members', label: 'Vendedores', icon: Users },
                  { id: 'fields', label: 'Campos', icon: Layers },
                  { id: 'stages', label: 'Etapas', icon: Target },
                  { id: 'reasons', label: 'Motivos', icon: Award }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <form onSubmit={handleCreatePipeline} className="p-6">
              {/* Aba Básico */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Pipeline *
                    </label>
                    <input
                      type="text"
                      value={pipelineForm.name}
                      onChange={(e) => setPipelineForm({...pipelineForm, name: e.target.value})}
                      required
                      placeholder="Ex: Pipeline Vendas B2B"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={pipelineForm.description}
                      onChange={(e) => setPipelineForm({...pipelineForm, description: e.target.value})}
                      placeholder="Descreva o objetivo desta pipeline..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Aba Vendedores */}
              {activeTab === 'members' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Vendedores Ativos
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {activeMembers.map((member) => (
                        <label key={member.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pipelineForm.member_ids.includes(member.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPipelineForm({
                                  ...pipelineForm,
                                  member_ids: [...pipelineForm.member_ids, member.id]
                                });
                              } else {
                                setPipelineForm({
                                  ...pipelineForm,
                                  member_ids: pipelineForm.member_ids.filter(id => id !== member.id)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Aba Campos Customizados */}
              {activeTab === 'fields' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Campos Customizados</h3>
                      <p className="text-sm text-gray-500">Adicione campos personalizados para coletar informações específicas</p>
                    </div>
                    <button
                      type="button"
                      onClick={addCustomField}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Campo</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {pipelineForm.custom_fields.map((field, index) => (
                      <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nome do Campo
                            </label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                              placeholder="Ex: Orçamento, Urgência..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo do Campo
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) => updateCustomField(field.id, { type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="select">Lista de Opções</option>
                              <option value="date">Data</option>
                              <option value="boolean">Sim/Não</option>
                            </select>
                          </div>
                        </div>

                        {field.type === 'select' && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Opções (separadas por vírgula)
                            </label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateCustomField(field.id, { 
                                options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt) 
                              })}
                              placeholder="Ex: Baixa, Média, Alta"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Campo obrigatório</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}

                    {pipelineForm.custom_fields.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum campo customizado adicionado</p>
                        <p className="text-sm">Clique em "Adicionar Campo" para começar</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba Etapas */}
              {activeTab === 'stages' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Etapas do Kanban</h3>
                      <p className="text-sm text-gray-500">Configure as etapas do funil de vendas</p>
                    </div>
                    <button
                      type="button"
                      onClick={addStage}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Etapa</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {pipelineForm.stages?.map((stage, index) => (
                      <div key={stage.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nome da Etapa
                            </label>
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                              placeholder="Ex: Prospecção, Qualificação..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cor
                            </label>
                            <input
                              type="color"
                              value={stage.color}
                              onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                              className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo
                            </label>
                            <select
                              value={stage.type}
                              onChange={(e) => updateStage(stage.id, { type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="active">Ativa</option>
                              <option value="win">Ganho</option>
                              <option value="loss">Perda</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-gray-300"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-sm text-gray-600">Ordem: {stage.order}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStage(stage.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aba Motivos de Ganho/Perda */}
              {activeTab === 'reasons' && (
                <div className="space-y-8">
                  {/* Motivos de Ganho */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                          <Award className="w-5 h-5 text-green-600" />
                          <span>Motivos de Ganho</span>
                        </h3>
                        <p className="text-sm text-gray-500">Defina os motivos pelos quais as vendas são fechadas</p>
                      </div>
                      <button
                        type="button"
                        onClick={addWinReason}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {pipelineForm.win_reasons.map((reason) => (
                        <div key={reason.id} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Award className="w-4 h-4 text-green-600" />
                          <input
                            type="text"
                            value={reason.name}
                            onChange={(e) => updateWinReason(reason.id, e.target.value)}
                            placeholder="Ex: Preço competitivo, Qualidade do produto..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => removeWinReason(reason.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Motivos de Perda */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span>Motivos de Perda</span>
                        </h3>
                        <p className="text-sm text-gray-500">Defina os motivos pelos quais as vendas são perdidas</p>
                      </div>
                      <button
                        type="button"
                        onClick={addLossReason}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {pipelineForm.loss_reasons.map((reason) => (
                        <div key={reason.id} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <input
                            type="text"
                            value={reason.name}
                            onChange={(e) => updateLossReason(reason.id, e.target.value)}
                            placeholder="Ex: Preço alto, Concorrência, Sem orçamento..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => removeLossReason(reason.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  Criar Pipeline
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {showEditModal && editingPipeline && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Edit className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Editar Pipeline</h2>
                    <p className="text-sm text-gray-600">Configure sua pipeline: {editingPipeline.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPipeline(null);
                  }}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Navegação por abas do modal de edição */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'basic', label: 'Básico', icon: Target },
                  { id: 'members', label: 'Vendedores', icon: Users },
                  { id: 'fields', label: 'Campos', icon: Layers },
                  { id: 'stages', label: 'Etapas', icon: Target },
                  { id: 'reasons', label: 'Motivos', icon: Award }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Aba Básico - Edição */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Pipeline *
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Pipeline Vendas B2B"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o objetivo desta pipeline..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Aba Vendedores - Edição */}
              {activeTab === 'members' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Vendedores Vinculados
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {activeMembers.map((member) => (
                        <label key={member.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.member_ids.includes(member.id)}
                            onChange={() => toggleMemberEdit(member.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600">
                                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Aba Campos - Edição */}
              {activeTab === 'fields' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Campos Customizados</h3>
                      <p className="text-sm text-gray-500">Gerencie campos personalizados desta pipeline</p>
                    </div>
                    <button
                      type="button"
                      onClick={addCustomFieldEdit}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Campo</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editForm.custom_fields.map((field) => (
                      <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nome do Campo
                            </label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateCustomFieldEdit(field.id, { name: e.target.value })}
                              placeholder="Ex: Orçamento, Urgência..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) => updateCustomFieldEdit(field.id, { type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="select">Seleção</option>
                              <option value="date">Data</option>
                              <option value="boolean">Sim/Não</option>
                            </select>
                          </div>
                        </div>

                        {field.type === 'select' && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Opções (separadas por vírgula)
                            </label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateCustomFieldEdit(field.id, { 
                                options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt) 
                              })}
                              placeholder="Ex: Baixa, Média, Alta"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateCustomFieldEdit(field.id, { required: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Campo obrigatório</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCustomFieldEdit(field.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}

                    {editForm.custom_fields.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum campo customizado adicionado</p>
                        <p className="text-sm">Clique em "Adicionar Campo" para criar um novo</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba Etapas - Edição */}
              {activeTab === 'stages' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Etapas do Kanban</h3>
                      <p className="text-sm text-gray-500">Gerencie as etapas desta pipeline</p>
                    </div>
                    <button
                      type="button"
                      onClick={addStageEdit}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Etapa</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editForm.stages?.map((stage, index) => (
                      <div key={stage.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nome da Etapa
                            </label>
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => updateStageEdit(stage.id, { name: e.target.value })}
                              placeholder="Ex: Prospecção, Qualificação..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cor
                            </label>
                            <input
                              type="color"
                              value={stage.color}
                              onChange={(e) => updateStageEdit(stage.id, { color: e.target.value })}
                              className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo
                            </label>
                            <select
                              value={stage.type}
                              onChange={(e) => updateStageEdit(stage.id, { type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="active">Ativa</option>
                              <option value="win">Ganho</option>
                              <option value="loss">Perda</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-gray-300"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-sm text-gray-600">Ordem: {stage.order}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStageEdit(stage.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aba Motivos - Edição */}
              {activeTab === 'reasons' && (
                <div className="space-y-8">
                  {/* Motivos de Ganho */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                          <Award className="w-5 h-5 text-green-600" />
                          <span>Motivos de Ganho</span>
                        </h3>
                        <p className="text-sm text-gray-500">Gerencie os motivos de fechamento</p>
                      </div>
                      <button
                        type="button"
                        onClick={addWinReasonEdit}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editForm.win_reasons.map((reason) => (
                        <div key={reason.id} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Award className="w-4 h-4 text-green-600" />
                          <input
                            type="text"
                            value={reason.name}
                            onChange={(e) => updateWinReasonEdit(reason.id, e.target.value)}
                            placeholder="Ex: Preço competitivo, Qualidade do produto..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => removeWinReasonEdit(reason.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Motivos de Perda */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span>Motivos de Perda</span>
                        </h3>
                        <p className="text-sm text-gray-500">Gerencie os motivos de perda</p>
                      </div>
                      <button
                        type="button"
                        onClick={addLossReasonEdit}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editForm.loss_reasons.map((reason) => (
                        <div key={reason.id} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <input
                            type="text"
                            value={reason.name}
                            onChange={(e) => updateLossReasonEdit(reason.id, e.target.value)}
                            placeholder="Ex: Preço alto, Concorrência, Sem orçamento..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => removeLossReasonEdit(reason.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botões do Modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPipeline(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditPipeline}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineModule; 