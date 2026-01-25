import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock, CheckSquare, DollarSign, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PerformerStats {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  completed_tasks: number;
  total_revenue: number;
  total_time_seconds: number;
  score: number;
}

export function TopPerformersCard() {
  const [performers, setPerformers] = useState<PerformerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopPerformers();

    // Atualizar a cada 10 minutos
    const interval = setInterval(() => {
      fetchTopPerformers();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchTopPerformers = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar usuários
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('hierarchy', 'admin');

      if (usersError) throw usersError;

      const performersData: PerformerStats[] = [];

      for (const user of users || []) {
        // Tarefas completadas nos últimos 30 dias
        const { count: completedTasks } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'done')
          .gte('updated_at', thirtyDaysAgo.toISOString());

        // Deals ganhos nos últimos 30 dias
        const { data: wonDeals } = await supabase
          .from('deals')
          .select('value, stage:pipeline_stages!deals_stage_id_fkey(stage_type)')
          .eq('assignee_id', user.id)
          .gte('updated_at', thirtyDaysAgo.toISOString());

        // Filtrar apenas deals ganhos
        const wonDealsFiltered = wonDeals?.filter(d => d.stage?.stage_type === 'won') || [];

        const totalRevenue = wonDealsFiltered.reduce((sum, deal) => sum + (deal.value || 0), 0);

        // Tempo total trabalhado nos últimos 30 dias
        const { data: timeLogs } = await supabase
          .from('time_logs')
          .select('duration_seconds')
          .eq('user_id', user.id)
          .gte('start_time', thirtyDaysAgo.toISOString())
          .not('duration_seconds', 'is', null);

        const totalTimeSeconds = timeLogs?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) || 0;

        // Calcular score (ponderado)
        // Tarefas: 30%, Revenue: 50%, Tempo: 20%
        const taskScore = (completedTasks || 0) * 10; // Max ~300
        const revenueScore = totalRevenue / 1000; // Normalizado
        const timeScore = totalTimeSeconds / 3600; // Horas trabalhadas

        const score = (taskScore * 0.3) + (revenueScore * 0.5) + (timeScore * 0.2);

        performersData.push({
          user_id: user.id,
          user_name: user.full_name,
          avatar_url: user.avatar_url,
          completed_tasks: completedTasks || 0,
          total_revenue: totalRevenue,
          total_time_seconds: totalTimeSeconds,
          score,
        });
      }

      // Ordenar por score e pegar top 5
      const topPerformers = performersData
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setPerformers(topPerformers);
    } catch (error) {
      console.error('Erro ao buscar top performers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900';
      case 1:
        return 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900';
      case 2:
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900';
      default:
        return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Top Performers (30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : performers.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Nenhum dado disponível</p>
          </div>
        ) : (
          <div className="space-y-3">
            {performers.map((performer, index) => (
              <div
                key={performer.user_id}
                className={`p-4 rounded-lg border transition-all ${
                  index === 0
                    ? 'border-yellow-300 bg-yellow-50/50 shadow-md'
                    : index === 1
                    ? 'border-gray-300 bg-gray-50/50'
                    : index === 2
                    ? 'border-orange-300 bg-orange-50/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={performer.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#2db4af] text-white text-xs">
                        {getInitials(performer.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    {index < 3 && (
                      <div
                        className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${getMedalColor(
                          index
                        )}`}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{performer.user_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        <span>{performer.completed_tasks}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(performer.total_revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(performer.total_time_seconds)}</span>
                      </div>
                    </div>
                  </div>

                  {index === 0 && (
                    <Trophy className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
