import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Clock, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface MyTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  client?: {
    name: string;
  };
}

export function MyTasksTodayCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyTasks();

      // Atualizar a cada 2 minutos
      const interval = setInterval(() => {
        fetchMyTasks();
      }, 2 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMyTasks = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          client:clients(name)
        `)
        .eq('assignee_id', user.id)
        .neq('status', 'done')
        .or(`due_date.is.null,due_date.lte.${tomorrow.toISOString()}`)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true })
        .limit(8);

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'done':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'A fazer';
      case 'in_progress':
        return 'Em andamento';
      case 'done':
        return 'Concluída';
      default:
        return status;
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-[#2db4af]" />
            Minhas Tarefas
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tasks.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="text-[#2db4af] hover:text-[#28a39e] hover:bg-[#2db4af]/10 text-xs"
          >
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Nenhuma tarefa pendente</p>
            <p className="text-xs text-gray-500 mt-1">Parabéns! Você está em dia</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isOverdue(task.due_date)
                    ? 'border-red-200 bg-red-50/50 hover:bg-red-50'
                    : 'border-gray-200 hover:border-[#2db4af]/50 hover:bg-gray-50'
                }`}
                onClick={() => navigate(`/tasks?open=${task.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                    {task.title}
                  </p>
                  <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                </div>

                {task.client && (
                  <p className="text-xs text-gray-600 mb-2">{task.client.name}</p>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={`text-xs ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </Badge>

                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1 text-xs ${
                        isOverdue(task.due_date) ? 'text-red-700 font-semibold' : 'text-gray-600'
                      }`}
                    >
                      {isOverdue(task.due_date) ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <Calendar className="h-3 w-3" />
                      )}
                      <span>
                        {isOverdue(task.due_date)
                          ? `Atrasada há ${formatDistanceToNow(new Date(task.due_date), { locale: ptBR })}`
                          : formatDistanceToNow(new Date(task.due_date), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                      </span>
                    </div>
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
