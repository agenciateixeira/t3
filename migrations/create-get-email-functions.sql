-- ============================================================================
-- FUNÇÕES PARA BUSCAR EMAIL POR CPF OU TELEFONE
-- ============================================================================
-- Cria funções RPC para buscar o email de um usuário por CPF ou telefone
-- ============================================================================

-- 1. Função para buscar email por CPF
CREATE OR REPLACE FUNCTION get_email_by_cpf(cpf_input TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Buscar o user_id do perfil com o CPF
  SELECT
    (SELECT email FROM auth.users WHERE id = p.id)
  INTO user_email
  FROM profiles p
  WHERE p.cpf = cpf_input
  LIMIT 1;

  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para buscar email por telefone
CREATE OR REPLACE FUNCTION get_email_by_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Buscar o user_id do perfil com o telefone
  SELECT
    (SELECT email FROM auth.users WHERE id = p.id)
  INTO user_email
  FROM profiles p
  WHERE p.phone = phone_input
  LIMIT 1;

  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comentários
COMMENT ON FUNCTION get_email_by_cpf(TEXT) IS 'Retorna o email do usuário baseado no CPF';
COMMENT ON FUNCTION get_email_by_phone(TEXT) IS 'Retorna o email do usuário baseado no telefone';
