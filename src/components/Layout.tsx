import { ReactNode } from 'react';
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
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Ativar sistema de lembretes de tarefas
  useTaskReminders();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
          {/* Left: Search Icon */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Search className="h-5 w-5 text-gray-600" />
          </button>

          {/* Center: Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link to="/dashboard" className="flex items-center">
              <img
                src="/logo-sidebar.png"
                alt="T3ntaculos"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

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
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center">
            <img
              src="/logo-sidebar.png"
              alt="T3ntaculos"
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 4rem)' }}>
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
