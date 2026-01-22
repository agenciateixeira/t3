-- ============================================================================
-- ADD REPLY_TO FIELD TO DEAL ACTIVITIES
-- ============================================================================
-- Adiciona campo para permitir respostas/comentários em atividades
-- ============================================================================

ALTER TABLE deal_activities
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES deal_activities(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance nas queries de respostas
CREATE INDEX IF NOT EXISTS idx_deal_activities_reply_to ON deal_activities(reply_to);

-- Verificar estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deal_activities'
AND column_name IN ('id', 'deal_id', 'reply_to')
ORDER BY column_name;
