-- ============================================================================
-- ADICIONAR NOTIFICAÇÕES DE CHAT
-- ============================================================================
-- Criar notificações automáticas quando:
-- 1. Alguém envia uma mensagem direta
-- 2. Alguém é mencionado em um grupo
-- 3. Mensagem em grupo (notifica todos os membros)
-- ============================================================================

-- Não precisa adicionar ENUM pois notifications.type e reference_type são TEXT

-- ============================================================================
-- FUNÇÃO PARA CRIAR NOTIFICAÇÃO DE MENSAGEM
-- ============================================================================
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  recipient_user_id UUID;
  mentioned_user_id UUID;
  notification_metadata JSONB;
BEGIN
  -- Buscar nome do remetente
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Caso 1: Mensagem direta (DM)
  IF NEW.recipient_id IS NOT NULL AND NEW.group_id IS NULL THEN
    notification_title := sender_name || ' te enviou uma mensagem';
    notification_message := COALESCE(NEW.content, 'Enviou uma mídia');

    -- Metadados: salvar sender_id para abrir a conversa DM
    notification_metadata := jsonb_build_object('sender_id', NEW.sender_id, 'type', 'dm');

    -- Criar notificação para o destinatário
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      reference_id,
      reference_type,
      metadata,
      is_read,
      created_at
    ) VALUES (
      NEW.recipient_id,
      notification_title,
      notification_message,
      'message',
      NEW.id,
      'message',
      notification_metadata,
      false,
      NOW()
    );
  END IF;

  -- Caso 2: Mensagem em grupo com menções
  IF NEW.group_id IS NOT NULL AND NEW.mentioned_users IS NOT NULL AND array_length(NEW.mentioned_users, 1) > 0 THEN
    -- Buscar nome do grupo
    DECLARE
      group_name TEXT;
    BEGIN
      SELECT name INTO group_name
      FROM chat_groups
      WHERE id = NEW.group_id;

      notification_title := sender_name || ' mencionou você em ' || group_name;
      notification_message := COALESCE(NEW.content, 'Enviou uma mídia');

      -- Metadados: salvar group_id para abrir o grupo
      notification_metadata := jsonb_build_object('group_id', NEW.group_id, 'type', 'group_mention');

      -- Criar notificação para cada usuário mencionado
      FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
      LOOP
        -- Não criar notificação para o próprio remetente
        IF mentioned_user_id != NEW.sender_id THEN
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            reference_id,
            reference_type,
            metadata,
            is_read,
            created_at
          ) VALUES (
            mentioned_user_id,
            notification_title,
            notification_message,
            'message',
            NEW.id,
            'message',
            notification_metadata,
            false,
            NOW()
          );
        END IF;
      END LOOP;
    END;
  END IF;

  -- Caso 3: Mensagem em grupo SEM menções (notificar todos os membros do grupo)
  IF NEW.group_id IS NOT NULL AND (NEW.mentioned_users IS NULL OR array_length(NEW.mentioned_users, 1) = 0) THEN
    DECLARE
      group_name TEXT;
      member_id UUID;
    BEGIN
      SELECT name INTO group_name
      FROM chat_groups
      WHERE id = NEW.group_id;

      notification_title := sender_name || ' enviou mensagem em ' || group_name;
      notification_message := COALESCE(NEW.content, 'Enviou uma mídia');

      -- Metadados: salvar group_id para abrir o grupo
      notification_metadata := jsonb_build_object('group_id', NEW.group_id, 'type', 'group');

      -- Criar notificação para todos os membros do grupo (exceto o remetente)
      FOR member_id IN
        SELECT user_id
        FROM group_members
        WHERE group_id = NEW.group_id AND user_id != NEW.sender_id
      LOOP
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          reference_id,
          reference_type,
          metadata,
          is_read,
          created_at
        ) VALUES (
          member_id,
          notification_title,
          notification_message,
          'message',
          NEW.id,
          'message',
          notification_metadata,
          false,
          NOW()
        );
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER PARA CRIAR NOTIFICAÇÕES AUTOMATICAMENTE
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;

CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

COMMENT ON FUNCTION create_message_notification IS
'Cria notificações automaticamente quando mensagens são enviadas.
Notifica destinatários de DMs, usuários mencionados em grupos, e todos membros de grupos.';
