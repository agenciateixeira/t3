-- Atualizar triggers para notificar mesmo quando atribui para si mesmo
-- Remove a condição que verifica se assignee != creator

-- Atualizar função de notificação de tarefas
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a tarefa foi atribuída a alguém (mesmo se for o próprio criador)
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.assignee_id,
      'Nova tarefa atribuída',
      'Você foi atribuído à tarefa: ' || NEW.title,
      'assignment',
      NEW.id,
      'task'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função de notificação de deals
CREATE OR REPLACE FUNCTION notify_deal_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o deal foi atribuído a alguém (mesmo se for o próprio criador)
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.assignee_id,
      'Novo deal atribuído',
      'Você foi atribuído ao deal: ' || NEW.title,
      'assignment',
      NEW.id,
      'deal'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION notify_task_assignment() IS 'Cria notificação quando uma tarefa é atribuída (incluindo auto-atribuição)';
COMMENT ON FUNCTION notify_deal_assignment() IS 'Cria notificação quando um deal é atribuído (incluindo auto-atribuição)';
