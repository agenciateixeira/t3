-- ============================================================================
-- FUNÇÃO PARA RESETAR SENHA POR CPF
-- ============================================================================
-- Permite que um usuário redefina sua senha usando apenas o CPF
-- Usado no fluxo de primeiro acesso quando a conta já existe
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_user_password_by_cpf(
  user_cpf TEXT,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_found UUID;
  user_email_found TEXT;
  result JSON;
BEGIN
  -- Buscar o ID do usuário pelo CPF
  SELECT u.id, u.email INTO user_id_found, user_email_found
  FROM auth.users u
  INNER JOIN public.profiles p ON u.id = p.id
  WHERE p.cpf = user_cpf
  LIMIT 1;

  -- Se não encontrou o usuário, retornar erro
  IF user_id_found IS NULL THEN
    RAISE EXCEPTION 'Usuário com CPF % não encontrado', user_cpf;
  END IF;

  -- Atualizar a senha no auth.users usando crypt do pgsodium
  UPDATE auth.users
  SET
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = user_id_found;

  -- Retornar sucesso
  result := json_build_object(
    'success', true,
    'user_id', user_id_found,
    'email', user_email_found,
    'message', 'Senha atualizada com sucesso'
  );

  RETURN result;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION reset_user_password_by_cpf IS
'Permite redefinir senha de usuário usando CPF. Usado no fluxo de primeiro acesso.';
