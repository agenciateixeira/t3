-- ============================================
-- TENTÁCULO FLOW - CONFIGURAÇÃO DO SUPABASE
-- ============================================
-- Este arquivo contém todos os scripts SQL necessários para configurar
-- o banco de dados do Tentáculo Flow no Supabase
-- ============================================

-- 1. CRIAR TABELA DE PERFIS DE USUÁRIO
-- Esta tabela armazena informações adicionais dos usuários
-- além das informações de autenticação gerenciadas pelo Supabase Auth

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. HABILITAR RLS (Row Level Security) NA TABELA DE PERFIS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE SEGURANÇA PARA A TABELA DE PERFIS

-- Política: Usuários podem ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Política: Usuários podem inserir seu próprio perfil
CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. CRIAR FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- Esta função é executada automaticamente quando um novo usuário é criado

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRIAR TRIGGER PARA EXECUTAR A FUNÇÃO APÓS CRIAÇÃO DE USUÁRIO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. CRIAR FUNÇÃO PARA ATUALIZAR O CAMPO updated_at AUTOMATICAMENTE

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR TRIGGER PARA ATUALIZAR updated_at NA TABELA DE PERFIS
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TABELAS ADICIONAIS PARA O SISTEMA
-- ============================================
-- Adicione abaixo as tabelas específicas do seu sistema
-- conforme necessário para sua aplicação

-- Exemplo de tabela de projetos (remova ou adapte conforme necessário):
/*
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios projetos"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Usuários podem criar projetos"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Usuários podem atualizar seus próprios projetos"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Usuários podem deletar seus próprios projetos"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
*/

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================
-- 1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
-- 2. Selecione seu projeto: hukbilmyblqlomoaiszm
-- 3. Vá em "SQL Editor" no menu lateral
-- 4. Copie e cole este arquivo completo
-- 5. Clique em "Run" para executar
--
-- IMPORTANTE: Execute este script apenas UMA vez!
-- Se precisar executar novamente, certifique-se de deletar
-- as tabelas e funções criadas anteriormente.
-- ============================================
