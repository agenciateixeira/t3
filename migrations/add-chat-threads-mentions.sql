-- ============================================================================
-- CHAT THREADS E MENTIONS
-- ============================================================================
-- Adiciona suporte para threads (respostas) e menções (@user) no chat
-- ============================================================================

-- Adicionar colunas à tabela messages para suportar threads
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_thread_reply BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS thread_reply_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mentioned_users UUID[] DEFAULT '{}';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_mentioned_users ON public.messages USING GIN(mentioned_users);

-- Função para incrementar contador de respostas em thread
CREATE OR REPLACE FUNCTION increment_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a mensagem é uma resposta a uma thread
  IF NEW.thread_id IS NOT NULL AND NEW.is_thread_reply = true THEN
    -- Incrementar o contador na mensagem pai
    UPDATE public.messages
    SET thread_reply_count = thread_reply_count + 1
    WHERE id = NEW.thread_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para incrementar contador
DROP TRIGGER IF EXISTS increment_thread_count_trigger ON public.messages;
CREATE TRIGGER increment_thread_count_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_thread_reply_count();

-- Função para decrementar contador quando resposta é deletada
CREATE OR REPLACE FUNCTION decrement_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a mensagem deletada era uma resposta a uma thread
  IF OLD.thread_id IS NOT NULL AND OLD.is_thread_reply = true THEN
    -- Decrementar o contador na mensagem pai
    UPDATE public.messages
    SET thread_reply_count = GREATEST(0, thread_reply_count - 1)
    WHERE id = OLD.thread_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para decrementar contador
DROP TRIGGER IF EXISTS decrement_thread_count_trigger ON public.messages;
CREATE TRIGGER decrement_thread_count_trigger
  AFTER DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION decrement_thread_reply_count();

-- Função para criar notificação quando um usuário é mencionado
CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_id UUID;
  conversation_name TEXT;
BEGIN
  -- Se há usuários mencionados
  IF array_length(NEW.mentioned_users, 1) > 0 THEN
    -- Buscar nome da conversa/grupo
    IF NEW.group_id IS NOT NULL THEN
      SELECT name INTO conversation_name
      FROM public.chat_groups
      WHERE id = NEW.group_id;
    ELSE
      SELECT full_name INTO conversation_name
      FROM public.profiles
      WHERE id = NEW.sender_id;
    END IF;

    -- Criar notificação para cada usuário mencionado
    FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
    LOOP
      -- Não notificar se o usuário mencionado é o próprio remetente
      IF mentioned_user_id != NEW.sender_id THEN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          reference_id,
          reference_type
        ) VALUES (
          mentioned_user_id,
          'mention',
          'Você foi mencionado',
          'Você foi mencionado em ' || COALESCE(conversation_name, 'uma conversa'),
          NEW.id,
          'chat_message'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificar menções
DROP TRIGGER IF EXISTS notify_mentions_trigger ON public.messages;
CREATE TRIGGER notify_mentions_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_mentioned_users();

-- View para buscar mensagens de thread com seus replies
CREATE OR REPLACE VIEW chat_thread_messages AS
SELECT
  m.*,
  COUNT(r.id) as reply_count,
  MAX(r.created_at) as last_reply_at
FROM public.messages m
LEFT JOIN public.messages r ON r.thread_id = m.id AND r.is_thread_reply = true
WHERE m.is_thread_reply = false OR m.is_thread_reply IS NULL
GROUP BY m.id;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Verificar se as colunas foram adicionadas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('thread_id', 'is_thread_reply', 'thread_reply_count', 'mentioned_users')
ORDER BY ordinal_position;
