import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      {/* Sidebar - Desktop only */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="h-24 flex items-center justify-center px-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center">
            <img
              src="/logo-sidebar.png"
              alt="T3ntaculos"
              className="h-20 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
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

        {/* User menu */}
        <div className="border-t border-gray-200 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-[#2db4af] text-white text-sm">
                    {getInitials(profile?.full_name || user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
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
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Page content */}
        <main className="min-h-screen pb-24 lg:pb-0">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg"
        style={{
          zIndex: 9999,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {/* 4 main items */}
          {mobileMainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 flex-1 transition-colors ${
                  active ? 'text-[#2db4af]' : 'text-gray-600'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] font-medium truncate max-w-full">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
