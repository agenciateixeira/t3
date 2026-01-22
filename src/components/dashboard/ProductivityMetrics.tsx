import { useMemo } from 'react';
import { TrendingUp, Target, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Task } from '@/types';
import { differenceInDays, isAfter, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface ProductivityMetricsProps {
  tasks: Task[];
}

export function ProductivityMetrics({ tasks }: ProductivityMetricsProps) {
  const metrics = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const tasksThisWeek = tasks.filter((t) => {
      const createdAt = parseISO(t.created_at);
      return isWithinInterval(createdAt, { start: weekStart, end: weekEnd });
    });

    const completedTasks = tasks.filter((t) => t.status === 'done');
    const completedThisWeek = completedTasks.filter((t) => {
      const updatedAt = parseISO(t.updated_at);
      return isWithinInterval(updatedAt, { start: weekStart, end: weekEnd });
    });

    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'done' || !t.due_date) return false;
      return isAfter(now, parseISO(t.due_date));
    });

    const byStatus = {
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      in_review: tasks.filter((t) => t.status === 'in_review').length,
      done: completedTasks.length,
    };

    const byPriority = {
      high: tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length,
      medium: tasks.filter((t) => t.priority === 'medium' && t.status !== 'done').length,
      low: tasks.filter((t) => t.priority === 'low' && t.status !== 'done').length,
    };

    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

    const completedWithDates = completedTasks.filter((t) => t.due_date);
    const avgCompletionTime = completedWithDates.length > 0
      ? Math.round(
          completedWithDates.reduce((acc, t) => {
            const created = parseISO(t.created_at);
            const completed = parseISO(t.updated_at);
            return acc + differenceInDays(completed, created);
          }, 0) / completedWithDates.length
        )
      : 0;

    return {
      total: tasks.length,
      completedThisWeek: completedThisWeek.length,
      createdThisWeek: tasksThisWeek.length,
      overdue: overdueTasks.length,
      byStatus,
      byPriority,
      completionRate,
      avgCompletionTime,
    };
  }, [tasks]);

  return (
    <div className="grid gap-4">
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#2db4af]/10 to-[#2db4af]/5 border-[#2db4af]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-[#2db4af]">{metrics.completionRate}%</p>
              </div>
              <div className="p-2 bg-[#2db4af]/20 rounded-full">
                <Target className="h-5 w-5 text-[#2db4af]" />
              </div>
            </div>
            <Progress value={metrics.completionRate} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Concluídas (Semana)</p>
                <p className="text-2xl font-bold">{metrics.completedThisWeek}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.createdThisWeek} novas esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold">{metrics.avgCompletionTime}d</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">para conclusão</p>
          </CardContent>
        </Card>

        <Card className={metrics.overdue > 0 ? 'border-red-500/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Atrasadas</p>
                <p className={`text-2xl font-bold ${metrics.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.overdue}
                </p>
              </div>
              <div className={`p-2 rounded-full ${metrics.overdue > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {metrics.overdue > 0 ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.overdue > 0 ? 'precisam atenção' : 'tudo em dia!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status and Priority Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'todo', label: 'A fazer', color: 'bg-gray-500' },
              { key: 'in_progress', label: 'Em andamento', color: 'bg-[#2db4af]' },
              { key: 'in_review', label: 'Em revisão', color: 'bg-violet-500' },
              { key: 'done', label: 'Concluído', color: 'bg-green-500' },
            ].map((status) => (
              <div key={status.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{status.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${status.color} rounded-full transition-all`}
                      style={{ width: `${metrics.total > 0 ? (metrics.byStatus[status.key as keyof typeof metrics.byStatus] / metrics.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {metrics.byStatus[status.key as keyof typeof metrics.byStatus]}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Prioridade (Pendentes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'high', label: 'Alta', color: 'bg-red-500' },
              { key: 'medium', label: 'Média', color: 'bg-yellow-500' },
              { key: 'low', label: 'Baixa', color: 'bg-green-500' },
            ].map((priority) => (
              <div key={priority.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                  <span className="text-sm text-gray-600">{priority.label}</span>
                </div>
                <span className="text-sm font-medium">
                  {metrics.byPriority[priority.key as keyof typeof metrics.byPriority]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
