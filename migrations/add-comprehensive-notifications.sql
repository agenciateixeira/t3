-- ============================================================================
-- Sistema Completo de Notificações
-- Inclui: Chat, Menções, Timers Ativos
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICAÇÕES DE CHAT
-- ============================================================================

-- Função para notificar membros de grupo quando nova mensagem chega
CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_group_name TEXT;
  v_sender_name TEXT;
  v_message_preview TEXT;
BEGIN
  -- Só processa mensagens de grupo (não privadas)
  IF NEW.group_id IS NOT NULL AND (NEW.private IS NULL OR NEW.private = FALSE) THEN

    -- Buscar nome do grupo
    SELECT name INTO v_group_name
    FROM chat_groups
    WHERE id = NEW.group_id;

    -- Buscar nome do remetente
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE id = NEW.sender_id;

    -- Preview da mensagem (primeiros 50 caracteres)
    v_message_preview := LEFT(COALESCE(NEW.content, 'Enviou uma mídia'), 50);
    IF LENGTH(COALESCE(NEW.content, '')) > 50 THEN
      v_message_preview := v_message_preview || '...';
    END IF;

    -- Notificar todos os membros do grupo EXCETO o remetente
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    SELECT
      gm.user_id,
      'Nova mensagem em ' || COALESCE(v_group_name, 'grupo'),
      COALESCE(v_sender_name, 'Alguém') || ': ' || v_message_preview,
      'system',
      NEW.group_id,
      'chat_group'
    FROM group_members gm
    WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.sender_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificações de chat
DROP TRIGGER IF EXISTS trigger_notify_new_chat_message ON messages;

CREATE TRIGGER trigger_notify_new_chat_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_chat_message();

COMMENT ON FUNCTION notify_new_chat_message() IS 'Notifica membros do grupo quando nova mensagem é enviada (exceto o remetente)';

-- ============================================================================
-- 2. NOTIFICAÇÕES DE MENÇÕES (@usuario)
-- ============================================================================
-- NOTA: Implementação de menções foi movida para fase futura
-- Requer modificação no frontend para detectar e armazenar menções
-- Por enquanto, apenas criamos a estrutura básica

-- Placeholder: Função será implementada quando o frontend suportar menções
COMMENT ON TABLE notifications IS 'Sistema de notificações - suporta menções via tipo "mention" (a implementar no frontend)';

-- ============================================================================
-- 3. NOTIFICAÇÕES DE TIMERS ATIVOS
-- ============================================================================

-- Função para notificar admins e gerentes sobre timers ativos
-- Esta será chamada periodicamente (ex: a cada 30 minutos)
CREATE OR REPLACE FUNCTION notify_active_timers()
RETURNS void AS $$
DECLARE
  v_admin_count INT;
  v_timer RECORD;
  v_user_name TEXT;
  v_task_title TEXT;
BEGIN
  -- Notificar ADMINS sobre TODOS os timers ativos
  FOR v_timer IN
    SELECT DISTINCT t.user_id, t.task_id, t.started_at
    FROM timers t
    WHERE t.ended_at IS NULL
    AND t.started_at > NOW() - INTERVAL '8 hours' -- Só timers das últimas 8 horas
  LOOP
    -- Buscar info do usuário e tarefa
    SELECT p.full_name INTO v_user_name
    FROM profiles p
    WHERE p.id = v_timer.user_id;

    SELECT tk.title INTO v_task_title
    FROM tasks tk
    WHERE tk.id = v_timer.task_id;

    -- Notificar todos os admins
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    SELECT
      p.id,
      'Timer ativo',
      COALESCE(v_user_name, 'Usuário') || ' está com timer ativo em: ' || COALESCE(v_task_title, 'tarefa'),
      'system',
      v_timer.task_id,
      'timer'
    FROM profiles p
    WHERE p.role = 'admin';

  END LOOP;

  -- Notificar GERENTES sobre timers do PRÓPRIO TIME
  FOR v_timer IN
    SELECT DISTINCT t.user_id, t.task_id, t.started_at, p.team_id
    FROM timers t
    JOIN profiles p ON p.id = t.user_id
    WHERE t.ended_at IS NULL
    AND t.started_at > NOW() - INTERVAL '8 hours'
    AND p.team_id IS NOT NULL
  LOOP
    -- Buscar info do usuário e tarefa
    SELECT p.full_name INTO v_user_name
    FROM profiles p
    WHERE p.id = v_timer.user_id;

    SELECT tk.title INTO v_task_title
    FROM tasks tk
    WHERE tk.id = v_timer.task_id;

    -- Notificar gerentes do mesmo time
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    SELECT
      p.id,
      'Timer ativo no seu time',
      COALESCE(v_user_name, 'Membro do time') || ' está com timer ativo em: ' || COALESCE(v_task_title, 'tarefa'),
      'system',
      v_timer.task_id,
      'timer'
    FROM profiles p
    WHERE p.role = 'team_manager'
    AND p.team_id = v_timer.team_id;

  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_active_timers() IS 'Notifica admins (todos timers) e gerentes (timers do time) sobre timers ativos. Deve ser chamada periodicamente via cron job.';

-- ============================================================================
-- 4. ADICIONAR NOVOS TIPOS DE NOTIFICAÇÃO À CONSTRAINT
-- ============================================================================

-- Remover constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar constraint com novos tipos
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN ('task', 'event', 'deal', 'assignment', 'reminder', 'system', 'mention', 'timer', 'chat_group'));

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Tipos de notificação: task, event, deal, assignment, reminder, system, mention, timer, chat_group';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- Para executar a função de timers periodicamente, você pode:
-- 1. Usar pg_cron (se disponível no Supabase)
-- 2. Chamar via Edge Function com cron
-- 3. Chamar manualmente quando necessário:
--    SELECT notify_active_timers();
