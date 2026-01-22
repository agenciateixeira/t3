import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Deal, PipelineStage, Client, Profile, DealFormData, TaskPriority } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import ClientDialog from '@/components/clients/ClientDialog';

interface DealDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void>;
  deal?: Deal | null;
  pipelineId: string;
  stages: PipelineStage[];
  clients: Client[];
  profiles: Profile[];
}

const CARD_COLORS = [
  { value: '#ffffff', label: 'Branco' },
  { value: '#fef3c7', label: 'Amarelo' },
  { value: '#dbeafe', label: 'Azul' },
  { value: '#d1fae5', label: 'Verde' },
  { value: '#ffe4e6', label: 'Rosa' },
  { value: '#e0e7ff', label: 'Roxo' },
  { value: '#fed7aa', label: 'Laranja' },
  { value: '#f3f4f6', label: 'Cinza' },
];

export default function DealDialog({
  open,
  onClose,
  onSuccess,
  deal,
  pipelineId,
  stages,
  clients,
  profiles,
}: DealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [localClients, setLocalClients] = useState<Client[]>(clients);
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    description: '',
    client_id: '',
    value: undefined,
    currency: 'BRL',
    probability: 50,
    start_date: '',
    start_time: '',
    expected_close_date: '',
    expected_close_time: '',
    assignee_id: '',
    priority: 'medium',
    card_color: '#ffffff',
    tags: [],
    source: '',
  });

  // Update local clients when prop changes
  useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        description: deal.description || '',
        client_id: deal.client_id || '',
        value: deal.value || undefined,
        currency: deal.currency || 'BRL',
        probability: deal.probability || 50,
        start_date: deal.start_date || '',
        start_time: deal.start_time || '',
        expected_close_date: deal.expected_close_date || '',
        expected_close_time: deal.expected_close_time || '',
        assignee_id: deal.assignee_id || '',
        priority: deal.priority || 'medium',
        card_color: deal.card_color || '#ffffff',
        tags: deal.tags || [],
        source: deal.source || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        client_id: '',
        value: undefined,
        currency: 'BRL',
        probability: 50,
        start_date: '',
        start_time: '',
        expected_close_date: '',
        expected_close_time: '',
        assignee_id: '',
        priority: 'medium',
        card_color: '#ffffff',
        tags: [],
        source: '',
      });
    }
  }, [deal, open]);

  const syncDealToCalendar = async (dealId: string, dealData: any) => {
    // Só sincroniza se tiver pelo menos uma data definida
    if (!dealData.start_date && !dealData.expected_close_date) {
      return;
    }

    try {
      // Verifica se já existe um evento de calendário para este deal
      const { data: existingEvent, error: checkError } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('deal_id', dealId)
        .single();

      const eventTitle = `📊 ${dealData.title}`;
      const eventDescription = dealData.description
        ? `${dealData.description}\n\nOportunidade do Pipeline`
        : 'Oportunidade do Pipeline';

      // Combina data + hora para criar datetime completo
      let startDateTime = dealData.start_date || dealData.expected_close_date;
      let endDateTime = dealData.expected_close_date || dealData.start_date;

      // Se tiver hora de início, concatena com a data
      if (dealData.start_time && dealData.start_date) {
        startDateTime = `${dealData.start_date}T${dealData.start_time}`;
      } else if (dealData.start_date) {
        // Se não tiver hora, usa 09:00 como padrão
        startDateTime = `${dealData.start_date}T09:00:00`;
      }

      // Se tiver hora de fechamento, concatena com a data
      if (dealData.expected_close_time && dealData.expected_close_date) {
        endDateTime = `${dealData.expected_close_date}T${dealData.expected_close_time}`;
      } else if (dealData.expected_close_date) {
        // Se não tiver hora, usa 18:00 como padrão
        endDateTime = `${dealData.expected_close_date}T18:00:00`;
      }

      const eventData = {
        title: eventTitle,
        description: eventDescription,
        client_id: dealData.client_id || null,
        deal_id: dealId,
        start_date: startDateTime,
        end_date: endDateTime,
        all_day: false,
        created_by: user?.id || null,
      };

      if (existingEvent) {
        // Atualiza evento existente
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) throw updateError;
      } else {
        // Cria novo evento
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert([eventData]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Erro ao sincronizar com calendário:', error);
      // Não bloqueia a operação principal se a sincronização falhar
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.title.trim()) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'O título é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (deal) {
        // Update existing deal
        const updateData = {
          title: formData.title,
          description: formData.description || null,
          client_id: formData.client_id || null,
          value: formData.value || null,
          currency: formData.currency || 'BRL',
          probability: formData.probability || 50,
          start_date: formData.start_date || null,
          start_time: formData.start_time || null,
          expected_close_date: formData.expected_close_date || null,
          expected_close_time: formData.expected_close_time || null,
          assignee_id: formData.assignee_id || null,
          priority: formData.priority || 'medium',
          card_color: formData.card_color || '#ffffff',
          tags: formData.tags || [],
          source: formData.source || null,
        };

        const { error } = await supabase
          .from('deals')
          .update(updateData)
          .eq('id', deal.id);

        if (error) throw error;

        // Sincroniza com o calendário
        await syncDealToCalendar(deal.id, updateData);

        toast({
          title: 'Oportunidade atualizada',
          description: 'A oportunidade foi atualizada com sucesso.',
        });
      } else {
        // Create new deal - insert in first stage
        const firstStage = stages.find(s => s.stage_type === 'active') || stages[0];

        if (!firstStage) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Nenhuma etapa disponível para criar a oportunidade.',
          });
          setIsLoading(false);
          return;
        }

        // Get max position for the stage
        const { data: existingDeals } = await supabase
          .from('deals')
          .select('position')
          .eq('stage_id', firstStage.id)
          .order('position', { ascending: false })
          .limit(1);

        const maxPosition = existingDeals && existingDeals.length > 0
          ? existingDeals[0].position
          : 0;

        const insertData = {
          pipeline_id: pipelineId,
          stage_id: firstStage.id,
          title: formData.title,
          description: formData.description || null,
          client_id: formData.client_id || null,
          value: formData.value || null,
          currency: formData.currency || 'BRL',
          probability: formData.probability || 50,
          start_date: formData.start_date || null,
          start_time: formData.start_time || null,
          expected_close_date: formData.expected_close_date || null,
          expected_close_time: formData.expected_close_time || null,
          assignee_id: formData.assignee_id || null,
          priority: formData.priority || 'medium',
          card_color: formData.card_color || '#ffffff',
          tags: formData.tags || [],
          source: formData.source || null,
          position: maxPosition + 1,
          created_by: user?.id,
        };

        const { data: newDeal, error } = await supabase
          .from('deals')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;

        // Sincroniza com o calendário
        if (newDeal) {
          await syncDealToCalendar(newDeal.id, insertData);
        }

        toast({
          title: 'Oportunidade criada',
          description: 'A oportunidade foi criada com sucesso e sincronizada com o calendário.',
        });
      }

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving deal:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;

    setIsLoading(true);
    try {
      // Deleta o evento de calendário associado (se existir)
      await supabase
        .from('calendar_events')
        .delete()
        .eq('deal_id', deal.id);

      // Deleta o deal
      const { error } = await supabase.from('deals').delete().eq('id', deal.id);

      if (error) throw error;

      toast({
        title: 'Oportunidade excluída',
        description: 'A oportunidade e o evento do calendário foram excluídos com sucesso.',
      });

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error deleting deal:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleClientDialogClose = async () => {
    setClientDialogOpen(false);

    // Recarregar a lista de clientes
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        setLocalClients(data);

        // Se um novo cliente foi criado (a lista cresceu), selecionar o último
        if (data.length > localClients.length) {
          const newestClient = data[data.length - 1];
          setFormData({ ...formData, client_id: newestClient.id });
        }
      }
    } catch (error: any) {
      console.error('Error reloading clients:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {deal ? 'Editar Oportunidade' : 'Nova Oportunidade'}
            </DialogTitle>
            <DialogDescription>
              {deal
                ? 'Atualize as informações da oportunidade.'
                : 'Crie uma nova oportunidade no pipeline.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome da oportunidade"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre a oportunidade..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="client">Cliente</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setClientDialogOpen(true)}
                    className="h-auto p-0 text-[#2db4af] hover:text-[#28a39e]"
                  >
                    + Cadastrar Cliente Completo
                  </Button>
                </div>

                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {localClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="assignee">Responsável</Label>
                <Select
                  value={formData.assignee_id}
                  onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Value */}
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, value: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0,00"
                />
              </div>

              {/* Probability */}
              <div className="space-y-2">
                <Label htmlFor="probability">Probabilidade (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) =>
                    setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TaskPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date and Time */}
              <div className="space-y-2">
                <Label htmlFor="start_date">Data de Início</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    placeholder="09:00"
                  />
                </div>
              </div>

              {/* Expected Close Date and Time */}
              <div className="space-y-2">
                <Label htmlFor="expected_close_date">Data Prevista de Fechamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_close_date: e.target.value })
                    }
                  />
                  <Input
                    id="expected_close_time"
                    type="time"
                    value={formData.expected_close_time}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_close_time: e.target.value })
                    }
                    placeholder="18:00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source">Origem</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Ex: Indicação, Site, LinkedIn"
                />
              </div>
            </div>

            {/* Card Color */}
            <div className="space-y-2">
              <Label>Cor do Card</Label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, card_color: color.value })}
                    className={`w-10 h-10 rounded border-2 transition-all ${
                      formData.card_color === color.value
                        ? 'border-[#2db4af] ring-2 ring-[#2db4af] ring-offset-2'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center">
              <div>
                {deal && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2db4af] hover:bg-[#28a39e]"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {deal ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta oportunidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Dialog - Full Client Registration */}
      <ClientDialog
        open={clientDialogOpen}
        onClose={handleClientDialogClose}
        client={null}
      />
    </>
  );
}
