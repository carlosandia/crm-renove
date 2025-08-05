// =====================================================================================
// SERVICE: Annotations Service
// Autor: Claude (Arquiteto Sênior)
// Descrição: Lógica de negócios para anotações usando Supabase básico
// =====================================================================================

import { supabase } from '../config/supabase';
import type {
  CreateAnnotation,
  UpdateAnnotation,
  ListAnnotationsQuery,
  AnnotationWithRelations,
  AnnotationMetrics
} from '../shared/schemas/annotations';

export class AnnotationsService {

  // ===================================
  // CRUD BÁSICO DE ANOTAÇÕES
  // ===================================

  /**
   * Criar nova anotação
   */
  static async createAnnotation(data: CreateAnnotation & { tenant_id: string; owner_id: string }): Promise<AnnotationWithRelations> {
    try {
      console.log('🔍 [AnnotationsService] Criando anotação:', {
        tenant_id: data.tenant_id.substring(0, 8),
        owner_id: data.owner_id.substring(0, 8),
        pipeline_lead_id: data.pipeline_lead_id?.substring(0, 8),
        lead_master_id: data.lead_master_id?.substring(0, 8),
        content_length: data.content?.length ?? 0, // Null-safe access
        has_audio: !!data.audio_file_url,
        content_type: data.content_type || 'text'
      });

      // AIDEV-NOTE: Insert com campos de áudio incluídos - NULL para áudio puro
      const insertData: any = {
        tenant_id: data.tenant_id,
        pipeline_lead_id: data.pipeline_lead_id || null,
        lead_master_id: data.lead_master_id || null,
        owner_id: data.owner_id,
        // Para áudio puro, usar NULL ao invés de string vazia
        content: (data.content && data.content.length > 0) ? data.content : null,
        content_plain: (data.content_plain && data.content_plain.length > 0) ? data.content_plain : null,
        // Campos de áudio
        audio_file_url: data.audio_file_url || null,
        audio_file_name: data.audio_file_name || null,
        audio_duration: data.audio_duration || null,
        content_type: data.content_type || 'text'
      };

      const { data: annotation, error } = await supabase
        .from('annotations')
        .insert([insertData])
        .select(`
          *,
          owner:users!annotations_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!annotations_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!annotations_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .single();

      if (error) {
        console.error('❌ [AnnotationsService] Erro ao criar anotação:', error);
        throw new Error(`Erro ao criar anotação: ${error.message}`);
      }

      if (!annotation) {
        throw new Error('Nenhuma anotação retornada após criação');
      }

      // Transformar para formato esperado
      const result: AnnotationWithRelations = {
        ...annotation,
        owner_name: annotation.owner 
          ? `${annotation.owner.first_name} ${annotation.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: annotation.pipeline_lead ? {
          id: annotation.pipeline_lead.id,
          stage_name: annotation.pipeline_lead.stage?.name,
          pipeline_name: annotation.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: annotation.lead_master ? {
          id: annotation.lead_master.id,
          first_name: annotation.lead_master.first_name,
          last_name: annotation.lead_master.last_name,
          email: annotation.lead_master.email,
          company: annotation.lead_master.company
        } : undefined
      };

      console.log('✅ [AnnotationsService] Anotação criada com sucesso:', {
        id: result.id.substring(0, 8),
        content_length: result.content?.length ?? 0 // Null-safe access
      });

      return result;

    } catch (error: any) {
      console.error('❌ [AnnotationsService] Erro inesperado ao criar anotação:', error);
      throw error;
    }
  }

  /**
   * Buscar anotações de um lead
   */
  static async getLeadAnnotations(
    leadId: string,
    tenantId: string,
    leadType: 'pipeline_lead' | 'lead_master',
    filters: Partial<ListAnnotationsQuery> = {}
  ): Promise<{ annotations: AnnotationWithRelations[]; pagination: any }> {
    try {
      console.log('🔍 [AnnotationsService] Buscando anotações do lead:', {
        leadId: leadId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        leadType,
        filters
      });

      let query = supabase
        .from('annotations')
        .select(`
          *,
          owner:users!annotations_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!annotations_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!annotations_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Filtrar por tipo de lead
      if (leadType === 'pipeline_lead') {
        query = query.eq('pipeline_lead_id', leadId);
      } else {
        query = query.eq('lead_master_id', leadId);
      }

      // Aplicar filtros opcionais
      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters.search) {
        query = query.textSearch('content_plain', filters.search, {
          type: 'websearch',
          config: 'portuguese'
        });
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Aplicar paginação
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 50); // Max 50 por página
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data: annotations, error, count } = await query;

      if (error) {
        console.error('❌ [AnnotationsService] Erro ao buscar anotações:', error);
        throw new Error(`Erro ao buscar anotações: ${error.message}`);
      }

      // Transformar dados para formato esperado
      const transformedAnnotations: AnnotationWithRelations[] = (annotations || []).map(annotation => ({
        ...annotation,
        owner_name: annotation.owner 
          ? `${annotation.owner.first_name} ${annotation.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: annotation.pipeline_lead ? {
          id: annotation.pipeline_lead.id,
          stage_name: annotation.pipeline_lead.stage?.name,
          pipeline_name: annotation.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: annotation.lead_master ? {
          id: annotation.lead_master.id,
          first_name: annotation.lead_master.first_name,
          last_name: annotation.lead_master.last_name,
          email: annotation.lead_master.email,
          company: annotation.lead_master.company
        } : undefined
      }));

      const pagination = {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      };

      console.log('✅ [AnnotationsService] Anotações encontradas:', {
        leadId: leadId.substring(0, 8),
        total: transformedAnnotations.length,
        pagination
      });

      return {
        annotations: transformedAnnotations,
        pagination
      };

    } catch (error: any) {
      console.error('❌ [AnnotationsService] Erro inesperado ao buscar anotações:', error);
      throw error;
    }
  }

  /**
   * Atualizar anotação
   */
  static async updateAnnotation(
    annotationId: string,
    tenantId: string,
    updateData: UpdateAnnotation
  ): Promise<AnnotationWithRelations | null> {
    try {
      console.log('🔍 [AnnotationsService] Atualizando anotação:', {
        annotationId: annotationId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        content_length: updateData.content?.length ?? 0, // Null-safe access
        has_audio: !!updateData.audio_file_url,
        content_type: updateData.content_type
      });

      // AIDEV-NOTE: Update com campos de áudio incluídos - NULL para strings vazias
      const updateFields: any = {
        content: (updateData.content && updateData.content.length > 0) ? updateData.content : null,
        content_plain: (updateData.content_plain && updateData.content_plain.length > 0) ? updateData.content_plain : null,
        updated_at: new Date().toISOString()
      };

      // Adicionar campos de áudio se fornecidos
      if (updateData.audio_file_url !== undefined) {
        updateFields.audio_file_url = updateData.audio_file_url;
      }
      if (updateData.audio_file_name !== undefined) {
        updateFields.audio_file_name = updateData.audio_file_name;
      }
      if (updateData.audio_duration !== undefined) {
        updateFields.audio_duration = updateData.audio_duration;
      }
      if (updateData.content_type !== undefined) {
        updateFields.content_type = updateData.content_type;
      }

      const { data: annotation, error } = await supabase
        .from('annotations')
        .update(updateFields)
        .eq('id', annotationId)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          owner:users!annotations_owner_id_fkey(first_name, last_name),
          pipeline_lead:pipeline_leads!annotations_pipeline_lead_id_fkey(
            id,
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              name,
              pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
            )
          ),
          lead_master:leads_master!annotations_lead_master_id_fkey(
            id, first_name, last_name, email, company
          )
        `)
        .single();

      if (error) {
        console.error('❌ [AnnotationsService] Erro ao atualizar anotação:', error);
        throw new Error(`Erro ao atualizar anotação: ${error.message}`);
      }

      if (!annotation) {
        console.warn('⚠️ [AnnotationsService] Anotação não encontrada para atualização');
        return null;
      }

      // Transformar para formato esperado
      const result: AnnotationWithRelations = {
        ...annotation,
        owner_name: annotation.owner 
          ? `${annotation.owner.first_name} ${annotation.owner.last_name}`.trim()
          : 'Usuário não encontrado',
        pipeline_lead: annotation.pipeline_lead ? {
          id: annotation.pipeline_lead.id,
          stage_name: annotation.pipeline_lead.stage?.name,
          pipeline_name: annotation.pipeline_lead.stage?.pipeline?.name
        } : undefined,
        lead_master: annotation.lead_master ? {
          id: annotation.lead_master.id,
          first_name: annotation.lead_master.first_name,
          last_name: annotation.lead_master.last_name,
          email: annotation.lead_master.email,
          company: annotation.lead_master.company
        } : undefined
      };

      console.log('✅ [AnnotationsService] Anotação atualizada com sucesso:', {
        id: result.id.substring(0, 8),
        content_length: result.content?.length ?? 0 // Null-safe access
      });

      return result;

    } catch (error: any) {
      console.error('❌ [AnnotationsService] Erro inesperado ao atualizar anotação:', error);
      throw error;
    }
  }

  /**
   * Excluir anotação
   */
  static async deleteAnnotation(annotationId: string, tenantId: string): Promise<boolean> {
    try {
      console.log('🗑️ [AnnotationsService] Excluindo anotação:', {
        annotationId: annotationId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('❌ [AnnotationsService] Erro ao excluir anotação:', error);
        throw new Error(`Erro ao excluir anotação: ${error.message}`);
      }

      console.log('✅ [AnnotationsService] Anotação excluída com sucesso:', {
        annotationId: annotationId.substring(0, 8)
      });

      return true;

    } catch (error: any) {
      console.error('❌ [AnnotationsService] Erro inesperado ao excluir anotação:', error);
      throw error;
    }
  }

  // ===================================
  // MÉTRICAS E RELATÓRIOS
  // ===================================

  /**
   * Buscar métricas de anotações para relatórios
   */
  static async getAnnotationMetrics(
    tenantId: string,
    filters: {
      pipeline_id?: string;
      owner_id?: string;
      date_from?: string;
      date_to?: string;
    } = {}
  ): Promise<AnnotationMetrics> {
    try {
      console.log('📊 [AnnotationsService] Calculando métricas:', {
        tenantId: tenantId.substring(0, 8),
        filters
      });

      // Query base para anotações
      let query = supabase
        .from('annotations')
        .select(`
          id,
          created_at,
          owner_id,
          pipeline_lead:pipeline_leads!annotations_pipeline_lead_id_fkey(
            stage:pipeline_stages!pipeline_leads_stage_id_fkey(
              pipeline_id
            )
          )
        `)
        .eq('tenant_id', tenantId);

      // Aplicar filtros
      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.pipeline_id) {
        query = query.eq('pipeline_lead.stage.pipeline_id', filters.pipeline_id);
      }

      const { data: annotations, error } = await query;

      if (error) {
        console.error('❌ [AnnotationsService] Erro ao buscar dados para métricas:', error);
        throw new Error(`Erro ao calcular métricas: ${error.message}`);
      }

      // Calcular métricas
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalAnnotations = annotations?.length || 0;
      const annotationsThisWeek = annotations?.filter(a => 
        new Date(a.created_at) >= oneWeekAgo
      ).length || 0;
      const annotationsThisMonth = annotations?.filter(a => 
        new Date(a.created_at) >= oneMonthAgo
      ).length || 0;

      // Encontrar usuário mais ativo
      const userCounts = annotations?.reduce((acc, annotation) => {
        acc[annotation.owner_id] = (acc[annotation.owner_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const mostActiveUserId = Object.keys(userCounts).reduce((a, b) => 
        userCounts[a] > userCounts[b] ? a : b, ''
      );

      // Buscar nome do usuário mais ativo
      let mostActiveUserName = '';
      if (mostActiveUserId) {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', mostActiveUserId)
          .single();
        
        if (user) {
          mostActiveUserName = `${user.first_name} ${user.last_name}`.trim();
        }
      }

      // Calcular média de anotações por lead
      const leadCounts = annotations?.reduce((acc, annotation) => {
        const leadId = annotation.pipeline_lead?.id || 'no-lead';
        acc[leadId] = (acc[leadId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const avgAnnotationsPerLead = Object.keys(leadCounts).length > 0 
        ? totalAnnotations / Object.keys(leadCounts).length 
        : 0;

      // Data da última anotação
      const lastAnnotationDate = annotations && annotations.length > 0
        ? annotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : undefined;

      const metrics: AnnotationMetrics = {
        tenant_id: tenantId,
        total_annotations: totalAnnotations,
        annotations_this_week: annotationsThisWeek,
        annotations_this_month: annotationsThisMonth,
        most_active_user: mostActiveUserName || undefined,
        avg_annotations_per_lead: Math.round(avgAnnotationsPerLead * 100) / 100,
        last_annotation_date: lastAnnotationDate
      };

      console.log('✅ [AnnotationsService] Métricas calculadas:', {
        tenantId: tenantId.substring(0, 8),
        totalAnnotations,
        annotationsThisWeek,
        annotationsThisMonth
      });

      return metrics;

    } catch (error: any) {
      console.error('❌ [AnnotationsService] Erro inesperado ao calcular métricas:', error);
      throw error;
    }
  }
}

export default AnnotationsService;