-- VERSÃO FINAL CORRIGIDA - SISTEMA DE VALIDAÇÃO DE PIPELINES
-- Baseada na análise completa das tabelas via MCP Supabase
-- ========================================================================

-- ANÁLISE DOS TIPOS REAIS DAS TABELAS:
-- pipelines.id: UUID (gen_random_uuid())
-- pipelines.tenant_id: TEXT (não UUID!)
-- pipelines.name: TEXT
-- pipeline_stages.pipeline_id: UUID
-- leads.tenant_id: UUID
-- users.tenant_id: UUID

-- PROBLEMA IDENTIFICADO:
-- A função anterior tentava comparar UUID (id) com TEXT (p_pipeline_id)
-- SOLUÇÃO: Conversão adequada de tipos

-- ========================================================================
-- ETAPA 1: FUNÇÃO DE VALIDAÇÃO CORRIGIDA
-- ========================================================================

CREATE OR REPLACE FUNCTION validate_pipeline_name_unique(
    p_name TEXT,
    p_tenant_id TEXT,
    p_pipeline_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    name_clean TEXT;
    existing_count INTEGER;
    similar_names JSONB;
    suggestion_counter INTEGER := 2;
    suggestion_name TEXT;
    final_suggestion TEXT;
BEGIN
    -- Validação de entrada
    name_clean := LOWER(TRIM(p_name));
    
    IF name_clean = '' OR name_clean IS NULL THEN
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'Nome obrigatório',
            'suggestion', null,
            'similar_names', '[]'::jsonb
        );
    END IF;
    
    -- Verificar se existe pipeline com o mesmo nome
    -- CORREÇÃO CRÍTICA: Comparar UUID com UUID usando CAST
    IF p_pipeline_id IS NOT NULL AND p_pipeline_id != '' THEN
        -- Modo edição: excluir o pipeline atual da validação
        SELECT COUNT(*) INTO existing_count
        FROM pipelines
        WHERE tenant_id = p_tenant_id
          AND LOWER(TRIM(name)) = name_clean
          AND id != p_pipeline_id::UUID;
    ELSE
        -- Modo criação: verificar todos os pipelines
        SELECT COUNT(*) INTO existing_count
        FROM pipelines
        WHERE tenant_id = p_tenant_id
          AND LOWER(TRIM(name)) = name_clean;
    END IF;
    
    -- Se nome é único, retornar válido
    IF existing_count = 0 THEN
        RETURN jsonb_build_object(
            'is_valid', true,
            'error', null,
            'suggestion', null,
            'similar_names', '[]'::jsonb
        );
    END IF;
    
    -- Gerar sugestão inteligente
    LOOP
        suggestion_name := p_name || ' (' || suggestion_counter || ')';
        
        -- Verificar se sugestão já existe
        SELECT COUNT(*) INTO existing_count
        FROM pipelines
        WHERE tenant_id = p_tenant_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(suggestion_name));
        
        IF existing_count = 0 THEN
            final_suggestion := suggestion_name;
            EXIT;
        END IF;
        
        suggestion_counter := suggestion_counter + 1;
        
        -- Limite de segurança para evitar loop infinito
        IF suggestion_counter > 100 THEN
            final_suggestion := p_name || ' (' || EXTRACT(EPOCH FROM NOW())::INTEGER || ')';
            EXIT;
        END IF;
    END LOOP;
    
    -- Buscar nomes similares para contexto
    WITH similar_names_cte AS (
        SELECT name
        FROM pipelines
        WHERE tenant_id = p_tenant_id
          AND LOWER(TRIM(name)) LIKE '%' || LOWER(TRIM(p_name)) || '%'
          AND LOWER(TRIM(name)) != name_clean
        ORDER BY name
        LIMIT 5
    )
    SELECT jsonb_agg(name) INTO similar_names
    FROM similar_names_cte;
    
    -- Retornar resultado com erro e sugestão
    RETURN jsonb_build_object(
        'is_valid', false,
        'error', 'Pipeline com este nome já existe',
        'suggestion', final_suggestion,
        'similar_names', COALESCE(similar_names, '[]'::jsonb)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback em caso de erro
        RETURN jsonb_build_object(
            'is_valid', false,
            'error', 'Erro na validação: ' || SQLSTATE || ' - ' || SQLERRM,
            'suggestion', p_name || ' (2)',
            'similar_names', '[]'::jsonb
        );
END;
$$;

-- ========================================================================
-- ETAPA 2: GARANTIR PERMISSÕES CORRETAS
-- ========================================================================

GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique(TEXT, TEXT, TEXT) TO service_role;

-- ========================================================================
-- ETAPA 3: FUNÇÃO AUXILIAR PARA MÚLTIPLAS SUGESTÕES
-- ========================================================================

CREATE OR REPLACE FUNCTION get_pipeline_name_suggestions(
    p_base_name TEXT,
    p_tenant_id TEXT,
    p_limit INTEGER DEFAULT 5
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    suggestions JSONB := '[]'::jsonb;
    counter INTEGER := 2;
    suggestion_name TEXT;
    existing_count INTEGER;
BEGIN
    -- Validação de entrada
    IF p_base_name IS NULL OR TRIM(p_base_name) = '' THEN
        RETURN suggestions;
    END IF;
    
    -- Gerar múltiplas sugestões
    WHILE jsonb_array_length(suggestions) < p_limit AND counter <= 50 LOOP
        suggestion_name := p_base_name || ' (' || counter || ')';
        
        -- Verificar se sugestão está disponível
        SELECT COUNT(*) INTO existing_count
        FROM pipelines
        WHERE tenant_id = p_tenant_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(suggestion_name));
        
        IF existing_count = 0 THEN
            suggestions := suggestions || jsonb_build_object('name', suggestion_name);
        END IF;
        
        counter := counter + 1;
    END LOOP;
    
    RETURN suggestions;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '[]'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pipeline_name_suggestions(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pipeline_name_suggestions(TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_pipeline_name_suggestions(TEXT, TEXT, INTEGER) TO service_role;

-- ========================================================================
-- ETAPA 4: TESTES DE VALIDAÇÃO COMPLETOS
-- ========================================================================

-- Teste 1: Validação básica com nome válido
SELECT 'TESTE 1 - Nome válido' as teste,
       validate_pipeline_name_unique('Pipeline Teste Único', 'tenant-test-123');

-- Teste 2: Nome vazio (deve falhar)
SELECT 'TESTE 2 - Nome vazio' as teste,
       validate_pipeline_name_unique('', 'tenant-test-123');

-- Teste 3: Nome apenas com espaços (deve falhar)
SELECT 'TESTE 3 - Nome apenas espaços' as teste,
       validate_pipeline_name_unique('   ', 'tenant-test-123');

-- Teste 4: Função de sugestões
SELECT 'TESTE 4 - Sugestões múltiplas' as teste,
       get_pipeline_name_suggestions('Pipeline Base', 'tenant-test-123', 3);

-- ========================================================================
-- ETAPA 5: DOCUMENTAÇÃO E COMENTÁRIOS
-- ========================================================================

COMMENT ON FUNCTION validate_pipeline_name_unique(TEXT, TEXT, TEXT) IS 
'Valida se nome de pipeline é único por tenant com validação case-insensitive.
ENTRADA: nome, tenant_id, pipeline_id_opcional (para modo edição)
SAÍDA: JSON com is_valid (boolean), error (string), suggestion (string), similar_names (array)
TIPOS CORRETOS: pipelines.id=UUID, tenant_id=TEXT, name=TEXT';

COMMENT ON FUNCTION get_pipeline_name_suggestions(TEXT, TEXT, INTEGER) IS 
'Gera múltiplas sugestões de nomes disponíveis baseado em um nome base.
ENTRADA: nome_base, tenant_id, limite_sugestões (padrão: 5)
SAÍDA: JSON array com sugestões disponíveis';

-- ========================================================================
-- ETAPA 6: VERIFICAÇÃO DE SISTEMA
-- ========================================================================

-- Verificar se índice único existe
SELECT 'ÍNDICE ÚNICO' as componente,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM pg_indexes 
               WHERE indexname = 'idx_pipelines_unique_name_per_tenant'
           ) THEN '✅ EXISTE'
           ELSE '❌ NÃO EXISTE'
       END as status;

-- Verificar se função existe
SELECT 'FUNÇÃO VALIDAÇÃO' as componente,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM pg_proc 
               WHERE proname = 'validate_pipeline_name_unique'
           ) THEN '✅ EXISTE'
           ELSE '❌ NÃO EXISTE'
       END as status;

-- ========================================================================
-- RESUMO DA CORREÇÃO APLICADA
-- ========================================================================

/*
🔧 CORREÇÕES IMPLEMENTADAS:

1. TIPOS DE DADOS CORRIGIDOS:
   ❌ Antes: Comparava UUID (id) diretamente com TEXT (p_pipeline_id)
   ✅ Agora: Conversão explícita p_pipeline_id::UUID

2. VALIDAÇÃO ROBUSTA:
   ✅ Tratamento de casos edge (nulo, vazio, espaços)
   ✅ Exception handling para erros inesperados
   ✅ Limite de segurança para loops infinitos

3. PERFORMANCE:
   ✅ Índice único case-insensitive já existe
   ✅ Queries otimizadas com LIMIT
   ✅ CTE para consultas complexas

4. FUNCIONALIDADES ENTERPRISE:
   ✅ Sugestões inteligentes automáticas
   ✅ Lista de nomes similares para contexto
   ✅ Modo edição vs criação
   ✅ Múltiplas sugestões disponíveis

5. SEGURANÇA:
   ✅ Permissões corretas para todos os roles
   ✅ Validação SQL injection resistant
   ✅ Fallback para casos de erro

COMPATIBILIDADE:
✅ Backend TypeScript (tipos TEXT/UUID compatíveis)
✅ Frontend React (JSON response padronizado)
✅ Supabase RLS e políticas de segurança
✅ Multi-tenant com tenant_id TEXT
*/ 