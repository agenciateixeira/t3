# Setup de Push Notifications

Este guia explica como configurar completamente o sistema de Push Notifications no projeto.

## 📋 Pré-requisitos

1. Node.js instalado
2. Supabase CLI instalado (`npm install -g supabase`)
3. Conta Supabase ativa
4. Projeto Supabase configurado

## 🔑 Passo 1: Gerar VAPID Keys

VAPID keys são necessárias para autenticar o servidor ao enviar push notifications.

```bash
# Instalar web-push globalmente
npm install -g web-push

# Gerar par de chaves VAPID
web-push generate-vapid-keys
```

Você receberá algo como:

```
Public Key: BCxxxxxxxxxxxxxxxxxxxxxxx...
Private Key: xxxxxxxxxxxxxxxxxxxxxxx...
```

**IMPORTANTE**: Guarde essas chaves em segurança!

## 🗄️ Passo 2: Configurar Banco de Dados

Execute as migrations no Supabase SQL Editor:

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o arquivo: `migrations/add-push-notifications.sql`

Isso criará a tabela `push_subscriptions` com as policies de RLS necessárias.

## ⚙️ Passo 3: Configurar Edge Function

### 3.1 Login no Supabase CLI

```bash
supabase login
```

### 3.2 Linkar seu projeto

```bash
supabase link --project-ref SEU_PROJECT_REF
```

Encontre o `PROJECT_REF` no dashboard do Supabase (URL: https://app.supabase.com/project/SEU_PROJECT_REF)

### 3.3 Configurar Secrets

Adicione as VAPID keys como secrets:

```bash
# Public Key
supabase secrets set VAPID_PUBLIC_KEY="BCxxxxxxxxxxxxxxxxxxxxxxx..."

# Private Key
supabase secrets set VAPID_PRIVATE_KEY="xxxxxxxxxxxxxxxxxxxxxxx..."

# Subject (seu email ou URL do site)
supabase secrets set VAPID_SUBJECT="mailto:seu-email@exemplo.com"
```

### 3.4 Deploy da Edge Function

```bash
supabase functions deploy send-push-notification
```

## 🔧 Passo 4: Configurar Frontend

### 4.1 Atualizar VAPID Public Key

Edite o arquivo `src/hooks/usePushNotifications.ts`:

```typescript
// Linha ~7
const VAPID_PUBLIC_KEY = 'SUA_VAPID_PUBLIC_KEY_AQUI';
```

Substitua `'SUA_VAPID_PUBLIC_KEY_AQUI'` pela Public Key gerada no Passo 1.

### 4.2 Verificar Service Worker

O service worker já está em `public/sw.js`. Certifique-se de que este arquivo está sendo servido corretamente.

## 🔌 Passo 5: Integrar com Sistema de Notificações

Atualize a migration `migrations/create-notifications-system.sql` para chamar a Edge Function quando criar uma notificação:

Adicione ao final do arquivo:

```sql
-- Função para enviar push notification quando criar notificação
CREATE OR REPLACE FUNCTION send_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
BEGIN
  -- URL da Edge Function
  function_url := current_setting('app.settings.supabase_functions_url') || '/send-push-notification';

  -- Chamar Edge Function via HTTP (requer extensão http)
  -- Nota: Você precisará instalar a extensão pg_net no Supabase
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'notification', jsonb_build_object(
          'title', NEW.title,
          'message', NEW.message,
          'type', NEW.type,
          'reference_id', NEW.reference_id,
          'reference_type', NEW.reference_type
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para enviar push ao criar notificação
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON notifications;
CREATE TRIGGER trigger_send_push_on_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_notification();
```

**Nota**: Esta abordagem requer a extensão `pg_net` que precisa ser habilitada no Supabase.

### Alternativa: Enviar Push via Cliente

Se preferir não usar trigger no banco, você pode enviar push notifications diretamente do frontend/backend quando criar notificações.

Exemplo:

```typescript
// Após criar notificação
const { data: notification } = await supabase
  .from('notifications')
  .insert({...})
  .select()
  .single();

// Enviar push
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: notification.user_id,
    notification: {
      title: notification.title,
      message: notification.message,
      type: notification.type,
      reference_id: notification.reference_id,
      reference_type: notification.reference_type,
    },
  },
});
```

## 🧪 Passo 6: Testar

1. Faça login na aplicação
2. Você verá um popup solicitando permissão para notificações
3. Clique em "Ativar"
4. Permita notificações no navegador
5. Crie uma tarefa e atribua a você mesmo
6. Você deve receber uma push notification!

## 🔍 Debugging

### Verificar Service Worker

```javascript
// Console do navegador
navigator.serviceWorker.getRegistrations().then(console.log);
```

### Verificar Subscription

```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(console.log);
});
```

### Verificar Logs da Edge Function

```bash
supabase functions logs send-push-notification
```

## 📱 Suporte de Navegadores

- ✅ Chrome/Edge (Desktop e Android)
- ✅ Firefox (Desktop e Android)
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ❌ Safari < 16 (não suporta)

## 🚨 Importante

1. **HTTPS é obrigatório** (exceto localhost)
2. **Usuário deve dar permissão** explicitamente
3. **Service Worker** precisa estar registrado antes de criar subscription
4. **VAPID keys** devem ser mantidas em segredo (especialmente a private key)

## 📚 Recursos Adicionais

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Protocol](https://datatracker.ietf.org/doc/html/rfc8292)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🆘 Troubleshooting

### Push não está sendo enviado

1. Verificar se Edge Function foi deployed: `supabase functions list`
2. Verificar secrets: `supabase secrets list`
3. Verificar logs: `supabase functions logs send-push-notification`

### Subscription não está sendo salva

1. Verificar RLS policies na tabela `push_subscriptions`
2. Verificar se usuário está autenticado
3. Verificar console do navegador para erros

### Notificação não aparece

1. Verificar permissões do navegador
2. Verificar se service worker está ativo
3. Testar enviando push manualmente via DevTools
