-- ============================================================================
-- CORRIGIR DEFINITIVAMENTE CONSTRAINT DE REFERENCE_TYPE
-- ============================================================================

-- 1. Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;

-- 2. Criar nova constraint permitindo: task, event, deal, message
ALTER TABLE notifications
ADD CONSTRAINT notifications_reference_type_check
CHECK (reference_type IS NULL OR reference_type IN ('task', 'event', 'deal', 'message'));

-- Verificar se funcionou
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'notifications_reference_type_check';
