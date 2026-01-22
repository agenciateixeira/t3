-- ============================================
-- Add meeting time and link fields to tasks table
-- ============================================

-- Add due_time column for task time
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS due_time TIME;

-- Add meeting_link column for virtual meetings
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add comment
COMMENT ON COLUMN public.tasks.due_time IS 'Optional time for the task deadline';
COMMENT ON COLUMN public.tasks.meeting_link IS 'Optional link for virtual meetings (Google Meet, Zoom, etc.)';
