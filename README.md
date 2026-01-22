# T3ntaculos Flow 🐙

Sistema completo de gerenciamento empresarial com CRM, Chat interno, Ferramentas e Controle de Tarefas.

## 🚀 Tecnologias

- **Frontend**: React 19.2.0 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **UI**: TailwindCSS + shadcn/ui
- **Gerenciamento de Estado**: React Context API
- **Autenticação**: Supabase Auth
- **Banco de Dados**: PostgreSQL com Row Level Security (RLS)

## 📋 Funcionalidades

### 👥 Gestão de Usuários
- Sistema de hierarquias (Admin, Gerente, Estratégia, Tráfego, Social Media, Designer, Audiovisual)
- Controle de permissões por setor
- Perfis completos com avatar e informações

### 💬 Chat Interno
- Interface estilo WhatsApp Web
- Conversas diretas (1:1)
- Grupos com gerenciamento de membros
- Apenas criadores de grupos podem adicionar/remover membros
- Envio de mídia (imagens, vídeos, áudios)
- Indicadores de digitação em tempo real
- Sistema de leitura de mensagens

### 🔧 Ferramentas
- Cadastro de ferramentas por setor
- Filtros avançados (busca, categoria, setor)
- Credenciais de acesso (visível apenas para Admin/Gerente)
- Instruções de uso
- Links diretos para acessar ferramentas

### 📊 Pipeline/CRM
- Gestão de oportunidades (deals)
- Quadro Kanban por status
- Atividades e histórico
- Checklists e anexos
- Tracking de tempo
- Sincronização com calendário

### 📅 Calendário
- Visualização mensal de tarefas e reuniões
- Timeline diária
- Integração com Pipeline
- Agendamento de eventos

### ✅ Tarefas
- Gerenciamento de tarefas por deal
- Controle de prioridades
- Responsáveis e prazos
- Anexos e comentários

### 📈 Dashboard
- Métricas de desempenho
- Gráficos de progresso
- Visão geral do time

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase

### Setup do Projeto

1. **Clone o repositório**:
```bash
git clone https://github.com/agenciateixeira/t3.git
cd t3
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-public-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

4. **Execute as migrations do banco de dados**:
- Acesse o [Supabase SQL Editor](https://app.supabase.com)
- Execute os scripts da pasta `migrations/` na ordem:
  1. `supabase-complete-setup.sql`
  2. `add-tools-credentials.sql`
  3. `chat-rls-simple-fix.sql`
  4. `fix-profiles-rls.sql`

Veja `migrations/README.md` para mais detalhes.

5. **Inicie o servidor de desenvolvimento**:
```bash
npm run dev
```

Acesse: `http://localhost:5173`

## 📁 Estrutura do Projeto

```
t3/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   │   ├── ui/          # Componentes shadcn/ui
│   │   ├── chat/        # Componentes do Chat
│   │   ├── tasks/       # Componentes de Tarefas
│   │   └── ...
│   ├── pages/           # Páginas principais
│   │   ├── Chat.tsx
│   │   ├── Tools.tsx
│   │   ├── Calendar.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── hooks/           # Custom hooks
│   │   └── useAuth.tsx
│   ├── lib/             # Utilitários
│   │   └── supabase.ts
│   ├── types/           # TypeScript types
│   └── App.tsx
├── migrations/          # Scripts SQL
├── public/             # Arquivos estáticos
└── README.md
```

## 🔒 Segurança

- **RLS (Row Level Security)** habilitado em todas as tabelas
- Autenticação obrigatória em todas as rotas
- Credenciais de ferramentas criptografadas no banco
- Permissões por hierarquia de usuário
- Validações server-side no Supabase

## 🎨 Sistema de Hierarquias

| Hierarquia | Código | Permissões |
|-----------|--------|-----------|
| Administrador | `admin` | Acesso total ao sistema |
| Gerente de Time | `team_manager` | Gerenciar ferramentas, ver credenciais, gerenciar equipe |
| Estratégia | `strategy` | Ferramentas de análise e planejamento |
| Gestor de Tráfego | `traffic_manager` | Ferramentas de tráfego pago |
| Social Media | `social_media` | Ferramentas de redes sociais |
| Designer | `designer` | Ferramentas de design |
| Audiovisual | `audiovisual` | Ferramentas de vídeo e edição |

## 🚀 Deploy

### Build de Produção
```bash
npm run build
```

### Preview do Build
```bash
npm run preview
```

### Deploy no Vercel/Netlify
O projeto está pronto para deploy em plataformas como Vercel ou Netlify. Configure as variáveis de ambiente na plataforma escolhida.

## 📝 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Gera build de produção
npm run preview      # Preview do build de produção
npm run lint         # Executa ESLint
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário da Agência Teixeira.

## 👥 Equipe

Desenvolvido por [Agência Teixeira](https://github.com/agenciateixeira)

---

**T3ntaculos Flow** - Gestão empresarial completa 🐙
