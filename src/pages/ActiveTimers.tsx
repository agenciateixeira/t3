import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  User,
  Briefcase,
  CheckSquare,
  PlayCircle,
  PauseCircle,
  Filter,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { useToastContext } from '@/contexts/ToastContext';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Timer {
  id: string;
  user_id: string;
  deal_id: string | null;
  task_id: string | null;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_seconds: number;
  duration_seconds: number | null;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  deal?: {
    id: string;
    title: string;
    client?: {
      name: string;
    };
  };
  task?: {
    id: string;
    title: string;
  };
}

interface UserOption {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface Filters {
  search: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
}

export default function ActiveTimers() {
  const { user, profile } = useAuth();
  const { toast } = useToastContext();
  const [activeTimers, setActiveTimers] = useState<Timer[]>([]);
  const [historyTimers, setHistoryTimers] = useState<Timer[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedTimes, setElapsedTimes] = useState<{ [key: string]: number }>({});
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    userId: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<{ [key: string]: { count: number; totalSeconds: number } }>({});

  // Verificar se usuário tem permissão (admin ou team_manager)
  const hasPermission = profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager';

  useEffect(() => {
    if (!hasPermission) return;

    fetchUsers();
    fetchActiveTimers();
    fetchHistoryTimers();

    // Atualizar a cada 1 segundo para mostrar tempo decorrido
    const interval = setInterval(() => {
      updateElapsedTimes();
    }, 1000);

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('active-timers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs',
        },
        () => {
          fetchActiveTimers();
          fetchHistoryTimers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [hasPermission]);

  useEffect(() => {
    if (hasPermission) {
      fetchHistoryTimers();
      setCurrentPage(1);
    }
  }, [filters.search, filters.userId, filters.dateFrom, filters.dateTo, selectedUserId, hasPermission]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActiveTimers = async () => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          id,
          user_id,
          deal_id,
          task_id,
          start_time,
          end_time,
          is_active,
          is_paused,
          paused_at,
          total_paused_seconds,
          duration_seconds,
          user:profiles!time_logs_user_id_fkey(id, full_name, avatar_url),
          deal:deals(id, title, client:clients(name)),
          task:tasks(id, title)
        `)
        .eq('is_active', true)
        .is('end_time', null)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setActiveTimers(data || []);

      // Inicializar tempos decorridos
      const times: { [key: string]: number } = {};
      data?.forEach((timer) => {
        times[timer.id] = calculateElapsedSeconds(timer);
      });
      setElapsedTimes(times);
    } catch (error: any) {
      console.error('Error fetching active timers:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar timers ativos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryTimers = async () => {
    try {
      // Se um usuário estiver selecionado, buscar apenas os timers dele
      if (selectedUserId) {
        let query = supabase
          .from('time_logs')
          .select(`
            id,
            user_id,
            deal_id,
            task_id,
            start_time,
            end_time,
            is_active,
            is_paused,
            paused_at,
            total_paused_seconds,
            duration_seconds,
            user:profiles!time_logs_user_id_fkey(id, full_name, avatar_url),
            deal:deals(id, title, client:clients(name)),
            task:tasks(id, title)
          `, { count: 'exact' })
          .eq('is_active', false)
          .not('end_time', 'is', null)
          .eq('user_id', selectedUserId);

        if (filters.dateFrom) {
          query = query.gte('start_time', new Date(filters.dateFrom).toISOString());
        }

        if (filters.dateTo) {
          const endDate = new Date(filters.dateTo);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('end_time', endDate.toISOString());
        }

        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await query
          .order('end_time', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setHistoryTimers(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      } else {
        // Buscar estatísticas por usuário
        let query = supabase
          .from('time_logs')
          .select(`
            user_id,
            duration_seconds,
            user:profiles!time_logs_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq('is_active', false)
          .not('end_time', 'is', null);

        if (filters.dateFrom) {
          query = query.gte('start_time', new Date(filters.dateFrom).toISOString());
        }

        if (filters.dateTo) {
          const endDate = new Date(filters.dateTo);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('end_time', endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        // Calcular estatísticas por usuário
        const stats: { [key: string]: { count: number; totalSeconds: number } } = {};
        data?.forEach((log: any) => {
          if (!stats[log.user_id]) {
            stats[log.user_id] = { count: 0, totalSeconds: 0 };
          }
          stats[log.user_id].count++;
          stats[log.user_id].totalSeconds += log.duration_seconds || 0;
        });

        setUserStats(stats);
        setHistoryTimers([]);
      }
    } catch (error: any) {
      console.error('Error fetching history timers:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar histórico',
        description: error.message,
      });
    }
  };

  const calculateElapsedSeconds = (timer: Timer): number => {
    const startTime = new Date(timer.start_time).getTime();
    const now = Date.now();
    const totalElapsed = Math.floor((now - startTime) / 1000);

    if (timer.is_paused && timer.paused_at) {
      const pausedTime = new Date(timer.paused_at).getTime();
      return Math.floor((pausedTime - startTime) / 1000) - (timer.total_paused_seconds || 0);
    }

    return totalElapsed - (timer.total_paused_seconds || 0);
  };

  const updateElapsedTimes = () => {
    const times: { [key: string]: number } = {};
    activeTimers.forEach((timer) => {
      times[timer.id] = calculateElapsedSeconds(timer);
    });
    setElapsedTimes(times);
  };

  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      userId: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.search !== '' ||
      filters.userId !== 'all' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== ''
    );
  };

