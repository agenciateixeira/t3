-- ============================================================================
-- TEST SESSION
-- ============================================================================

-- Verificar se há sessão
SELECT
  auth.uid() as user_id,
  auth.jwt() as jwt_info,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ SEM SESSÃO - Você não está autenticado no SQL!'
    ELSE '✅ COM SESSÃO - Autenticado'
  END as status;

-- Ver seu usuário
SELECT * FROM auth.users LIMIT 1;
