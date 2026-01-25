import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  UserCircle,
  Settings,
  LogOut,
  Briefcase,
  Wrench,
  MessageCircle,
  Clock,
  Search,
  X,
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

interface SearchResult {
  id: string;
  type: 'client' | 'task' | 'deal' | 'event' | 'employee' | 'page';
  title: string;
  subtitle?: string;
  path: string;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Ativar sistema de lembretes de tarefas
  useTaskReminders();

  // Estado da busca
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];

    try {
      // Buscar páginas/seções do sistema
      const pages = [
        { id: 'dashboard', name: 'Dashboard', path: '/dashboard', keywords: ['painel', 'inicio', 'home', 'principal'] },
        { id: 'clients', name: 'Clientes', path: '/clients', keywords: ['clientes', 'empresas', 'companies'] },
        { id: 'tasks', name: 'Tarefas', path: '/tasks', keywords: ['tarefas', 'tasks', 'to-do', 'afazeres'] },
        { id: 'calendar', name: 'Calendário', path: '/calendar', keywords: ['calendario', 'agenda', 'eventos', 'compromissos'] },
        { id: 'employees', name: 'Equipe', path: '/employees', keywords: ['equipe', 'funcionarios', 'colaboradores', 'time', 'pessoas'] },
        { id: 'tools', name: 'Ferramentas', path: '/tools', keywords: ['ferramentas', 'tools', 'utilidades'] },
        { id: 'chat', name: 'Chat', path: '/chat', keywords: ['chat', 'mensagens', 'conversa'] },
        { id: 'profile', name: 'Perfil', path: '/profile', keywords: ['perfil', 'meu perfil', 'conta', 'usuario'] },
        { id: 'settings', name: 'Configurações', path: '/settings', keywords: ['configuracoes', 'settings', 'ajustes'] },
        ...(profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager'
          ? [{ id: 'active-timers', name: 'Timers Ativos', path: '/active-timers', keywords: ['timers', 'cronometros', 'tempo'] }]
          : []),
      ];

      const lowerQuery = query.toLowerCase();
      const matchingPages = pages.filter(page =>
        page.name.toLowerCase().includes(lowerQuery) ||
        page.keywords.some(keyword => keyword.includes(lowerQuery))
      );

      matchingPages.forEach(page => {
        results.push({
          id: page.id,
          type: 'page',
          title: page.name,
          subtitle: 'Ir para página',
          path: page.path,
        });
      });

      try {
      // Buscar clientes
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      clients?.forEach(client => {
        results.push({
          id: client.id,
          type: 'client',
          title: client.name,
          subtitle: client.email,
          path: `/clients?client=${client.id}`,
        });
      });

      // Buscar tarefas
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      tasks?.forEach(task => {
        results.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.description?.substring(0, 50),
          path: `/tasks?open=${task.id}`,
        });
      });

      // Buscar deals
      const { data: deals } = await supabase
        .from('deals')
        .select('id, title, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      deals?.forEach(deal => {
        results.push({
          id: deal.id,
          type: 'deal',
          title: deal.title,
          subtitle: deal.description?.substring(0, 50),
          path: `/tasks?deal=${deal.id}`,
        });
      });

      // Buscar eventos
      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, description')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      events?.forEach(event => {
        results.push({
          id: event.id,
          type: 'event',
          title: event.title,
          subtitle: event.description?.substring(0, 50),
          path: `/calendar`,
        });
      });

      // Buscar funcionários
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      employees?.forEach(emp => {
        results.push({
          id: emp.id,
          type: 'employee',
          title: emp.full_name || 'Sem nome',
          subtitle: emp.email,
          path: `/employees`,
        });
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    performSearch(value);
  };

  const handleResultClick = (path: string) => {
    navigate(path);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'page': return <LayoutDashboard className="h-4 w-4 text-[#2db4af]" />;
      case 'client': return <Briefcase className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'deal': return <Briefcase className="h-4 w-4 text-green-600" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'employee': return <Users className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'page': return 'Página';
      case 'client': return 'Cliente';
      case 'task': return 'Tarefa';
      case 'deal': return 'Oportunidade';
      case 'event': return 'Evento';
      case 'employee': return 'Funcionário';
      default: return '';
    }
  };

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clients', icon: Briefcase },
    { name: 'Tarefas', href: '/tasks', icon: CheckSquare },
    { name: 'Calendário', href: '/calendar', icon: Calendar },
    { name: 'Equipe', href: '/employees', icon: Users },
    { name: 'Ferramentas', href: '/tools', icon: Wrench },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
  ];

  // Adicionar "Timers Ativos" apenas para admins e gerentes
  const navigation = [
    ...baseNavigation,
    ...(profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager'
      ? [{ name: 'Timers Ativos', href: '/active-timers', icon: Clock }]
      : []),
  ];

  // Items principais para barra inferior mobile (4 itens)
  const mobileMainItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendário', href: '/calendar', icon: Calendar },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Clientes', href: '/clients', icon: Briefcase },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden max-w-full">
      {/* Top Header - Desktop only */}
      <header className="hidden lg:block fixed top-0 left-64 right-0 z-40 h-16 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-full px-6 flex items-center justify-between gap-4">
          {/* Left: Search */}
          <div className="flex-1 max-w-md">
            {!isSearchOpen ? (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </button>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Buscar clientes, tarefas, oportunidades..."
                  className="pl-10 pr-10"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>

                {/* Dropdown de resultados */}
                {(searchQuery.length >= 2 && (searchResults.length > 0 || isSearching)) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                    {isSearching ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2db4af] mx-auto"></div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Nenhum resultado encontrado
                      </div>
                    ) : (
                      <div className="py-2">
                        {searchResults.map((result) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result.path)}
                            className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 text-left"
                          >
                            <div className="p-2 bg-gray-100 rounded-lg mt-0.5">
                              {getResultIcon(result.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {result.title}
                                </p>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                                  {getResultTypeLabel(result.type)}
                                </span>
                              </div>
                              {result.subtitle && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center: Logo */}
          {!isSearchOpen && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Link to="/dashboard" className="flex items-center">
                <img
                  src="/logo-sidebar.png"
                  alt="T3ntaculos"
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </div>
          )}

          {/* Right: Notifications + Avatar */}
          <div className="flex items-center gap-3">
            <NotificationCenter />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-[#2db4af] text-white text-xs">
                      {getInitials(profile?.full_name || user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar - Desktop only */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
        {/* Navigation */}
        <nav className="px-4 pt-12 pb-6 space-y-1 overflow-y-auto h-full">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#2db4af] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 lg:pt-16">
        {/* Page content */}
        <main className="min-h-screen lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed left-0 right-0 bg-white border-t border-gray-200 shadow-lg"
        style={{
          bottom: 0,
          zIndex: 9999
        }}
      >
        <div
          className="flex items-end justify-around px-1 pb-2"
          style={{
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
            touchAction: 'manipulation',
            minHeight: '64px'
          }}
        >
          {/* 4 main items */}
          {mobileMainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-end gap-1 px-2 py-1.5 flex-1 transition-colors ${
                  active ? 'text-[#2db4af]' : 'text-gray-600'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] font-medium truncate max-w-full">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />
    </div>
  );
}
