# ⚙️ Configuração do Sistema Settings

Guia completo para configurar a página de Settings no Supabase.

## 📋 Passo 1: Executar Migration SQL

1. **Acesse o Supabase Dashboard**: https://supabase.com/dashboard
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New query**
4. Abra o arquivo: `migrations/settings-organization.sql`
5. Copie **TODO o conteúdo** e cole no SQL Editor
6. Clique em **Run** (ou `Ctrl+Enter`)
7. Aguarde: **Success. No rows returned**

Isso vai criar:
- ✅ 6 tabelas (organization_settings, role_permissions, pipelines, pipeline_stages, notification_settings, audit_logs)
- ✅ Políticas RLS (apenas admin pode acessar)
- ✅ Triggers para updated_at
- ✅ Seed data (1 organização, 7 roles, 1 notification_settings)

## 🪣 Passo 2: Criar Bucket para Logos

1. Vá em **Storage** (menu lateral)
2. Clique em **New bucket**
3. Configure:
   - **Name**: `org-logos`
   - **Public bucket**: ✅ **MARCAR**
   - Deixe resto padrão
4. Clique em **Create bucket**

## 🔐 Passo 3: Aplicar Políticas do Storage

Depois de criar o bucket, volte para o **SQL Editor** e execute:

```sql
-- Políticas para bucket org-logos
DROP POLICY IF EXISTS "Admins podem fazer upload de logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar logos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver logos" ON storage.objects;

CREATE POLICY "Admins podem fazer upload de logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND hierarchy = 'admin'
    )
  );

CREATE POLICY "Todos podem ver logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');
```

## ✅ Passo 4: Verificar se seu usuário é Admin

Para acessar /settings, você precisa ser admin:

```sql
-- Verificar seu hierarchy
SELECT id, full_name, hierarchy FROM profiles WHERE id = auth.uid();

-- Se não for 'admin', atualizar para admin:
UPDATE profiles SET hierarchy = 'admin' WHERE id = auth.uid();
```

## 🧪 Passo 5: Testar a Página

1. **Acesse**: `/settings` na aplicação
2. Se não for admin: será redirecionado para /dashboard
3. Se for admin: verá as 6 tabs

### Teste cada Tab:

**1. Organização**
- ✅ Upload de logo (clique em "Alterar Logo")
- ✅ Editar nome da empresa
- ✅ Mudar cor principal (color picker)
- ✅ Selecionar timezone
- ✅ Salvar configurações

**2. Permissões**
- ✅ Selecionar role no dropdown
- ✅ Ver tabela de permissões (view/create/edit/delete)
- ✅ Toggle switches para mudar permissões
- ✅ Salvar permissões

**3. Pipelines**
- ✅ Ver lista de pipelines (vazia inicialmente)
- ✅ Clicar "Criar Pipeline"
- ✅ Preencher: Nome, Descrição, Ícone (emoji), Cor
- ✅ Criar → Deve criar pipeline com 6 etapas padrão
- ✅ Editar pipeline existente
- ✅ Deletar pipeline

**4. Notificações**
- ✅ Ver 4 toggles:
  - Email enabled
  - Task created
  - Task overdue
  - Pipeline stage changed
- ✅ Toggle on/off
- ✅ Salvar preferências

**5. Integrações**
- ✅ Ver 4 cards placeholder:
  - Google Calendar
  - WhatsApp Business
  - Slack
  - SMTP
- ✅ Status "Em breve" em cada um

**6. Auditoria**
- ✅ Ver tabela de logs (vazia inicialmente)
- ✅ Filtro por tipo (all/task/deal/client/user)
- ✅ Mensagem "Nenhum log encontrado" se vazio

## 📊 Estrutura das Tabelas

### organization_settings
```
id, company_name, company_logo_url, primary_color,
timezone_default, created_at, updated_at
```

### role_permissions
```
role (PK), permissions (JSONB), description,
created_at, updated_at
```

### pipelines
```
id, name, description, icon, color, position,
is_active, created_by, created_at, updated_at
```

### pipeline_stages
```
id, pipeline_id, name, color, position, is_final,
is_won, created_at, updated_at
```

### notification_settings
```
id, email_enabled, notify_task_created,
notify_task_overdue, notify_pipeline_stage_changed,
created_at, updated_at
```

### audit_logs
```
id, actor_user_id, action, entity_type, entity_id,
metadata (JSONB), ip_address, user_agent, created_at
```

## 🔒 Controle de Acesso (RLS)

### Quem pode acessar:
- ✅ **Admin**: Acesso total a todas as tabs
- ❌ **Outros roles**: Redirecionados para /dashboard

### Políticas aplicadas:
- `organization_settings`: Apenas admin pode ver/editar
- `role_permissions`: Apenas admin pode gerenciar
- `pipelines`: Todos veem, apenas admin gerencia
- `pipeline_stages`: Todos veem, apenas admin gerencia
- `notification_settings`: Apenas admin pode gerenciar
- `audit_logs`: Apenas admin vê, todos podem inserir

## 🎨 Roles Predefinidos

A migration cria 7 roles automaticamente:

1. **admin**: Acesso total
2. **team_manager**: Gerencia equipe
3. **strategy**: Planeja estratégias
4. **traffic_manager**: Gerencia tráfego pago
5. **social_media**: Gerencia redes sociais
6. **designer**: Cria peças visuais
7. **audiovisual**: Produz vídeos

Cada role tem permissões específicas em:
- clients (view/create/edit/delete)
- tools
- pipelines
- employees
- settings

## 🐛 Troubleshooting

### Erro: "Acesso negado"
- **Causa**: Usuário não é admin
- **Solução**: Execute SQL para tornar seu usuário admin:
```sql
UPDATE profiles SET hierarchy = 'admin' WHERE id = auth.uid();
```

### Erro: "relation does not exist"
- **Causa**: Migration não foi executada
- **Solução**: Execute novamente `settings-organization.sql`

### Erro: "Bucket not found" ao fazer upload de logo
- **Causa**: Bucket `org-logos` não foi criado
- **Solução**: Crie o bucket no Storage Dashboard

### Logo não aparece após upload
- **Causa**: Bucket não está público
- **Solução**:
  1. Storage > org-logos > Settings
  2. Marque "Public bucket"
  3. Salve

### Permissões não salvam
- **Causa**: RLS bloqueando
- **Solução**: Verifique se seu usuário é admin:
```sql
SELECT hierarchy FROM profiles WHERE id = auth.uid();
```

## 📱 Próximos Passos

Depois de configurar, você pode:

1. **Personalizar a organização**:
   - Adicionar logo da empresa
   - Definir nome e cor
   - Configurar timezone

2. **Ajustar permissões**:
   - Modificar o que cada role pode fazer
   - Adaptar ao seu processo

3. **Criar pipelines**:
   - Criar funis personalizados
   - Adicionar/remover etapas
   - Customizar cores

4. **Configurar notificações**:
   - Ativar/desativar emails
   - Escolher quais eventos notificar

5. **Preparar para integrações**:
   - Os placeholders já estão prontos
   - Quando implementar, só ativar

---

**Status**: ✅ Pronto para uso
**Acesso**: Apenas administradores
**Próxima feature**: Implementar integrações reais
