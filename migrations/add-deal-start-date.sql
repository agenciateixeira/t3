-- ============================================================================
-- ADD START_DATE TO DEALS
-- ============================================================================
-- Adiciona campo de data de início nas oportunidades
-- ============================================================================

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Verificar estrutura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deals'
AND column_name IN ('start_date', 'expected_close_date', 'actual_close_date')
ORDER BY column_name;
