# Migrations SQL

Esta pasta contém todos os scripts SQL de migração e configuração do banco de dados Supabase.

## ⚠️ Arquivos Importantes

### Setup Inicial
- `supabase-complete-setup.sql` - Setup completo do banco de dados
- `setup-hierarchies-fixed.sql` - Configuração de hierarquias de usuários

### Features Principais
- `add-tools-credentials.sql` - Adiciona campo de credenciais em ferramentas ⭐ **EXECUTAR PRIMEIRO**
- `chat-rls-simple-fix.sql` - Políticas RLS do Chat (última versão)
- `fix-profiles-rls.sql` - Políticas RLS de perfis
- `create-pipeline-schema.sql` - Schema do Pipeline/CRM
- `create-time-tracking-system.sql` - Sistema de tracking de tempo

### Storages
- `setup-chat-storage.sql` - Storage para arquivos do chat
- `setup-deal-attachments-storage.sql` - Storage para anexos de deals

## 📝 Ordem de Execução Recomendada

1. **Setup inicial do banco**:
   ```sql
   -- Execute no Supabase SQL Editor
   supabase-complete-setup.sql
   ```

2. **Features específicas** (execute conforme necessário):
   ```sql
   add-tools-credentials.sql
   chat-rls-simple-fix.sql
   fix-profiles-rls.sql
   ```

## 🔒 Segurança

- Todos os scripts assumem que você está executando no Supabase SQL Editor
- RLS (Row Level Security) está habilitado em todas as tabelas sensíveis
- Credenciais de ferramentas são visíveis apenas para ADMIN e GERENTE

## ⚠️ Avisos

- **NÃO** execute scripts de "debug" em produção
- Arquivos com prefixo `fix-` ou `cleanup-` devem ser revisados antes de executar
- Sempre faça backup antes de executar migrations em produção
