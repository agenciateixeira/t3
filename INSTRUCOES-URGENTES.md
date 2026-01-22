# 🚨 INSTRUÇÕES URGENTES - CORRIGIR ERRO DE BANCO DE DADOS

## PROBLEMA
O erro "infinite recursion detected in policy for relation 'user_roles'" está impedindo TODO o sistema de funcionar.

## SOLUÇÃO
Você precisa executar o script SQL que corrige as políticas RLS (Row Level Security) no Supabase.

## PASSOS PARA CORRIGIR

### 1. Acesse o Supabase Dashboard
- Vá para https://supabase.com/dashboard
- Faça login na sua conta
- Selecione o projeto **t3** (Tentaculo Flow)

### 2. Abra o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Clique em **"New query"** (Nova consulta)

### 3. Execute o Script de Correção
- Abra o arquivo `fix-rls-emergency.sql` que está na raiz do projeto
- **COPIE TODO O CONTEÚDO** do arquivo
- **COLE** no SQL Editor do Supabase
- Clique em **"Run"** (Executar) ou pressione `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)

### 4. Verifique se Funcionou
- Você deve ver mensagens de sucesso no painel de resultados
- Aguarde alguns segundos para o Supabase processar as mudanças
- Volte para o navegador onde está rodando a aplicação
- **Atualize a página** (F5 ou Ctrl+R / Cmd+R)

### 5. Teste o Sistema
Agora teste se está funcionando:
- ✅ Criar cliente
- ✅ Criar tarefa
- ✅ Criar agendamento no calendário
- ✅ Abrir chat e enviar mensagem
- ✅ Criar ferramenta
- ✅ Cadastrar colaborador

## O QUE O SCRIPT FAZ

O script `fix-rls-emergency.sql` faz o seguinte:

1. **Remove TODAS as políticas RLS antigas** que estavam causando recursão infinita
2. **Cria novas políticas simples** sem recursão
3. **Recarrega o cache** do Supabase para aplicar as mudanças

## SE AINDA NÃO FUNCIONAR

Se após executar o script ainda houver erros:

1. Abra o console do navegador (F12)
2. Vá na aba "Console"
3. Copie TODOS os erros que aparecem
4. Me envie os erros para eu analisar

## NOTAS IMPORTANTES

- ⚠️ **NÃO execute** outros scripts SQL sem orientação
- ⚠️ **NÃO delete** tabelas ou dados
- ✅ O script `fix-rls-emergency.sql` é **SEGURO** e não apaga dados
- ✅ Apenas corrige as políticas de acesso (RLS)

## CORREÇÕES JÁ FEITAS NO CÓDIGO

Já corrigi os seguintes problemas no código frontend:

1. ✅ **Calendar.tsx** - Removido `email` das queries
2. ✅ **Chat.tsx** - Removido `email` do tipo Profile e das queries
3. ✅ **Tasks.tsx** - Corrigido queries de profiles
4. ✅ **Dashboard.tsx** - Corrigido queries de profiles
5. ✅ **Calendar Dialog** - Adicionado DialogDescription (warning corrigido)

**Agora o código está correto, mas o banco de dados ainda precisa do fix!**

---

## RESUMO RÁPIDO

```
1. Acesse Supabase Dashboard → seu projeto t3
2. SQL Editor → New query
3. Copie TODO o conteúdo de fix-rls-emergency.sql
4. Cole no SQL Editor
5. Clique em "Run"
6. Atualize a página da aplicação
7. Teste tudo!
```

**Qualquer dúvida, me chame!**
