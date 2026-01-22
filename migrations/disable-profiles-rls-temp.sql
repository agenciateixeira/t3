-- ============================================================================
-- DISABLE RLS ON PROFILES TEMPORARILY
-- ============================================================================
-- Remove RLS de profiles para testar se é isso que está bloqueando
-- ============================================================================

-- Ver status atual
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- DESABILITAR RLS (temporário para teste)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

SELECT 'RLS DESABILITADO - Agora você pode deletar qualquer perfil!' as status;
