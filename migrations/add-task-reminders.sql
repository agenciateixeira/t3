-- ============================================================================
-- Sistema de Lembretes Automáticos de Tarefas
-- Envia notificações 24h antes e no dia do vencimento
-- ============================================================================

-- Função para enviar lembretes de tarefas próximas do vencimento
CREATE OR REPLACE FUNCTION send_task_reminders()
RETURNS void AS $$
DECLARE
  v_task RECORD;
  v_assignee_name TEXT;
BEGIN
  -- LEMBRETE 1: Tarefas que vencem em 24 horas
  FOR v_task IN
    SELECT
      t.id,
      t.title,
      t.assignee_id,
      t.due_date,
      t.due_time
    FROM tasks t
    WHERE t.assignee_id IS NOT NULL
    AND t.status != 'completed'
    AND t.due_date IS NOT NULL
    -- Tarefas que vencem amanhã (entre 23h e 25h a partir de agora)
    AND t.due_date::date = (CURRENT_DATE + INTERVAL '1 day')::date
    -- Não enviar se já foi enviado lembrete nas últimas 23 horas
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.reference_id = t.id
      AND n.reference_type = 'task'
      AND n.type = 'reminder'
      AND n.created_at > NOW() - INTERVAL '23 hours'
    )
  LOOP
    -- Buscar nome do responsável
    SELECT full_name INTO v_assignee_name
    FROM profiles
    WHERE id = v_task.assignee_id;

    -- Criar notificação
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      v_task.assignee_id,
      'Lembrete: Tarefa vence amanhã',
      'A tarefa "' || v_task.title || '" vence amanhã' ||
      CASE
        WHEN v_task.due_time IS NOT NULL THEN ' às ' || v_task.due_time
        ELSE ''
      END,
      'reminder',
      v_task.id,
      'task'
    );
  END LOOP;

  -- LEMBRETE 2: Tarefas que vencem HOJE
  FOR v_task IN
    SELECT
      t.id,
      t.title,
      t.assignee_id,
      t.due_date,
      t.due_time
    FROM tasks t
    WHERE t.assignee_id IS NOT NULL
    AND t.status != 'completed'
    AND t.due_date IS NOT NULL
    -- Tarefas que vencem hoje
    AND t.due_date::date = CURRENT_DATE
    -- Não enviar se já foi enviado lembrete nas últimas 4 horas
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.reference_id = t.id
      AND n.reference_type = 'task'
      AND n.type = 'reminder'
      AND n.message LIKE '%vence hoje%'
      AND n.created_at > NOW() - INTERVAL '4 hours'
    )
  LOOP
    -- Criar notificação
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      v_task.assignee_id,
      '⚠️ Tarefa vence HOJE',
      'A tarefa "' || v_task.title || '" vence hoje' ||
      CASE
        WHEN v_task.due_time IS NOT NULL THEN ' às ' || v_task.due_time
        ELSE ''
      END,
      'reminder',
      v_task.id,
      'task'
    );
  END LOOP;

  -- LEMBRETE 3: Tarefas ATRASADAS (venceram ontem ou antes)
  FOR v_task IN
    SELECT
      t.id,
      t.title,
      t.assignee_id,
      t.due_date,
      t.due_time,
      CURRENT_DATE - t.due_date::date as days_overdue
    FROM tasks t
    WHERE t.assignee_id IS NOT NULL
    AND t.status != 'completed'
    AND t.due_date IS NOT NULL
    -- Tarefas vencidas (até 7 dias atrás)
    AND t.due_date::date < CURRENT_DATE
    AND t.due_date::date >= CURRENT_DATE - INTERVAL '7 days'
    -- Não enviar se já foi enviado lembrete nas últimas 24 horas
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.reference_id = t.id
      AND n.reference_type = 'task'
      AND n.type = 'reminder'
      AND n.message LIKE '%atrasada%'
      AND n.created_at > NOW() - INTERVAL '24 hours'
    )
  LOOP
    -- Criar notificação
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      v_task.assignee_id,
      '🔴 Tarefa ATRASADA',
      'A tarefa "' || v_task.title || '" está atrasada há ' || v_task.days_overdue || ' dia(s)',
      'reminder',
      v_task.id,
      'task'
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_task_reminders() IS 'Envia lembretes de tarefas: 24h antes, no dia, e quando atrasadas. Deve ser chamada periodicamente (ex: a cada 4 horas via cron)';

-- Para testar manualmente:
-- SELECT send_task_reminders();

-- Para automatizar, você pode:
-- 1. Criar Edge Function com cron trigger
-- 2. Usar pg_cron (se disponível)
-- 3. Chamar manualmente quando necessário
