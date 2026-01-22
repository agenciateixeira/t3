-- ============================================================================
-- UPGRADE TIMER SYSTEM - PAUSE/RESUME/FINISH
-- ============================================================================
-- Adiciona funcionalidade de pausar e retomar timers
-- ============================================================================

-- Adicionar colunas para gerenciar pausas
ALTER TABLE public.time_logs
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_paused_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Criar tabela para histórico de pausas
CREATE TABLE IF NOT EXISTS public.time_log_pauses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  time_log_id UUID REFERENCES public.time_logs(id) ON DELETE CASCADE NOT NULL,
  paused_at TIMESTAMPTZ NOT NULL,
  resumed_at TIMESTAMPTZ,
  pause_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_log_pauses_time_log_id ON public.time_log_pauses(time_log_id);

-- Enable RLS
ALTER TABLE public.time_log_pauses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pausas
DROP POLICY IF EXISTS "Usuários podem ver suas pausas" ON public.time_log_pauses;
CREATE POLICY "Usuários podem ver suas pausas"
ON public.time_log_pauses FOR SELECT
TO authenticated
USING (
  time_log_id IN (
    SELECT id FROM public.time_logs WHERE user_id = auth.uid()
  )
  OR auth.uid() IN (
    SELECT id FROM public.profiles WHERE hierarchy = 'admin'
  )
);

DROP POLICY IF EXISTS "Usuários podem criar pausas" ON public.time_log_pauses;
CREATE POLICY "Usuários podem criar pausas"
ON public.time_log_pauses FOR INSERT
TO authenticated
WITH CHECK (
  time_log_id IN (
    SELECT id FROM public.time_logs WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Usuários podem atualizar pausas" ON public.time_log_pauses;
CREATE POLICY "Usuários podem atualizar pausas"
ON public.time_log_pauses FOR UPDATE
TO authenticated
USING (
  time_log_id IN (
    SELECT id FROM public.time_logs WHERE user_id = auth.uid()
  )
);

-- Função para calcular duração com pausas
CREATE OR REPLACE FUNCTION calculate_time_log_duration_with_pauses()
RETURNS TRIGGER AS $$
BEGIN
  -- Se end_time foi definido, calcular duration_seconds considerando pausas
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    -- Tempo total em segundos
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;

    -- Subtrair tempo pausado
    NEW.duration_seconds := NEW.duration_seconds - COALESCE(NEW.total_paused_seconds, 0);

    NEW.is_active := false;
    NEW.is_paused := false;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger para usar nova função
DROP TRIGGER IF EXISTS calculate_duration_trigger ON public.time_logs;
CREATE TRIGGER calculate_duration_trigger
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_log_duration_with_pauses();

-- View para timers ativos de todos os usuários (para admins e gerentes)
CREATE OR REPLACE VIEW active_timers_view AS
SELECT
  tl.id,
  tl.user_id,
  tl.deal_id,
  tl.task_id,
  tl.start_time,
  tl.is_active,
  tl.is_paused,
  tl.paused_at,
  tl.total_paused_seconds,
  p.full_name as user_name,
  p.avatar_url as user_avatar,
  p.hierarchy as user_hierarchy,
  p.team_id,
  d.title as deal_title,
  t.title as task_title,
  -- Calcular tempo decorrido
  CASE
    WHEN tl.is_paused THEN
      EXTRACT(EPOCH FROM (tl.paused_at - tl.start_time))::INTEGER - COALESCE(tl.total_paused_seconds, 0)
    ELSE
      EXTRACT(EPOCH FROM (NOW() - tl.start_time))::INTEGER - COALESCE(tl.total_paused_seconds, 0)
  END as elapsed_seconds
FROM public.time_logs tl
LEFT JOIN public.profiles p ON p.id = tl.user_id
LEFT JOIN public.deals d ON d.id = tl.deal_id
LEFT JOIN public.tasks t ON t.id = tl.task_id
WHERE tl.is_active = true
  AND tl.end_time IS NULL
ORDER BY tl.start_time DESC;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar novas colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'time_logs'
  AND column_name IN ('paused_at', 'total_paused_seconds', 'is_paused')
ORDER BY column_name;

-- Verificar tabela de pausas
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'time_log_pauses';

-- Verificar view de timers ativos
SELECT table_name
FROM information_schema.views
WHERE table_name = 'active_timers_view';
