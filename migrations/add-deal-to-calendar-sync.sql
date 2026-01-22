-- Adicionar campo deal_id na tabela calendar_events para vincular eventos a oportunidades do pipeline

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_calendar_events_deal_id ON calendar_events(deal_id);

COMMENT ON COLUMN calendar_events.deal_id IS 'Oportunidade do pipeline vinculada a este evento';
