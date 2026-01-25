import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, TrendingUp, Eye, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface StageData {
  id: string;
  name: string;
  color: string;
  position: number;
  stage_type: string;
  deal_count: number;
  total_value: number;
}

export function PipelineCard() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<StageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDeals, setTotalDeals] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    fetchPipelineData();

    // Atualizar a cada 2 minutos
    const interval = setInterval(() => {
      fetchPipelineData();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchPipelineData = async () => {
    try {
      // Buscar etapas do pipeline
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, color, position, stage_type')
        .order('position', { ascending: true });

      if (stagesError) throw stagesError;

      // Buscar deals agrupados por etapa
      const stagesWithCounts: StageData[] = [];
      let totalDealsCount = 0;
      let totalValueSum = 0;

      for (const stage of stagesData || []) {
        const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select('id, value')
          .eq('stage_id', stage.id);

        if (dealsError) throw dealsError;

        const dealCount = deals?.length || 0;
        const stageValue = deals?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;

        // Contar apenas etapas ativas (não ganho/perdido)
        if (stage.stage_type === 'active') {
          totalDealsCount += dealCount;
          totalValueSum += stageValue;
        }

        stagesWithCounts.push({
          ...stage,
          deal_count: dealCount,
          total_value: stageValue,
        });
      }

      setStages(stagesWithCounts);
      setTotalDeals(totalDealsCount);
      setTotalValue(totalValueSum);
    } catch (error) {
      console.error('Erro ao buscar dados do pipeline:', error);
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

  const getStageTypeLabel = (type: string) => {
    switch (type) {
      case 'won':
        return 'Ganho';
      case 'lost':
        return 'Perdido';
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#2db4af]" />
            Pipeline de Vendas
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="text-[#2db4af] hover:text-[#28a39e] hover:bg-[#2db4af]/10"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver pipeline
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gradient-to-br from-[#2db4af]/5 to-[#2db4af]/10 rounded-lg border border-[#2db4af]/20">
          <div>
            <p className="text-xs text-gray-600 mb-1">Deals Ativos</p>
            <p className="text-2xl font-bold text-gray-900">{totalDeals}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Valor Total</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Etapas */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-8">
            <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Nenhuma etapa configurada</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-[#2db4af]/50 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <p className="text-sm font-semibold text-gray-900 flex-1 truncate">
                    {stage.name}
                  </p>
                  {getStageTypeLabel(stage.stage_type) && (
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        stage.stage_type === 'won'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {getStageTypeLabel(stage.stage_type)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      <span>{stage.deal_count} {stage.deal_count === 1 ? 'deal' : 'deals'}</span>
                    </div>
                    {stage.total_value > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="font-semibold text-green-700">
                          {formatCurrency(stage.total_value)}
                        </span>
                      </div>
                    )}
                  </div>
                  {stage.deal_count > 0 && (
                    <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2db4af] transition-all"
                        style={{
                          width: `${Math.min(100, (stage.deal_count / Math.max(...stages.map(s => s.deal_count), 1)) * 100)}%`,
                        }}
                      />
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
