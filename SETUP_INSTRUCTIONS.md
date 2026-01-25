# 🚀 Setup de Notificações Push - Instruções

## 📋 Pré-requisitos

1. Conta Supabase ativa
2. Projeto já configurado
3. Arquivo `.env` com credenciais (não commitado no Git)

## 🔧 Configuração

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Depois edite `.env` e adicione:
- `VITE_SUPABASE_URL`: URL do seu projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Anon key do Supabase (em Settings > API)
- `VITE_VAPID_PUBLIC_KEY`: Public key do VAPID (gerada automaticamente)

### 2. Executar Migrations SQL

Acesse o SQL Editor do Supabase e execute na ordem:

1. `migrations/create-notifications-system.sql`
2. `migrations/add-push-notifications.sql`

### 3. Configurar Secrets no Supabase

No Supabase Dashboard, acesse **Settings > Vault** e adicione:

#### VAPID Keys (Push Notifications)

Execute localmente para gerar novas keys (se necessário):
```bash
npx web-push generate-vapid-keys
```

Adicione os 3 secrets:
- `VAPID_PUBLIC_KEY`: Public key gerada
- `VAPID_PRIVATE_KEY`: Private key gerada
- `VAPID_SUBJECT`: `mailto:seu-email@dominio.com`

**IMPORTANTE**: As keys já estão configuradas. Só reconfigure se precisar gerar novas.

### 4. Deploy da Edge Function

#### Opção A: Via Dashboard (Recomendado)

1. Acesse **Edge Functions** no Supabase Dashboard
2. Crie nova function chamada `send-push-notification`
3. Cole o código de `supabase/functions/send-push-notification/index.ts`
4. Deploy!

#### Opção B: Via CLI

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy send-push-notification
```

### 5. Configurar Vercel (Produção)

No Vercel, adicione as variáveis de ambiente:

```
VITE_SUPABASE_URL=<sua URL do Supabase>
VITE_SUPABASE_ANON_KEY=<sua anon key>
VITE_VAPID_PUBLIC_KEY=<sua VAPID public key>
```

## ✅ Verificação

Após configurar tudo:

1. Acesse a aplicação
2. Faça login
3. Aceite permissão de notificações
4. Crie uma tarefa e atribua a você
5. Você deve receber uma push notification!

## 🔒 Segurança

- ✅ Arquivo `.env` está no `.gitignore`
- ✅ Credenciais NÃO estão commitadas
- ✅ Service Role Key fica apenas no Supabase
- ✅ Private Key fica apenas nos Secrets do Supabase

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do Supabase
2. Verifique o console do navegador
3. Confirme que as migrations foram executadas
4. Confirme que a Edge Function está deployada

## 🎯 Checklist

- [ ] Arquivo `.env` criado e preenchido
- [ ] Migrations SQL executadas
- [ ] Secrets configurados no Supabase
- [ ] Edge Function deployada
- [ ] Variáveis configuradas no Vercel
- [ ] Sistema testado e funcionando

---

**Última atualização**: 2026-01-24
