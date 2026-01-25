-- Trigger para enviar push notification quando uma nova notificação é criada
-- Este trigger chama a Edge Function send-push-notification

CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_result TEXT;
BEGIN
  -- Chama a Edge Function de forma assíncrona
  -- Usamos pg_net extension do Supabase para fazer chamadas HTTP

  -- Nota: A Edge Function será chamada de forma assíncrona
  -- Não esperamos resposta para não bloquear a inserção da notificação

  PERFORM
    net.http_post(
      url := 'https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id,
        'notification', jsonb_build_object(
          'title', NEW.title,
          'message', NEW.message,
          'type', NEW.type,
          'reference_id', NEW.reference_id,
          'reference_type', NEW.reference_type
        )
      )
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro ao enviar push, não bloqueia a criação da notificação
    -- Apenas loga o erro
    RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger
DROP TRIGGER IF EXISTS trigger_send_push_on_notification_insert ON notifications;

CREATE TRIGGER trigger_send_push_on_notification_insert
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_push_notification();

-- Comentários
COMMENT ON FUNCTION trigger_send_push_notification() IS 'Chama a Edge Function para enviar push notification quando uma notificação é criada';
COMMENT ON TRIGGER trigger_send_push_on_notification_insert ON notifications IS 'Envia push notification automaticamente após inserir uma nova notificação';
