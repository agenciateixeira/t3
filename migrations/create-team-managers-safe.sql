-- ============================================================================
-- MIGRATION SEGURA - CRIAR ESTRUTURA DE MÚLTIPLOS GERENTES
-- ============================================================================

-- 1. Criar tabela team_managers (se não existir)
CREATE TABLE IF NOT EXISTS team_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, manager_id)
);

-- 2. Criar índices (se não existirem)
CREATE INDEX IF NOT EXISTS idx_team_managers_team_id ON team_managers(team_id);
CREATE INDEX IF NOT EXISTS idx_team_managers_manager_id ON team_managers(manager_id);

-- 3. Migrar dados existentes (ignora duplicatas)
INSERT INTO team_managers (team_id, manager_id)
SELECT id, manager_id FROM teams WHERE manager_id IS NOT NULL
ON CONFLICT (team_id, manager_id) DO NOTHING;

-- 4. RLS (se ainda não estiver ativado)
ALTER TABLE team_managers ENABLE ROW LEVEL SECURITY;

-- 5. Dropar policies antigas se existirem e recriar
DO $$
BEGIN
  DROP POLICY IF EXISTS "Todos podem ver gerentes de times" ON team_managers;
  DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar" ON team_managers;
END $$;

-- 6. Criar policies
CREATE POLICY "Todos podem ver gerentes de times"
  ON team_managers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins e gerentes podem gerenciar"
  ON team_managers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.hierarchy IN ('admin', 'team_manager')
    )
  );

-- 7. Criar/Recriar VIEW
CREATE OR REPLACE VIEW teams_with_managers AS
SELECT
  t.id as team_id,
  t.name as team_name,
  t.description,
  t.created_at,
  t.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::json
  ) as managers,
  COUNT(DISTINCT tm.manager_id) as manager_count,
  (SELECT COUNT(*) FROM profiles WHERE team_id = t.id) as member_count
FROM teams t
LEFT JOIN team_managers tm ON t.id = tm.team_id
LEFT JOIN profiles p ON tm.manager_id = p.id
GROUP BY t.id, t.name, t.description, t.created_at, t.updated_at;

-- 8. Grant permissões
GRANT SELECT ON teams_with_managers TO authenticated;

-- 9. Verificar resultado
SELECT
  'Tabela criada' as status,
  COUNT(*) as registros
FROM team_managers;

SELECT
  'View criada' as status,
  COUNT(*) as times
FROM teams_with_managers;
