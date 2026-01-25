-- ============================================================================
-- Database Webhook via SQL Trigger
-- Substitui a necessidade de configurar webhook manualmente no dashboard
-- ============================================================================

-- Habilitar extensão pg_net (já vem habilitada no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que envia requisição HTTP para a Edge Function
CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
BEGIN
  -- Chama a Edge Function de forma assíncrona usando pg_net
  -- Não espera resposta para não bloquear a inserção da notificação

  SELECT net.http_post(
    url := 'https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2JpbG15YmxxbG9tb2Fpc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTM4MzgsImV4cCI6MjA4Mzk2OTgzOH0.dm6A7cymtNHUNGBWeQaTEAstKPhpMsAvBA9NteqhE28'
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
  ) INTO v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro ao enviar push, não bloqueia a criação da notificação
    -- Apenas loga o erro
    RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_send_push_on_notification_insert ON notifications;

-- Cria o trigger que dispara após INSERT na tabela notifications
CREATE TRIGGER trigger_send_push_on_notification_insert
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_push_notification();

-- Comentários
COMMENT ON FUNCTION trigger_send_push_notification() IS 'Chama a Edge Function send-push-notification via HTTP POST usando pg_net quando uma notificação é criada';
COMMENT ON TRIGGER trigger_send_push_on_notification_insert ON notifications IS 'Webhook SQL: Envia push notification automaticamente após inserir uma nova notificação';

-- ============================================================================
-- Verificação (opcional)
-- ============================================================================
-- Para verificar se o trigger foi criado com sucesso:
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_push_on_notification_insert';

-- Para ver requisições HTTP (útil para debug):
-- SELECT * FROM net._http_response ORDER BY created_at DESC LIMIT 10;
