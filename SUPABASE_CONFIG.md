# Configuração do Supabase - Tentáculo Flow

Este documento contém todas as instruções para configurar o Supabase para o projeto Tentáculo Flow.

## 📋 Credenciais do Projeto

```
URL: https://hukbilmyblqlomoaiszm.supabase.co
Project ID: hukbilmyblqlomoaiszm
Anon/Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2JpbG15YmxxbG9tb2Fpc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTM4MzgsImV4cCI6MjA4Mzk2OTgzOH0.dm6A7cymtNHUNGBWeQaTEAstKPhpMsAvBA9NteqhE28
```

## 🚀 Passo a Passo de Configuração

### 1. Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login com suas credenciais
3. Selecione o projeto `hukbilmyblqlomoaiszm`

### 2. Configurar Autenticação

#### 2.1. Habilitar Provedores de Autenticação

1. No dashboard, vá em **Authentication** → **Providers**
2. Certifique-se de que **Email** está habilitado
3. Configure as seguintes opções:

```
✅ Enable email provider
✅ Confirm email (recomendado para produção)
✅ Secure email change
```

#### 2.2. Configurar Templates de E-mail

1. Vá em **Authentication** → **Email Templates**
2. Personalize os seguintes templates:

**Confirm Signup:**
```
Subject: Confirme seu cadastro no Tentáculo Flow

Olá!

Clique no link abaixo para confirmar seu cadastro:
{{ .ConfirmationURL }}

Se você não criou esta conta, ignore este e-mail.
```

**Reset Password:**
```
Subject: Redefinir senha - Tentáculo Flow

Olá!

Você solicitou a redefinição de senha. Clique no link abaixo:
{{ .ConfirmationURL }}

Se você não solicitou isso, ignore este e-mail.
```

#### 2.3. Configurar URL de Redirecionamento

1. Vá em **Authentication** → **URL Configuration**
2. Adicione suas URLs permitidas:

```
Site URL: http://localhost:5174 (desenvolvimento)
Redirect URLs:
  - http://localhost:5174/reset-password
  - http://localhost:5174/auth
```

**Para produção, adicione:**
```
Site URL: https://seu-dominio.com
Redirect URLs:
  - https://seu-dominio.com/reset-password
  - https://seu-dominio.com/auth
```

### 3. Executar Scripts SQL

1. Vá em **SQL Editor** no menu lateral
2. Clique em **+ New Query**
3. Copie todo o conteúdo do arquivo `supabase-setup.sql`
4. Cole no editor
5. Clique em **Run** para executar

**O que este script faz:**
- ✅ Cria tabela `profiles` para dados dos usuários
- ✅ Configura políticas de segurança (RLS)
- ✅ Cria trigger para criar perfil automaticamente
- ✅ Configura atualização automática de timestamps

### 4. Verificar Tabelas Criadas

1. Vá em **Table Editor** no menu lateral
2. Você deve ver a tabela **profiles**
3. A estrutura deve ser:

```sql
profiles
├── id (uuid) - FK para auth.users
├── full_name (text)
├── avatar_url (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### 5. Testar Autenticação

1. Inicie o servidor: `npm run dev`
2. Acesse: http://localhost:5174/auth
3. Crie uma nova conta
4. Verifique se:
   - ✅ Usuário foi criado em **Authentication** → **Users**
   - ✅ Perfil foi criado automaticamente em **profiles**

### 6. Configurar Políticas de Segurança (RLS)

As políticas já foram criadas pelo script SQL, mas você pode verificar:

1. Vá em **Table Editor** → **profiles**
2. Clique na aba **Policies**
3. Verifique se existem as políticas:
   - "Usuários podem ver seu próprio perfil" (SELECT)
   - "Usuários podem atualizar seu próprio perfil" (UPDATE)
   - "Usuários podem inserir seu próprio perfil" (INSERT)

## 🔐 Funcionalidades Implementadas

### Login
- Email + senha
- Validação com Zod
- Mensagens de erro amigáveis

### Cadastro
- Email + senha + nome completo
- Confirmação de senha
- Criação automática de perfil

### Recuperação de Senha
- Envio de e-mail com link de reset
- Página de redefinição de senha
- Link "Esqueci minha senha" na tela de login

## 📊 Estrutura de Dados

### Tabela `auth.users` (gerenciada pelo Supabase)
- id (uuid)
- email (text)
- encrypted_password (text)
- email_confirmed_at (timestamptz)
- raw_user_meta_data (jsonb)
  - full_name

### Tabela `public.profiles` (criada por você)
- id (uuid) - FK para auth.users
- full_name (text)
- avatar_url (text)
- created_at (timestamptz)
- updated_at (timestamptz)

## 🔧 Próximas Tabelas

Conforme você desenvolver o sistema, adicione tabelas específicas. Exemplo:

```sql
-- Tabela de projetos, tarefas, clientes, etc.
CREATE TABLE public.sua_tabela (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- seus campos aqui
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sempre habilite RLS
ALTER TABLE public.sua_tabela ENABLE ROW LEVEL SECURITY;

-- Crie políticas apropriadas
CREATE POLICY "..." ON public.sua_tabela ...;
```

## ⚠️ Importante

1. **RLS sempre habilitado**: Todas as tabelas públicas devem ter RLS ativado
2. **Políticas específicas**: Crie políticas que garantam que usuários só acessem seus próprios dados
3. **Service Role**: Use a service_role key APENAS no backend, nunca no frontend
4. **Anon Key**: A anon key já está configurada no `.env` e é segura para uso público

## 🆘 Troubleshooting

### Erro: "New row violates row-level security policy"
- Verifique se as políticas RLS estão configuradas corretamente
- Certifique-se de que `auth.uid()` retorna o ID correto

### Perfil não é criado automaticamente
- Verifique se o trigger `on_auth_user_created` existe
- Veja os logs em **Logs** → **Postgres Logs**

### E-mails de recuperação não chegam
- Verifique a configuração SMTP em **Project Settings** → **Auth**
- Em desenvolvimento, os e-mails aparecem nos logs

### Erro ao fazer login
- Verifique se as credenciais estão corretas no `.env`
- Confirme que o Supabase URL está correto
- Veja erros no console do navegador

## 📝 Checklist de Configuração

- [ ] Executar script SQL (`supabase-setup.sql`)
- [ ] Configurar provedores de autenticação
- [ ] Personalizar templates de e-mail
- [ ] Adicionar URLs de redirecionamento
- [ ] Testar criação de conta
- [ ] Testar login
- [ ] Testar recuperação de senha
- [ ] Verificar criação automática de perfil
- [ ] Configurar SMTP para e-mails (produção)

## 🎯 Próximos Passos

1. Execute o script SQL
2. Teste todas as funcionalidades de autenticação
3. Quando tiver os códigos da área logada, criaremos as tabelas adicionais necessárias
4. Configure SMTP para envio real de e-mails quando for para produção
