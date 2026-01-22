-- ============================================================================
-- SETUP STORAGE BUCKET FOR DEAL ATTACHMENTS
-- ============================================================================
-- Este script cria o bucket de storage necessário para anexos de deals
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- Criar bucket para anexos de deals
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-attachments', 'deal-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Criar política para permitir usuários autenticados fazerem upload
CREATE POLICY "Usuários autenticados podem fazer upload de anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-attachments'
);

-- Criar política para permitir usuários autenticados visualizarem anexos
CREATE POLICY "Usuários autenticados podem ver anexos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-attachments'
);

-- Criar política para permitir usuários autenticados baixarem anexos
CREATE POLICY "Usuários autenticados podem baixar anexos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-attachments'
);

-- Criar política para permitir usuários autenticados deletarem seus próprios anexos
CREATE POLICY "Usuários podem deletar seus próprios anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-attachments'
  AND auth.uid() = owner::uuid
);

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Verificar se o bucket foi criado corretamente
SELECT * FROM storage.buckets WHERE id = 'deal-attachments';
