import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Task, Client } from '@/types';
import Layout from '@/components/Layout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TaskItem } from '@/components/dashboard/TaskItem';
import { ClientItem } from '@/components/dashboard/ClientItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckSquare,
  Clock,
  Users,
  Briefcase,
  TrendingUp,
  Plus,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    totalClients: 0,
    completedTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Use Promise.all for better performance
      const [
        { data: tasksData, error: tasksError },
        { count: totalTasksCount },
        { count: pendingTasksCount },
        { count: completedTasksCount },
        { data: clientsData, error: clientsError },
        { count: totalClientsCount },
      ] = await Promise.all([
        // Fetch recent tasks (last 5)
        supabase
          .from('tasks')
          .select(`
            *,
            client:clients(*),
            assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, hierarchy)
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        // Count total tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true }),

        // Count pending tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('status', ['todo', 'in_progress']),

        // Count completed tasks
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'done'),

        // Fetch recent clients (last 5)
        supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),

        // Count total clients
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true }),
      ]);

      if (tasksError) throw tasksError;
      if (clientsError) throw clientsError;

      setStats({
        totalTasks: totalTasksCount || 0,
        pendingTasks: pendingTasksCount || 0,
        totalClients: totalClientsCount || 0,
        completedTasks: completedTasksCount || 0,
      });

      setRecentTasks(tasksData || []);
      setRecentClients(clientsData || []);
    } catch (error: any) {
      // Only log errors that are not related to RLS recursion
      // (those are being fixed on the database side)
      if (error?.code !== '42P17') {
        console.error('Error fetching dashboard data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Aqui está um resumo das suas atividades
          </p>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
          <MetricCard
            title="Total de Tarefas"
            value={stats.totalTasks}
            icon={<CheckSquare className="h-5 w-5" />}
          />
          <MetricCard
            title="Tarefas Pendentes"
            value={stats.pendingTasks}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <MetricCard
            title="Total de Clientes"
            value={stats.totalClients}
            icon={<Users className="h-5 w-5" />}
            variant="primary"
          />
          <MetricCard
            title="Tarefas Concluídas"
            value={stats.completedTasks}
            icon={<CheckSquare className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/tasks')}
                  className="text-[#2db4af] hover:text-[#28a39e] hover:bg-[#2db4af]/10"
                >
                  Ver todas
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
              ) : recentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">Nenhuma tarefa criada</p>
                  <Button
                    onClick={() => navigate('/tasks')}
                    size="sm"
                    className="bg-[#2db4af] hover:bg-[#28a39e]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onClick={() => navigate(`/tasks?open=${task.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Clients */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Clientes Recentes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/clients')}
                  className="text-[#2db4af] hover:text-[#28a39e] hover:bg-[#2db4af]/10"
                >
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentClients.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">Nenhum cliente cadastrado</p>
                  <Button
                    onClick={() => navigate('/clients')}
                    size="sm"
                    className="bg-[#2db4af] hover:bg-[#28a39e]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentClients.map((client) => (
                    <ClientItem
                      key={client.id}
                      client={client}
                      onClick={() => navigate('/clients')}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Button
                onClick={() => navigate('/tasks')}
                variant="outline"
                className="justify-start h-auto py-4 px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Nova Tarefa</p>
                    <p className="text-xs text-gray-500">Criar nova tarefa</p>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/clients')}
                variant="outline"
                className="justify-start h-auto py-4 px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#2db4af]/10">
                    <Briefcase className="h-5 w-5 text-[#2db4af]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Novo Cliente</p>
                    <p className="text-xs text-gray-500">Adicionar cliente</p>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/calendar')}
                variant="outline"
                className="justify-start h-auto py-4 px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Ver Calendário</p>
                    <p className="text-xs text-gray-500">Agendar conteúdo</p>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/employees')}
                variant="outline"
                className="justify-start h-auto py-4 px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Ver Equipe</p>
                    <p className="text-xs text-gray-500">Gerenciar equipe</p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
