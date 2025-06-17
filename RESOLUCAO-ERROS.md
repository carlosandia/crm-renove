# RESOLUÇÃO DOS ERROS DO CONSOLE

## 1. EXECUTAR SQL NO SUPABASE DASHBOARD

Copie e cole este SQL no Supabase Dashboard (SQL Editor):

```sql
-- Criar tabela user_pipeline_links
CREATE TABLE IF NOT EXISTS user_pipeline_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pipeline_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_user_id ON user_pipeline_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_pipeline_id ON user_pipeline_links(pipeline_id);

-- Habilitar RLS
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;
```

## 2. PROBLEMAS RESOLVIDOS

✅ **usePipelines** - Agora usa Supabase diretamente em vez de localhost:5001
✅ **useMembers** - Agora usa Supabase diretamente em vez de localhost:5001  
✅ **useMCP** - Usa dados mock (não precisa de API externa)
✅ **CustomFieldsManager** - Usa Supabase diretamente
✅ **PipelineFormWithStagesAndFields** - Usa Supabase diretamente
✅ **Tabela user_pipeline_links** - Será criada com o SQL acima

## 3. APÓS EXECUTAR O SQL

1. Recarregue a página (F5)
2. Os erros 404 no console devem desaparecer
3. O vínculo de pipelines deve funcionar corretamente
4. Todas as funcionalidades devem estar operacionais

## 4. VERIFICAÇÃO

Se ainda houver erros, verifique:
- Se o SQL foi executado com sucesso no Supabase
- Se não há erros de sintaxe no console
- Se as tabelas foram criadas corretamente 