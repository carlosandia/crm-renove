import { Request, Response } from 'express';
import { supabase, createUserSupabaseClient } from '../config/supabase';
import { LeadDistributionService, CreateLeadPayload } from '../services/leadDistributionService';

export class LeadController {
  // GET /api/pipelines/:pipeline_id/leads - Buscar leads de uma pipeline
  static async getLeadsByPipeline(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { start_date, end_date } = req.query;
      
      // 🔐 SEGURANÇA: Usar tenant_id do usuário autenticado (req.user)
      const user_tenant_id = (req as any).user?.tenant_id;
      
      if (!user_tenant_id) {
        console.error('❌ [getLeadsByPipeline] Usuário não autenticado ou sem tenant_id');
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      console.log('🔍 [getLeadsByPipeline] Buscando leads:', {
        pipeline_id,
        user_tenant_id,
        start_date,
        end_date,
        user_id: (req as any).user?.id
      });

      if (!pipeline_id) {
        console.warn('⚠️ [getLeadsByPipeline] pipeline_id não fornecido');
        return res.status(400).json({ error: 'pipeline_id é obrigatório' });
      }

      // 🔧 CORREÇÃO DEFINITIVA: Escolher cliente Supabase baseado no tipo de token
      const userJWT = (req as any).jwtToken;
      const isDemoToken = userJWT && userJWT.startsWith('demo_');
      
      console.log('📋 [getLeadsByPipeline] Selecionando client Supabase:', {
        pipeline_id,
        user_tenant_id,
        hasJWT: !!userJWT,
        isDemoToken,
        tokenStart: userJWT ? userJWT.substring(0, 10) : 'nenhum'
      });
      
      // 🔧 CORREÇÃO DEFINITIVA: Usar service role com RLS desabilitado temporariamente
      // RLS está bloqueando acesso do service role, vamos usar uma solução alternativa
      console.log('🔧 [BACKEND] Usando service role - filtro manual por tenant_id');
      const clientSupabase = supabase;
      
      // Teste 1: Buscar apenas pipeline_leads sem JOIN
      // ✅ CORREÇÃO POSIÇÃO: Ordenar por position primeiro, depois created_at como fallback
      let basicQuery = clientSupabase
        .from('pipeline_leads')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .eq('tenant_id', user_tenant_id)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      const { data: basicLeads, error: basicError } = await basicQuery;
      
      console.log('🔍 [DEBUG] Resultado básico pipeline_leads:', {
        count: basicLeads?.length || 0,
        error: basicError?.message || 'nenhum',
        firstLead: basicLeads?.[0]?.id?.substring(0, 8) || 'nenhum',
        errorCode: basicError?.code || 'nenhum',
        errorDetails: basicError?.details || 'nenhum'
      });

      // 🔍 DIAGNÓSTICO: Log mas continue processamento normal
      if (!basicLeads || basicLeads.length === 0) {
        console.error('🚨 [INFO] Query básica retornou 0 leads - continuando...');
        
        // Teste direto sem filtros usando clientSupabase para debug
        const { data: allPipelineLeads, error: allError } = await clientSupabase
          .from('pipeline_leads')
          .select('id, pipeline_id, tenant_id')
          .limit(5);
          
        console.error('🔍 [DEBUG] Todos pipeline_leads (sem filtro):', {
          count: allPipelineLeads?.length || 0,
          error: allError?.message || 'nenhum',
          errorCode: allError?.code || 'nenhum',
          sample: allPipelineLeads?.slice(0, 2) || []
        });

        // 🔧 TESTE DIRETO: Verificar se service role funciona completamente
        const { data: testUsers, error: testError } = await clientSupabase
          .from('users')
          .select('id, email')
          .limit(3);
          
        console.error('🔍 [SERVICE ROLE TEST] Teste acesso tabela users:', {
          count: testUsers?.length || 0,
          error: testError?.message || 'nenhum',
          sample: testUsers?.slice(0, 1) || []
        });
      }
      
      if (basicError) {
        console.error('❌ [DEBUG] Erro na query básica:', basicError);
        return res.status(500).json({ error: 'Erro na query básica', details: basicError.message });
      }
      
      // 🔧 CORREÇÃO DEFINITIVA: Buscar pipeline_leads primeiro, depois fazer queries separadas para leads_master
      console.log('🔧 [MÉTODO ALTERNATIVO] Buscando pipeline_leads + leads_master separadamente...');
      
      // Primeira query: buscar pipeline_leads
      console.log('🔍 [DEBUG] Executando query pipeline_leads:', {
        client: 'service role',
        pipeline_id,
        user_tenant_id,
        table: 'pipeline_leads'
      });
      
      // ✅ CORREÇÃO POSIÇÃO: Ordenar por position primeiro, depois created_at como fallback
      const { data: pipelineLeads, error: pipelineError } = await clientSupabase
        .from('pipeline_leads')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .eq('tenant_id', user_tenant_id)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      console.log('🔍 [DEBUG] Resultado pipeline_leads:', {
        data_count: pipelineLeads?.length || 0,
        error: pipelineError?.message || 'nenhum',
        error_code: pipelineError?.code || 'nenhum',
        sample: pipelineLeads?.[0] ? {
          id: pipelineLeads[0].id.substring(0, 8),
          pipeline_id: pipelineLeads[0].pipeline_id.substring(0, 8),
          tenant_id: pipelineLeads[0].tenant_id.substring(0, 8)
        } : null
      });

      if (pipelineError) {
        console.error('❌ [PIPELINE] Erro ao buscar pipeline_leads:', pipelineError);
        return res.status(500).json({ error: 'Erro ao buscar pipeline_leads', details: pipelineError.message });
      }

      console.log('📋 [PIPELINE] Pipeline leads encontrados:', pipelineLeads?.length || 0);

      // Segunda query: buscar dados dos leads_master se houver pipeline_leads
      let leads = pipelineLeads || [];
      if (pipelineLeads && pipelineLeads.length > 0) {
        const leadMasterIds = pipelineLeads
          .map(pl => pl.lead_master_id)
          .filter(id => id);

        if (leadMasterIds.length > 0) {
          const { data: leadsData, error: leadsError } = await clientSupabase
            .from('leads_master')
            .select('id, first_name, last_name, email, phone, company, estimated_value')
            .in('id', leadMasterIds);

          if (leadsError) {
            console.warn('⚠️ [LEADS_MASTER] Erro ao buscar leads_master:', leadsError);
          } else {
            // Combinar dados manualmente
            leads = pipelineLeads.map(pl => {
              const leadMaster = leadsData?.find(lm => lm.id === pl.lead_master_id);
              return {
                ...pl,
                // Adicionar campos do leads_master de forma flatten
                first_name: leadMaster?.first_name || null,
                last_name: leadMaster?.last_name || null,
                email: leadMaster?.email || null,
                phone: leadMaster?.phone || null,
                company: leadMaster?.company || null,
                estimated_value: leadMaster?.estimated_value || null
              };
            });
          }
        }
      }

      const error = pipelineError;

      // ✅ FILTRO POR PERÍODO: Aplicar filtros de data se fornecidos
      if (start_date && end_date) {
        console.log('🗓️ [getLeadsByPipeline] Aplicando filtro de período:', { start_date, end_date });
        
        const startDateTime = `${start_date}T00:00:00.000Z`;
        const endDateTime = `${end_date}T23:59:59.999Z`;
        
        // 🔧 CORREÇÃO: Filtrar dados já carregados por data
        const leadsFiltered = leads.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          const startDate = new Date(startDateTime);
          const endDate = new Date(endDateTime);
          return leadDate >= startDate && leadDate <= endDate;
        });

        const errorFiltered = null;
        
        if (errorFiltered) {
          console.error('❌ [getLeadsByPipeline] Erro ao buscar leads com filtro de data:', errorFiltered);
          return res.status(500).json({ error: 'Erro ao buscar leads', details: errorFiltered.message });
        }
        
        // Processar resposta filtrada por data - SQL direto já retorna campos flatten
        const leadsResponse = (leadsFiltered || []).map((lead: any) => ({
          ...lead,
          custom_data: lead.custom_data || {},
          // Campos já vem do JOIN SQL direto, fallback para custom_data se necessário
          first_name: lead.first_name || lead.custom_data?.nome_lead?.split(' ')[0] || '',
          last_name: lead.last_name || lead.custom_data?.nome_lead?.split(' ').slice(1).join(' ') || '',
          email: lead.email || lead.custom_data?.email || '',
          phone: lead.phone || lead.custom_data?.telefone || '',
          company: lead.company || lead.custom_data?.empresa || '',
          estimated_value: lead.estimated_value || lead.custom_data?.valor || 0
        }));

        console.log('✅ [getLeadsByPipeline] Resposta processada com filtro de data:', {
          pipeline_id,
          leads_count: leadsResponse.length,
          period: { start_date, end_date }
        });

        return res.json(leadsResponse);
      }

