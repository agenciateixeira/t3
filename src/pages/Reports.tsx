import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FileBarChart,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Users,
  Clock,
  CheckSquare,
  Target,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportTasksToExcel, exportTasksToPDF } from '@/lib/exportUtils';

interface PerformanceMetrics {
  userId: string;
  userName: string;
  completedTasks: number;
  averageCompletionTime: number;
  onTimeRate: number;
  totalTimeSpent: number;
}

interface ProductivityData {
  date: string;
  tasksCompleted: number;
  hoursWorked: number;
}

const COLORS = ['#2db4af', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function Reports() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasPermission = profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager';

  useEffect(() => {
    if (hasPermission) {
      fetchReportsData();
    }
  }, [period, hasPermission]);

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'quarter':
          startDate.setDate(now.getDate() - 90);
          break;
      }

      // Buscar métricas de performance por usuário
      await fetchPerformanceMetrics(startDate);

      // Buscar dados de produtividade
      await fetchProductivityData(startDate);

      // Buscar distribuição de tarefas por status
      await fetchTasksByStatus();
    } catch (error) {
      console.error('Erro ao buscar dados de relatórios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPerformanceMetrics = async (startDate: Date) => {
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name')
        .neq('hierarchy', 'admin');

      if (!users) return;

      const metrics: PerformanceMetrics[] = [];

      for (const user of users) {
        // Tarefas completadas
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('id, created_at, updated_at, due_date')
          .eq('assignee_id', user.id)
          .eq('status', 'done')
          .gte('updated_at', startDate.toISOString());

        const completedCount = completedTasks?.length || 0;

        // Calcular tempo médio de conclusão
        let totalCompletionTime = 0;
        let onTimeCount = 0;

        completedTasks?.forEach((task) => {
          const created = new Date(task.created_at);
          const completed = new Date(task.updated_at);
          const timeDiff = completed.getTime() - created.getTime();
          totalCompletionTime += timeDiff;

          // Verificar se foi concluída no prazo
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            if (completed <= dueDate) {
              onTimeCount++;
            }
          }
        });

        const avgCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount / (1000 * 60 * 60) : 0;
        const onTimeRate = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 0;

        // Tempo total trabalhado
        const { data: timeLogs } = await supabase
          .from('time_logs')
          .select('duration_seconds')
          .eq('user_id', user.id)
          .gte('start_time', startDate.toISOString())
          .not('duration_seconds', 'is', null);

        const totalTimeSpent = timeLogs?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) || 0;

        metrics.push({
          userId: user.id,
          userName: user.full_name,
          completedTasks: completedCount,
          averageCompletionTime: avgCompletionTime,
          onTimeRate,
          totalTimeSpent,
        });
      }

      setPerformanceMetrics(metrics.sort((a, b) => b.completedTasks - a.completedTasks));
    } catch (error) {
      console.error('Erro ao buscar métricas de performance:', error);
    }
  };

  const fetchProductivityData = async (startDate: Date) => {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('updated_at')
        .eq('status', 'done')
        .gte('updated_at', startDate.toISOString());

      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('start_time, duration_seconds')
        .gte('start_time', startDate.toISOString())
        .not('duration_seconds', 'is', null);

      // Agrupar por dia
      const dataByDay: { [key: string]: { tasks: number; seconds: number } } = {};

      tasks?.forEach((task) => {
        const date = new Date(task.updated_at).toISOString().split('T')[0];
        if (!dataByDay[date]) {
          dataByDay[date] = { tasks: 0, seconds: 0 };
        }
        dataByDay[date].tasks++;
      });

      timeLogs?.forEach((log) => {
        const date = new Date(log.start_time).toISOString().split('T')[0];
        if (!dataByDay[date]) {
          dataByDay[date] = { tasks: 0, seconds: 0 };
        }
        dataByDay[date].seconds += log.duration_seconds || 0;
      });

      const chartData = Object.entries(dataByDay)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          tasksCompleted: data.tasks,
          hoursWorked: Math.round(data.seconds / 3600 * 10) / 10,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Últimos 14 dias

      setProductivityData(chartData);
    } catch (error) {
      console.error('Erro ao buscar dados de produtividade:', error);
    }
  };

  const fetchTasksByStatus = async () => {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status');

      const statusCount: { [key: string]: number } = {};

      tasks?.forEach((task) => {
        statusCount[task.status] = (statusCount[task.status] || 0) + 1;
      });

      const chartData = Object.entries(statusCount).map(([status, count]) => ({
        name: getStatusLabel(status),
        value: count,
      }));

      setTasksByStatus(chartData);
    } catch (error) {
      console.error('Erro ao buscar tarefas por status:', error);
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

  const formatTime = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  if (!hasPermission) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Apenas administradores e gerentes de equipe podem acessar relatórios.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileBarChart className="h-8 w-8 text-[#2db4af]" />
              Relatórios e Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Métricas de performance e produtividade da equipe
            </p>
          </div>

          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Métricas Gerais */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100">
                  <CheckSquare className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tarefas Concluídas</p>
                  <p className="text-2xl font-bold">
                    {performanceMetrics.reduce((sum, m) => sum + m.completedTasks, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-[#2db4af]/10">
                  <Clock className="h-6 w-6 text-[#2db4af]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Horas Trabalhadas</p>
                  <p className="text-2xl font-bold">
                    {Math.round(performanceMetrics.reduce((sum, m) => sum + m.totalTimeSpent, 0) / 3600)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-100">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Taxa No Prazo</p>
                  <p className="text-2xl font-bold">
                    {performanceMetrics.length > 0
                      ? Math.round(
                          performanceMetrics.reduce((sum, m) => sum + m.onTimeRate, 0) /
                            performanceMetrics.length
                        )
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Membros Ativos</p>
                  <p className="text-2xl font-bold">{performanceMetrics.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Performance por Pessoa</TabsTrigger>
            <TabsTrigger value="productivity">Produtividade Diária</TabsTrigger>
            <TabsTrigger value="distribution">Distribuição de Tarefas</TabsTrigger>
          </TabsList>

          {/* Performance Chart */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Tarefas Concluídas por Pessoa</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => console.log('Export Excel')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log('Export PDF')}>
                        <FileText className="h-4 w-4 mr-2 text-red-600" />
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="userName" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completedTasks" name="Tarefas Concluídas" fill="#2db4af" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance Table */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Métricas Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 font-semibold">Nome</th>
                        <th className="pb-3 font-semibold">Tarefas</th>
                        <th className="pb-3 font-semibold">Tempo Médio</th>
                        <th className="pb-3 font-semibold">Taxa No Prazo</th>
                        <th className="pb-3 font-semibold">Tempo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {performanceMetrics.map((metric) => (
                        <tr key={metric.userId} className="hover:bg-gray-50">
                          <td className="py-3">{metric.userName}</td>
                          <td className="py-3">{metric.completedTasks}</td>
                          <td className="py-3">{metric.averageCompletionTime.toFixed(1)}h</td>
                          <td className="py-3">
                            <Badge
                              className={
                                metric.onTimeRate >= 80
                                  ? 'bg-green-100 text-green-700'
                                  : metric.onTimeRate >= 60
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }
                            >
                              {metric.onTimeRate.toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-3">{Math.round(metric.totalTimeSpent / 3600)}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Productivity Chart */}
          <TabsContent value="productivity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Produtividade nos Últimos 14 Dias</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={productivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="tasksCompleted" name="Tarefas" fill="#2db4af" />
                      <Bar yAxisId="right" dataKey="hoursWorked" name="Horas" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Chart */}
          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Tarefas por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={tasksByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {tasksByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
