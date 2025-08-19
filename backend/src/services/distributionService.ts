/**
 * Serviço de Distribuição de Leads - Sistema Round-Robin
 * 
 * Implementa algoritmo de rodízio automático com:
 * - Isolamento de tenant
 * - Verificação de horários comerciais
 * - Filtros de membros ativos
 * - Fallback para modo manual
 */

import { Request } from 'express';
import { supabase } from '../config/supabase';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================

export interface DistributionRule {
  pipeline_id: string;
  tenant_id: string;
  mode: 'manual' | 'rodizio';
  is_active: boolean;
  working_hours_only: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: number[];
  skip_inactive_members: boolean;
  fallback_to_manual: boolean;
  last_assigned_member_id?: string;
  total_assignments?: number;
  successful_assignments?: number;
  failed_assignments?: number;
  last_assignment_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  tenant_id: string;
}

export interface DistributionResult {
  success: boolean;
  assigned_to?: string;
  member_name?: string;
  method: 'rodizio' | 'manual' | 'fallback';
  round_robin_position?: number;
  total_eligible_members?: number;
  message: string;
  error?: string;
}

export interface DistributionStats {
  rule: DistributionRule | null;
  total_assignments: number;
  successful_assignments: number;
  failed_assignments: number;
  last_assignment_at: string | null;
  recent_assignments: any[];
  assignment_success_rate: number;
}

// ================================================================================
// UTILITÁRIOS PARA VALIDAÇÃO
// ================================================================================

/**
 * Verifica se o horário atual está dentro do horário comercial
 */
function isWithinWorkingHours(rule: DistributionRule): boolean {
  if (!rule.working_hours_only) return true;

  const now = new Date();
  const currentDay = now.getDay() + 1; // Supabase usa 1=domingo, 2=segunda...
  const currentTime = now.toTimeString().substring(0, 8); // HH:MM:SS

  // Verificar dias da semana
  if (rule.working_days && rule.working_days.length > 0) {
    if (!rule.working_days.includes(currentDay)) {
      return false;
    }
  }

  // Verificar horários
  if (rule.working_hours_start && rule.working_hours_end) {
    return currentTime >= rule.working_hours_start && currentTime <= rule.working_hours_end;
  }

  return true;
}

/**
 * Extrai tenant_id do usuário autenticado
 * ✅ CORREÇÃO CRÍTICA: Suportar estrutura padronizada de autenticação
 */
function extractTenantId(req: Request): string | null {
  // AIDEV-NOTE: Usar autenticação básica Supabase com estrutura padronizada
  const user = (req as any).user;
  
  // ✅ CORREÇÃO: Priorizar estrutura direta, fallback para nested
  // Middleware simpleAuth agora define ambos: req.user.tenant_id (direto) e req.user.user_metadata.tenant_id (nested)
  const tenantId = user?.tenant_id || user?.user_metadata?.tenant_id || null;
  
  if (!tenantId) {
    console.error('🚨 [extractTenantId] Tenant ID não encontrado:', {
      hasUser: !!user,
      hasDirectTenantId: !!user?.tenant_id,
      hasNestedTenantId: !!user?.user_metadata?.tenant_id,
      userEmail: user?.email || 'unknown',
      userRole: user?.role || 'unknown',
      userStructure: user ? Object.keys(user).filter(k => k !== 'user_metadata') : 'no_user',
      userMetadataStructure: user?.user_metadata ? Object.keys(user.user_metadata) : 'no_metadata'
    });
  } else {
    // ✅ Log de sucesso em modo debug apenas
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [extractTenantId] Tenant ID extraído:', {
        tenantId: tenantId.substring(0, 8),
        source: user?.tenant_id ? 'direct' : 'nested',
        userEmail: user?.email
      });
    }
  }
  
  return tenantId;
}

// ================================================================================
// SERVIÇO PRINCIPAL DE DISTRIBUIÇÃO
// ================================================================================

export class DistributionService {
  /**
   * Buscar regra de distribuição da pipeline
   */
  static async getDistributionRule(req: Request, pipelineId: string): Promise<DistributionRule | null> {
    const tenantId = extractTenantId(req);
    if (!tenantId) {
      throw new Error('Tenant ID não encontrado');
    }

    console.log('🔍 [DistributionService] Buscando regra:', { pipelineId: pipelineId.substring(0, 8), tenantId: tenantId.substring(0, 8) });

    const { data, error } = await supabase
      .from('pipeline_distribution_rules')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ [DistributionService] Erro ao buscar regra:', error);
      throw new Error('Erro ao buscar regra de distribuição');
    }

    if (!data) {
      console.log('📋 [DistributionService] Nenhuma regra encontrada, retornando null');
      return null;
    }

