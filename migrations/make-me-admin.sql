-- ============================================================================
-- MAKE CURRENT USER ADMIN
-- ============================================================================
-- Torna o usuário logado em administrador
-- ============================================================================

-- Atualizar seu usuário para admin
UPDATE profiles
SET hierarchy = 'admin'
WHERE id = auth.uid();

-- Verificar se deu certo
SELECT
  id,
  full_name,
  hierarchy,
  'AGORA VOCÊ É ADMIN!' as status
FROM profiles
WHERE id = auth.uid();
