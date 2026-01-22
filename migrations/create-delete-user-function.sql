-- ============================================================================
-- CREATE FUNCTION TO DELETE USER COMPLETELY
-- ============================================================================
-- Função que deleta usuário de auth.users E profiles
-- ============================================================================

-- Criar função
CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar de auth.users (isso deve cascadear para profiles se configurado)
  DELETE FROM auth.users WHERE id = user_id;

  -- Deletar de profiles também (caso não tenha CASCADE)
  DELETE FROM profiles WHERE id = user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;

-- Testar a função
SELECT delete_user_completely('2e745e8a-72af-4d3f-8c08-fc8151d80cc1'::UUID);

-- Verificar se foi deletado
SELECT COUNT(*) as users_restantes FROM auth.users WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';
SELECT COUNT(*) as profiles_restantes FROM profiles WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';
