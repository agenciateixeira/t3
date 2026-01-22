-- Complete fix for all RLS policies to prevent infinite recursion

-- 1. Drop ALL policies from user_roles first
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;

-- 2. Create simple, non-recursive policies for user_roles
CREATE POLICY "allow_select_own_roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "allow_all_authenticated"
  ON public.user_roles
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- 3. Force reload of PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- 4. Also refresh the connection pool
SELECT pg_notify('pgrst', 'reload config');
