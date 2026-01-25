import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, TrendingUp, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface MyDeal {
  id: string;
  title: string;
  value: number;
  probability: number;
  stage?: {
    name: string;
    color: string;
    stage_type: string;
  };
  client?: {
    name: string;
  };
}

export function MyDealsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<MyDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (user) {
      fetchMyDeals();

      // Atualizar a cada 2 minutos
      const interval = setInterval(() => {
        fetchMyDeals();
      }, 2 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMyDeals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          value,
          probability,
          stage:pipeline_stages(name, color, stage_type),
          client:clients(name)
        `)
        .eq('assignee_id', user.id)
        .neq('stage.stage_type', 'won')
        .neq('stage.stage_type', 'lost')
        .order('value', { ascending: false })
        .limit(6);

      if (error) throw error;

      setDeals(data || []);

      const total = data?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
      setTotalValue(total);
    } catch (error) {
      console.error('Erro ao buscar deals:', error);
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

  const getExpectedValue = (value: number, probability: number) => {
    return value * (probability / 100);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-green-600" />
            Meus Deals
            {deals.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {deals.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="text-[#2db4af] hover:text-[#28a39e] hover:bg-[#2db4af]/10 text-xs"
          >
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Value */}
        {totalValue > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 font-medium mb-1">Valor Total Pipeline</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(totalValue)}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Nenhum deal ativo</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-[#2db4af]/50 hover:bg-gray-50 transition-all cursor-pointer"
                onClick={() => navigate(`/tasks?deal=${deal.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{deal.title}</p>
                    {deal.client && (
                      <p className="text-xs text-gray-600">{deal.client.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-700">
                      {formatCurrency(deal.value)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Exp: {formatCurrency(getExpectedValue(deal.value, deal.probability))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {deal.stage && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: deal.stage.color }}
                      />
                      <p className="text-xs text-gray-600">{deal.stage.name}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>{deal.probability}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
