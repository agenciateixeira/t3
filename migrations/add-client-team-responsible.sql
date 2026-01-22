-- ============================================================================
-- ADD TEAM AND RESPONSIBLE TO CLIENTS
-- ============================================================================

-- 1. Adicionar coluna team_id (time responsável pelo cliente)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 2. Adicionar coluna responsible_id (colaborador responsável)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_team_id ON clients(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_responsible_id ON clients(responsible_id);

-- 4. Comentários nas colunas
COMMENT ON COLUMN clients.team_id IS 'Time responsável pelo cliente';
COMMENT ON COLUMN clients.responsible_id IS 'Colaborador responsável pelo cliente';
