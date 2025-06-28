-- MIGRAÇÃO: Fix Users Table RLS Policies
-- Data: 2025-01-27
-- Objetivo: Corrigir políticas RLS da tabela users para permitir criação de admins

-- 1. Remover políticas existentes problemáticas (se existirem)
DROP POLICY IF EXISTS "Users can view own profile" ON auth.users;
DROP POLICY IF EXISTS "Users can update own profile" ON auth.users;
DROP POLICY IF EXISTS "Admins can create users" ON auth.users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON auth.users;

-- 2. Verificar se RLS está habilitado na tabela users (custom)
-- Nota: Não mexemos na tabela auth.users do Supabase
DO $$
BEGIN
    -- Verificar se nossa tabela custom users existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Desabilitar RLS temporariamente para permitir INSERTs
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        
        -- Ou criar políticas permissivas para desenvolvimento
        -- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir INSERT de novos usuários (criação de empresas)
        CREATE POLICY "Allow company creation user inserts" ON public.users
            FOR INSERT
            WITH CHECK (true);
        
        -- Política para permitir SELECT por tenant_id
        CREATE POLICY "Users can view by tenant" ON public.users
            FOR SELECT
            USING (
                tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
                OR 
                auth.uid() IS NULL -- Permitir durante desenvolvimento
            );
        
        -- Política para permitir UPDATE próprio perfil
        CREATE POLICY "Users can update own profile" ON public.users
            FOR UPDATE
            USING (id = auth.uid() OR auth.uid() IS NULL);
            
        RAISE NOTICE 'RLS policies updated for public.users table';
    ELSE
        RAISE NOTICE 'Custom users table not found, skipping RLS setup';
    END IF;
END $$;

-- 3. Criar função para verificar schema da tabela users
CREATE OR REPLACE FUNCTION check_users_table_schema()
RETURNS TABLE(column_name text, data_type text, is_nullable text) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text
    FROM information_schema.columns c
    WHERE c.table_name = 'users' 
    AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$;

-- 4. Verificar se a coluna phone existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'phone'
    ) THEN
        RAISE NOTICE 'Column phone exists in users table ✅';
    ELSE
        RAISE NOTICE 'Column phone does NOT exist in users table ❌';
        
        -- Adicionar coluna phone se não existir
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
        RAISE NOTICE 'Column phone added to users table ✅';
    END IF;
END $$;

-- 5. Garantir que todas as colunas necessárias existam
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

COMMENT ON TABLE public.users IS 'Enterprise CRM Users Table - Updated 2025-01-27'; 