# 🔧 Como Executar a Migration Settings (Evitando Deadlock)

## ⚠️ Se você recebeu erro de DEADLOCK:

Execute as migrations em **3 blocos separados** na ordem abaixo:

---

## 📝 PASSO A PASSO:

### 1️⃣ Abra o Supabase SQL Editor
- Acesse: https://supabase.com/dashboard
- Vá em: **SQL Editor** (menu lateral)
- Clique em: **New query**

---

### 2️⃣ Execute BLOCO 1: Criar Tabelas

Abra o arquivo: `migrations/settings-1-tables.sql`

Copie **TODO o conteúdo** e cole no SQL Editor

Clique em **Run** (ou `Ctrl+Enter`)

✅ Aguarde: **Success. No rows returned**

---

### 3️⃣ Execute BLOCO 2: RLS e Políticas

⏱️ **AGUARDE 10 SEGUNDOS** antes de continuar

Clique em **New query** novamente

Abra o arquivo: `migrations/settings-2-rls.sql`

Copie **TODO o conteúdo** e cole no SQL Editor

Clique em **Run** (ou `Ctrl+Enter`)

✅ Aguarde: **Success. No rows returned**

---

### 4️⃣ Execute BLOCO 3: Seed Data

⏱️ **AGUARDE 10 SEGUNDOS** antes de continuar

Clique em **New query** novamente

Abra o arquivo: `migrations/settings-3-seed.sql`

Copie **TODO o conteúdo** e cole no SQL Editor

Clique em **Run** (ou `Ctrl+Enter`)

✅ Aguarde: **Success. No rows returned**

---

## ✅ Verificação:

Após executar os 3 blocos, verifique se as tabelas foram criadas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organization_settings',
    'role_permissions',
    'pipelines',
    'pipeline_stages',
    'notification_settings',
    'audit_logs'
  );
```

Você deve ver **6 tabelas** no resultado.

---

## 🎯 Próximos Passos:

Depois de executar as migrations com sucesso:

1. **Criar bucket** `org-logos` no Storage (veja SETTINGS_SETUP.md)
2. **Verificar se você é admin**: `SELECT hierarchy FROM profiles WHERE id = auth.uid();`
3. **Atualizar para admin** (se necessário): `UPDATE profiles SET hierarchy = 'admin' WHERE id = auth.uid();`
4. **Acessar** `/settings` na aplicação

---

## 🚨 Se ainda der erro de Deadlock:

Execute este SQL **antes** de cada bloco:

```sql
-- Cancelar queries ativas
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND pid <> pg_backend_pid()
  AND query NOT ILIKE '%pg_stat_activity%';
```

⏱️ Aguarde 5 segundos e execute o bloco normalmente.

---

**Por que dividir em blocos?**

O deadlock acontece quando há muitas operações DDL (CREATE, ALTER, DROP) executadas ao mesmo tempo. Dividindo em blocos menores, evitamos que o banco de dados trave.
