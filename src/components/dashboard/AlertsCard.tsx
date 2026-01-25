import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, Briefcase, CheckSquare, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  assignee?: {
    full_name: string;
    avatar_url: string | null;
  };
  client?: {
    name: string;
  };
}

interface StaleDeal {
  id: string;
  title: string;
  updated_at: string;
  value: number;
  stage?: {
    name: string;
  };
  client?: {
    name: string;
  };
}

export function AlertsCard() {
  const navigate = useNavigate();
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [staleDeals, setStaleDeals] = useState<StaleDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();

    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      fetchAlerts();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const now = new Date().toISOString();

      // Buscar tarefas atrasadas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          due_date,
          priority,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url),
          client:clients(name)
        `)
        .lt('due_date', now)
        .neq('status', 'done')
        .order('due_date', { ascending: true })
        .limit(10);

      if (tasksError) throw tasksError;

      // Buscar deals parados (sem atualização há mais de 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          updated_at,
          value,
          stage:pipeline_stages(name),
          client:clients(name)
        `)
        .lt('updated_at', sevenDaysAgo.toISOString())
        .neq('stage_id', 'won')
        .neq('stage_id', 'lost')
        .order('updated_at', { ascending: true })
        .limit(10);

      if (dealsError) throw dealsError;

      setOverdueTasks(tasksData || []);
      setStaleDeals(dealsData || []);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalAlerts = overdueTasks.length + staleDeals.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alertas
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-1">
                {totalAlerts}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="tasks" className="text-xs">
              Tarefas Atrasadas
              {overdueTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {overdueTasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deals" className="text-xs">
              Deals Parados
              {staleDeals.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {staleDeals.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : overdueTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckSquare className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nenhuma tarefa atrasada</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks?open=${task.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                        {task.assignee && (
                          <p className="text-xs text-gray-600">{task.assignee.full_name}</p>
                        )}
                        {task.client && (
                          <p className="text-xs text-gray-500">{task.client.name}</p>
                        )}
                      </div>
                      <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-red-700">
                      <Clock className="h-3 w-3" />
                      <span>
                        Atrasada há {formatDistanceToNow(new Date(task.due_date), { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deals" className="mt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : staleDeals.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nenhum deal parado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {staleDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tasks?deal=${deal.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{deal.title}</p>
                        {deal.client && (
                          <p className="text-xs text-gray-600">{deal.client.name}</p>
                        )}
                        {deal.stage && (
                          <p className="text-xs text-gray-500">Etapa: {deal.stage.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-green-700">
                          {formatCurrency(deal.value)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="h-3 w-3" />
                      <span>
                        Sem movimentação há {formatDistanceToNow(new Date(deal.updated_at), { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
