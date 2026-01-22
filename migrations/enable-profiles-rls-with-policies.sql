-- ============================================================================
-- RE-ENABLE RLS ON PROFILES WITH PROPER POLICIES
-- ============================================================================
-- This re-enables RLS and creates comprehensive policies for profile management
-- ============================================================================

-- 1. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Profiles are viewable by team members" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and managers can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;

-- 2. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create comprehensive policies

-- READ: All authenticated users can view all profiles
CREATE POLICY "authenticated_users_can_view_all_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only insert their own profile (happens during signup)
CREATE POLICY "users_can_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile OR admins/team_managers can update any profile
CREATE POLICY "users_and_managers_can_update_profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT hierarchy FROM profiles WHERE id = auth.uid()) IN ('admin', 'team_manager')
  )
  WITH CHECK (
    auth.uid() = id OR
    (SELECT hierarchy FROM profiles WHERE id = auth.uid()) IN ('admin', 'team_manager')
  );

-- DELETE: Only handled through delete_user_completely() function with SECURITY DEFINER
-- So we create a policy that allows admins to delete
CREATE POLICY "admins_can_delete_profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT hierarchy FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Verify policies are active
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
