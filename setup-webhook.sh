#!/bin/bash

# ============================================================================
# Script para configurar o Webhook de Push Notifications via SQL
# ============================================================================

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Setup de Push Notifications - Database Webhook        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório correto
if [ ! -f "migrations/add-notification-push-trigger.sql" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 O que este script faz:${NC}"
echo "   • Copia o SQL do webhook para a área de transferência"
echo "   • Abre o SQL Editor do Supabase no navegador"
echo "   • Você cola e executa o SQL"
echo ""

# Detectar sistema operacional e copiar para clipboard
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    cat migrations/add-notification-push-trigger.sql | pbcopy
    echo -e "${GREEN}✅ SQL copiado para área de transferência (macOS)${NC}"
elif command -v xclip &> /dev/null; then
    # Linux com xclip
    cat migrations/add-notification-push-trigger.sql | xclip -selection clipboard
    echo -e "${GREEN}✅ SQL copiado para área de transferência (Linux)${NC}"
elif command -v xsel &> /dev/null; then
    # Linux com xsel
    cat migrations/add-notification-push-trigger.sql | xsel --clipboard
    echo -e "${GREEN}✅ SQL copiado para área de transferência (Linux)${NC}"
else
    echo -e "${YELLOW}⚠️  Não foi possível copiar automaticamente${NC}"
    echo -e "${YELLOW}   O SQL está em: migrations/add-notification-push-trigger.sql${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo ""
echo "1. O navegador vai abrir o SQL Editor do Supabase"
echo "2. Cole o SQL (Cmd+V ou Ctrl+V)"
echo "3. Clique em 'RUN' ou pressione Cmd+Enter"
echo "4. Aguarde confirmação 'Success. No rows returned'"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Pressione ENTER para abrir o SQL Editor no navegador..."

# Abrir SQL Editor no navegador
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/sql/new"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/sql/new"
else
    echo -e "${YELLOW}Abra manualmente:${NC}"
    echo "https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/sql/new"
fi

echo ""
echo -e "${GREEN}✨ Depois de executar o SQL:${NC}"
echo ""
echo "✅ O webhook estará ativo automaticamente"
echo "✅ Push notifications funcionarão mesmo com app fechado"
echo "✅ Triggers disparam a cada nova notificação"
echo ""
echo -e "${BLUE}🧪 Para testar:${NC}"
echo "   1. Crie uma tarefa e atribua a alguém"
echo "   2. A push notification deve chegar automaticamente"
echo ""
echo -e "${BLUE}🔍 Ver logs das requisições HTTP:${NC}"
echo '   Rode este SQL no editor:'
echo '   SELECT * FROM net._http_response ORDER BY created_at DESC LIMIT 10;'
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Setup completo! Push notifications prontas para uso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
