import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle, PauseCircle, StopCircle, Briefcase, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/contexts/ToastContext';

interface ActiveTimer {
  id: string;
  deal_id: string | null;
  task_id: string | null;
  start_time: string;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_seconds: number;
  deal?: {
    title: string;
  };
  task?: {
    title: string;
  };
}

export function MyTimerCard() {
  const { user } = useAuth();
  const { toast } = useToastContext();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActiveTimer();

      // Atualizar a cada 1 segundo
      const interval = setInterval(() => {
        updateElapsedTime();
      }, 1000);

      // Subscrever a mudanças
      const channel = supabase
        .channel('my-timer')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'time_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchActiveTimer();
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchActiveTimer = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          id,
          deal_id,
          task_id,
          start_time,
          is_paused,
          paused_at,
          total_paused_seconds,
          deal:deals(title),
          task:tasks(title)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('end_time', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setActiveTimer(data);
      if (data) {
        setElapsedSeconds(calculateElapsedSeconds(data));
      }
    } catch (error) {
      console.error('Erro ao buscar timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateElapsedSeconds = (timer: ActiveTimer): number => {
    const startTime = new Date(timer.start_time).getTime();
    const now = Date.now();
    const totalElapsed = Math.floor((now - startTime) / 1000);

    if (timer.is_paused && timer.paused_at) {
      const pausedTime = new Date(timer.paused_at).getTime();
      return Math.floor((pausedTime - startTime) / 1000) - (timer.total_paused_seconds || 0);
    }

    return totalElapsed - (timer.total_paused_seconds || 0);
  };

  const updateElapsedTime = () => {
    if (activeTimer && !activeTimer.is_paused) {
      setElapsedSeconds(calculateElapsedSeconds(activeTimer));
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = async () => {
    if (!activeTimer) return;

    try {
      if (activeTimer.is_paused) {
        // Resumir
        const pausedDuration = activeTimer.paused_at
          ? Math.floor((Date.now() - new Date(activeTimer.paused_at).getTime()) / 1000)
          : 0;

        const { error } = await supabase
          .from('time_logs')
          .update({
            is_paused: false,
            paused_at: null,
            total_paused_seconds: (activeTimer.total_paused_seconds || 0) + pausedDuration,
          })
          .eq('id', activeTimer.id);

        if (error) throw error;
      } else {
        // Pausar
        const { error } = await supabase
          .from('time_logs')
          .update({
            is_paused: true,
            paused_at: new Date().toISOString(),
          })
          .eq('id', activeTimer.id);

        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  const handleStop = async () => {
    if (!activeTimer) return;

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', activeTimer.id);

      if (error) throw error;

      toast({
        title: 'Timer finalizado',
        description: `Tempo total: ${formatTime(elapsedSeconds)}`,
      });

      setActiveTimer(null);
      setElapsedSeconds(0);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#2db4af]" />
          Meu Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        ) : activeTimer ? (
          <div className="space-y-4">
            {/* Timer Display */}
            <div className="bg-gradient-to-br from-[#2db4af]/10 to-[#2db4af]/20 rounded-lg p-6 text-center border-2 border-[#2db4af]/30">
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Tempo Decorrido</p>
              <p className="text-4xl font-bold text-[#2db4af] font-mono mb-3">
                {formatTime(elapsedSeconds)}
              </p>
              {activeTimer.is_paused && (
                <Badge variant="secondary" className="mb-2">
                  <PauseCircle className="h-3 w-3 mr-1" />
                  Pausado
                </Badge>
              )}
            </div>

            {/* Tarefa/Deal */}
            <div className="bg-gray-50 rounded-lg p-3">
              {activeTimer.deal && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-600" />
                  <p className="text-sm font-medium truncate">{activeTimer.deal.title}</p>
                </div>
              )}
              {activeTimer.task && (
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-gray-600" />
                  <p className="text-sm font-medium truncate">{activeTimer.task.title}</p>
                </div>
              )}
              {!activeTimer.deal && !activeTimer.task && (
                <p className="text-sm text-gray-500 italic">Sem tarefa ou deal</p>
              )}
            </div>

            {/* Controles */}
            <div className="flex gap-2">
              <Button
                onClick={handlePauseResume}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                {activeTimer.is_paused ? (
                  <>
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Retomar
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 mr-1" />
                    Pausar
                  </>
                )}
              </Button>
              <Button
                onClick={handleStop}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-1" />
                Finalizar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">Nenhum timer ativo</p>
            <p className="text-xs text-gray-500">
              Inicie um timer em uma tarefa ou deal para começar a rastrear seu tempo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
