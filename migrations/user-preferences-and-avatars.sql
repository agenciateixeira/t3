-- ============================================
-- USER PREFERENCES AND AVATAR STORAGE SETUP
-- ============================================

-- 1. CRIAR BUCKET DE AVATARS NO STORAGE
-- Executar via dashboard do Supabase: Storage > Create Bucket
-- Nome: avatars
-- Public: true (ou false se preferir signed URLs)

-- 2. CRIAR TABELA DE PREFERÊNCIAS DO USUÁRIO
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  locale VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HABILITAR RLS NA TABELA
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURANÇA PARA USER_PREFERENCES

-- Usuários podem ver suas próprias preferências
CREATE POLICY "Usuários podem ver suas próprias preferências"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias preferências
CREATE POLICY "Usuários podem atualizar suas próprias preferências"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias preferências
CREATE POLICY "Usuários podem inserir suas próprias preferências"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. TRIGGER PARA ATUALIZAR updated_at
CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. POLÍTICAS DE STORAGE PARA BUCKET AVATARS
-- Executar após criar o bucket via dashboard:

-- Permitir upload de avatars (apenas o próprio usuário)
CREATE POLICY "Usuários podem fazer upload de seus avatars"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir update de avatars (apenas o próprio usuário)
CREATE POLICY "Usuários podem atualizar seus avatars"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir delete de avatars (apenas o próprio usuário)
CREATE POLICY "Usuários podem deletar seus avatars"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir leitura pública de avatars (se bucket for público)
CREATE POLICY "Avatars são públicos para leitura"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- ============================================
-- INSTRUÇÕES
-- ============================================
-- 1. Criar bucket 'avatars' no Supabase Dashboard (Storage > New bucket)
--    - Name: avatars
--    - Public: true
-- 2. Executar este SQL no SQL Editor
-- 3. As políticas de storage só funcionam após criar o bucket
-- ============================================
