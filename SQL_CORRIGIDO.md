# SQL do Supabase - CORRIGIDO ✅

## Problemas Corrigidos:

### 1. Erro: "column user_id does not exist"
**Causa:** Tentativa de criar índice em coluna inexistente
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
```

**Solução:** Removido o índice. A tabela `profiles` usa `id` como PK que já é indexada automaticamente.

---

### 2. Erro: "policy already exists"
**Causa:** Tentar criar políticas RLS que já existem ao executar o SQL novamente

**Solução:** Adicionada seção de limpeza antes de criar as políticas:
```sql
-- 13. REMOVER POLÍTICAS EXISTENTES (se houver)
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
... (24 políticas no total)
```

---

## Status Atual: ✅ FUNCIONANDO

O arquivo `supabase-complete-setup.sql` agora pode ser executado:
- ✅ Múltiplas vezes sem erros
- ✅ Todas as 8 tabelas serão criadas
- ✅ Todas as 24 políticas RLS funcionando
- ✅ Triggers e funções configuradas
- ✅ Índices otimizados

---

## Como Usar:

1. Acesse Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole TODO o conteúdo do arquivo `supabase-complete-setup.sql`
4. Clique em **RUN**
5. Aguarde conclusão

**Pronto!** Todas as tabelas estarão criadas e configuradas.

---

## Estrutura do Banco:

### Tabelas Criadas:
1. `profiles` - Perfis de usuários
2. `user_roles` - Funções/permissões
3. `clients` - Clientes
4. `client_users` - Relacionamento cliente-usuário
5. `manager_employees` - Relacionamento gerente-funcionário
6. `tasks` - Tarefas
7. `scheduled_posts` - Posts agendados
8. `calendar_events` - Eventos do calendário

### Segurança (RLS):
- ✅ Row Level Security habilitado em todas as tabelas
- ✅ 24 políticas de acesso configuradas
- ✅ Baseadas em auth.uid() do Supabase
- ✅ Diferentes permissões por role (admin, gerente, etc)

---

Data da correção: 14/01/2026
