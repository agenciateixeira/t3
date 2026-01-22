-- ============================================
-- CORREÇÃO: Permitir acesso a profiles no Chat
-- Erro 406 acontece porque o JOIN com profiles não tem permissão
-- ============================================

-- Remove políticas antigas de profiles se existirem
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Habilita RLS em profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados vejam todos os perfis
-- (necessário para mostrar nomes e avatares no chat)
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Permite que usuários atualizem apenas o próprio perfil
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Garante permissões
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- Confirma
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;