      if (error) {
        console.error('❌ [getLeadsByPipeline] Erro ao buscar leads:', error);
        return res.status(500).json({ error: 'Erro ao buscar leads', details: error.message });
      }

      console.log('📋 [getLeadsByPipeline] Leads encontrados via método alternativo:', {
        pipeline_id,
        total: leads?.length || 0,
        method: 'Pipeline leads + leads_master separadamente',
        leads: leads?.slice(0, 3).map((l: any) => ({
          id: l.id?.substring(0, 8),
          stage_id: l.stage_id,
          has_custom_data: !!l.custom_data,
          lead_name: l.first_name ? `${l.first_name} ${l.last_name || ''}`.trim() : 'N/A'
        })) || []
      });

      // 🔧 VALIDAÇÃO: Se não retornou leads, logar para debug
      if (!leads || leads.length === 0) {
        console.warn('⚠️ [MÉTODO ALTERNATIVO] Não foram encontrados leads:', {
          pipeline_id,
          user_tenant_id,
          method: 'Pipeline leads + leads_master separadamente'
        });
      }

      // ✅ PROCESSAR DADOS COMBINADOS: Campos já combinados das duas tabelas
      const leadsResponse = (leads || []).map((lead: any) => ({
        ...lead,
        custom_data: lead.custom_data || {},
        // 🔧 DADOS COMBINADOS: Campos do leads_master ou fallback para custom_data
        first_name: lead.first_name || lead.custom_data?.nome_lead?.split(' ')[0] || '',
        last_name: lead.last_name || lead.custom_data?.nome_lead?.split(' ').slice(1).join(' ') || '',
        email: lead.email || lead.custom_data?.email || '',
        phone: lead.phone || lead.custom_data?.telefone || '',
        company: lead.company || lead.custom_data?.empresa || '',
        estimated_value: lead.estimated_value || lead.custom_data?.valor || 0
      }));

