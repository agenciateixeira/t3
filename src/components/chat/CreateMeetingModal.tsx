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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Clock, Video } from 'lucide-react';
import { format, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  type: 'group' | 'direct';
}

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onMeetingCreated?: (meeting: any) => void;
}

interface Profile {
  id: string;
  full_name: string;
}

export default function CreateMeetingModal({
  open,
  onClose,
  conversation,
  onMeetingCreated,
}: CreateMeetingModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meet_link: '',
    meeting_date: new Date(),
    meeting_time: '09:00',
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

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const generateMeetLink = () => {
    // Gera um link fictício do Google Meet
    const randomId = Math.random().toString(36).substring(2, 15);
    const meetLink = `https://meet.google.com/${randomId}`;
    setFormData({ ...formData, meet_link: meetLink });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    setIsLoading(true);

    try {
      // Combinar data e hora
      const [hours, minutes] = formData.meeting_time.split(':');
      const meetingDateTime = set(formData.meeting_date, {
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        seconds: 0,
      });

      // Criar evento/reunião (salvamos como um evento no calendário)
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description || null,
          start_date: meetingDateTime.toISOString(),
          end_date: set(meetingDateTime, { hours: parseInt(hours) + 1 }).toISOString(), // 1h de duração
          created_by: user.id,
          event_type: 'meeting',
          location: formData.meet_link || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Adicionar participantes (se houver tabela de participantes)
      // Se não houver, podemos criar notificações para os participantes

      const participantsToNotify = selectedParticipants.length > 0 ? selectedParticipants : [user.id];

      // Criar notificações para participantes
      const notifications = participantsToNotify.map((userId) => ({
        user_id: userId,
        type: 'event',
        title: 'Nova reunião agendada',
        message: `Reunião: ${formData.title} - ${format(meetingDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        reference_id: event.id,
        reference_type: 'event',
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Buscar nomes dos participantes
      const participantNames = profiles
        .filter((p) => participantsToNotify.includes(p.id))
        .map((p) => `@${p.full_name}`)
        .join(', ');

      // Enviar mensagem no chat informando sobre a reunião
      const meetingMessage = `📅 Reunião agendada
**${formData.title}**
${formData.description ? `\n${formData.description}\n` : ''}
Data: ${format(meetingDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
${formData.meet_link ? `\n🎥 Link: ${formData.meet_link}` : ''}

Participantes: ${participantNames}`;

      const { error: messageError } = await supabase.from('messages').insert({
        group_id: conversation.type === 'group' ? conversation.id : null,
        recipient_id: conversation.type === 'direct' ? conversation.id : null,
        sender_id: user.id,
        content: meetingMessage,
        mentioned_users: participantsToNotify,
      });

      if (messageError) throw messageError;

      // Callback com a reunião criada
      if (onMeetingCreated) {
        onMeetingCreated({ event, participants: participantsToNotify });
      }

      // Resetar formulário e fechar
      setFormData({
        title: '',
        description: '',
        meet_link: '',
        meeting_date: new Date(),
        meeting_time: '09:00',
      });
      setSelectedParticipants([]);
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar reunião:', error);
      alert('Erro ao criar reunião: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📅 Agendar Reunião</DialogTitle>
          <DialogDescription>
            Agende uma reunião e notifique os participantes
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
              placeholder="Ex: Reunião de planejamento"
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
              placeholder="Pauta da reunião..."
              rows={3}
            />
          </div>

          {/* Link do Google Meet */}
          <div className="space-y-2">
            <Label htmlFor="meet_link">Link do Google Meet</Label>
            <div className="flex gap-2">
              <Input
                id="meet_link"
                value={formData.meet_link}
                onChange={(e) => setFormData({ ...formData, meet_link: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateMeetLink}
                className="flex-shrink-0"
              >
                <Video className="h-4 w-4 mr-2" />
                Gerar
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Ou cole um link existente do Google Meet/Zoom
            </p>
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
                      !formData.meeting_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.meeting_date ? (
                      format(formData.meeting_date, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.meeting_date}
                    onSelect={(date) => date && setFormData({ ...formData, meeting_date: date })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_time">Horário</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="meeting_time"
                  type="time"
                  value={formData.meeting_time}
                  onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Participantes (multi-select) */}
          <div className="space-y-2">
            <Label>Participantes (deixe vazio para notificar só você)</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {profiles.map((profile) => (
                <label
                  key={profile.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(profile.id)}
                    onChange={() => toggleParticipant(profile.id)}
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
              disabled={isLoading || !formData.title.trim()}
              className="bg-[#2db4af] hover:bg-[#28a39e]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                'Agendar reunião'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
