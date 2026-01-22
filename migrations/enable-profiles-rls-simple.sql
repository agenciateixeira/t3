-- ============================================================================
-- RE-ENABLE RLS ON PROFILES WITH SIMPLE POLICIES
-- ============================================================================

-- 1. Re-enable RLS first
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- 3. Create simple, permissive policies

-- READ: All authenticated users can view all profiles
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can insert their own profile
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Allow users to update their own profile, or admins/team_managers to update any
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
  );

-- DELETE: Only admins can delete (via the delete_user_completely function)
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND hierarchy = 'admin'
    )
  );
