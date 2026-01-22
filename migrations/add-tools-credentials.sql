-- ============================================
-- ADICIONA CAMPO DE CREDENCIAIS NA TABELA TOOLS
-- Para armazenar login/senha das ferramentas
-- ============================================

-- Adiciona coluna de credenciais (JSON para armazenar login, senha, etc)
ALTER TABLE tools 
ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN tools.credentials IS 'Credenciais de acesso da ferramenta (login, senha, API key, etc)';

-- Exemplo de estrutura JSON esperada:
-- {
--   "login": "usuario@empresa.com",
--   "password": "senha123",
--   "api_key": "key_abc123",
--   "notes": "Observações adicionais"
-- }

-- Confirma estrutura
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tools'
ORDER BY ordinal_position;