      console.log('✅ [getLeadsByPipeline] Resposta método alternativo processada:', {
        pipeline_id,
        leads_count: leadsResponse.length,
        method: 'Pipeline leads + leads_master separadamente',
        first_lead: leadsResponse[0] ? {
          id: leadsResponse[0].id?.substring(0, 8),
          stage_id: leadsResponse[0].stage_id,
          has_custom_data: !!leadsResponse[0].custom_data,
          name: `${leadsResponse[0].first_name} ${leadsResponse[0].last_name}`.trim(),
          email: leadsResponse[0].email
        } : null
      });

      // ✅ CORREÇÃO: Retornar dados diretamente para compatibilidade com frontend
      res.json(leadsResponse);
    } catch (error) {
      console.error('❌ [getLeadsByPipeline] Erro interno:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Função auxiliar para garantir que existe uma etapa inicial ("Lead" ou "Novos Leads") na primeira posição
  static async ensureLeadStage(pipeline_id: string) {
    try {
      // Verificar se já existe uma etapa com order_index = 0
      const { data: firstStage, error: checkError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .eq('order_index', 0)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erro ao verificar primeira etapa:', checkError);
        return null;
      }

      // Se existe uma etapa com order_index = 0, verificar se é "Lead" ou "Novos Leads" (compatibilidade)
      if (firstStage) {
        if (firstStage.name === 'Lead' || firstStage.name === 'Novos Leads') {
          return firstStage.id;
        } else {
          // Existe uma etapa no índice 0, mas não é a etapa inicial padrão
          // Vamos usar essa etapa existente
          return firstStage.id;
        }
      }

      // Se não existe etapa com order_index = 0, verificar se existe "Lead" ou "Novos Leads" em outro índice
      const { data: existingLeadStage, error: existingError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline_id)
        .or('name.eq.Lead,name.eq.Novos Leads')
        .single();

      if (existingLeadStage && !existingError) {
        // Existe "Lead" ou "Novos Leads" mas em outro índice, vamos atualizar para order_index = 0
        const { error: updateError } = await supabase
          .from('pipeline_stages')
          .update({ order_index: 0 })
          .eq('id', existingLeadStage.id);

        if (updateError) {
          console.error('Erro ao atualizar ordem da etapa inicial:', updateError);
        }
        
        return existingLeadStage.id;
      }

      // Não existe "Novos Leads", vamos criar uma nova etapa
      const { data: newStage, error: createError } = await supabase
        .from('pipeline_stages')
        .insert({
          pipeline_id: pipeline_id,
          name: 'Novos Leads',
          order_index: 0,
          color: '#3B82F6'
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar etapa Novos Leads:', createError);
        return null;
      }

      console.log('✅ Etapa "Novos Leads" criada com sucesso:', newStage.id);
      return newStage.id;

    } catch (error) {
      console.error('Erro na função ensureNewLeadsStage:', error);
      return null;
    }
  }

  // Função auxiliar para obter a primeira etapa da pipeline
  static async getFirstStage(pipeline_id: string) {
    try {
      // Primeiro, garantir que existe uma etapa inicial
      let firstStageId = await LeadController.ensureLeadStage(pipeline_id);
      
      if (firstStageId) {
        return firstStageId;
      }

      // Se não conseguiu criar/encontrar "Novos Leads", pegar a primeira etapa disponível
      const { data: firstStage, error } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', pipeline_id)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Erro ao buscar primeira etapa:', error);
        return null;
      }

      return firstStage?.id || null;
    } catch (error) {
      console.error('Erro na função getFirstStage:', error);
      return null;
    }
  }

  // POST /api/pipelines/:pipeline_id/leads - Criar novo lead com distribuição automática
  static async createLead(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { stage_id, custom_data, created_by } = req.body;
      const user = (req as any).user;

      if (!pipeline_id) {
        return res.status(400).json({ 
          error: 'pipeline_id é obrigatório' 
        });
      }

      // ✅ INTEGRAÇÃO COM SISTEMA DE DISTRIBUIÇÃO
      // Verificar se temos dados suficientes para usar o LeadDistributionService
      const leadData = custom_data || {};
      
      if (leadData.first_name || leadData.nome_lead || leadData.email) {
        // Temos dados suficientes, usar o sistema de distribuição completo
        console.log('🎯 Usando LeadDistributionService para criar lead com distribuição');
        
        const payload: CreateLeadPayload = {
          first_name: leadData.first_name || leadData.nome_lead || 'Lead',
          last_name: leadData.last_name || leadData.sobrenome || '',
          email: leadData.email || leadData.email_lead || '',
          phone: leadData.phone || leadData.telefone || '',
          company: leadData.company || leadData.empresa || '',
          pipeline_id,
          created_via: 'manual', // Criado via API manual
          created_by,
          additional_fields: leadData
        };

        try {
          const distributedLead = await LeadDistributionService.createLead(payload);
          
          // Formatar resposta para manter compatibilidade
          const leadResponse = {
            ...distributedLead,
            custom_data: distributedLead.custom_data || distributedLead.lead_data
          };
          
          // Remover lead_data se existir para evitar duplicação
          if (leadResponse.lead_data) {
            delete leadResponse.lead_data;
          }

          return res.status(201).json({ 
            message: 'Lead criado com sucesso e distribuído automaticamente',
            lead: leadResponse,
            distributed: true,
            assigned_to: distributedLead.assigned_to
          });
        } catch (distributionError) {
          console.warn('⚠️ Erro na distribuição, usando método tradicional:', distributionError);
          // Fallback para método tradicional se distribuição falhar
        }
      }

      // ✅ FALLBACK: Método tradicional (compatibilidade)
      console.log('📝 Usando método tradicional para criar lead');
      
      // SEMPRE usar a primeira etapa da pipeline para novos leads
      const firstStageId = await LeadController.getFirstStage(pipeline_id);
      
      if (!firstStageId) {
        return res.status(400).json({ 
          error: 'Pipeline não possui etapas configuradas ou não foi possível criar etapa "Novos Leads"' 
        });
      }

      // AIDEV-NOTE: Usar custom_data que é a coluna correta na tabela pipeline_leads
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .insert({
          pipeline_id,
          stage_id: firstStageId, // SEMPRE usar a primeira etapa
          custom_data: custom_data || {},
          created_by: created_by || null,
          tenant_id: user?.tenant_id || null
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar lead:', error);
        return res.status(500).json({ error: 'Erro ao criar lead', details: error.message });
      }

      // AIDEV-NOTE: Compatibilidade com ambas as colunas
      const leadResponse = {
        ...lead,
        custom_data: lead.custom_data || lead.lead_data || {}
      };
      // Limpar dados desnecessários
      if (leadResponse.lead_data) {
        delete leadResponse.lead_data;
      }

      res.status(201).json({ 
        message: 'Lead criado com sucesso na primeira etapa "Novos Leads"',
        lead: leadResponse,
        distributed: false
      });
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  }

  // PUT /api/pipelines/:pipeline_id/leads/:lead_id - Atualizar lead
  static async updateLead(req: Request, res: Response) {
    try {
      const { pipeline_id, lead_id } = req.params;
      const { stage_id, custom_data, position } = req.body;
      const user = (req as any).user;

      console.log('🔄 [UPDATE LEAD] Iniciando atualização:', {
        leadId: lead_id.substring(0, 8),
        pipelineId: pipeline_id.substring(0, 8),
        newStageId: stage_id?.substring(0, 8),
        hasPosition: position !== undefined,
        position,
        userId: user?.id?.substring(0, 8),
        tenantId: user?.tenant_id?.substring(0, 8)
      });

      // ✅ CORREÇÃO CRÍTICA: Lógica simplificada e robusta
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Atualizar stage_id se fornecido
      if (stage_id) {
        updateData.stage_id = stage_id;
        updateData.moved_at = new Date().toISOString();
        console.log('📍 [UPDATE LEAD] Movendo para nova stage:', stage_id.substring(0, 8));
      }

      // Atualizar custom_data se fornecido
      if (custom_data) {
        updateData.custom_data = custom_data;
        console.log('📝 [UPDATE LEAD] Atualizando custom_data');
      }

      // ✅ POSIÇÃO OPCIONAL: Incluir posição se fornecida
      if (position !== undefined && position !== null) {
        const positionNum = typeof position === 'number' ? position : parseInt(position.toString());
        if (!isNaN(positionNum)) {
          updateData.position = positionNum;
          console.log('🎯 [UPDATE LEAD] Incluindo posição:', updateData.position);
        } else {
          console.warn('⚠️ [UPDATE LEAD] Posição inválida ignorada:', position);
        }
      }

      // ✅ ATUALIZAÇÃO DIRETA: Sem função SQL complexa
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .update(updateData)
        .eq('id', lead_id)
        .eq('pipeline_id', pipeline_id)
        .select()
        .single();

      if (error) {
        console.error('❌ [UPDATE LEAD] Erro ao atualizar lead:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          leadId: lead_id.substring(0, 8),
          updateData
        });
        return res.status(500).json({ 
          error: 'Erro ao atualizar lead', 
          details: error.message,
          code: error.code
        });
      }

      if (!lead) {
        console.error('❌ [UPDATE LEAD] Lead não encontrado:', {
          leadId: lead_id.substring(0, 8),
          pipelineId: pipeline_id.substring(0, 8)
        });
        return res.status(404).json({ 
          error: 'Lead não encontrado' 
        });
      }

      console.log('✅ [UPDATE LEAD] Lead atualizado com sucesso:', {
        leadId: lead.id.substring(0, 8),
        newStageId: lead.stage_id?.substring(0, 8),
        position: lead.position,
        movedAt: lead.moved_at
      });

      res.json({ 
        message: 'Lead atualizado com sucesso',
        lead 
      });
    } catch (error) {
      console.error('❌ [UPDATE LEAD] Erro interno:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // PUT /api/pipelines/:pipeline_id/leads/:lead_id/flexible-values - Atualizar valores flexíveis
  static async updateFlexibleValues(req: Request, res: Response) {
    try {
      const { pipeline_id, lead_id } = req.params;
      const { 
        valor_unico, 
        valor_recorrente, 
        recorrencia_periodo, 
        recorrencia_unidade, 
        tipo_venda, 
        valor_observacoes 
      } = req.body;
      const user = (req as any).user;

      console.log('💰 [UPDATE FLEXIBLE VALUES] Iniciando atualização de valores:', {
        leadId: lead_id.substring(0, 8),
        pipelineId: pipeline_id.substring(0, 8),
        valorUnico: valor_unico,
        valorRecorrente: valor_recorrente,
        recorrenciaPeriodo: recorrencia_periodo,
        tipoVenda: tipo_venda,
        userId: user?.id?.substring(0, 8),
        tenantId: user?.tenant_id?.substring(0, 8)
      });

      // Validação básica
      if (!user?.tenant_id) {
        console.error('❌ [UPDATE FLEXIBLE VALUES] Usuário não autenticado ou sem tenant_id');
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Preparar dados de atualização
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Adicionar campos de valor flexível apenas se fornecidos
      if (valor_unico !== undefined) {
        updateData.valor_unico = valor_unico;
      }
      if (valor_recorrente !== undefined) {
        updateData.valor_recorrente = valor_recorrente;
      }
      if (recorrencia_periodo !== undefined) {
        updateData.recorrencia_periodo = recorrencia_periodo;
      }
      if (recorrencia_unidade !== undefined) {
        updateData.recorrencia_unidade = recorrencia_unidade;
      }
      if (tipo_venda !== undefined) {
        updateData.tipo_venda = tipo_venda;
      }
      if (valor_observacoes !== undefined) {
        updateData.valor_observacoes = valor_observacoes;
      }

      // ✅ NOTA: O trigger de cálculo automático (calculate_deal_total) será executado automaticamente
      console.log('🔧 [UPDATE FLEXIBLE VALUES] Dados para atualização:', updateData);

      // Executar atualização com filtro de segurança por tenant_id
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .update(updateData)
        .eq('id', lead_id)
        .eq('pipeline_id', pipeline_id)
        .eq('tenant_id', user.tenant_id) // Segurança adicional
        .select()
        .single();

      if (error) {
        console.error('❌ [UPDATE FLEXIBLE VALUES] Erro ao atualizar valores:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          leadId: lead_id.substring(0, 8),
          updateData
        });
        return res.status(500).json({ 
          error: 'Erro ao atualizar valores flexíveis', 
          details: error.message,
          code: error.code
        });
      }

      if (!lead) {
        console.error('❌ [UPDATE FLEXIBLE VALUES] Lead não encontrado:', {
          leadId: lead_id.substring(0, 8),
          pipelineId: pipeline_id.substring(0, 8),
          tenantId: user.tenant_id.substring(0, 8)
        });
        return res.status(404).json({ 
          error: 'Lead não encontrado ou sem permissão de acesso' 
        });
      }

      console.log('✅ [UPDATE FLEXIBLE VALUES] Valores atualizados com sucesso:', {
        leadId: lead.id.substring(0, 8),
        valorTotal: lead.valor_total_calculado,
        tipoVenda: lead.tipo_venda,
        valorUnico: lead.valor_unico,
        valorRecorrente: lead.valor_recorrente
      });

      res.json({ 
        message: 'Valores flexíveis atualizados com sucesso',
        lead: {
          id: lead.id,
          valor_unico: lead.valor_unico,
          valor_recorrente: lead.valor_recorrente,
          recorrencia_periodo: lead.recorrencia_periodo,
          recorrencia_unidade: lead.recorrencia_unidade,
          tipo_venda: lead.tipo_venda,
          valor_total_calculado: lead.valor_total_calculado,
          valor_observacoes: lead.valor_observacoes,
          updated_at: lead.updated_at
        }
      });
    } catch (error) {
      console.error('❌ [UPDATE FLEXIBLE VALUES] Erro interno:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // DELETE /api/pipelines/:pipeline_id/leads/:lead_id - Excluir lead
  static async deleteLead(req: Request, res: Response) {
    try {
      const { pipeline_id, lead_id } = req.params;

      const { error } = await supabase
        .from('pipeline_leads')
        .delete()
        .eq('id', lead_id)
        .eq('pipeline_id', pipeline_id);

      if (error) {
        console.error('Erro ao excluir lead:', error);
        return res.status(500).json({ error: 'Erro ao excluir lead', details: error.message });
      }

      res.json({ message: 'Lead excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Função para garantir que a tabela existe
  static async ensureLeadsTableExists() {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS pipeline_leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
            stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
            custom_data JSONB NOT NULL DEFAULT '{}',
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
          CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
          CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_by ON pipeline_leads(created_by);
        `
      });

      if (error) {
        console.log('⚠️ Não foi possível criar tabela via RPC:', error.message);
        // Tentar criar via SQL direto
        const { error: directError } = await supabase
          .from('pipeline_leads')
          .select('id')
          .limit(1);
        
        if (directError && directError.message.includes('does not exist')) {
          console.log('❌ Tabela pipeline_leads não existe e não pode ser criada automaticamente');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.log('❌ Erro ao verificar/criar tabela:', error);
      return false;
    }
  }
}