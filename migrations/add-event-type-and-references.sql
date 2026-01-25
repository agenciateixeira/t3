-- Adicionar campos para suportar diferentes tipos de eventos no calendário
-- (reuniões, tarefas, lembretes, deals)

-- Adicionar tipo de evento
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'event'
CHECK (event_type IN ('event', 'meeting', 'task', 'reminder', 'deal'));

-- Adicionar referências para tarefas e lembretes
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reminder_id UUID;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- Comentários explicativos
COMMENT ON COLUMN calendar_events.event_type IS 'Tipo de evento: event (padrão), meeting (reunião), task (tarefa), reminder (lembrete), deal (oportunidade)';
COMMENT ON COLUMN calendar_events.task_id IS 'Tarefa vinculada a este evento (quando event_type = task)';
COMMENT ON COLUMN calendar_events.reminder_id IS 'ID do lembrete vinculado a este evento (quando event_type = reminder)';
