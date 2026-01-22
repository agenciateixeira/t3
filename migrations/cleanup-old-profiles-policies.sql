-- ============================================================================
-- CLEANUP OLD PROFILES POLICIES
-- ============================================================================
-- Remove policies antigas que podem estar conflitando
-- ============================================================================

-- Remover policies antigas que permitem acesso público
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "profiles_write_own" ON profiles;

-- Verificar que apenas as novas policies existem
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
