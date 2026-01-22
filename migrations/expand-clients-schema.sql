-- =============================================
-- EXPANDIR SCHEMA DA TABELA CLIENTS
-- Execute este no SQL Editor do Supabase
-- =============================================

-- Adicionar novos campos à tabela clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18) UNIQUE,
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS contract_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS company_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS responsible_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS responsible_name TEXT;

-- Criar índice no CNPJ para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients(cnpj);

-- Adicionar comentários explicativos nas colunas
COMMENT ON COLUMN public.clients.logo_url IS 'URL da logo do cliente no storage';
COMMENT ON COLUMN public.clients.cnpj IS 'CNPJ do cliente (único)';
COMMENT ON COLUMN public.clients.razao_social IS 'Razão Social da empresa';
COMMENT ON COLUMN public.clients.endereco IS 'Endereço completo do cliente';
COMMENT ON COLUMN public.clients.contract_start_date IS 'Data de início do contrato';
COMMENT ON COLUMN public.clients.contract_end_date IS 'Data de término do contrato';
COMMENT ON COLUMN public.clients.contract_value IS 'Valor negociado do contrato';
COMMENT ON COLUMN public.clients.company_phone IS 'Telefone da empresa';
COMMENT ON COLUMN public.clients.responsible_phone IS 'Telefone do responsável pela negociação';
COMMENT ON COLUMN public.clients.responsible_name IS 'Nome do responsável pela negociação';

-- Criar storage bucket para logos de clientes (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas de storage para client-logos
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "client_logos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "client_logos_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "client_logos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "client_logos_auth_delete" ON storage.objects;

-- Permitir leitura pública
CREATE POLICY "client_logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-logos');

-- Permitir upload para usuários autenticados
CREATE POLICY "client_logos_auth_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
);

-- Permitir atualização para usuários autenticados
CREATE POLICY "client_logos_auth_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
);

-- Permitir deleção para usuários autenticados
CREATE POLICY "client_logos_auth_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
);
