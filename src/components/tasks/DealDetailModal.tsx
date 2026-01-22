import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Deal,
  DealActivity,
  DealChecklist,
  DealChecklistItem,
  DealAttachment,
  Client,
  Profile,
  Team,
  PipelineStage,
  TaskPriority,
  UserHierarchy,
  TASK_PRIORITY_LABELS,
  USER_HIERARCHY_LABELS,
} from '@/types';
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast';
import {
  X,
  MoreVertical,
  User,
  Calendar,
  Flag,
  Tag,
  DollarSign,
  Link2,
  CheckSquare,
  Paperclip,
  Plus,
  Clock,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import MentionTextarea from '@/components/ui/MentionTextarea';
import MentionText from '@/components/ui/MentionText';
import TimeTracker from '@/components/ui/TimeTracker';

interface DealDetailModalProps {
  open: boolean;
  onClose: () => void;
  dealId: string | null;
  onUpdate?: () => void;
  clients: Client[];
  profiles: Profile[];
  stages: PipelineStage[];
}

export default function DealDetailModal({
  open,
  onClose,
  dealId,
  onUpdate,
  clients,
  profiles,
  stages,
}: DealDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [checklists, setChecklists] = useState<DealChecklist[]>([]);
  const [attachments, setAttachments] = useState<DealAttachment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [value, setValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [nextResponsibleSector, setNextResponsibleSector] = useState<UserHierarchy | ''>('');
  const [nextResponsibleUser, setNextResponsibleUser] = useState('');

  // Checklist state
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistItemText, setNewChecklistItemText] = useState<{ [key: string]: string }>({});

  // Activity/Comment state
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // File upload state
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (open && dealId) {
      fetchDealDetails();
    } else {
      resetState();
    }
  }, [open, dealId]);

  const resetState = () => {
    setDeal(null);
    setActivities([]);
    setChecklists([]);
    setAttachments([]);
    setTeams([]);
    setTitle('');
    setDescription('');
    setStageId('');
    setPriority('medium');
    setAssigneeId('');
    setClientId('');
    setValue('');
    setExpectedCloseDate('');
    setTags([]);
    setNextResponsibleSector('');
  };

  const organizeActivitiesTree = (activities: DealActivity[]): DealActivity[] => {
    // Separar atividades principais (sem reply_to) das respostas
    const mainActivities = activities.filter(a => !a.reply_to);
    const replies = activities.filter(a => a.reply_to);

    // Criar mapa de respostas por parent_id
    const repliesMap = new Map<string, DealActivity[]>();
    replies.forEach(reply => {
      const parentId = reply.reply_to!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(reply);
    });

    // Adicionar respostas às atividades principais
    const activitiesWithReplies = mainActivities.map(activity => ({
      ...activity,
      replies: repliesMap.get(activity.id) || [],
    }));

    // Ordenar respostas por data (mais antigas primeiro)
    activitiesWithReplies.forEach(activity => {
      if (activity.replies) {
        activity.replies.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
    });

    return activitiesWithReplies;
  };

  const fetchDealDetails = async () => {
    if (!dealId) return;

    setIsLoading(true);
    try {
      // Fetch deal
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients(*),
          assignee:profiles!deals_assignee_id_fkey(id, full_name, avatar_url),
          stage:pipeline_stages(*)
        `)
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;

      setDeal(dealData);
      setTitle(dealData.title);
      setDescription(dealData.description || '');
      setStageId(dealData.stage_id);
      setPriority(dealData.priority);
      setAssigneeId(dealData.assignee_id || '');
      setClientId(dealData.client_id || '');
      setValue(dealData.value?.toString() || '');
      setExpectedCloseDate(dealData.expected_close_date || '');
      setTags(dealData.tags || []);
      setNextResponsibleSector(dealData.next_responsible_sector || '');
      setNextResponsibleUser(dealData.next_responsible_user || '');

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('deal_activities')
        .select('*, user:profiles(*)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Organizar atividades em árvore (parent/replies)
      const organizedActivities = organizeActivitiesTree(activitiesData || []);
      setActivities(organizedActivities);

      // Fetch checklists with items
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('deal_checklists')
        .select(`
          *,
          items:deal_checklist_items(*, assignee:profiles(*))
        `)
        .eq('deal_id', dealId)
        .order('position', { ascending: true });

      if (checklistsError) throw checklistsError;
      setChecklists(checklistsData || []);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('deal_attachments')
        .select('*, uploader:profiles(*)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

      // Fetch teams for mentions
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (teamsError) console.error('Error fetching teams:', teamsError);
      setTeams(teamsData || []);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar oportunidade',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (field: string, value: any) => {
    if (!dealId) return;

    setIsSaving(true);
    try {
      const updates: any = { [field]: value };

      const { error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId);

      if (error) throw error;

      // Log activity
      await supabase.from('deal_activities').insert([{
        deal_id: dealId,
        user_id: user?.id,
        activity_type: 'field_update',
        title: `Atualizou ${field}`,
        metadata: { field, value },
      }]);

      if (onUpdate) onUpdate();
      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!dealId || !newChecklistTitle.trim()) return;

    try {
      const { error } = await supabase.from('deal_checklists').insert([{
        deal_id: dealId,
        title: newChecklistTitle,
        position: checklists.length,
      }]);

      if (error) throw error;

      setNewChecklistTitle('');
      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar checklist',
        description: error.message,
      });
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const text = newChecklistItemText[checklistId]?.trim();
    if (!text) return;

    try {
      const checklist = checklists.find(c => c.id === checklistId);
      const itemCount = checklist?.items?.length || 0;

      const { error } = await supabase.from('deal_checklist_items').insert([{
        checklist_id: checklistId,
        text,
        position: itemCount,
      }]);

      if (error) throw error;

      setNewChecklistItemText({ ...newChecklistItemText, [checklistId]: '' });
      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar item',
        description: error.message,
      });
    }
  };

  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('deal_checklist_items')
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (error) throw error;
      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar item',
        description: error.message,
      });
    }
  };

  const handleAddComment = async (replyToId?: string | null) => {
    const commentText = replyToId ? replyText : newComment;
    if (!dealId || !commentText.trim()) return;

    try {
      const { error } = await supabase.from('deal_activities').insert([{
        deal_id: dealId,
        user_id: user?.id,
        activity_type: 'note',
        title: replyToId ? 'Respondeu' : 'Adicionou um comentário',
        description: commentText,
        reply_to: replyToId || null,
      }]);

      if (error) throw error;

      if (replyToId) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }

      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar comentário',
        description: error.message,
      });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      toast({
        title: 'Comentário excluído',
        description: 'O comentário foi removido com sucesso.',
      });

      await fetchDealDetails();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir comentário',
        description: error.message,
      });
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      const { error } = await supabase
        .from('deal_checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;

      toast({
        title: 'Checklist excluída',
        description: 'A checklist foi removida com sucesso.',
      });

      await fetchDealDetails();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir checklist',
        description: error.message,
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!dealId || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setIsUploading(true);

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${dealId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('deal-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deal-attachments')
        .getPublicUrl(fileName);

      // Insert attachment record
      const { error: insertError } = await supabase.from('deal_attachments').insert([{
        deal_id: dealId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user?.id,
      }]);

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('deal_activities').insert([{
        deal_id: dealId,
        user_id: user?.id,
        activity_type: 'attachment',
        title: 'Adicionou um anexo',
        description: file.name,
      }]);

      toast({
        title: 'Arquivo enviado!',
        description: `${file.name} foi adicionado com sucesso.`,
      });

      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar arquivo',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Helper para extrair o path do storage a partir da URL pública
  const getStoragePathFromUrl = (url: string): string => {
    // URL format: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/PATH
    const parts = url.split('/deal-attachments/');
    return parts[1] || '';
  };

  const handleDownloadAttachment = async (attachment: DealAttachment) => {
    try {
      const storagePath = getStoragePathFromUrl(attachment.file_url);

      const { data, error } = await supabase.storage
        .from('deal-attachments')
        .download(storagePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar arquivo',
        description: error.message,
      });
    }
  };

  const handleDeleteAttachment = async (attachment: DealAttachment) => {
    if (!confirm(`Deseja realmente excluir ${attachment.file_name}?`)) return;

    try {
      const storagePath = getStoragePathFromUrl(attachment.file_url);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('deal-attachments')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('deal_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      // Log activity
      await supabase.from('deal_activities').insert([{
        deal_id: dealId,
        user_id: user?.id,
        activity_type: 'attachment_deleted',
        title: 'Removeu um anexo',
        description: attachment.file_name,
      }]);

      toast({
        title: 'Arquivo excluído',
        description: `${attachment.file_name} foi removido.`,
      });

      await fetchDealDetails();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir arquivo',
        description: error.message,
      });
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;

    const updatedTags = [...tags, newTag.trim()];
    setTags(updatedTags);
    handleSave('tags', updatedTags);
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    handleSave('tags', updatedTags);
  };

  const handleDeleteDeal = async () => {
    if (!dealId || !deal) return;

    if (!confirm(`Deseja realmente excluir a oportunidade "${deal.title}"? Esta ação não pode ser desfeita.`)) {
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
        description: `"${deal.title}" foi removida com sucesso.`,
      });

      onClose();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!deal) return null;

  const currentStage = stages.find(s => s.id === stageId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] p-0 gap-0 overflow-hidden">
        {/* HEADER FIXO */}
        <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-4">
              <DialogTitle className="text-2xl font-semibold flex-1">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleSave('title', title)}
                  className="text-2xl font-semibold border-none p-0 h-auto focus-visible:ring-0"
                  placeholder="Nome da oportunidade"
                />
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Dropdown */}
              <Select value={stageId} onValueChange={(val) => { setStageId(val); handleSave('stage_id', val); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={handleDeleteDeal}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Oportunidade
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* CORPO - Layout em 2 colunas */}
        <div className="flex flex-1 overflow-hidden">
          {/* COLUNA PRINCIPAL (scrollável) */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Descrição */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleSave('description', description)}
                placeholder="Adicione uma descrição..."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* CAMPOS PRINCIPAIS - Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Responsável */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Responsável
                </Label>
                <Select value={assigneeId} onValueChange={(val) => { setAssigneeId(val); handleSave('assignee_id', val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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

              {/* Cliente */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </Label>
                <Select value={clientId} onValueChange={(val) => { setClientId(val); handleSave('client_id', val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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

              {/* Valor */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor
                </Label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={() => handleSave('value', parseFloat(value) || null)}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Data prevista */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Fechamento
                </Label>
                <Input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  onBlur={() => handleSave('expected_close_date', expectedCloseDate)}
                />
              </div>

              {/* Prioridade */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Prioridade
                </Label>
                <Select value={priority} onValueChange={(val: TaskPriority) => { setPriority(val); handleSave('priority', val); }}>
                  <SelectTrigger>
                    <SelectValue />
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

              {/* Setor Responsável */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Setor Responsável pela Próxima Tarefa
                </Label>
                <Select
                  value={nextResponsibleSector || 'none'}
                  onValueChange={(val: string) => {
                    const newValue = val === 'none' ? '' : (val as UserHierarchy);
                    setNextResponsibleSector(newValue);
                    handleSave('next_responsible_sector', newValue || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(USER_HIERARCHY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional Responsável */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profissional Responsável pela Próxima Tarefa
                </Label>
                <Select
                  value={nextResponsibleUser || 'none'}
                  onValueChange={(val: string) => {
                    const newValue = val === 'none' ? '' : val;
                    setNextResponsibleUser(newValue);
                    handleSave('next_responsible_user', newValue || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Adicionar tag..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddTag}>+</Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* CHECKLISTS */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Checklists
                </Label>
              </div>

              {checklists.map((checklist) => (
                <Card key={checklist.id} className="mb-4 group">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{checklist.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteChecklist(checklist.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {checklist.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={item.is_completed}
                            onCheckedChange={() => handleToggleChecklistItem(item.id, item.is_completed)}
                          />
                          <span className={item.is_completed ? 'line-through text-gray-500' : ''}>
                            <MentionText text={item.text} />
                          </span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <div className="flex-1">
                          <MentionTextarea
                            value={newChecklistItemText[checklist.id] || ''}
                            onChange={(value) => setNewChecklistItemText({ ...newChecklistItemText, [checklist.id]: value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddChecklistItem(checklist.id);
                              }
                            }}
                            placeholder="Adicionar item... (use @ para mencionar)"
                            className="min-h-[40px]"
                            users={profiles}
                            sectors={Object.entries(USER_HIERARCHY_LABELS).map(([value, label]) => ({
                              value,
                              label,
                            }))}
                            teams={teams}
                          />
                        </div>
                        <Button size="sm" onClick={() => handleAddChecklistItem(checklist.id)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2">
                <Input
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddChecklist()}
                  placeholder="Nova checklist..."
                />
                <Button onClick={handleAddChecklist}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            <Separator />

            {/* ANEXOS */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Anexos ({attachments.length})
                </Label>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Arquivo
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {attachments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Paperclip className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhum anexo adicionado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {attachments.map((attachment) => (
                    <Card key={attachment.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{attachment.file_name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {attachment.uploader?.full_name} • {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadAttachment(attachment)}
                            title="Baixar arquivo"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAttachment(attachment)}
                            title="Excluir arquivo"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR DIREITA - Activity Panel */}
          <div className="w-96 border-l bg-gray-50 overflow-y-auto p-4 space-y-4">
            {/* Time Tracker */}
            <TimeTracker dealId={dealId || undefined} />

            <Separator />

            {/* Activities Section */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Atividades
              </h3>

              {/* Adicionar comentário */}
              <div className="mb-4">
                <MentionTextarea
                  value={newComment}
                  onChange={setNewComment}
                  placeholder="Adicionar um comentário... Use @ para mencionar pessoas, setores ou times"
                  rows={3}
                  className="mb-2"
                  users={profiles}
                  sectors={Object.entries(USER_HIERARCHY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  teams={teams}
                />
                <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comentar
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Lista de atividades */}
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="space-y-3">
                    {/* Atividade principal */}
                    <div className="flex gap-3 group">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={activity.user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#2db4af] text-white text-xs">
                          {getInitials(activity.user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm flex-1">
                            <span className="font-medium">{activity.user?.full_name}</span>
                            <span className="text-gray-600 ml-1">{activity.title}</span>
                          </div>
                          {activity.user_id === user?.id && activity.activity_type === 'note' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => handleDeleteActivity(activity.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                        {activity.description && (
                          <div className="text-sm text-gray-700 mt-1 bg-white p-2 rounded border">
                            <MentionText text={activity.description} />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-xs text-gray-500">
                            {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                          {activity.activity_type === 'note' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs text-[#2db4af] hover:text-[#28a39e] hover:bg-transparent"
                              onClick={() => setReplyingTo(activity.id)}
                            >
                              Responder
                            </Button>
                          )}
                        </div>

                        {/* Campo de resposta */}
                        {replyingTo === activity.id && (
                          <div className="mt-3 pl-0 space-y-2">
                            <MentionTextarea
                              value={replyText}
                              onChange={setReplyText}
                              placeholder="Escrever resposta..."
                              rows={2}
                              className="text-sm"
                              users={profiles}
                              sectors={Object.entries(USER_HIERARCHY_LABELS).map(([value, label]) => ({
                                value,
                                label,
                              }))}
                              teams={teams}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(activity.id)}
                                disabled={!replyText.trim()}
                              >
                                Responder
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Respostas */}
                        {activity.replies && activity.replies.length > 0 && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                            {activity.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2 group/reply">
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={reply.user?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-gray-400 text-white text-xs">
                                    {getInitials(reply.user?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="text-xs flex-1">
                                      <span className="font-medium">{reply.user?.full_name}</span>
                                      <span className="text-gray-600 ml-1">respondeu</span>
                                    </div>
                                    {reply.user_id === user?.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 opacity-0 group-hover/reply:opacity-100 transition-opacity flex-shrink-0"
                                        onClick={() => handleDeleteActivity(reply.id)}
                                      >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                  {reply.description && (
                                    <div className="text-sm text-gray-700 mt-1 bg-white p-2 rounded border">
                                      <MentionText text={reply.description} />
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {format(new Date(reply.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
