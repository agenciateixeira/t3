import { useMemo } from 'react';
import { Task } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { subDays, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityChartProps {
  tasks: Task[];
  days?: number;
}

export function ActivityChart({ tasks, days = 14 }: ActivityChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const data = Array.from({ length: days }, (_, i) => {
      const day = subDays(today, days - 1 - i);
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
        shortDate: format(day, 'dd', { locale: ptBR }),
        criadas: created,
        concluídas: completed,
      };
    });

    return data;
  }, [tasks, days]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-xs font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-medium">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2db4af" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2db4af" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="shortDate"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            interval={days > 7 ? 1 : 0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            allowDecimals={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="criadas"
            name="Criadas"
            stroke="#94a3b8"
            strokeWidth={1.5}
            fill="url(#colorCriadas)"
          />
          <Area
            type="monotone"
            dataKey="concluídas"
            name="Concluídas"
            stroke="#2db4af"
            strokeWidth={2}
            fill="url(#colorConcluidas)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
