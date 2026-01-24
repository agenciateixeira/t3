-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'event', 'deal', 'assignment', 'reminder', 'system')),
  reference_id UUID, -- ID da tarefa, evento, deal, etc
  reference_type TEXT, -- 'task', 'event', 'deal', etc
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só podem ver suas próprias notificações
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Sistema pode inserir notificações
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Usuários podem deletar suas próprias notificações
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Função para criar notificação quando tarefa é atribuída
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a tarefa foi atribuída a alguém e não é o criador
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.created_by THEN
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

-- Trigger para notificar atribuição de tarefas
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON tasks;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW
  WHEN (NEW.assignee_id IS NOT NULL)
  EXECUTE FUNCTION notify_task_assignment();

-- Função para criar notificação quando deal muda de etapa (stage)
CREATE OR REPLACE FUNCTION notify_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a etapa mudou e há um responsável
  IF NEW.stage_id != OLD.stage_id AND NEW.assignee_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.assignee_id,
      'Deal mudou de etapa',
      'O deal "' || NEW.title || '" foi movido para uma nova etapa',
      'deal',
      NEW.id,
      'deal'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para notificar mudanças de etapa em deals
DROP TRIGGER IF EXISTS trigger_notify_deal_stage_change ON deals;
CREATE TRIGGER trigger_notify_deal_stage_change
  AFTER UPDATE OF stage_id ON deals
  FOR EACH ROW
  WHEN (NEW.stage_id IS DISTINCT FROM OLD.stage_id)
  EXECUTE FUNCTION notify_deal_stage_change();

-- Função para limpar notificações antigas (mais de 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_read = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
