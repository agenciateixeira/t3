-- Verificar seu usuário e permissões
SELECT
  id,
  full_name,
  hierarchy,
  team_id,
  created_at
FROM profiles
WHERE id = auth.uid();

-- Verificar se você é admin
SELECT
  CASE
    WHEN hierarchy = 'admin' THEN 'Você é ADMIN - pode deletar'
    WHEN hierarchy = 'team_manager' THEN 'Você é GERENTE - pode editar mas não deletar'
    ELSE 'Você NÃO é admin/gerente - sem permissão'
  END as status
FROM profiles
WHERE id = auth.uid();
