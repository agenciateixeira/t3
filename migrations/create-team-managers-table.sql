-- ============================================================================
-- CRIAR TABELA DE MÚLTIPLOS GERENTES POR TIME
-- ============================================================================

-- Tabela de relacionamento N:N entre teams e managers
CREATE TABLE IF NOT EXISTS team_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantir que não haja duplicatas (mesmo gerente no mesmo time)
  UNIQUE(team_id, manager_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_team_managers_team_id ON team_managers(team_id);
CREATE INDEX IF NOT EXISTS idx_team_managers_manager_id ON team_managers(manager_id);

-- Migrar dados existentes da coluna manager_id para a nova tabela
INSERT INTO team_managers (team_id, manager_id)
SELECT id, manager_id
FROM teams
WHERE manager_id IS NOT NULL
ON CONFLICT (team_id, manager_id) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE team_managers IS 'Relacionamento N:N entre times e gerentes. Permite múltiplos gerentes por time.';
COMMENT ON COLUMN team_managers.team_id IS 'ID do time';
COMMENT ON COLUMN team_managers.manager_id IS 'ID do gerente (referencia profiles)';

-- RLS (Row Level Security)
ALTER TABLE team_managers ENABLE ROW LEVEL SECURITY;

-- Policies: Todos autenticados podem ver team_managers
CREATE POLICY "Todos podem ver gerentes de times"
  ON team_managers FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins e gerentes podem adicionar/remover gerentes
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

-- Criar VIEW para facilitar queries de times com seus gerentes
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
        'avatar_url', p.avatar_url,
        'email', p.email
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

-- Grant permissões na VIEW
GRANT SELECT ON teams_with_managers TO authenticated;

COMMENT ON VIEW teams_with_managers IS 'View que retorna times com array de gerentes e contagens';
