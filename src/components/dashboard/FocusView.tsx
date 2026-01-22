import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task, Client, TASK_PRIORITY_LABELS } from '@/types';
import { format, isToday, isBefore, addDays, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Calendar, Zap, Clock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusViewProps {
  tasks: Task[];
  clients: Client[];
}

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function FocusView({ tasks, clients }: FocusViewProps) {
  const getClient = (clientId: string | null) => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId);
  };

  const { todayTasks, overdueTasks, upcomingTasks } = useMemo(() => {
    const today = startOfDay(new Date());
    const in3Days = addDays(today, 3);

    const pendingTasks = tasks.filter((t) => t.status !== 'done');

    const todayTasks = pendingTasks.filter(
      (t) => t.due_date && isToday(parseISO(t.due_date))
    );

    const overdueTasks = pendingTasks.filter(
      (t) => t.due_date && isBefore(parseISO(t.due_date), today)
    );

    const upcomingTasks = pendingTasks.filter((t) => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return dueDate > today && dueDate <= in3Days && !isToday(dueDate);
    });

    return { todayTasks, overdueTasks, upcomingTasks };
  }, [tasks]);

  const TaskItem = ({ task }: { task: Task }) => {
    const client = getClient(task.client_id);

    return (
      <div className="group flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-[#2db4af]/30 hover:bg-gray-50/50 transition-all relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-0.5 bg-[#2db4af] opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-[#2db4af] transition-colors">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {client && (
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                {client.logo_url ? (
                  <img src={client.logo_url} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
                ) : (
                  <Building2 className="h-3 w-3 text-[#2db4af]/60" />
                )}
                <span className="truncate max-w-[100px]">{client.name}</span>
              </span>
            )}
            {task.due_date && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(task.due_date), 'dd MMM', { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn('ml-2 text-xs', PRIORITY_STYLES[task.priority])}
        >
          {TASK_PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-gray-500 text-sm">
      {message}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overdue - Most Important */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-500/30 bg-red-50/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Atrasadas ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueTasks.slice(0, 5).map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {overdueTasks.length > 5 && (
              <p className="text-xs text-gray-600 text-center pt-2">
                +{overdueTasks.length - 5} tarefas atrasadas
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today */}
      <Card className="border-[#2db4af]/30 bg-[#2db4af]/5 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#2db4af] to-[#28a39e]" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-[#2db4af]">
            <Zap className="h-4 w-4" />
            Para Hoje ({todayTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayTasks.length > 0 ? (
            todayTasks.map((task) => <TaskItem key={task.id} task={task} />)
          ) : (
            <EmptyState message="Nenhuma tarefa para hoje" />
          )}
        </CardContent>
      </Card>

      {/* Upcoming 3 days */}
      <Card className="border-gray-200 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-gray-400/30 to-gray-300/10" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            Próximos 3 Dias ({upcomingTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingTasks.length > 0 ? (
            upcomingTasks.slice(0, 6).map((task) => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <EmptyState message="Nenhuma tarefa nos próximos 3 dias" />
          )}
          {upcomingTasks.length > 6 && (
            <p className="text-xs text-gray-600 text-center pt-2">
              +{upcomingTasks.length - 6} tarefas próximas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary if all clear */}
      {overdueTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && (
        <Card className="border-gray-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 to-green-400" />
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#2db4af]/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-[#2db4af]" />
            </div>
            <p className="font-medium">Tudo em dia!</p>
            <p className="text-sm text-gray-600 mt-1">
              Nenhuma tarefa urgente pendente
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
