# Configuração de Cron para Lembretes Automáticos

Como o Supabase não oferece cron nativo em todas as contas, use um serviço externo gratuito.

## 📋 Passo 1: Adicionar Secret no Supabase

1. Acesse: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/settings/vault
2. Clique em "New Secret"
3. **Name:** `CRON_SECRET`
4. **Secret:** `15d35fe9a65c6b00020cc5542844d005316097b7bc1b45f88d61294320ebfe94`
5. Salve

## 📋 Passo 2: Configurar Cron Job (Escolha UMA das opções)

### Opção A: cron-job.org (Recomendado - Grátis)

1. Acesse: https://cron-job.org/
2. Crie uma conta gratuita
3. Clique em "Create Cronjob"
4. Configure:
   - **Title:** `Task Reminders`
   - **URL:** `https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-task-reminders`
   - **Schedule:**
     - Escolha "Every 6 hours" OU
     - Custom: `0 6,12,18 * * *` (às 6h, 12h, 18h)
   - **Request Method:** POST
   - **Headers:** Clique em "Add header"
     - **Name:** `Authorization`
     - **Value:** `Bearer 15d35fe9a65c6b00020cc5542844d005316097b7bc1b45f88d61294320ebfe94`
5. Salve e ative

### Opção B: EasyCron (Grátis até 20 jobs)

1. Acesse: https://www.easycron.com/
2. Crie conta
3. Add Cron Job:
   - **URL:** `https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-task-reminders`
   - **Cron Expression:** `0 6,12,18 * * *`
   - **HTTP Method:** POST
   - **HTTP Headers:** `Authorization: Bearer 15d35fe9a65c6b00020cc5542844d005316097b7bc1b45f88d61294320ebfe94`

### Opção C: GitHub Actions (Grátis - Requer repositório)

Adicione arquivo `.github/workflows/task-reminders.yml`:

```yaml
name: Task Reminders Cron

on:
  schedule:
    - cron: '0 6,12,18 * * *'  # 6h, 12h, 18h UTC (ajuste timezone)
  workflow_dispatch:  # Permite execução manual

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer 15d35fe9a65c6b00020cc5542844d005316097b7bc1b45f88d61294320ebfe94" \
            https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-task-reminders
```

## ✅ Testar Agora

Você pode testar manualmente com:

```bash
curl -X POST \
  -H "Authorization: Bearer 15d35fe9a65c6b00020cc5542844d005316097b7bc1b45f88d61294320ebfe94" \
  https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-task-reminders
```

Ou direto no SQL Editor do Supabase:
```sql
SELECT send_task_reminders();
```

## 🔒 Segurança

- ⚠️ **NUNCA** compartilhe o CRON_SECRET publicamente
- O token está protegido no Supabase Vault
- Apenas requisições com o token correto funcionarão
