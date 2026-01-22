-- =============================================
-- CONFIGURAR STORAGE PARA O CHAT
-- Execute este no SQL Editor do Supabase
-- =============================================

-- Criar storage bucket para mídias do chat (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas de storage para chat-media
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "chat_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_auth_delete" ON storage.objects;

-- Permitir leitura pública de todas as mídias do chat
CREATE POLICY "chat_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

-- Permitir upload para usuários autenticados
CREATE POLICY "chat_media_auth_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.role() = 'authenticated'
);

-- Permitir atualização para usuários autenticados (apenas seus próprios arquivos)
CREATE POLICY "chat_media_auth_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-media'
  AND auth.role() = 'authenticated'
);

-- Permitir deleção para usuários autenticados (apenas seus próprios arquivos)
CREATE POLICY "chat_media_auth_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-media'
  AND auth.role() = 'authenticated'
);
