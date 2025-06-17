-- ============================================
-- CONFIGURAÇÃO DE FUSO HORÁRIO BRASÍLIA
-- ============================================

-- Adicionar coluna last_login se não existir
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo');

-- Criar função para atualizar último acesso em horário de Brasília
CREATE OR REPLACE FUNCTION update_last_login_brasilia()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = NOW() AT TIME ZONE 'America/Sao_Paulo';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar último acesso automaticamente
DROP TRIGGER IF EXISTS update_customer_last_login ON customers;
CREATE TRIGGER update_customer_last_login
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_last_login_brasilia();

-- Atualizar registros existentes com horário de Brasília
UPDATE customers 
SET last_login = NOW() AT TIME ZONE 'America/Sao_Paulo'
WHERE last_login IS NULL;

-- Verificar se funcionou
SELECT id, name, company, last_login, 
       last_login AT TIME ZONE 'America/Sao_Paulo' as brasilia_time
FROM customers;

-- Função para simular login (atualizar último acesso)
CREATE OR REPLACE FUNCTION simulate_customer_login(customer_email TEXT)
RETURNS void AS $$
BEGIN
    UPDATE customers 
    SET last_login = NOW() AT TIME ZONE 'America/Sao_Paulo'
    WHERE email = customer_email;
END;
$$ language 'plpgsql';

-- Exemplo de uso:
-- SELECT simulate_customer_login('joao@empresaabc.com'); 