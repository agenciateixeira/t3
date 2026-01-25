# ⚙️ Configurar Webhook para Push Notifications

## Por que precisamos disso?

Atualmente, a push notification só é enviada quando o usuário está com a aplicação aberta e recebe a notificação via Realtime. Para que as push notifications funcionem **mesmo quando a aplicação está fechada**, precisamos configurar um Database Webhook no Supabase.

## Passo a Passo

### 1. Acessar Database Webhooks

Acesse: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/database/hooks

### 2. Criar Novo Webhook

Clique em **"Create a new hook"** ou **"Enable Webhooks"**

### 3. Configurar o Webhook

Preencha os campos:

#### Nome
```
send-push-on-notification
```

#### Tabela
```
notifications
```

#### Eventos
Marque apenas: **INSERT** ✅

#### HTTP Request

**Tipo**: `POST`

**URL**:
```
https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/send-push-notification
```

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2JpbG15YmxxbG9tb2Fpc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTM4MzgsImV4cCI6MjA4Mzk2OTgzOH0.dm6A7cymtNHUNGBWeQaTEAstKPhpMsAvBA9NteqhE28"
}
```

**Body** (Payload):
```json
{
  "notification_id": "{{ record.id }}",
  "user_id": "{{ record.user_id }}",
  "notification": {
    "title": "{{ record.title }}",
    "message": "{{ record.message }}",
    "type": "{{ record.type }}",
    "reference_id": "{{ record.reference_id }}",
    "reference_type": "{{ record.reference_type }}"
  }
}
```

#### Condições (opcional)

Deixe em branco ou adicione se quiser filtrar:
```sql
-- Exemplo: só enviar push para notificações não lidas
is_read = false
```

### 4. Salvar

Clique em **"Create webhook"** ou **"Save"**

### 5. Testar

Após salvar, o webhook deve aparecer na lista como **"Enabled"** ou **"Active"**.

Para testar:

1. Crie uma tarefa e atribua a um usuário
2. Verifique os logs do webhook em: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/database/hooks
3. Verifique os logs da Edge Function em: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/logs/edge-functions

---

## Como Funciona

```
Nova Tarefa Criada
       ↓
Trigger SQL cria notificação na tabela notifications
       ↓
Webhook dispara automaticamente (mesmo se app fechado)
       ↓
Chama Edge Function send-push-notification
       ↓
Edge Function busca subscriptions do usuário
       ↓
Envia push notification via Web Push API
       ↓
Usuário recebe notificação no navegador/device
```

---

## Alternativa: Trigger SQL com pg_net

Se preferir usar SQL ao invés de Webhook do dashboard, use o arquivo:
`migrations/add-notification-push-trigger.sql`

Execute este SQL no Editor SQL do Supabase.

**IMPORTANTE**: Requer que a extensão `pg_net` esteja habilitada no seu projeto Supabase (geralmente já está).

---

## Troubleshooting

### Webhook não está disparando
- Verifique se está "Enabled"
- Verifique se a tabela está correta (notifications)
- Verifique se o evento INSERT está marcado

### Erro 401 Unauthorized
- Verifique se o token Bearer no header está correto
- Use o anon key do Supabase

### Push não chega
- Verifique logs da Edge Function
- Verifique se o usuário tem subscription ativa na tabela `push_subscriptions`
- Verifique se o Service Worker está registrado
- Verifique se as permissões de notificação estão ativadas no navegador

### Como ver os logs
- Logs do Webhook: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/database/hooks
- Logs da Edge Function: https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/logs/edge-functions

---

**Última atualização**: 2026-01-24
