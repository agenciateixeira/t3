-- ============================================================================
-- CORRIGIR CONSTRAINT DA TABELA NOTIFICATIONS
-- ============================================================================
-- Adicionar 'message' aos valores permitidos no type check constraint
-- ============================================================================

-- PASSO 1: Primeiro, atualizar quaisquer dados inválidos existentes
-- Converter tipos inválidos para 'system'
UPDATE notifications
SET type = 'system'
WHERE type NOT IN ('task', 'event', 'deal', 'assignment', 'reminder', 'system', 'message');

-- PASSO 2: Remover constraint antiga se existir
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- PASSO 3: Adicionar constraint nova com 'message'
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('task', 'event', 'deal', 'assignment', 'reminder', 'system', 'message'));

-- PASSO 4: Fazer o mesmo para reference_type se houver constraint
-- Atualizar dados inválidos
UPDATE notifications
SET reference_type = NULL
WHERE reference_type IS NOT NULL
  AND reference_type NOT IN ('task', 'event', 'deal', 'message');

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;

-- Adicionar nova constraint
ALTER TABLE notifications
ADD CONSTRAINT notifications_reference_type_check
CHECK (reference_type IS NULL OR reference_type IN ('task', 'event', 'deal', 'message'));

-- Adicionar coluna metadata se não existir (para salvar group_id ou sender_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT NULL;
  END IF;
END $$;

-- Criar índice para buscar por metadata
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN (metadata);

COMMENT ON COLUMN notifications.metadata IS
'Metadados adicionais da notificação. Para mensagens de chat, contém group_id ou sender_id para navegar para a conversa correta.';
