import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock, Pause, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActiveTimer {
  id: string;
  user_id: string;
  deal_id: string | null;
  task_id: string | null;
  start_time: string;
  is_active: boolean;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_seconds: number;
  user_name: string;
  user_avatar: string | null;
  user_hierarchy: string;
  team_id: string | null;
  deal_title: string | null;
  task_title: string | null;
  elapsed_seconds: number;
}

export default function ActiveTimers() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se usuário é admin ou gerente
    if (!profile || (profile.hierarchy !== 'admin' && profile.hierarchy !== 'team_manager')) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Apenas admins e gerentes podem acessar esta página.',
      });
      return;
    }

    fetchActiveTimers();

    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchActiveTimers, 10000);

    return () => clearInterval(interval);
  }, [profile]);

  const fetchActiveTimers = async () => {
    try {
      const { data, error } = await supabase
        .from('active_timers_view')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;

      setTimers(data || []);
    } catch (error: any) {
      console.error('Error fetching active timers:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar timers',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2db4af]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Clock className="h-8 w-8 text-[#2db4af]" />
            Timers Ativos
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Acompanhe os timers ativos de toda a equipe em tempo real
          </p>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#2db4af]">{timers.length}</div>
                <div className="text-sm text-gray-600 mt-1">Timers Ativos</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {timers.filter(t => !t.is_paused).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Em Execução</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {timers.filter(t => t.is_paused).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Pausados</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Timers */}
        {timers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum timer ativo
                </h3>
                <p className="text-gray-600">
                  Não há timers em execução no momento.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {timers.map((timer) => (
              <Card key={timer.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Usuário */}
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={timer.user_avatar || undefined} />
                        <AvatarFallback className="bg-[#2db4af] text-white">
                          {getInitials(timer.user_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{timer.user_name}</h3>
                          {timer.is_paused ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <Pause className="h-3 w-3 mr-1" />
                              Pausado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Play className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-600">
                          {timer.deal_title && (
                            <span className="font-medium">Deal: {timer.deal_title}</span>
                          )}
                          {timer.task_title && (
                            <span className="font-medium">Tarefa: {timer.task_title}</span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          Iniciado em: {new Date(timer.start_time).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    {/* Tempo Decorrido */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[#2db4af]">
                        {formatDuration(timer.elapsed_seconds)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {timer.total_paused_seconds > 0 && (
                          <span>Pausado: {formatDuration(timer.total_paused_seconds)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
