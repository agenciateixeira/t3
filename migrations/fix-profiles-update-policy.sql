-- ============================================================================
-- FIX PROFILES UPDATE POLICY
-- ============================================================================
-- Adiciona WITH CHECK que estava faltando na política de UPDATE
-- ============================================================================

-- 1. Dropar política antiga
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- 2. Recriar com WITH CHECK
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND hierarchy IN ('admin', 'team_manager')
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND hierarchy IN ('admin', 'team_manager')
    )
  );

-- 3. Verificar se a política foi criada
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND policyname = 'profiles_update_policy';
