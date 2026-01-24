-- ============================================================================
-- SISTEMA DE CARGOS PERSONALIZÁVEIS
-- ============================================================================
-- Cria tabela de cargos personalizáveis e migra dados existentes
-- ============================================================================

-- 1. Criar tabela de cargos
CREATE TABLE IF NOT EXISTS job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- Cargos do sistema não podem ser deletados
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserir cargos padrões do sistema
INSERT INTO job_titles (name, description, is_system, is_active) VALUES
  ('Social Media', 'Responsável pelas redes sociais e conteúdo', TRUE, TRUE),
  ('Gestor de Tráfego', 'Responsável por campanhas de tráfego pago', TRUE, TRUE),
  ('Designer', 'Responsável pela criação visual e design', TRUE, TRUE),
  ('Gerente de Time', 'Responsável pela gestão de equipe', TRUE, TRUE),
  ('Comercial', 'Responsável por vendas e relacionamento com clientes', TRUE, TRUE),
  ('Desenvolvedor', 'Responsável pelo desenvolvimento de sistemas', TRUE, TRUE),
  ('Copywriter', 'Responsável pela criação de textos e conteúdo', TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 3. Adicionar coluna job_title_id na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES job_titles(id) ON DELETE SET NULL;

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id ON profiles(job_title_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_active ON job_titles(is_active);

-- 5. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_job_titles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_job_titles_updated_at ON job_titles;
CREATE TRIGGER trigger_update_job_titles_updated_at
  BEFORE UPDATE ON job_titles
  FOR EACH ROW
  EXECUTE FUNCTION update_job_titles_updated_at();

-- 7. RLS Policies para job_titles
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;

-- Todos podem ver cargos ativos
CREATE POLICY "Todos podem ver cargos ativos"
  ON job_titles FOR SELECT
  USING (is_active = TRUE);

-- Apenas admins podem criar cargos
CREATE POLICY "Apenas admins podem criar cargos"
  ON job_titles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND hierarchy = 'admin'
    )
  );

-- Apenas admins podem atualizar cargos
CREATE POLICY "Apenas admins podem atualizar cargos"
  ON job_titles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND hierarchy = 'admin'
    )
  );

-- Apenas admins podem deletar cargos não-sistema
CREATE POLICY "Apenas admins podem deletar cargos customizados"
  ON job_titles FOR DELETE
  USING (
    is_system = FALSE
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND hierarchy = 'admin'
    )
  );

-- 8. Comentários
COMMENT ON TABLE job_titles IS 'Tabela de cargos/funções personalizáveis';
COMMENT ON COLUMN job_titles.is_system IS 'Indica se é um cargo do sistema (não pode ser deletado)';
COMMENT ON COLUMN job_titles.is_active IS 'Indica se o cargo está ativo e pode ser usado';
COMMENT ON COLUMN profiles.job_title_id IS 'Cargo/função do colaborador';
