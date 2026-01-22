-- ============================================
-- Add card color field to tasks table
-- ============================================

-- Add card_color column for task card customization
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS card_color TEXT DEFAULT '#ffffff';

-- Add comment
COMMENT ON COLUMN public.tasks.card_color IS 'Color for the task card in hex format (e.g., #ff0000)';
