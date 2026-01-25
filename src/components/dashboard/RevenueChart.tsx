import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterType = 'month' | 'quarter' | 'year';

interface RevenueData {
  label: string;
  current: number;
  previous: number;
}

export function RevenueChart() {
  const [filter, setFilter] = useState<FilterType>('month');
  const [chartData, setChartData] = useState<RevenueData[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [growthPercentage, setGrowthPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [filter]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;
      let data: RevenueData[] = [];

      switch (filter) {
        case 'month':
          currentStart = startOfMonth(now);
          currentEnd = endOfMonth(now);
          previousStart = startOfMonth(subMonths(now, 1));
          previousEnd = endOfMonth(subMonths(now, 1));

          // Buscar dados diários do mês
          data = await fetchDailyRevenue(currentStart, currentEnd, previousStart, previousEnd);
          break;

        case 'quarter':
          currentStart = startOfQuarter(now);
          currentEnd = endOfQuarter(now);
          previousStart = startOfQuarter(subQuarters(now, 1));
          previousEnd = endOfQuarter(subQuarters(now, 1));

          // Buscar dados mensais do trimestre
          data = await fetchMonthlyRevenue(currentStart, currentEnd, previousStart, previousEnd);
          break;

        case 'year':
          currentStart = startOfYear(now);
          currentEnd = endOfYear(now);
          previousStart = startOfYear(subYears(now, 1));
          previousEnd = endOfYear(subYears(now, 1));

          // Buscar dados mensais do ano
          data = await fetchMonthlyRevenue(currentStart, currentEnd, previousStart, previousEnd);
          break;
      }

      setChartData(data);

      // Calcular totais
      const currentSum = data.reduce((sum, item) => sum + item.current, 0);
      const previousSum = data.reduce((sum, item) => sum + item.previous, 0);

      setCurrentTotal(currentSum);
      setPreviousTotal(previousSum);

      // Calcular crescimento
      if (previousSum > 0) {
        const growth = ((currentSum - previousSum) / previousSum) * 100;
        setGrowthPercentage(growth);
      } else {
        setGrowthPercentage(currentSum > 0 ? 100 : 0);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de receita:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailyRevenue = async (
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<RevenueData[]> => {
    // Buscar deals ganhos no período atual
    const { data: currentDeals } = await supabase
      .from('deals')
      .select('value, expected_close_date')
      .eq('stage_id', 'won') // Assumindo que existe uma etapa "won"
      .gte('expected_close_date', currentStart.toISOString())
      .lte('expected_close_date', currentEnd.toISOString());

    // Buscar deals ganhos no período anterior
    const { data: previousDeals } = await supabase
      .from('deals')
      .select('value, expected_close_date')
      .eq('stage_id', 'won')
      .gte('expected_close_date', previousStart.toISOString())
      .lte('expected_close_date', previousEnd.toISOString());

    // Agrupar por dia
    const days: RevenueData[] = [];
    const daysInMonth = endOfMonth(currentStart).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDeals = currentDeals?.filter(d => {
        const dealDate = new Date(d.expected_close_date);
        return dealDate.getDate() === day;
      }) || [];

      const previousDayDeals = previousDeals?.filter(d => {
        const dealDate = new Date(d.expected_close_date);
        return dealDate.getDate() === day;
      }) || [];

      days.push({
        label: `${day}`,
        current: currentDayDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        previous: previousDayDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      });
    }

    return days;
  };

  const fetchMonthlyRevenue = async (
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<RevenueData[]> => {
    // Buscar deals ganhos no período atual
    const { data: currentDeals } = await supabase
      .from('deals')
      .select('value, expected_close_date')
      .eq('stage_id', 'won')
      .gte('expected_close_date', currentStart.toISOString())
      .lte('expected_close_date', currentEnd.toISOString());

    // Buscar deals ganhos no período anterior
    const { data: previousDeals } = await supabase
      .from('deals')
      .select('value, expected_close_date')
      .eq('stage_id', 'won')
      .gte('expected_close_date', previousStart.toISOString())
      .lte('expected_close_date', previousEnd.toISOString());

    // Agrupar por mês
    const months: RevenueData[] = [];
    const monthCount = filter === 'quarter' ? 3 : 12;

    for (let i = 0; i < monthCount; i++) {
      const currentMonth = new Date(currentStart);
      currentMonth.setMonth(currentStart.getMonth() + i);

      const previousMonth = new Date(previousStart);
      previousMonth.setMonth(previousStart.getMonth() + i);

      const currentMonthDeals = currentDeals?.filter(d => {
        const dealDate = new Date(d.expected_close_date);
        return dealDate.getMonth() === currentMonth.getMonth();
      }) || [];

      const previousMonthDeals = previousDeals?.filter(d => {
        const dealDate = new Date(d.expected_close_date);
        return dealDate.getMonth() === previousMonth.getMonth();
      }) || [];

      months.push({
        label: format(currentMonth, 'MMM', { locale: ptBR }),
        current: currentMonthDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        previous: previousMonthDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      });
    }

    return months;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getFilterLabel = () => {
    const now = new Date();
    switch (filter) {
      case 'month':
        return format(now, 'MMMM yyyy', { locale: ptBR });
      case 'quarter':
        return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
      case 'year':
        return now.getFullYear().toString();
    }
  };

  const getComparisonLabel = () => {
    const now = new Date();
    switch (filter) {
      case 'month':
        return format(subMonths(now, 1), 'MMMM yyyy', { locale: ptBR });
      case 'quarter':
        const prevQuarter = subQuarters(now, 1);
        return `Q${Math.floor(prevQuarter.getMonth() / 3) + 1} ${prevQuarter.getFullYear()}`;
      case 'year':
        return subYears(now, 1).getFullYear().toString();
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Faturamento
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Comparação: {getFilterLabel()} vs {getComparisonLabel()}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'month' ? 'default' : 'outline'}
              onClick={() => setFilter('month')}
              className={filter === 'month' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
            >
              Mês
            </Button>
            <Button
              size="sm"
              variant={filter === 'quarter' ? 'default' : 'outline'}
              onClick={() => setFilter('quarter')}
              className={filter === 'quarter' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
            >
              Trimestre
            </Button>
            <Button
              size="sm"
              variant={filter === 'year' ? 'default' : 'outline'}
              onClick={() => setFilter('year')}
              className={filter === 'year' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
            >
              Ano
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 font-medium mb-1">{getFilterLabel()}</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(currentTotal)}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 font-medium mb-1">{getComparisonLabel()}</p>
            <p className="text-2xl font-bold text-gray-700">{formatCurrency(previousTotal)}</p>
          </div>

          <div className={`p-4 rounded-lg border ${
            growthPercentage >= 0
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
          }`}>
            <p className={`text-sm font-medium mb-1 ${
              growthPercentage >= 0 ? 'text-blue-700' : 'text-red-700'
            }`}>
              Crescimento
            </p>
            <div className="flex items-center gap-2">
              {growthPercentage >= 0 ? (
                <TrendingUp className="h-6 w-6 text-blue-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
              <p className={`text-2xl font-bold ${
                growthPercentage >= 0 ? 'text-blue-900' : 'text-red-900'
              }`}>
                {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="current"
                name={getFilterLabel()}
                stroke="#2db4af"
                strokeWidth={3}
                dot={{ fill: '#2db4af', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                name={getComparisonLabel()}
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9ca3af', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
