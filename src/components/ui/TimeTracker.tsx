import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { TimeLog } from '@/types';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Play, Pause, Clock, History, Square, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeTrackerProps {
  dealId?: string;
  taskId?: string;
  compact?: boolean;
}

export default function TimeTracker({ dealId, taskId, compact = false }: TimeTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTimer, setActiveTimer] = useState<TimeLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActiveTimer();
      fetchTimeLogs();
    }
  }, [user, dealId, taskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeTimer && activeTimer.is_active && !activeTimer.is_paused) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(activeTimer.start_time);
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const totalPaused = activeTimer.total_paused_seconds || 0;
        setElapsedSeconds(diff - totalPaused);
      }, 1000);
    } else if (activeTimer && activeTimer.is_paused) {
      // Timer pausado - mostrar tempo até a pausa
      const pausedAt = new Date(activeTimer.paused_at!);
      const start = new Date(activeTimer.start_time);
      const diff = Math.floor((pausedAt.getTime() - start.getTime()) / 1000);
      const totalPaused = activeTimer.total_paused_seconds || 0;
      setElapsedSeconds(diff - totalPaused);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const fetchActiveTimer = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('end_time', null);

      if (dealId) query.eq('deal_id', dealId);
      if (taskId) query.eq('task_id', taskId);

      const { data, error } = await query.maybeSingle();

      if (error) {
        // Se a tabela não existe, não fazer nada (SQL ainda não foi executado)
        if (error.code === '42P01') {
          console.warn('Tabela time_logs ainda não existe. Execute create-time-tracking-system.sql');
          return;
        }
        throw error;
      }

      setActiveTimer(data);

      if (data) {
        if (data.is_paused && data.paused_at) {
          // Se pausado, calcular até o momento da pausa
          const pausedAt = new Date(data.paused_at);
          const start = new Date(data.start_time);
          const diff = Math.floor((pausedAt.getTime() - start.getTime()) / 1000);
          const totalPaused = data.total_paused_seconds || 0;
          setElapsedSeconds(diff - totalPaused);
        } else {
          // Se ativo, calcular até agora
          const now = new Date();
          const start = new Date(data.start_time);
          const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
          const totalPaused = data.total_paused_seconds || 0;
          setElapsedSeconds(diff - totalPaused);
        }
      } else {
        setElapsedSeconds(0);
      }
    } catch (error: any) {
      console.error('Error fetching active timer:', error);
    }
  };

  const fetchTimeLogs = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('time_logs')
        .select(`
          *,
          user:profiles!time_logs_user_id_fkey(id, full_name, avatar_url)
        `)
        .not('duration_seconds', 'is', null)
        .order('end_time', { ascending: false })
        .limit(10);

      if (dealId) query.eq('deal_id', dealId);
      if (taskId) query.eq('task_id', taskId);

      const { data, error } = await query;

      if (error) {
        // Se a tabela não existe, não fazer nada (SQL ainda não foi executado)
        if (error.code === '42P01') {
          return;
        }
        throw error;
      }

      setTimeLogs(data || []);

      // Calculate total time
      const total = (data || []).reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
      setTotalSeconds(total);
    } catch (error: any) {
      console.error('Error fetching time logs:', error);
    }
  };

  const handleStart = async () => {
    if (!user || (!dealId && !taskId)) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert([
          {
            user_id: user.id,
            deal_id: dealId || null,
            task_id: taskId || null,
            start_time: new Date().toISOString(),
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setActiveTimer(data);
      toast({
        title: 'Timer iniciado',
        description: 'Começamos a contar o tempo!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar timer',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!activeTimer) return;

    setIsLoading(true);
    try {
      const now = new Date().toISOString();

      // Atualizar timer como pausado
      const { error: updateError } = await supabase
        .from('time_logs')
        .update({
          is_paused: true,
          paused_at: now,
        })
        .eq('id', activeTimer.id);

      if (updateError) throw updateError;

      // Criar registro de pausa
      const { error: pauseError } = await supabase
        .from('time_log_pauses')
        .insert([{
          time_log_id: activeTimer.id,
          paused_at: now,
        }]);

      if (pauseError) throw pauseError;

      await fetchActiveTimer();

      toast({
        title: 'Timer pausado',
        description: 'Você pode retomar quando quiser.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao pausar timer',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeTimer) return;

    setIsLoading(true);
    try {
      // Buscar última pausa não finalizada
      const { data: lastPause, error: pauseError } = await supabase
        .from('time_log_pauses')
        .select('*')
        .eq('time_log_id', activeTimer.id)
        .is('resumed_at', null)
        .order('paused_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pauseError) throw pauseError;

      if (lastPause) {
        const now = new Date();
        const pausedAt = new Date(lastPause.paused_at);
        const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);

        // Atualizar registro de pausa
        const { error: updatePauseError } = await supabase
          .from('time_log_pauses')
          .update({
            resumed_at: now.toISOString(),
            pause_duration_seconds: pauseDuration,
          })
          .eq('id', lastPause.id);

        if (updatePauseError) throw updatePauseError;

        // Atualizar timer
        const newTotalPaused = (activeTimer.total_paused_seconds || 0) + pauseDuration;
        const { error: updateTimerError } = await supabase
          .from('time_logs')
          .update({
            is_paused: false,
            paused_at: null,
            total_paused_seconds: newTotalPaused,
          })
          .eq('id', activeTimer.id);

        if (updateTimerError) throw updateTimerError;
      }

      await fetchActiveTimer();

      toast({
        title: 'Timer retomado',
        description: 'Continuando contagem...',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao retomar timer',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!activeTimer) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', activeTimer.id);

      if (error) throw error;

      setActiveTimer(null);
      setElapsedSeconds(0);
      await fetchTimeLogs();

      toast({
        title: 'Timer finalizado',
        description: `Tempo registrado: ${formatDuration(elapsedSeconds)}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar timer',
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

  const formatCompactDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {activeTimer && activeTimer.is_active ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleFinish}
            disabled={isLoading}
            className="gap-2"
          >
            <Square className="h-3 w-3" />
            {formatCompactDuration(elapsedSeconds)}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStart}
            disabled={isLoading}
            className="gap-2"
          >
            <Play className="h-3 w-3" />
            Iniciar
          </Button>
        )}

        {totalSeconds > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Badge variant="secondary" className="cursor-pointer gap-1">
                <Clock className="h-3 w-3" />
                {formatCompactDuration(totalSeconds)}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Histórico de Tempo</h4>
                <div className="text-sm text-gray-600">
                  Total: {formatDuration(totalSeconds)}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {timeLogs.map((log) => (
                    <div key={log.id} className="text-xs p-2 bg-gray-50 rounded space-y-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={log.user?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-[#2db4af] text-white">
                            {getInitials(log.user?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{log.user?.full_name || 'Usuário'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#2db4af]">
                          {formatDuration(log.duration_seconds || 0)}
                        </span>
                        <span className="text-gray-500">
                          {format(new Date(log.end_time || log.start_time), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Temporizador
          </h3>
          {totalSeconds > 0 && (
            <Badge variant="secondary">
              Total: {formatCompactDuration(totalSeconds)}
            </Badge>
          )}
        </div>

        {activeTimer && activeTimer.is_active ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#2db4af]">
                {formatDuration(elapsedSeconds)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {activeTimer.is_paused ? 'Timer pausado' : 'Timer ativo'}
              </div>
            </div>
            <div className="flex gap-2">
              {activeTimer.is_paused ? (
                <Button
                  onClick={handleResume}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Retomar
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              )}
              <Button
                onClick={handleFinish}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Finalizar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full bg-[#2db4af] hover:bg-[#28a39e]"
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar Timer
          </Button>
        )}

        {timeLogs.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico Recente
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {timeLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={log.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-[#2db4af] text-white">
                        {getInitials(log.user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{log.user?.full_name || 'Usuário'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#2db4af] text-base">
                      {formatDuration(log.duration_seconds || 0)}
                    </span>
                    <span className="text-gray-500">
                      {format(new Date(log.end_time || log.start_time), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
