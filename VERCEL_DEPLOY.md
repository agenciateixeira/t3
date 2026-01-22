# Deploy na Vercel 🚀

Guia completo para fazer deploy do T3ntaculos Flow na Vercel.

## 📋 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Projeto no GitHub (✅ já feito!)
- Credenciais do Supabase

## 🔑 Variáveis de Ambiente para Vercel

Configure estas **3 variáveis** no Vercel:

### 1. `VITE_SUPABASE_PROJECT_ID`
- **Valor**: ID do seu projeto Supabase
- **Exemplo**: `abc123def456`
- **Onde encontrar**: URL do projeto (`https://ESTE-ID.supabase.co`)

### 2. `VITE_SUPABASE_URL`
- **Valor**: URL completa do projeto Supabase
- **Exemplo**: `https://abc123def456.supabase.co`
- **Onde encontrar**: [Supabase Settings > API](https://app.supabase.com/project/_/settings/api)

### 3. `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Valor**: Chave pública anon do Supabase
- **Exemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QtaWQi...`
- **Onde encontrar**: [Supabase Settings > API](https://app.supabase.com/project/_/settings/api) → "anon public"
- **⚠️ IMPORTANTE**: É a chave **anon**, NÃO a service_role!

## 🚀 Passo a Passo do Deploy

### Opção 1: Deploy Automático (Recomendado)

1. **Acesse a Vercel**: https://vercel.com/new

2. **Importe o Repositório**:
   - Clique em "Import Project"
   - Conecte sua conta GitHub
   - Selecione o repositório: `agenciateixeira/t3`

3. **Configure o Projeto**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (raiz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Adicione as Variáveis de Ambiente**:
   ```
   VITE_SUPABASE_PROJECT_ID = seu-project-id
   VITE_SUPABASE_URL = https://seu-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = sua-chave-anon-public
   ```

5. **Clique em "Deploy"** 🚀

### Opção 2: Deploy via CLI

```bash
# 1. Instale o Vercel CLI
npm i -g vercel

# 2. Faça login
vercel login

# 3. Configure o projeto
vercel

# 4. Adicione as variáveis de ambiente (uma por vez)
vercel env add VITE_SUPABASE_PROJECT_ID
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY

# 5. Deploy para produção
vercel --prod
```

## 🔧 Configuração na Vercel Dashboard

Após importar o projeto, acesse **Project Settings** → **Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_PROJECT_ID` | `seu-project-id` | Production, Preview, Development |
| `VITE_SUPABASE_URL` | `https://seu-project-id.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGci...` | Production, Preview, Development |

**⚠️ IMPORTANTE**: Marque **Production, Preview e Development** para todas as variáveis!

## 📱 Configurar Domínio Personalizado (Opcional)

1. Acesse **Settings** → **Domains**
2. Adicione seu domínio: `app.t3ntaculos.com.br`
3. Configure os DNS records conforme instruções da Vercel

## 🔒 Configurar Supabase para Produção

Após o deploy, adicione a URL da Vercel no Supabase:

1. Acesse [Supabase Auth Settings](https://app.supabase.com/project/_/auth/url-configuration)
2. Em **Site URL**, adicione: `https://seu-projeto.vercel.app`
3. Em **Redirect URLs**, adicione:
   ```
   https://seu-projeto.vercel.app/**
   https://seu-projeto.vercel.app/reset-password
   ```

## ✅ Verificação Pós-Deploy

Após o deploy, teste:

1. ✅ Acesse a URL do projeto
2. ✅ Faça login com um usuário
3. ✅ Teste o Chat
4. ✅ Teste o Pipeline
5. ✅ Verifique se as Ferramentas carregam

## 🐛 Troubleshooting

### Erro: "Build failed"
```bash
# Verifique se as variáveis estão configuradas
# Verifique os logs de build na Vercel
```

### Erro: "Supabase connection failed"
- ✅ Verifique se as variáveis de ambiente estão corretas
- ✅ Verifique se a URL do Supabase está correta (com `https://`)
- ✅ Verifique se está usando a chave **anon**, não a service_role

### Erro: "401 Unauthorized"
- ✅ Adicione a URL da Vercel nas Redirect URLs do Supabase
- ✅ Verifique a Site URL no Supabase Auth

## 🔄 Deploy Contínuo

A Vercel faz deploy automático sempre que você:
- Faz push para a branch `main` (produção)
- Abre um Pull Request (preview)

## 📊 Monitoramento

- **Analytics**: Vercel Analytics (ative em Settings → Analytics)
- **Logs**: Acesse Deployments → View Function Logs
- **Performance**: Speed Insights disponível

## 💡 Dicas

1. **Use Preview Deploys**: Teste mudanças em branches antes de fazer merge
2. **Environment Variables**: Nunca commite `.env` no git
3. **Build Cache**: Vercel cacheia builds para deploys mais rápidos
4. **Edge Functions**: Considere usar Edge Functions para performance

---

**Pronto!** Seu T3ntaculos Flow estará no ar! 🐙

URL esperada: `https://t3-XXXXX.vercel.app`