  const renderTimerCard = (timer: Timer, isHistory: boolean = false) => (
    <Card key={timer.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Usuário */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={timer.user?.avatar_url || undefined} />
            <AvatarFallback>
              {timer.user?.full_name ? getInitials(timer.user.full_name) : <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{timer.user?.full_name || 'Usuário'}</p>
            <p className="text-sm text-muted-foreground">
              {isHistory ? (
                <>
                  {format(new Date(timer.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </>
              ) : (
                <>
                  Iniciado{' '}
                  {formatDistanceToNow(new Date(timer.start_time), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </>
              )}
            </p>
          </div>
          {!isHistory && (
            <>
              {timer.is_paused ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <PauseCircle className="h-3 w-3" />
                  Pausado
                </Badge>
              ) : (
                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                  <PlayCircle className="h-3 w-3" />
                  Ativo
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Tarefa/Deal */}
        <div className="space-y-2 mb-4">
          {timer.deal && (
            <div className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{timer.deal.title}</p>
                {timer.deal.client && (
                  <p className="text-xs text-muted-foreground truncate">{timer.deal.client.name}</p>
                )}
              </div>
            </div>
          )}
          {timer.task && (
            <div className="flex items-start gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{timer.task.title}</p>
              </div>
            </div>
          )}
          {!timer.deal && !timer.task && (
            <p className="text-sm text-muted-foreground italic">Sem tarefa ou deal associado</p>
          )}
        </div>

        {/* Tempo */}
        <div className="bg-primary/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {isHistory ? 'Duração Total' : 'Tempo Decorrido'}
          </p>
          <p className="text-2xl font-bold text-primary font-mono">
            {isHistory
              ? formatDuration(timer.duration_seconds || 0)
              : formatElapsedTime(elapsedTimes[timer.id] || 0)}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (!hasPermission) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Apenas administradores e gerentes de equipe podem acessar esta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Timers</h1>
            <p className="text-muted-foreground mt-1">
              Monitore o tempo da equipe em tempo real e consulte o histórico
            </p>
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-1">
                {Object.values(filters).filter((v) => v && v !== 'all').length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <Input
                    placeholder="Nome, deal, cliente..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Select value={filters.userId} onValueChange={(value) => setFilters({ ...filters, userId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data início</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data fim</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>

              {hasActiveFilters() && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Ativos
              <Badge variant="secondary">{activeTimers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Timers Ativos */}
          <TabsContent value="active" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : activeTimers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum timer ativo</h3>
                  <p className="text-muted-foreground">
                    Não há nenhum membro da equipe com timer em execução no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                {activeTimers.map((timer) => renderTimerCard(timer, false))}
              </div>
            )}
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selectedUserId ? (
              // View de timers do usuário selecionado
              <>
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserId(null)}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <h2 className="text-xl font-semibold">
                    Histórico de {users.find(u => u.id === selectedUserId)?.full_name}
                  </h2>
                </div>

                {historyTimers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                      <History className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                      <p className="text-muted-foreground">
                        Este usuário ainda não tem histórico de timers.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                      {historyTimers.map((timer) => renderTimerCard(timer, true))}
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              // View de lista de usuários
              <>
                {Object.keys(userStats).length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                      <History className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                      <p className="text-muted-foreground">
                        Não há histórico de timers finalizados ainda.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                    {users
                      .filter(u => userStats[u.id])
                      .map((user) => {
                        const stats = userStats[user.id];
                        return (
                          <Card
                            key={user.id}
                            className="hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4 mb-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="bg-[#2db4af] text-white">
                                    {getInitials(user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg truncate">{user.full_name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {stats.count} {stats.count === 1 ? 'registro' : 'registros'}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-primary/10 rounded-lg p-4 text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                  Tempo Total
                                </p>
                                <p className="text-2xl font-bold text-primary font-mono">
                                  {formatDuration(stats.totalSeconds)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
