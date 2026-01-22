-- ============================================================================
-- DELETE USER COMPLETELY
-- ============================================================================
-- Deleta usuário de auth.users E profiles
-- ============================================================================

-- 1. Ver o usuário antes de deletar
SELECT 'ANTES DE DELETAR:' as status;
SELECT id, email FROM auth.users WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';
SELECT id, full_name FROM profiles WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';

-- 2. Deletar de auth.users (isso deve deletar automaticamente de profiles se houver CASCADE)
DELETE FROM auth.users
WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';

-- 3. Deletar de profiles também (caso não tenha CASCADE)
DELETE FROM profiles
WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';

-- 4. Verificar se foi deletado
SELECT 'DEPOIS DE DELETAR:' as status;
SELECT COUNT(*) as users_restantes FROM auth.users WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';
SELECT COUNT(*) as profiles_restantes FROM profiles WHERE id = '2e745e8a-72af-4d3f-8c08-fc8151d80cc1';
