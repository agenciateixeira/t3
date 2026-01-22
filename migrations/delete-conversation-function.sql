-- Função para deletar/sair de conversas de forma segura
CREATE OR REPLACE FUNCTION delete_conversation(
  p_conversation_id UUID,
  p_conversation_type TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_conversation_type = 'group' THEN
    -- Para grupos: remove o usuário do grupo
    DELETE FROM group_members
    WHERE group_id = p_conversation_id
    AND user_id = p_user_id;

    v_result := json_build_object(
      'success', true,
      'message', 'Você saiu do grupo com sucesso'
    );
  ELSE
    -- Para conversas diretas: deleta as mensagens do usuário
    DELETE FROM messages
    WHERE sender_id = p_user_id
    AND recipient_id = p_conversation_id
    AND group_id IS NULL;

    v_result := json_build_object(
      'success', true,
      'message', 'Suas mensagens foram removidas'
    );
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuários autenticados executem esta função
GRANT EXECUTE ON FUNCTION delete_conversation(UUID, TEXT, UUID) TO authenticated;
