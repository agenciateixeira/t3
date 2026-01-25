-- ============================================================================
-- CORRIGIR CONSTRAINT DE REFERENCE_TYPE
-- ============================================================================
-- Garantir que 'event' está incluído no reference_type
-- ============================================================================

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;

-- Adicionar nova constraint com 'event' incluído
ALTER TABLE notifications
ADD CONSTRAINT notifications_reference_type_check
CHECK (reference_type IS NULL OR reference_type IN ('task', 'event', 'deal', 'message'));

COMMENT ON CONSTRAINT notifications_reference_type_check ON notifications IS
'Permite valores: task, event, deal, message ou NULL';
