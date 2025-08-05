-- =====================================================================================
-- MIGRATION: Adicionar coluna title na tabela meetings
-- Data: 2025-08-02
-- Descrição: Adiciona campo title para armazenar título das reuniões
-- =====================================================================================

-- Adicionar coluna title na tabela meetings
ALTER TABLE meetings 
ADD COLUMN title VARCHAR(500) NOT NULL DEFAULT 'Reunião';

-- Atualizar registros existentes com título baseado em notes ou padrão
UPDATE meetings 
SET title = COALESCE(
  CASE 
    WHEN notes IS NOT NULL AND LENGTH(TRIM(notes)) > 0 
    THEN CONCAT('Reunião - ', LEFT(TRIM(notes), 50))
    ELSE 'Reunião'
  END
) 
WHERE title IS NULL OR title = '' OR title = 'Reunião';

-- Comentário na coluna para documentação
COMMENT ON COLUMN meetings.title IS 'Título da reunião definido pelo usuário (obrigatório)';