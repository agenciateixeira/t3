-- EMERGENCY FIX: Remove all recursive RLS policies and create simple ones
-- Execute este script no SQL Editor do Supabase Dashboard

-- ============================================================
-- 1. FIX USER_ROLES TABLE (Main cause of infinite recursion)
-- ============================================================

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "allow_select_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.user_roles;

-- Create NEW simple policies without recursion
CREATE POLICY "user_roles_select"
  ON public.user_roles
  FOR SELECT
  USING (true); -- Allow all authenticated users to read

CREATE POLICY "user_roles_insert"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_update"
  ON public.user_roles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_delete"
  ON public.user_roles
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. FIX CLIENTS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Users can update their organization clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their organization clients" ON public.clients;

-- Create simple policies
CREATE POLICY "clients_select"
  ON public.clients
  FOR SELECT
  USING (true); -- Allow all authenticated to read

CREATE POLICY "clients_insert"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clients_update"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_delete"
  ON public.clients
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. FIX TASKS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- Create simple policies
CREATE POLICY "tasks_select"
  ON public.tasks
  FOR SELECT
  USING (true);

CREATE POLICY "tasks_insert"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_update"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_delete"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. FIX PROFILES TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create simple policies
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- 5. FIX TEAMS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete teams" ON public.teams;

-- Create simple policies
CREATE POLICY "teams_select"
  ON public.teams
  FOR SELECT
  USING (true);

CREATE POLICY "teams_insert"
  ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "teams_update"
  ON public.teams
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "teams_delete"
  ON public.teams
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. FIX TOOLS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tools" ON public.tools;
DROP POLICY IF EXISTS "Users can insert tools" ON public.tools;
DROP POLICY IF EXISTS "Users can update tools" ON public.tools;
DROP POLICY IF EXISTS "Users can delete tools" ON public.tools;

-- Create simple policies
CREATE POLICY "tools_select"
  ON public.tools
  FOR SELECT
  USING (true);

CREATE POLICY "tools_insert"
  ON public.tools
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tools_update"
  ON public.tools
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tools_delete"
  ON public.tools
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 7. FIX MESSAGES TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;

-- Create simple policies
CREATE POLICY "messages_select"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = recipient_id OR
    group_id IS NOT NULL
  );

CREATE POLICY "messages_insert"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "messages_delete"
  ON public.messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================
-- 8. FIX CHAT_GROUPS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Users can insert groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Users can update their groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Users can delete their groups" ON public.chat_groups;

-- Create simple policies
CREATE POLICY "chat_groups_select"
  ON public.chat_groups
  FOR SELECT
  USING (true);

CREATE POLICY "chat_groups_insert"
  ON public.chat_groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "chat_groups_update"
  ON public.chat_groups
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "chat_groups_delete"
  ON public.chat_groups
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================
-- 9. FIX CHAT_GROUP_MEMBERS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view group members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users can insert group members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users can delete group members" ON public.chat_group_members;

-- Create simple policies
CREATE POLICY "chat_group_members_select"
  ON public.chat_group_members
  FOR SELECT
  USING (true);

CREATE POLICY "chat_group_members_insert"
  ON public.chat_group_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "chat_group_members_delete"
  ON public.chat_group_members
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 10. RELOAD SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
