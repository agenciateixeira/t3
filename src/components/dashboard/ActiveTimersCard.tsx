import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Briefcase, CheckSquare, PlayCircle, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Timer {
  id: string;
  user_id: string;
  deal_id: string | null;
  task_id: string | null;
  start_time: string;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_seconds: number;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  deal?: {
    id: string;
    title: string;
  };
  task?: {
    id: string;
    title: string;
  };
}

export function ActiveTimersCard() {
  const navigate = useNavigate();
  const [activeTimers, setActiveTimers] = useState<Timer[]>([]);
  const [elapsedTimes, setElapsedTimes] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActiveTimers();

    // Atualizar a cada 1 segundo
    const interval = setInterval(() => {
      updateElapsedTimes();
    }, 1000);

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('dashboard-timers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs',
        },
        () => {
          fetchActiveTimers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

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
          is_paused,
          paused_at,
          total_paused_seconds,
          user:profiles!time_logs_user_id_fkey(id, full_name, avatar_url),
          deal:deals(id, title),
          task:tasks(id, title)
        `)
        .eq('is_active', true)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(6);

      if (error) throw error;

      setActiveTimers(data || []);

      // Inicializar tempos decorridos
      const times: { [key: string]: number } = {};
      data?.forEach((timer) => {
        times[timer.id] = calculateElapsedSeconds(timer);
      });
      setElapsedTimes(times);
    } catch (error) {
      console.error('Erro ao buscar timers ativos:', error);
    } finally {
      setIsLoading(false);
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

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#2db4af]" />
            Timers Ativos
            {activeTimers.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeTimers.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/active-timers')}
            className="text-[#2db4af] hover:text-[#28a39e] hover:bg-[#2db4af]/10"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeTimers.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Nenhum timer ativo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTimers.slice(0, 5).map((timer) => (
              <div
                key={timer.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-[#2db4af]/50 hover:bg-[#2db4af]/5 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={timer.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-[#2db4af] text-white">
                      {timer.user?.full_name ? getInitials(timer.user.full_name) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{timer.user?.full_name || 'Usuário'}</p>
                    {timer.deal && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Briefcase className="h-3 w-3" />
                        <span className="truncate">{timer.deal.title}</span>
                      </div>
                    )}
                    {timer.task && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <CheckSquare className="h-3 w-3" />
                        <span className="truncate">{timer.task.title}</span>
                      </div>
                    )}
                  </div>
                  {timer.is_paused ? (
                    <Badge variant="secondary" className="text-xs">Pausado</Badge>
                  ) : (
                    <Badge className="text-xs bg-green-600">
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(timer.start_time), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                  <p className="text-sm font-mono font-bold text-[#2db4af]">
                    {formatElapsedTime(elapsedTimes[timer.id] || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
