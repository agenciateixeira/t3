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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import { CalendarIcon, Loader2, Clock } from 'lucide-react';
import { format, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Conversation {
  id: string;
  type: 'group' | 'direct';
}

interface CreateReminderModalProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onReminderCreated?: (reminder: any) => void;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function CreateReminderModal({
  open,
  onClose,
  conversation,
  onReminderCreated,
}: CreateReminderModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    reminder_date: new Date(),
    reminder_time: '09:00',
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

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim() || !user) return;

    setIsLoading(true);

    try {
      // Combinar data e hora
      const [hours, minutes] = formData.reminder_time.split(':');
      const reminderDateTime = set(formData.reminder_date, {
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        seconds: 0,
      });

      // Criar notificações para cada usuário selecionado
      const usersToNotify = selectedUsers.length > 0 ? selectedUsers : [user.id];

      const notifications = usersToNotify.map((userId) => ({
        user_id: userId,
        type: 'reminder',
        title: formData.title || 'Lembrete',
        message: formData.message,
        reference_type: 'chat_message',
        created_at: reminderDateTime.toISOString(),
        metadata: {
          group_id: conversation.type === 'group' ? conversation.id : null,
          sender_id: user.id,
        },
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Criar evento no calendário para o lembrete
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .insert({
          title: `🔔 ${formData.title || 'Lembrete'}`,
          description: formData.message,
          start_date: reminderDateTime.toISOString(),
          end_date: set(reminderDateTime, { minutes: parseInt(reminderDateTime.getMinutes()) + 15 }).toISOString(),
          created_by: user.id,
          event_type: 'reminder',
          all_day: false,
        });

      if (calendarError) console.error('Erro ao criar evento no calendário:', calendarError);

      // Buscar nomes dos usuários mencionados
      const mentionedNames = profiles
        .filter((p) => usersToNotify.includes(p.id))
        .map((p) => `@${p.full_name}`)
        .join(', ');

      // Enviar mensagem no chat informando sobre o lembrete
      const reminderMessage = `🔔 Lembrete criado
${formData.title ? `**${formData.title}**` : ''}
${formData.message}

Para: ${mentionedNames}
Data: ${format(reminderDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;

      const { error: messageError } = await supabase.from('messages').insert({
        group_id: conversation.type === 'group' ? conversation.id : null,
        recipient_id: conversation.type === 'direct' ? conversation.id : null,
        sender_id: user.id,
        content: reminderMessage,
        mentioned_users: usersToNotify,
      });

      if (messageError) throw messageError;

      // Callback com o lembrete criado
      if (onReminderCreated) {
        onReminderCreated({ notifications, message: reminderMessage });
      }

      // Resetar formulário e fechar
      setFormData({
        title: '',
        message: '',
        reminder_date: new Date(),
        reminder_time: '09:00',
      });
      setSelectedUsers([]);
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar lembrete:', error);
      alert('Erro ao criar lembrete: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔔 Criar Lembrete</DialogTitle>
          <DialogDescription>
            Crie um lembrete e notifique pessoas no horário escolhido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Título (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Reunião com cliente"
            />
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Mensagem <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Digite a mensagem do lembrete..."
              rows={3}
              required
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.reminder_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.reminder_date ? (
                      format(formData.reminder_date, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.reminder_date}
                    onSelect={(date) => date && setFormData({ ...formData, reminder_date: date })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder_time">Horário</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="reminder_time"
                  type="time"
                  value={formData.reminder_time}
                  onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Para quem (multi-select) */}
          <div className="space-y-2">
            <Label>Notificar (deixe vazio para notificar só você)</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {profiles.map((profile) => (
                <label
                  key={profile.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(profile.id)}
                    onChange={() => toggleUser(profile.id)}
                    className="h-4 w-4 text-[#2db4af] rounded border-gray-300 focus:ring-[#2db4af]"
                  />
                  <span className="text-sm text-gray-900">{profile.full_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.message.trim()}
              className="bg-[#2db4af] hover:bg-[#28a39e]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar lembrete'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
