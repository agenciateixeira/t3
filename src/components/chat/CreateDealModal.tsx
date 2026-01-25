import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  type: 'group' | 'direct';
}

interface CreateDealModalProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onDealCreated?: (deal: any) => void;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Stage {
  id: string;
  name: string;
}

export default function CreateDealModal({
  open,
  onClose,
  conversation,
  onDealCreated,
}: CreateDealModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    value: '',
    assignee_id: '',
    stage_id: '',
    expected_close_date: new Date(),
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      // Buscar perfis
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      // Buscar clientes
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      // Buscar stages (primeira pipeline ativa)
      const { data: pipelinesData } = await supabase
        .from('pipelines')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (pipelinesData) {
        const { data: stagesData } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('pipeline_id', pipelinesData.id)
          .eq('stage_type', 'active')
          .order('position');

        setStages(stagesData || []);
        if (stagesData && stagesData.length > 0) {
          setFormData((prev) => ({ ...prev, stage_id: stagesData[0].id }));
        }
      }

      setProfiles(profilesData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user || !formData.stage_id) return;

    setIsLoading(true);

    try {
      // Buscar pipeline_id da stage selecionada
      const { data: stageData } = await supabase
        .from('pipeline_stages')
        .select('pipeline_id')
        .eq('id', formData.stage_id)
        .single();

      if (!stageData) throw new Error('Stage não encontrada');

      // Criar o deal
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          title: formData.title,
          description: formData.description || null,
          client_id: formData.client_id || null,
          value: formData.value ? parseFloat(formData.value) : null,
          assignee_id: formData.assignee_id || user.id,
          created_by: user.id,
          stage_id: formData.stage_id,
          pipeline_id: stageData.pipeline_id,
          expected_close_date: format(formData.expected_close_date, 'yyyy-MM-dd'),
          priority: formData.priority,
        })
        .select('*, assignee:profiles!deals_assignee_id_fkey(id, full_name), client:clients(id, name), stage:pipeline_stages(id, name)')
        .single();

      if (dealError) throw dealError;

      // Criar evento no calendário para o deal (data de previsão de fechamento)
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .insert({
          title: `💼 ${formData.title}`,
          description: formData.description || `Deal - ${formData.title}`,
          start_date: `${format(formData.expected_close_date, 'yyyy-MM-dd')}T09:00:00`,
          end_date: `${format(formData.expected_close_date, 'yyyy-MM-dd')}T10:00:00`,
          created_by: user.id,
          event_type: 'deal',
          deal_id: deal.id,
          client_id: formData.client_id || null,
          all_day: false,
        });

      if (calendarError) console.error('Erro ao criar evento no calendário:', calendarError);

      // Buscar nome do responsável e cliente
      const assignedProfile = profiles.find((p) => p.id === (formData.assignee_id || user.id));
      const client = clients.find((c) => c.id === formData.client_id);
      const stage = stages.find((s) => s.id === formData.stage_id);

      // Enviar mensagem no chat informando sobre o deal criado
      const dealMessage = `💼 Deal criado
**${formData.title}**
${client ? `Cliente: ${client.name}` : ''}
${formData.value ? `Valor: R$ ${parseFloat(formData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
Responsável: @${assignedProfile?.full_name || 'Você'}
Etapa: ${stage?.name || 'N/A'}
Previsão: ${format(formData.expected_close_date, "dd/MM/yyyy", { locale: ptBR })}`;

      const { error: messageError } = await supabase.from('messages').insert({
        group_id: conversation.type === 'group' ? conversation.id : null,
        recipient_id: conversation.type === 'direct' ? conversation.id : null,
        sender_id: user.id,
        content: dealMessage,
        mentioned_users: formData.assignee_id ? [formData.assignee_id] : [],
      });

      if (messageError) throw messageError;

      // Callback com o deal criado
      if (onDealCreated) {
        onDealCreated(deal);
      }

      // Resetar formulário e fechar
      setFormData({
        title: '',
        description: '',
        client_id: '',
        value: '',
        assignee_id: '',
        stage_id: stages[0]?.id || '',
        expected_close_date: new Date(),
        priority: 'medium',
      });
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar deal:', error);
      alert('Erro ao criar deal: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💼 Criar Novo Deal</DialogTitle>
          <DialogDescription>
            Crie um deal e compartilhe no chat com a equipe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Proposta de desenvolvimento de app"
              required
            />
          </div>

          {/* Cliente e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva os detalhes do deal..."
              rows={3}
            />
          </div>

          {/* Etapa e Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage_id">
                Etapa <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.stage_id}
                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee_id">Responsável</Label>
              <Select
                value={formData.assignee_id || user?.id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

          {/* Data e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previsão de fechamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.expected_close_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expected_close_date ? (
                      format(formData.expected_close_date, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expected_close_date}
                    onSelect={(date) => date && setFormData({ ...formData, expected_close_date: date })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baixa</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="high">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim() || !formData.stage_id}
              className="bg-[#2db4af] hover:bg-[#28a39e]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar e compartilhar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
