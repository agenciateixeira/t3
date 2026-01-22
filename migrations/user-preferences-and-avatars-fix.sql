-- ============================================
-- USER PREFERENCES - FIX (Safe to run multiple times)
-- ============================================

-- 1. DROP EXISTING POLICIES (if any)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias preferências" ON public.user_preferences;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias preferências" ON public.user_preferences;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias preferências" ON public.user_preferences;

-- 2. DROP AND RECREATE TABLE
DROP TABLE IF EXISTS public.user_preferences CASCADE;

CREATE TABLE public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  locale VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENABLE RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 4. CREATE POLICIES
CREATE POLICY "Usuários podem ver suas próprias preferências"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias preferências"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias preferências"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. CREATE TRIGGER FOR updated_at
DROP TRIGGER IF EXISTS set_user_preferences_updated_at ON public.user_preferences;

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================
-- Execute APÓS criar o bucket 'avatars' no dashboard

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários podem fazer upload de seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars são públicos para leitura" ON storage.objects;

-- Create policies
CREATE POLICY "Usuários podem fazer upload de seus avatars"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Usuários podem atualizar seus avatars"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Usuários podem deletar seus avatars"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars são públicos para leitura"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- ============================================
-- DONE!
-- ============================================
