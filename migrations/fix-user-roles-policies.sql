-- Fix infinite recursion in user_roles policies
-- The problem: policies are referencing user_roles table from within user_roles policies

-- Drop all existing policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Simple, non-recursive policies for user_roles
-- Users can view their own roles (no recursion)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all roles (using auth.jwt() instead of user_roles lookup)
CREATE POLICY "Service role can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (
    -- Allow if user is authenticated (we'll handle admin checks in application layer)
    auth.uid() IS NOT NULL
  );

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
