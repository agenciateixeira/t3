# 🚀 Deploy da Edge Function - Guia Passo a Passo

## Opção 1: Via Dashboard do Supabase (RECOMENDADO - Mais Fácil)

### Passo 1: Acessar Edge Functions
Acesse: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/functions

### Passo 2: Criar Nova Function
1. Clique em **"Create a new function"** ou **"New Edge Function"**
2. Configure:
   - **Nome**: `send-push-notification`
   - **Manter os demais campos padrão**

### Passo 3: Copiar o Código
Abra o arquivo `supabase/functions/send-push-notification/index.ts` e copie TODO o conteúdo.

### Passo 4: Colar no Editor
Cole o código no editor do Supabase Dashboard

### Passo 5: Deploy
Clique em **"Deploy function"**

### Passo 6: Verificar
Após o deploy, você verá a function listada. Status deve estar como **"Active"**

---

## Opção 2: Via CLI (Se preferir)

### Pré-requisitos
```bash
# Fazer login
supabase login
```

### Deploy
```bash
# Na pasta raiz do projeto
cd /Users/guilhermeteixeira/Documents/PROJETOS/t3

# Deploy
supabase functions deploy send-push-notification
```

---

## ⚙️ Configurar Secrets (IMPORTANTE!)

**ANTES** de testar a function, configure os secrets:

### Acessar Vault
https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/settings/vault

### Adicionar Secrets

Clique em **"New secret"** para cada um:

1. **VAPID_PUBLIC_KEY**
   ```
   BBrMkjArSIrZyWfUQ_BRsx6kUjC8PrrZnOD1t2eNzvCVrfkOrZDRbsu03onmNcX5PUJKs7nhJULRTSFAKXktu0Q
   ```

2. **VAPID_PRIVATE_KEY**
   ```
   Uv73eeUJbXbA6eKnvSmt3_WMFaMOuZUVTURGQPnruIc
   ```

3. **VAPID_SUBJECT**
   ```
   mailto:guilherme@agenciateixeira.com.br
   ```

---

## 🧪 Testar a Function

### Via Dashboard
1. Acesse a function deployada
2. Clique em **"Invoke"** ou **"Test"**
3. Use este payload de teste:

```json
{
  "user_id": "UUID_DO_USUARIO_TESTE",
  "notification": {
    "title": "Teste",
    "message": "Testando push notification",
    "type": "system"
  }
}
```

### Via cURL
```bash
curl -i --location --request POST \
  'https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-push-notification' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2JpbG15YmxxbG9tb2Fpc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTM4MzgsImV4cCI6MjA4Mzk2OTgzOH0.dm6A7cymtNHUNGBWeQaTEAstKPhpMsAvBA9NteqhE28' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "UUID_DO_USUARIO",
    "notification": {
      "title": "Teste",
      "message": "Testando push notification"
    }
  }'
```

---

## 📝 Logs

Para ver os logs da function:
https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/logs/edge-functions

---

## ⚙️ Configurar Webhook (CRÍTICO!)

**IMPORTANTE**: Para que as push notifications funcionem mesmo quando o app está fechado, você precisa configurar um Database Webhook.

📄 **Siga as instruções detalhadas em**: `CONFIGURE_WEBHOOK.md`

Resumo rápido:
1. Acesse: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/database/hooks
2. Crie novo webhook na tabela `notifications`
3. Configure para chamar a Edge Function em eventos INSERT
4. Use o payload template do arquivo CONFIGURE_WEBHOOK.md

---

## ✅ Checklist

- [ ] Edge Function deployada
- [ ] Secrets configurados (3 secrets do VAPID)
- [ ] **Database Webhook configurado** ⚠️ NOVO!
- [ ] Function testada e funcionando
- [ ] Logs verificados (sem erros)

---

## 🔍 Troubleshooting

### Erro: "VAPID keys not configured"
- Verifique se os 3 secrets foram adicionados no Vault
- Nomes devem ser EXATAMENTE: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

### Erro: "No active subscriptions found"
- Normal se nenhum usuário ativou notificações push ainda
- Primeiro ative as notificações no navegador, depois teste

### Function não aparece
- Aguarde alguns segundos após deploy
- Recarregue a página do dashboard
- Verifique se não há erros de sintaxe no código

---

**Última atualização**: 2026-01-24
