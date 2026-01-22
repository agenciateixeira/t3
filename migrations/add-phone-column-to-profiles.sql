-- ============================================================================
-- ADD PHONE COLUMN TO PROFILES
-- ============================================================================
-- Adiciona a coluna phone na tabela profiles (se não existir)
-- ============================================================================

-- 1. Adicionar coluna phone (se não existir)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'phone';