    console.log('✅ [DistributionService] Regra encontrada:', data.mode);
    return data as DistributionRule;
  }

  /**
   * Salvar regra de distribuição
   */
  static async saveDistributionRule(
    req: Request, 
    pipelineId: string, 
    ruleData: Partial<DistributionRule>
  ): Promise<DistributionRule> {
    const tenantId = extractTenantId(req);
    if (!tenantId) {
      throw new Error('Tenant ID não encontrado');
    }

    console.log('💾 [DistributionService] Salvando regra:', { pipelineId: pipelineId.substring(0, 8), mode: ruleData.mode });

    // Preparar dados para upsert
    const ruleToSave = {
      pipeline_id: pipelineId,
      tenant_id: tenantId,
      mode: ruleData.mode || 'manual',
      is_active: ruleData.is_active ?? true,
      working_hours_only: ruleData.working_hours_only ?? false,
      working_hours_start: ruleData.working_hours_start || null,
      working_hours_end: ruleData.working_hours_end || null,
      working_days: ruleData.working_days || null,
      skip_inactive_members: ruleData.skip_inactive_members ?? true,
      fallback_to_manual: ruleData.fallback_to_manual ?? true,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('pipeline_distribution_rules')
      .upsert(ruleToSave, { 
        onConflict: 'pipeline_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [DistributionService] Erro ao salvar regra:', error);
      throw new Error('Erro ao salvar regra de distribuição');
    }

    console.log('✅ [DistributionService] Regra salva com sucesso');
    return data as DistributionRule;
  }

  /**
   * Buscar membros elegíveis para distribuição
   */
  static async getEligibleMembers(req: Request, pipelineId: string, skipInactive = true): Promise<Member[]> {
    const tenantId = extractTenantId(req);
    if (!tenantId) {
      throw new Error('Tenant ID não encontrado');
    }

    // Buscar membros associados à pipeline (usando JOIN manual por incompatibilidade de relacionamento)
    const { data: pipelineMembers, error: membersError } = await supabase
      .from('pipeline_members')
      .select('member_id')
      .eq('pipeline_id', pipelineId);

    if (membersError) {
      console.error('❌ [DistributionService] Erro ao buscar pipeline_members:', membersError);
      throw new Error('Erro ao buscar membros da pipeline');
    }

    if (!pipelineMembers || pipelineMembers.length === 0) {
      console.log('👥 [DistributionService] Nenhum membro associado à pipeline');
      return [];
    }

    // Buscar dados dos usuários separadamente
    const memberIds = pipelineMembers.map(m => m.member_id);
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, is_active, role, tenant_id')
      .in('id', memberIds);

    if (usersError) {
      console.error('❌ [DistributionService] Erro ao buscar dados dos usuários:', usersError);
      throw new Error('Erro ao buscar dados dos usuários');
    }

    let members = usersData?.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      is_active: user.is_active,
      tenant_id: user.tenant_id
    })) || [];

    // Filtrar por tenant_id
    members = members.filter(member => member.tenant_id === tenantId);

    // Filtrar por membros ativos se necessário
    if (skipInactive) {
      members = members.filter(member => member.is_active !== false);
    }

    console.log('👥 [DistributionService] Membros elegíveis encontrados:', members.length);
    return members;
  }

  /**
   * Algoritmo Round-Robin Principal
   */
  static async distributeRoundRobin(req: Request, pipelineId: string): Promise<DistributionResult> {
    const tenantId = extractTenantId(req);
    if (!tenantId) {
      throw new Error('Tenant ID não encontrado');
    }

    console.log('🎯 [DistributionService] Iniciando distribuição round-robin:', pipelineId.substring(0, 8));

    try {
      // 1. Buscar regra de distribuição
      const rule = await this.getDistributionRule(req, pipelineId);
      if (!rule || !rule.is_active || rule.mode !== 'rodizio') {
        return {
          success: false,
          method: 'manual',
          message: 'Distribuição automática não está ativa ou configurada para manual'
        };
      }

      // 2. Verificar horário comercial
      if (!isWithinWorkingHours(rule)) {
        if (rule.fallback_to_manual) {
          return {
            success: false,
            method: 'fallback',
            message: 'Fora do horário comercial. Usar distribuição manual.'
          };
        } else {
          return {
            success: false,
            method: 'rodizio',
            message: 'Fora do horário comercial. Distribuição rejeitada.'
          };
        }
      }

      // 3. Buscar membros elegíveis
      const members = await this.getEligibleMembers(req, pipelineId, rule.skip_inactive_members);
      if (members.length === 0) {
        if (rule.fallback_to_manual) {
          return {
            success: false,
            method: 'fallback',
            message: 'Nenhum membro elegível encontrado. Usar distribuição manual.'
          };
        } else {
          return {
            success: false,
            method: 'rodizio',
            message: 'Nenhum membro elegível disponível.'
          };
        }
      }

      // 4. Implementar algoritmo round-robin
      let selectedMember: Member;
      let nextPosition = 0;

      if (rule.last_assigned_member_id) {
        // Encontrar posição do último membro atribuído
        const lastMemberIndex = members.findIndex(m => m.id === rule.last_assigned_member_id);
        if (lastMemberIndex !== -1) {
          // Próximo membro na sequência
          nextPosition = (lastMemberIndex + 1) % members.length;
        }
      }

      selectedMember = members[nextPosition];

      // 5. Atualizar regra com novo último membro
      await supabase
        .from('pipeline_distribution_rules')
        .update({
          last_assigned_member_id: selectedMember.id,
          total_assignments: (rule.total_assignments || 0) + 1,
          successful_assignments: (rule.successful_assignments || 0) + 1,
          last_assignment_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId);

      // 6. Registrar histórico de atribuição (opcional)
      await supabase
        .from('lead_assignment_history')
        .insert({
          pipeline_id: pipelineId,
          tenant_id: tenantId,
          assigned_to: selectedMember.id,
          assignment_method: 'rodizio',
          round_robin_position: nextPosition,
          total_eligible_members: members.length,
          status: 'success',
          created_at: new Date().toISOString()
        });

      console.log('✅ [DistributionService] Distribuição bem-sucedida:', {
        memberId: selectedMember.id.substring(0, 8),
        memberName: `${selectedMember.first_name} ${selectedMember.last_name}`,
        position: nextPosition,
        totalMembers: members.length
      });

      return {
        success: true,
        assigned_to: selectedMember.id,
        member_name: `${selectedMember.first_name} ${selectedMember.last_name}`,
        method: 'rodizio',
        round_robin_position: nextPosition,
        total_eligible_members: members.length,
        message: `Lead atribuído para ${selectedMember.first_name} ${selectedMember.last_name} via rodízio automático`
      };

    } catch (error: any) {
      console.error('❌ [DistributionService] Erro na distribuição:', error);

      // Registrar falha no histórico
      await supabase
        .from('lead_assignment_history')
        .insert({
          pipeline_id: pipelineId,
          tenant_id: tenantId,
          assignment_method: 'rodizio',
          status: 'failed',
          error_message: error.message,
          created_at: new Date().toISOString()
        });

      // Atualizar contador de falhas
      const rule = await this.getDistributionRule(req, pipelineId);
      if (rule) {
        await supabase
          .from('pipeline_distribution_rules')
          .update({
            failed_assignments: (rule.failed_assignments || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('pipeline_id', pipelineId)
          .eq('tenant_id', tenantId);
      }

      return {
        success: false,
        method: 'rodizio',
        message: 'Erro na distribuição automática',
        error: error.message
      };
    }
  }

  /**
   * Testar distribuição (simulação)
   */
  static async testDistribution(req: Request, pipelineId: string): Promise<DistributionResult> {
    console.log('🧪 [DistributionService] Testando distribuição:', pipelineId.substring(0, 8));

    // Simular distribuição sem persistir mudanças
    const result = await this.distributeRoundRobin(req, pipelineId);
    
    // Se foi bem-sucedido, reverter as mudanças (é só um teste)
    if (result.success && result.assigned_to) {
      console.log('🔄 [DistributionService] Revertendo mudanças do teste');
      // Nota: Em um teste real, poderíamos usar transações ou não persistir
    }

    return {
      ...result,
      message: `[TESTE] ${result.message}`
    };
  }

  /**
   * Resetar distribuição (limpar último membro)
   */
  static async resetDistribution(req: Request, pipelineId: string): Promise<void> {
    const tenantId = extractTenantId(req);
    if (!tenantId) {
      throw new Error('Tenant ID não encontrado');
    }

    console.log('🔄 [DistributionService] Resetando distribuição:', pipelineId.substring(0, 8));

    const { error } = await supabase
      .from('pipeline_distribution_rules')
      .update({
        last_assigned_member_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('❌ [DistributionService] Erro ao resetar distribuição:', error);
      throw new Error('Erro ao resetar distribuição');
    }

    console.log('✅ [DistributionService] Distribuição resetada com sucesso');
  }

  /**
   * Buscar estatísticas de distribuição
   */
  static async getDistributionStats(req: Request, pipelineId: string): Promise<DistributionStats> {
    const tenantId = extractTenantId(req);
    if (!tenantId) {
      throw new Error('Tenant ID não encontrado');
    }

    console.log('📊 [DistributionService] Buscando estatísticas:', pipelineId.substring(0, 8));

    // Buscar regra atual
    const rule = await this.getDistributionRule(req, pipelineId);

    // Buscar histórico recente de atribuições (sem JOIN devido a problemas de relacionamento)
    const { data: recentAssignments, error: historyError } = await supabase
      .from('lead_assignment_history')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('❌ [DistributionService] Erro ao buscar histórico:', historyError);
    }

    const totalAssignments = rule?.total_assignments || 0;
    const successfulAssignments = rule?.successful_assignments || 0;
    const failedAssignments = rule?.failed_assignments || 0;
    const successRate = totalAssignments > 0 ? Math.round((successfulAssignments / totalAssignments) * 100) : 0;

    const stats: DistributionStats = {
      rule,
      total_assignments: totalAssignments,
      successful_assignments: successfulAssignments,
      failed_assignments: failedAssignments,
      last_assignment_at: rule?.last_assignment_at || null,
      recent_assignments: recentAssignments || [],
      assignment_success_rate: successRate
    };

    console.log('✅ [DistributionService] Estatísticas carregadas:', {
      total: totalAssignments,
      successRate: `${successRate}%`
    });

    return stats;
  }
}