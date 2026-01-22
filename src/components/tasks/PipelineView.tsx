import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Pipeline, PipelineStage, Deal, Client, Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Settings, Plus, Workflow, MoreVertical, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PipelineDialog from './PipelineDialog';
import DealDialog from './DealDialog';
import StageManager from './StageManager';
import DealDetailModal from './DealDetailModal';

export default function PipelineView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [stageManagerOpen, setStageManagerOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [dealDetailOpen, setDealDetailOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [activeTimerDealIds, setActiveTimerDealIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchPipelineData(selectedPipeline.id);

      // Atualizar timers ativos a cada 10 segundos
      const interval = setInterval(() => {
        fetchActiveTimers(selectedPipeline.id);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [selectedPipeline]);

  // Handle query params to auto-open deal dialog
  useEffect(() => {
    const dealId = searchParams.get('deal');
    if (dealId && deals.length > 0 && !isLoading) {
      const deal = deals.find(d => d.id === dealId);
      if (deal) {
        setSelectedDealId(dealId);
        setDealDetailOpen(true);
        // Remove query param after opening
        setSearchParams({});
      }
    }
  }, [searchParams, deals, isLoading]);

  const fetchPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPipelines(data || []);
      if (data && data.length > 0) {
        setSelectedPipeline(data[0]);
      }

      // Fetch clients and profiles for the modal
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name', { ascending: true });

      setClients(clientsData || []);
      setProfiles(profilesData || []);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar pipelines',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveTimers = async (pipelineId: string) => {
    try {
      const { data: activeTimersData } = await supabase
        .from('time_logs')
        .select('deal_id')
        .eq('is_active', true)
        .is('end_time', null)
        .not('deal_id', 'is', null);

      if (activeTimersData) {
        const dealIdsWithTimer = new Set(activeTimersData.map(t => t.deal_id));
        setActiveTimerDealIds(dealIdsWithTimer);
      }
    } catch (error: any) {
      // Ignorar erro silenciosamente se a tabela não existir
      if (error?.code !== '42P01') {
        console.error('Error fetching active timers:', error);
      }
    }
  };

  const fetchPipelineData = async (pipelineId: string) => {
    try {
      // Fetch stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });

      if (stagesError) throw stagesError;

      setStages(stagesData || []);

      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients(*),
          assignee:profiles!deals_assignee_id_fkey(id, full_name, avatar_url),
          stage:pipeline_stages(*)
        `)
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });

      if (dealsError) throw dealsError;

      setDeals(dealsData || []);

      // Fetch active timers
      await fetchActiveTimers(pipelineId);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados do pipeline',
        description: error.message,
      });
    }
  };

  const handleCreatePipeline = () => {
    setEditingPipeline(null);
    setDialogOpen(true);
  };

  const handleEditPipeline = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPipeline(null);
    fetchPipelines();
  };

  const handleDealClick = (dealId: string) => {
    setSelectedDealId(dealId);
    setDealDetailOpen(true);
  };

  const handleDealDetailClose = () => {
    setDealDetailOpen(false);
    setSelectedDealId(null);
    if (selectedPipeline) {
      fetchPipelineData(selectedPipeline.id);
    }
  };

  const handleCreateDeal = () => {
    setDealDialogOpen(true);
  };

  const handleDealDialogClose = async () => {
    setDealDialogOpen(false);
    if (selectedPipeline) {
      await fetchPipelineData(selectedPipeline.id);
    }
  };

  const handleOpenStageManager = () => {
    setStageManagerOpen(true);
  };

  const handleStageManagerClose = () => {
    setStageManagerOpen(false);
    if (selectedPipeline) {
      fetchPipelineData(selectedPipeline.id);
    }
  };

  const handleStageNameDoubleClick = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  };

  const handleStageNameSave = async (stageId: string) => {
    if (!editingStageName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome da etapa não pode estar vazio.',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ name: editingStageName.trim() })
        .eq('id', stageId);

      if (error) throw error;

      // Update local state
      setStages(stages.map(s => s.id === stageId ? { ...s, name: editingStageName.trim() } : s));

      toast({
        title: 'Etapa atualizada!',
        description: 'O nome da etapa foi alterado com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating stage name:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    } finally {
      setEditingStageId(null);
      setEditingStageName('');
    }
  };

  const handleStageNameCancel = () => {
    setEditingStageId(null);
    setEditingStageName('');
  };

  const handleDeleteDeal = async (dealId: string, dealTitle: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir o modal do deal

    if (!confirm(`Deseja realmente excluir a oportunidade "${dealTitle}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;

      toast({
        title: 'Oportunidade excluída',
        description: `"${dealTitle}" foi removida com sucesso.`,
      });

      // Atualizar lista de deals
      if (selectedPipeline) {
        await fetchPipelineData(selectedPipeline.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    const stageDeals = getDealsByStage(stageId);

    if (stageDeals.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Não é possível excluir',
        description: `A etapa "${stageName}" contém ${stageDeals.length} oportunidade(s). Mova ou exclua as oportunidades antes de excluir a etapa.`,
      });
      return;
    }

    if (!confirm(`Deseja realmente excluir a etapa "${stageName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Etapa excluída',
        description: `"${stageName}" foi removida com sucesso.`,
      });

      // Atualizar lista de stages
      if (selectedPipeline) {
        await fetchPipelineData(selectedPipeline.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
      </div>
    );
  }

  // No pipelines exist yet
  if (pipelines.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-gray-100 rounded-full p-6 mb-6">
            <Workflow className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum Pipeline Configurado
          </h3>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            Crie seu primeiro pipeline personalizado para gerenciar suas oportunidades de vendas,
            projetos ou qualquer processo que precise de acompanhamento.
          </p>
          <Button
            onClick={handleCreatePipeline}
            className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Pipeline
          </Button>
        </div>

        <PipelineDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onSuccess={fetchPipelines}
          pipeline={editingPipeline}
        />
      </>
    );
  }

  // Pipeline exists but no stages
  if (stages.length === 0) {
    return (
      <>
        <div className="space-y-4">
          {/* Pipeline Selector */}
          <div className="flex items-center justify-between bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedPipeline?.color || '#2db4af' }}
              />
              <div>
                <h2 className="font-semibold text-gray-900">{selectedPipeline?.name}</h2>
                {selectedPipeline?.description && (
                  <p className="text-sm text-gray-600">{selectedPipeline.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedPipeline && handleEditPipeline(selectedPipeline)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>

          {/* Empty state for stages */}
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Configure as Etapas do Pipeline
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Defina as etapas que suas oportunidades passarão, como "Prospecção", "Negociação",
              "Proposta Enviada" e "Fechado".
            </p>
            <Button
              onClick={handleOpenStageManager}
              className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Etapas
            </Button>
          </div>
        </div>

        <PipelineDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onSuccess={fetchPipelines}
          pipeline={editingPipeline}
        />

        {selectedPipeline && (
          <StageManager
            open={stageManagerOpen}
            onClose={handleStageManagerClose}
            pipelineId={selectedPipeline.id}
            stages={stages}
            onUpdate={handleStageManagerClose}
          />
        )}
      </>
    );
  }

  // Pipeline with stages - Kanban view
  const getDealsByStage = (stageId: string) => {
    return deals.filter((deal) => deal.stage_id === stageId);
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Selector */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedPipeline?.color || '#2db4af' }}
          />
          <div>
            <h2 className="font-semibold text-gray-900">{selectedPipeline?.name}</h2>
            {selectedPipeline?.description && (
              <p className="text-sm text-gray-600">{selectedPipeline.description}</p>
            )}
          </div>

          {/* Pipeline switcher - if multiple pipelines exist */}
          {pipelines.length > 1 && (
            <select
              value={selectedPipeline?.id || ''}
              onChange={(e) => {
                const pipeline = pipelines.find((p) => p.id === e.target.value);
                if (pipeline) setSelectedPipeline(pipeline);
              }}
              className="ml-4 border rounded-md px-3 py-1.5 text-sm"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedPipeline && handleEditPipeline(selectedPipeline)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button
            size="sm"
            className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
            onClick={handleCreateDeal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);

            return (
              <div key={stage.id} className="flex flex-col w-80 flex-shrink-0 group">
                <div className="mb-3 flex items-center justify-between gap-2">
                  {editingStageId === stage.id ? (
                    <input
                      type="text"
                      value={editingStageName}
                      onChange={(e) => setEditingStageName(e.target.value)}
                      onBlur={() => handleStageNameSave(stage.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleStageNameSave(stage.id);
                        } else if (e.key === 'Escape') {
                          handleStageNameCancel();
                        }
                      }}
                      autoFocus
                      className="flex-1 font-semibold text-gray-900 text-sm px-2 py-1 border border-[#2db4af] rounded focus:outline-none focus:ring-2 focus:ring-[#2db4af]"
                    />
                  ) : (
                    <h3
                      className="font-semibold text-gray-900 text-sm cursor-pointer hover:text-[#2db4af] transition-colors flex-1"
                      onDoubleClick={() => handleStageNameDoubleClick(stage)}
                      title="Clique duas vezes para editar"
                    >
                      {stage.name}
                    </h3>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {stageDeals.length}
                    </span>
                    <button
                      onClick={() => handleDeleteStage(stage.id, stage.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      title="Excluir etapa"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>

                <div
                  className="flex-1 space-y-3 p-3 bg-gray-50 rounded-lg border-t-4 min-h-[400px]"
                  style={{ borderTopColor: stage.color }}
                >
                {stageDeals.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-8">
                    Nenhuma oportunidade
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-white rounded-lg border hover:shadow-md transition-shadow group"
                      style={{ backgroundColor: deal.card_color }}
                    >
                      {/* Header com título e menu */}
                      <div className="flex items-start justify-between p-4 pb-2">
                        <h4
                          onClick={() => handleDealClick(deal.id)}
                          className="font-medium text-gray-900 text-sm flex-1 cursor-pointer"
                        >
                          {deal.title}
                        </h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={(e) => handleDeleteDeal(deal.id, deal.title, e)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Conteúdo do card */}
                      <div
                        onClick={() => handleDealClick(deal.id)}
                        className="px-4 pb-4 cursor-pointer"
                      >
                        {/* Timer ativo ou Tags */}
                        {(activeTimerDealIds.has(deal.id) || (deal.tags && deal.tags.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {/* Badge de Timer Ativo */}
                            {activeTimerDealIds.has(deal.id) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200 animate-pulse">
                                <Clock className="h-3 w-3 mr-1" />
                                Timer Ativo
                              </span>
                            )}
                            {/* Tags */}
                            {deal.tags && deal.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {deal.tags && deal.tags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                +{deal.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                      {deal.value && (
                        <p className="text-lg font-semibold text-[#2db4af] mb-2">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: deal.currency || 'BRL',
                          }).format(deal.value)}
                        </p>
                      )}
                        {deal.client && (
                          <p className="text-xs text-gray-600">{deal.client.name}</p>
                        )}
                        {deal.assignee && (
                          <p className="text-xs text-gray-500 mt-2">{deal.assignee.full_name}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

          {/* Botão para adicionar nova stage */}
          <div className="flex flex-col w-80 flex-shrink-0">
            <button
              onClick={handleOpenStageManager}
              className="h-full min-h-[400px] flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-[#2db4af] hover:bg-gray-50 transition-all group cursor-pointer"
            >
              <div className="bg-gray-100 group-hover:bg-[#2db4af] rounded-full p-4 transition-colors">
                <Plus className="h-8 w-8 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700 group-hover:text-[#2db4af] transition-colors">
                  Adicionar Etapa
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Clique para criar nova etapa
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total de Oportunidades</p>
          <p className="text-2xl font-semibold text-gray-900">{deals.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Valor Total</p>
          <p className="text-2xl font-semibold text-[#2db4af]">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(deals.reduce((sum, deal) => sum + (deal.value || 0), 0))}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Taxa de Fechamento</p>
          <p className="text-2xl font-semibold text-gray-900">
            {deals.length > 0
              ? Math.round(
                  (deals.filter((d) => d.stage?.stage_type === 'won').length / deals.length) * 100
                )
              : 0}
            %
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Etapas</p>
          <p className="text-2xl font-semibold text-gray-900">{stages.length}</p>
        </div>
      </div>

      <PipelineDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={fetchPipelines}
        pipeline={editingPipeline}
      />

      {selectedPipeline && (
        <>
          <DealDialog
            open={dealDialogOpen}
            onClose={handleDealDialogClose}
            onSuccess={handleDealDialogClose}
            pipelineId={selectedPipeline.id}
            stages={stages}
            clients={clients}
            profiles={profiles}
          />

          <StageManager
            open={stageManagerOpen}
            onClose={handleStageManagerClose}
            pipelineId={selectedPipeline.id}
            stages={stages}
            onUpdate={handleStageManagerClose}
          />
        </>
      )}

      <DealDetailModal
        open={dealDetailOpen}
        onClose={handleDealDetailClose}
        dealId={selectedDealId}
        onUpdate={handleDealDetailClose}
        clients={clients}
        profiles={profiles}
        stages={stages}
      />
    </div>
  );
}
