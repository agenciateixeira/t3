import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsViewProps {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#2db4af',
  in_review: '#8b5cf6',
  done: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  in_review: 'Revisão',
  done: 'Concluído',
};

export function AnalyticsView({ tasks }: AnalyticsViewProps) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
    tasks.forEach((task) => {
      counts[task.status]++;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
      value,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
    }));
  }, [tasks]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const completed = tasks.filter(
        (t) => t.status === 'done' && t.updated_at.startsWith(dayStr)
      ).length;
      return {
        day: format(day, 'EEE', { locale: ptBR }),
        concluídas: completed,
      };
    });
  }, [tasks]);

  const trendData = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

    return last7Days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const created = tasks.filter((t) => {
        const createdDate = new Date(t.created_at);
        return isWithinInterval(createdDate, { start: dayStart, end: dayEnd });
      }).length;

      const completed = tasks.filter((t) => {
        if (t.status !== 'done') return false;
        const updatedDate = new Date(t.updated_at);
        return isWithinInterval(updatedDate, { start: dayStart, end: dayEnd });
      }).length;

      return {
        date: format(day, 'dd/MM'),
        criadas: created,
        concluídas: completed,
      };
    });
  }, [tasks]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-[#2db4af]">{totalTasks}</p>
            <p className="text-xs text-gray-600">Total de Tarefas</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-[#2db4af]">{completedTasks}</p>
            <p className="text-xs text-gray-600">Concluídas</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-3xl font-bold text-[#2db4af]">{completionRate}%</p>
            <p className="text-xs text-gray-600">Taxa de Conclusão</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart - Status Distribution */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Weekly Completed */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluídas esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="concluídas"
                    fill="#2db4af"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart - Trend */}
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tendência (Últimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="criadas"
                  stroke="#94a3b8"
                  fill="#f1f5f9"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="concluídas"
                  stroke="#2db4af"
                  fill="rgba(45, 180, 175, 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-gray-600">Criadas</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2db4af]" />
              <span className="text-gray-600">Concluídas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
