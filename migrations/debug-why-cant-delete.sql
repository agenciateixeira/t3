-- ============================================================================
-- DEBUG WHY CAN'T DELETE PROFILE
-- ============================================================================

-- 1. Verificar se você está tentando deletar você mesmo
SELECT
  'Este é o ID do usuário que você está tentando deletar:' as info,
  '2e745e8a-72af-4d3f-8c08-fc8151d80cc1' as deleting_id,
  'Este é o ID do usuário logado:' as info2,
  auth.uid() as your_id,
  CASE
    WHEN auth.uid() = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1'::uuid
    THEN '⚠️ VOCÊ ESTÁ TENTANDO DELETAR VOCÊ MESMO - NÃO PODE!'
    ELSE '✅ Você pode deletar este usuário'
  END as can_delete;

-- 2. Verificar triggers em profiles que podem bloquear DELETE
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND event_manipulation = 'DELETE';

-- 3. Buscar foreign keys com NO ACTION ou RESTRICT que bloqueiam
SELECT
  tc.table_name,
  kcu.column_name,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
  AND rc.delete_rule IN ('NO ACTION', 'RESTRICT')
ORDER BY tc.table_name;
