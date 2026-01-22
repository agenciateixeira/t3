-- Fix foreign keys to reference profiles instead of auth.users
-- This allows Supabase to recognize the relationship for joins

-- Drop existing foreign keys
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey,
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

-- Add new foreign keys referencing profiles
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_id_fkey
    FOREIGN KEY (assignee_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT tasks_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
