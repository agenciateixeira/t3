-- ============================================================================
-- TIME TRACKING SYSTEM
-- ============================================================================
-- Este script cria o sistema de temporizador para rastrear tempo gasto
-- em tarefas e deals por funcionário
-- ============================================================================

-- Tabela para armazenar logs de tempo
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  deal_id UUID REFERENCES public.deals(id),
  task_id UUID REFERENCES public.tasks(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER, -- Calculado quando end_time é definido
  description TEXT,
  is_active BOOLEAN DEFAULT true, -- true se o timer está rodando
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: deve ter pelo menos deal_id ou task_id
  CONSTRAINT time_log_has_target CHECK (deal_id IS NOT NULL OR task_id IS NOT NULL)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_deal_id ON public.time_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON public.time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_is_active ON public.time_logs(is_active);
CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON public.time_logs(start_time DESC);

-- Enable RLS
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários veem seus próprios logs e admins veem todos
DROP POLICY IF EXISTS "Usuários podem ver seus próprios time logs" ON public.time_logs;
CREATE POLICY "Usuários podem ver seus próprios time logs"
  ON public.time_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE hierarchy = 'admin'
    )
  );

-- Política para INSERT - usuários podem criar seus próprios logs
DROP POLICY IF EXISTS "Usuários podem criar time logs" ON public.time_logs;
CREATE POLICY "Usuários podem criar time logs"
  ON public.time_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - usuários podem atualizar seus próprios logs
DROP POLICY IF EXISTS "Usuários podem atualizar seus time logs" ON public.time_logs;
CREATE POLICY "Usuários podem atualizar seus time logs"
  ON public.time_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para DELETE - usuários podem deletar seus próprios logs
DROP POLICY IF EXISTS "Usuários podem deletar seus time logs" ON public.time_logs;
CREATE POLICY "Usuários podem deletar seus time logs"
  ON public.time_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para calcular duração automaticamente
CREATE OR REPLACE FUNCTION calculate_time_log_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Se end_time foi definido, calcular duration_seconds
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
    NEW.is_active := false;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular duração automaticamente
DROP TRIGGER IF EXISTS calculate_duration_trigger ON public.time_logs;
CREATE TRIGGER calculate_duration_trigger
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_log_duration();

-- Função para garantir apenas um timer ativo por usuário
CREATE OR REPLACE FUNCTION check_active_timer()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está tentando criar um novo timer ativo
  IF NEW.is_active = true AND NEW.end_time IS NULL THEN
    -- Verificar se já existe um timer ativo para este usuário
    IF EXISTS (
      SELECT 1 FROM public.time_logs
      WHERE user_id = NEW.user_id
        AND is_active = true
        AND end_time IS NULL
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Usuário já tem um timer ativo. Pare o timer atual antes de iniciar um novo.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir apenas um timer ativo
DROP TRIGGER IF EXISTS check_active_timer_trigger ON public.time_logs;
CREATE TRIGGER check_active_timer_trigger
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_active_timer();

-- View para estatísticas de tempo por deal
CREATE OR REPLACE VIEW deal_time_stats AS
SELECT
  deal_id,
  user_id,
  COUNT(*) as log_count,
  SUM(duration_seconds) as total_seconds,
  AVG(duration_seconds) as avg_seconds,
  MAX(end_time) as last_logged_at
FROM public.time_logs
WHERE deal_id IS NOT NULL AND duration_seconds IS NOT NULL
GROUP BY deal_id, user_id;

-- View para estatísticas de tempo por task
CREATE OR REPLACE VIEW task_time_stats AS
SELECT
  task_id,
  user_id,
  COUNT(*) as log_count,
  SUM(duration_seconds) as total_seconds,
  AVG(duration_seconds) as avg_seconds,
  MAX(end_time) as last_logged_at
FROM public.time_logs
WHERE task_id IS NOT NULL AND duration_seconds IS NOT NULL
GROUP BY task_id, user_id;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Verificar se a tabela foi criada corretamente
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'time_logs'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'time_logs'
ORDER BY policyname;
