-- Trigger para notificar quando um novo deal é atribuído a alguém
-- Complementa o trigger existente de mudança de etapa

-- Função para criar notificação quando deal é atribuído
CREATE OR REPLACE FUNCTION notify_deal_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o deal foi atribuído a alguém e não é o criador
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.created_by THEN
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

-- Trigger para notificar atribuição de deals (INSERT e UPDATE)
DROP TRIGGER IF EXISTS trigger_notify_deal_assignment ON deals;

CREATE TRIGGER trigger_notify_deal_assignment
  AFTER INSERT OR UPDATE OF assignee_id ON deals
  FOR EACH ROW
  WHEN (NEW.assignee_id IS NOT NULL)
  EXECUTE FUNCTION notify_deal_assignment();

-- Comentários
COMMENT ON FUNCTION notify_deal_assignment() IS 'Cria notificação quando um deal é atribuído a um usuário (novo ou mudança de responsável)';
COMMENT ON TRIGGER trigger_notify_deal_assignment ON deals IS 'Notifica usuário quando recebe atribuição de um deal';
