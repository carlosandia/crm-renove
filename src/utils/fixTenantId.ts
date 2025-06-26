import { supabase } from '../lib/supabase';

/**
 * Utilitário para corrigir o tenant_id do usuário logado
 * Usado para resolver o problema específico do teste3@teste3.com
 */
export const fixUserTenantId = async () => {
  console.log('🔧 Iniciando correção do tenant_id...');
  
  try {
    // Buscar usuário salvo no localStorage
    const savedUser = localStorage.getItem('crm_user');
    if (!savedUser) {
      console.log('❌ Nenhum usuário no localStorage');
      return false;
    }
    
    const userData = JSON.parse(savedUser);
    console.log('👤 Usuário atual:', userData.email);
    
    // Buscar tenant_id real no banco
    const { data: userFromDB, error } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('email', userData.email)
      .single();
    
    if (error || !userFromDB) {
      console.log('❌ Erro ao buscar usuário no banco:', error);
      return false;
    }
    
    const realTenantId = userFromDB.tenant_id;
    console.log('🔍 tenant_id real no banco:', realTenantId);
    console.log('🔍 tenant_id no localStorage:', userData.tenant_id);
    
    // Se diferentes, atualizar
    if (realTenantId !== userData.tenant_id) {
      console.log('🔧 Atualizando tenant_id...');
      userData.tenant_id = realTenantId;
      localStorage.setItem('crm_user', JSON.stringify(userData));
      console.log('✅ tenant_id atualizado para:', realTenantId);
      
      // Forçar reload da página para recarregar contextos
      console.log('🔄 Recarregando página para aplicar mudanças...');
      window.location.reload();
      return true;
    } else {
      console.log('✅ tenant_id já está correto');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tenant_id:', error);
    return false;
  }
};

/**
 * Buscar todas as pipelines de um tenant específico
 */
export const getAllPipelinesForTenant = async (tenantId: string) => {
  console.log('🔍 Buscando pipelines para tenant:', tenantId);
  
  try {
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select(`
        *,
        pipeline_stages(*),
        pipeline_custom_fields(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar pipelines:', error);
      return [];
    }
    
    console.log('✅ Pipelines encontradas:', pipelines?.length || 0);
    pipelines?.forEach(p => {
      console.log(`  📋 ${p.name} (ID: ${p.id})`);
    });
    
    return pipelines || [];
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    return [];
  }
}; 