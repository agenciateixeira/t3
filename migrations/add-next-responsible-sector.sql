-- ============================================================================
-- ADD NEXT RESPONSIBLE SECTOR TO DEALS
-- ============================================================================
-- Este script adiciona o campo "Setor Responsável pela Próxima Tarefa"
-- na tabela deals
-- ============================================================================

-- Adicionar coluna para setor responsável pela próxima tarefa
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS next_responsible_sector user_hierarchy;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.deals.next_responsible_sector IS
  'Setor/hierarquia responsável pela próxima ação/tarefa neste deal';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deals' AND column_name = 'next_responsible_sector';
