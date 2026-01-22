-- ============================================================================
-- ADD NEXT_RESPONSIBLE_USER TO DEALS
-- ============================================================================
-- Adiciona campo de profissional responsável pela próxima tarefa
-- Complementa o campo next_responsible_sector que já existe
-- ============================================================================

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS next_responsible_user UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Verificar estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deals'
AND column_name IN ('next_responsible_sector', 'next_responsible_user', 'assignee_id')
ORDER BY column_name;
