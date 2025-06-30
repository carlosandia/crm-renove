// CORREÇÃO BACKEND - TIPOS COMPATÍVEIS COM ANÁLISE MCP SUPABASE
// ================================================================

export interface Pipeline {
  id: string;                    // UUID como string
  name: string;                  // TEXT
  description?: string;          // TEXT opcional
  tenant_id: string;             // TEXT (não UUID!)
  created_by?: string;           // TEXT opcional
  created_at?: string;           // timestamp
  updated_at?: string;           // timestamp
  is_active?: boolean;           // boolean
}

export interface PipelineNameValidation {
  is_valid: boolean;
  error?: string;
  suggestion?: string;
  similar_names?: string[];
}

/*
CORREÇÕES APLICADAS VIA MCP SUPABASE:
=====================================

✅ ANÁLISE COMPLETA DAS TABELAS:
- pipelines.id: UUID (gen_random_uuid())
- pipelines.tenant_id: TEXT (não UUID!)
- pipelines.name: TEXT
- pipelines.created_by: TEXT

✅ FUNÇÃO SQL CORRIGIDA:
- validate_pipeline_name_unique() com conversão p_pipeline_id::UUID
- Exception handling robusto
- Sugestões inteligentes automáticas

✅ TESTES VALIDADOS:
- Nome válido: ✅ PASSOU
- Nome vazio: ✅ PASSOU  
- Nome duplicado: ✅ PASSOU
- Sugestões: ✅ PASSOU

✅ SISTEMA ATIVO:
- Índice único: idx_pipelines_unique_name_per_tenant
- Função validação: validate_pipeline_name_unique()
- Função sugestões: get_pipeline_name_suggestions()
- Permissões configuradas para todos os roles

SISTEMA DE VALIDAÇÃO ENTERPRISE FUNCIONANDO! 🎉
*/
