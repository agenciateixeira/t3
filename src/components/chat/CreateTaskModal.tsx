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

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  onTaskCreated?: (task: any) => void;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function CreateTaskModal({
  open,
  onClose,
  conversationId,
  onTaskCreated,
}: CreateTaskModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: new Date(),
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    if (open) {
      fetchProfiles();
    }
  }, [open]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    setIsLoading(true);

    try {
      // Criar a tarefa
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || user.id,
          created_by: user.id,
          due_date: format(formData.due_date, 'yyyy-MM-dd'),
          priority: formData.priority,
          status: 'pending',
        })
        .select('*, assigned:profiles!tasks_assigned_to_fkey(id, full_name)')
        .single();

      if (taskError) throw taskError;

      // Buscar nome do responsável
      const assignedProfile = profiles.find((p) => p.id === (formData.assigned_to || user.id));

      // Enviar mensagem no chat informando sobre a tarefa criada
      const taskMessage = `📋 Tarefa criada
**${formData.title}**
Responsável: @${assignedProfile?.full_name || 'Você'}
Vencimento: ${format(formData.due_date, "dd/MM/yyyy", { locale: ptBR })}
Prioridade: ${formData.priority === 'high' ? '🔴 Alta' : formData.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}`;

      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: taskMessage,
        mentioned_users: formData.assigned_to ? [formData.assigned_to] : [],
      });

      if (messageError) throw messageError;

      // Callback com a tarefa criada
      if (onTaskCreated) {
        onTaskCreated(task);
      }

      // Resetar formulário e fechar
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        due_date: new Date(),
        priority: 'medium',
      });
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      alert('Erro ao criar tarefa: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>📋 Criar Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma tarefa e compartilhe no chat com a equipe
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
              placeholder="Ex: Revisar proposta do cliente X"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva os detalhes da tarefa..."
              rows={3}
            />
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Responsável</Label>
            <Select
              value={formData.assigned_to || user?.id}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
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

          {/* Data de Vencimento e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            {/* Data */}
            <div className="space-y-2">
              <Label>Data de vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.due_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? (
                      format(formData.due_date, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => date && setFormData({ ...formData, due_date: date })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Prioridade */}
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
              disabled={isLoading || !formData.title.trim()}
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
