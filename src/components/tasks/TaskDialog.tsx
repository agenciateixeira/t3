import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Task,
  Client,
  Profile,
  TaskFormData,
  TaskStatus,
  TaskPriority,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Trash2 } from 'lucide-react';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void>;
  task?: Task | null;
  clients: Client[];
  profiles: Profile[];
}

export default function TaskDialog({
  open,
  onClose,
  onSuccess,
  task,
  clients,
  profiles,
}: TaskDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    assignee_id: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    due_date: '',
    due_time: '',
    meeting_link: '',
    card_color: '#ffffff',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        client_id: task.client_id || '',
        assignee_id: task.assignee_id || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        due_time: task.due_time || '',
        meeting_link: task.meeting_link || '',
        card_color: task.card_color || '#ffffff',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        client_id: '',
        assignee_id: '',
        status: 'todo',
        priority: 'medium',
        due_date: '',
        due_time: '',
        meeting_link: '',
        card_color: '#ffffff',
      });
    }
  }, [task, open]);

  const checkAvailability = async () => {
    if (!formData.assignee_id || !formData.due_date || !formData.due_time) {
      return true; // Sem restrições se não há assignee ou data/hora
    }

    const scheduledDateTime = `${formData.due_date}T${formData.due_time}`;

    // Verifica se já existe uma tarefa agendada para esse horário com a mesma pessoa
    const { data: existingTasks, error } = await supabase
      .from('tasks')
      .select('id, title, scheduled_date, scheduled_time')
      .eq('assignee_id', formData.assignee_id)
      .not('id', 'eq', task?.id || '') // Exclui a task atual se estiver editando
      .not('scheduled_date', 'is', null)
      .not('scheduled_time', 'is', null);

    if (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      return true; // Em caso de erro, permite o agendamento
    }

    // Verifica conflitos de horário (mesma data e hora)
    const hasConflict = existingTasks?.some((t) => {
      const existingDateTime = `${t.scheduled_date}T${t.scheduled_time}`;
      return existingDateTime === scheduledDateTime;
    });

    return !hasConflict;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verifica disponibilidade antes de salvar
      const isAvailable = await checkAvailability();

      if (!isAvailable) {
        const assigneeName = profiles.find((p) => p.id === formData.assignee_id)?.full_name || 'Esta pessoa';
        toast({
          variant: 'destructive',
          title: 'Horário indisponível',
          description: `${assigneeName} já possui uma tarefa agendada para este horário.`,
        });
        setIsLoading(false);
        return;
      }
      const dataToSave = {
        title: formData.title,
        description: formData.description || null,
        client_id: formData.client_id || null,
        assignee_id: formData.assignee_id || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null,
        meeting_link: formData.meeting_link || null,
        card_color: formData.card_color || '#ffffff',
        scheduled_date: formData.due_date || null,
        scheduled_time: formData.due_time || null,
        created_by: task ? undefined : user?.id,
      };

      if (task) {
        const { error } = await supabase
          .from('tasks')
          .update(dataToSave)
          .eq('id', task.id);

        if (error) throw error;

        toast({
          title: 'Tarefa atualizada!',
          description: 'As informações foram salvas com sucesso.',
        });
      } else {
        const { error } = await supabase.from('tasks').insert([dataToSave]);

        if (error) throw error;

        // Create calendar event if task has a due date
        if (formData.due_date) {
          const clientName = clients.find((c) => c.id === formData.client_id)?.name || '';
          const assigneeName = profiles.find((p) => p.id === formData.assignee_id)?.full_name || '';

          const eventDescription = [
            formData.description,
            clientName ? `Cliente: ${clientName}` : '',
            assigneeName ? `Responsável: ${assigneeName}` : '',
            `Prioridade: ${TASK_PRIORITY_LABELS[formData.priority]}`,
            formData.meeting_link ? `Link: ${formData.meeting_link}` : '',
          ].filter(Boolean).join('\n');

          const startTime = formData.due_time || '09:00:00';
          const endTime = formData.due_time
            ? `${formData.due_time.split(':')[0].padStart(2, '0')}:${(parseInt(formData.due_time.split(':')[1]) + 30).toString().padStart(2, '0')}:00`
            : '18:00:00';

          await supabase.from('calendar_events').insert([{
            title: `📋 ${formData.title}`,
            description: eventDescription,
            client_id: formData.client_id,
            created_by: user?.id,
            start_date: `${formData.due_date}T${startTime}`,
            end_date: `${formData.due_date}T${endTime}`,
            all_day: false,
            attendees: formData.assignee_id ? [formData.assignee_id] : null,
          }]);
        }

        toast({
          title: 'Tarefa criada!',
          description: formData.due_date
            ? 'A tarefa foi adicionada com sucesso e um evento foi criado no calendário.'
            : 'A tarefa foi adicionada com sucesso.',
        });
      }

      // Refetch data before closing to ensure UI updates
      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar tarefa',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);

      if (error) throw error;

      toast({
        title: 'Tarefa excluída!',
        description: 'A tarefa foi removida com sucesso.',
      });

      setShowDeleteAlert(false);

      // Refetch data before closing to ensure UI updates
      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir tarefa',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            <DialogDescription>
              {task ? 'Edite as informações da tarefa' : 'Preencha os dados para criar uma nova tarefa'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Ex: Criar post para Instagram"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre a tarefa..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: TaskStatus) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: TaskPriority) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
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
                <Label htmlFor="assignee">Responsável</Label>
                <Select
                  value={formData.assignee_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignee_id: value })
                  }
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Entrega</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_time">Horário (opcional)</Label>
                <Input
                  id="due_time"
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_link">Link da Reunião (opcional)</Label>
              <Input
                id="meeting_link"
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_color">Cor do Card</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Branco', value: '#ffffff' },
                  { name: 'Azul Claro', value: '#dbeafe' },
                  { name: 'Verde Claro', value: '#dcfce7' },
                  { name: 'Amarelo Claro', value: '#fef9c3' },
                  { name: 'Vermelho Claro', value: '#fee2e2' },
                  { name: 'Roxo Claro', value: '#f3e8ff' },
                  { name: 'Rosa Claro', value: '#fce7f3' },
                  { name: 'Laranja Claro', value: '#ffedd5' },
                ].map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, card_color: color.value })}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      formData.card_color === color.value
                        ? 'border-[#2db4af] ring-2 ring-[#2db4af] ring-offset-2'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {task && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteAlert(true)}
                  className="sm:mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#2db4af] hover:bg-[#28a39e]"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {task ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente a tarefa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
