-- ============================================================================
-- CHECK RLS POLICIES DETAILED
-- ============================================================================

-- Ver todas as políticas de profiles
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Ver se RLS está habilitado
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Testar se você é admin (precisa estar logado)
SELECT
  auth.uid() AS my_user_id,
  (SELECT hierarchy FROM profiles WHERE id = auth.uid()) AS my_hierarchy,
  (SELECT hierarchy FROM profiles WHERE id = auth.uid()) IN ('admin', 'team_manager') AS can_update_others;
