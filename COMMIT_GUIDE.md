# Guia de Commit para GitHub

## ✅ Checklist Pré-Commit

Todas as etapas abaixo foram completadas:

- [x] **.gitignore** atualizado com `.env` e arquivos sensíveis
- [x] **migrations/** criada com todos os arquivos SQL organizados
- [x] **.env.example** criado (sem credenciais reais)
- [x] **README.md** completo e profissional
- [x] Credenciais removidas do código
- [x] Variáveis de ambiente protegidas

## 🚀 Comandos para Commit

Execute os comandos abaixo **NA ORDEM**:

### 1. Inicialize o repositório Git (se ainda não foi feito)
```bash
cd /Users/guilhermeteixeira/Documents/PROJETOS/t3
git init
```

### 2. Adicione o remote do GitHub
```bash
git remote add origin https://github.com/agenciateixeira/t3.git
```

### 3. Verifique se o .env está sendo ignorado
```bash
git status
```

**IMPORTANTE**: O arquivo `.env` **NÃO DEVE** aparecer na lista. Se aparecer, PARE e verifique o .gitignore!

### 4. Adicione todos os arquivos
```bash
git add .
```

### 5. Faça o commit inicial
```bash
git commit -m "feat: Implementação inicial do T3ntaculos Flow

- Sistema de Chat interno (WhatsApp style)
- Gerenciamento de Ferramentas por setor
- Pipeline/CRM completo
- Calendário integrado
- Sistema de tarefas
- Dashboard com métricas
- Controle de hierarquias e permissões
- RLS (Row Level Security) implementado

🐙 Generated with Claude Code"
```

### 6. Configure a branch principal
```bash
git branch -M main
```

### 7. Envie para o GitHub
```bash
git push -u origin main
```

## ⚠️ AVISOS IMPORTANTES

### ❌ NÃO FAÇA:
- **NÃO** commit o arquivo `.env` (credenciais reais)
- **NÃO** force push (`git push -f`) em main
- **NÃO** commit node_modules

### ✅ FAÇA:
- **SIM** commit o `.env.example` (sem credenciais)
- **SIM** commit o README.md completo
- **SIM** commit todos os arquivos SQL na pasta `migrations/`

## 🔍 Verificação Final

Antes de dar push, verifique:

```bash
# Lista arquivos que serão commitados
git ls-files

# Verifica se .env NÃO está na lista
git ls-files | grep .env
```

Se `.env` aparecer, **REMOVA IMEDIATAMENTE**:
```bash
git rm --cached .env
git commit --amend -m "fix: Remove .env do repositório"
```

## 📝 Commits Futuros

Para commits futuros, use o padrão:

```bash
# Adicione as mudanças
git add .

# Commit com mensagem descritiva
git commit -m "tipo: descrição breve

- Detalhe 1
- Detalhe 2

🐙 Generated with Claude Code"

# Push
git push origin main
```

### Tipos de Commit:
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

## 🆘 Problemas Comuns

### Erro: "remote origin already exists"
```bash
git remote set-url origin https://github.com/agenciateixeira/t3.git
```

### Erro: ".env está no repositório"
```bash
git rm --cached .env
git commit -m "fix: Remove .env do repositório"
```

### Erro: "Updates were rejected"
```bash
git pull origin main --rebase
git push origin main
```

---

**Pronto para commit!** ✅
