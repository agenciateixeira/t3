-- ============================================================================
-- FIX DELETE RLS - MORE PERMISSIVE
-- ============================================================================
-- Permite que admins deletem profiles
-- ============================================================================

-- Ver a policy atual de DELETE
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'DELETE';

-- Dropar a policy antiga
DROP POLICY IF EXISTS "Apenas admins podem deletar perfis" ON profiles;

-- Criar nova policy mais simples
CREATE POLICY "Admins podem deletar perfis"
ON profiles FOR DELETE
TO authenticated
USING (
  -- Verifica se o usuário logado é admin
  (SELECT hierarchy FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Verificar se foi criada
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'DELETE';
