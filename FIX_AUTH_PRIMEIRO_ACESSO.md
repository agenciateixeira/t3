# Correção do Primeiro Acesso - Auth

## Problema
Ao tentar fazer o primeiro acesso com CPF, o sistema retornava o erro:
```
Erro: Não foi possível encontrar os dados do colaborador.
```

Mesmo quando o colaborador já estava cadastrado no sistema.

## Causa Raiz
1. O CPF não estava sendo salvo na tabela `profiles` quando o colaborador era criado
2. A função `getPreRegisteredEmployee()` busca por CPF na tabela profiles
3. Quando não encontra o CPF, tentava buscar o perfil pelo email
4. O campo `email` só existe na tabela `auth.users`, não na tabela `profiles`
5. A API admin do Supabase (`supabase.auth.admin`) não está disponível no client-side

## Solução Implementada

### 1. Função RPC Criada
Criada a função `get_profile_by_email` que busca o perfil através do email em `auth.users`:

**Arquivo**: `migrations/add-get-profile-by-email-rpc.sql`

### 2. Código Atualizado
**Arquivo**: `/src/pages/Auth.tsx` (linhas 252-292)

O código agora:
1. Tenta buscar colaborador pelo CPF
2. Se não encontrar, usa a RPC `get_profile_by_email` para buscar pelo email
3. Atualiza o CPF no perfil se ele estiver faltando
4. Permite que o colaborador continue o fluxo de primeiro acesso

## Como Aplicar a Correção

### Passo 1: Executar o SQL no Supabase

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Crie uma nova query
5. Cole o conteúdo do arquivo `migrations/add-get-profile-by-email-rpc.sql`:

```sql
-- Create RPC function to get profile by email
-- This function allows querying profiles by email from auth.users table
-- Used during first access authentication when CPF is not yet saved in profiles

CREATE OR REPLACE FUNCTION get_profile_by_email(email_input TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  cpf TEXT,
  phone TEXT,
  hierarchy TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.cpf,
    p.phone,
    p.hierarchy,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE u.email = email_input;
END;
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profile_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_by_email(TEXT) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION get_profile_by_email(TEXT) IS 'Retrieves profile data by querying auth.users email. Used for first access authentication when CPF is not yet saved in profiles table.';
```

6. Execute a query (clique em Run ou pressione Cmd/Ctrl + Enter)
7. Confirme que a função foi criada com sucesso

### Passo 2: Deploy do Frontend

O código do frontend já foi atualizado e commitado. Basta fazer o deploy:

```bash
git add .
git commit -m "fix: corrige autenticação de primeiro acesso quando CPF não está salvo"
git push
```

O Vercel fará o deploy automático.

### Passo 3: Testar

1. Acesse a página de primeiro acesso
2. Informe um CPF de colaborador já cadastrado (ex: vanessa@t3ntaculos.com.br)
3. Verifique se o sistema agora encontra os dados e permite redefinir a senha

## Fluxo de Autenticação Atualizado

```
1. Usuário informa CPF
   ↓
2. Sistema busca por CPF na tabela profiles usando getPreRegisteredEmployee()
   ↓
3. Se encontrar → prossegue normalmente
   ↓
4. Se NÃO encontrar:
   a. Busca email através da RPC get_email_by_cpf
   b. Se encontrou email:
      - Usa RPC get_profile_by_email para buscar perfil
      - Atualiza CPF no perfil se estiver faltando
      - Prossegue com o fluxo de redefinição de senha
   c. Se NÃO encontrou → mostra erro
```

## Logs de Debug

O sistema agora mostra logs detalhados no console:
- `Employee data:` - Dados encontrados pelo CPF
- `Email from RPC:` - Email retornado pela busca por CPF
- `Profile by email (RPC):` - Perfil encontrado pelo email
- `Profile error:` - Erros ao buscar perfil

## Observações Importantes

1. A função RPC usa `SECURITY DEFINER` para ter permissão de acessar a tabela `auth.users`
2. A função está disponível tanto para usuários autenticados (`authenticated`) quanto anônimos (`anon`)
3. O CPF é automaticamente atualizado no perfil quando encontrado através do email
4. Esta correção não afeta colaboradores que já têm CPF salvo corretamente

## Arquivos Modificados

- `/src/pages/Auth.tsx` - Lógica de autenticação atualizada
- `/migrations/add-get-profile-by-email-rpc.sql` - Nova função RPC criada
