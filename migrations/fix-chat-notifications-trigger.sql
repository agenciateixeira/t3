-- ============================================================================
-- CORREÇÃO: Trigger de Notificações de Chat
-- ============================================================================
-- Remove referência ao campo "private" que não existe na tabela messages
-- ============================================================================

-- Recriar função de notificação de chat sem referência ao campo "private"
CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_group_name TEXT;
  v_sender_name TEXT;
  v_message_preview TEXT;
BEGIN
  -- Só processa mensagens de grupo (quando group_id não é nulo)
  IF NEW.group_id IS NOT NULL THEN

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

COMMENT ON FUNCTION notify_new_chat_message() IS 'Notifica membros do grupo quando nova mensagem é enviada (exceto o remetente)';

-- Trigger já existe, apenas recriamos a função acima
