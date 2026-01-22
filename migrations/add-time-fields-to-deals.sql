-- Adicionar campos de hora (time) na tabela deals para sincronização completa com calendário

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS start_time TIME;

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS expected_close_time TIME;

COMMENT ON COLUMN deals.start_time IS 'Horário de início da oportunidade';
COMMENT ON COLUMN deals.expected_close_time IS 'Horário previsto de fechamento da oportunidade';
