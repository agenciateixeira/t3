// Chat component with full privacy and RLS (updated 2026-01-22)
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import AudioPlayer from '@/components/chat/AudioPlayer';
import ThreadView from '@/components/chat/ThreadView';
import MentionAutocomplete from '@/components/chat/MentionAutocomplete';
import SlashCommandMenu from '@/components/chat/SlashCommandMenu';
import CreateTaskModal from '@/components/chat/CreateTaskModal';
import CreateDealModal from '@/components/chat/CreateDealModal';
import CreateReminderModal from '@/components/chat/CreateReminderModal';
import CreateMeetingModal from '@/components/chat/CreateMeetingModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Send,
  Paperclip,
  Users,
  User,
  Plus,
  Search,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  Video,
  X,
  Play,
  Pause,
  StopCircle,
  MoreVertical,
  Trash2,
  Archive,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import { parseMentions, detectMentions } from '@/lib/chatUtils';
import { useToastContext } from '@/contexts/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { USER_HIERARCHY_LABELS, UserHierarchy } from '@/types';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  hierarchy?: UserHierarchy;
}

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  group_id: string | null;
  recipient_id: string | null;
  created_at: string;
  sender?: Profile;
  reads?: { user_id: string; read_at: string }[];
  mentioned_users?: string[];
  thread_reply_count?: number;
}

interface Conversation {
  id: string;
  type: 'group' | 'direct';
  name: string;
  avatar_url: string | null;
  last_message?: Message;
  unread_count: number;
  other_user?: Profile;
  created_by?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToastContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Get query params for opening specific conversation
  const [searchParams, setSearchParams] = useState<URLSearchParams>(new URLSearchParams(window.location.search));

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Thread view
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);

  // Mention autocomplete
  const [cursorPosition, setCursorPosition] = useState(0);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Slash command modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  // New group dialog
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [showMobilePlusMenu, setShowMobilePlusMenu] = useState(false);
  const [showMobileOptionsMenu, setShowMobileOptionsMenu] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    members: [] as string[],
  });

  // Delete dialogs
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  // Group members dialog
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);

  // Typing and recording indicators
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [recordingUsers, setRecordingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any | null>(null);

  // Handle opening conversation from URL params
  useEffect(() => {
    if (conversations.length > 0) {
      const conversationId = searchParams.get('conversation');
      const userId = searchParams.get('user');

      if (conversationId) {
        // Find and open group conversation
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
          // Clear query param after opening
          window.history.replaceState({}, '', '/chat');
        }
      } else if (userId) {
        // Find and open DM conversation
        const conv = conversations.find(c => c.type === 'direct' && c.id === userId);
        if (conv) {
          setSelectedConversation(conv);
          // Clear query param after opening
          window.history.replaceState({}, '', '/chat');
        }
      }
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    fetchConversations();
    fetchProfiles();

    // Real-time subscription para mensagens
    // Escutar TODAS as mensagens e filtrar no callback
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Nova mensagem recebida (realtime):', payload);
          const newMessage = payload.new as any;

          // Verificar se a mensagem é relevante para o usuário atual
          const isRelevant =
            newMessage.recipient_id === user?.id || // DM recebida
            newMessage.sender_id === user?.id || // Mensagem enviada por mim
            newMessage.group_id; // Mensagem em grupo

          if (isRelevant) {
            // Atualizar lista de conversas
            fetchConversations();

            // Se a mensagem é da conversa atualmente selecionada
            if (selectedConversationRef.current) {
              const currentConv = selectedConversationRef.current;
              const isCurrentConversation =
                (currentConv.type === 'direct' &&
                  (newMessage.sender_id === currentConv.id || newMessage.recipient_id === currentConv.id)) ||
                (currentConv.type === 'group' && newMessage.group_id === currentConv.id);

              // Apenas atualizar se for mensagem de OUTRA pessoa
              // (minhas mensagens já foram adicionadas no handleSendMessage)
              if (isCurrentConversation && newMessage.sender_id !== user?.id) {
                fetchMessages(currentConv);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription de mensagens:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter((conversation) =>
          conversation.name.toLowerCase().includes(query) ||
          conversation.last_message?.content?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, conversations]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    setOptimisticMessages([]); // Clear optimistic messages when changing conversation

    if (selectedConversation) {
      fetchMessages(selectedConversation);

      // Setup presence channel for typing/recording indicators
      // IMPORTANTE: Todos devem usar o MESMO nome de channel
      const channelName = selectedConversation.type === 'group'
        ? `group:${selectedConversation.id}`
        : `dm:${[user?.id, selectedConversation.id].sort().join('-')}`;

      console.log('Creating presence channel:', channelName);
      const presenceChannel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: '' }, // Remover key específica para compartilhar estado
        },
      });

      // Store reference for use in sendTypingIndicator and sendRecordingIndicator
      presenceChannelRef.current = presenceChannel;

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const typing = new Set<string>();
          const recording = new Set<string>();

          console.log('=== PRESENCE DEBUG ===');
          console.log('My user ID:', user?.id);
          console.log('Full presence state:', JSON.stringify(state, null, 2));
          console.log('State keys:', Object.keys(state));

          Object.entries(state).forEach(([key, presences]: [string, any]) => {
            console.log(`Key: ${key}, Presences:`, presences);
            presences.forEach((presence: any) => {
              console.log('  Individual presence:', presence);
              console.log('  - user_id:', presence.user_id);
              console.log('  - typing:', presence.typing);
              console.log('  - Is me?', presence.user_id === user?.id);

              if (presence.user_id !== user?.id) {
                if (presence.typing) {
                  console.log('  → ADDING TO TYPING USERS:', presence.user_id);
                  typing.add(presence.user_id);
                }
                if (presence.recording) recording.add(presence.user_id);
              }
            });
          });

          console.log('Final typing users:', Array.from(typing));
          console.log('Final recording users:', Array.from(recording));
          console.log('======================');

          setTypingUsers(typing);
          setRecordingUsers(recording);
        })
        .subscribe((status) => {
          console.log('Presence channel status:', status);
        });

      return () => {
        presenceChannelRef.current = null;
        supabase.removeChannel(presenceChannel);
      };
    }
  }, [selectedConversation, user?.id]);

  // Scroll automático inteligente
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    // Detectar se o usuário está perto do final (dentro de 100px)
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 100;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Scroll automático apenas se:
    // 1. Usuário está perto do final (shouldAutoScrollRef.current)
    // 2. OU está enviando mensagem (optimisticMessages)
    if (shouldAutoScrollRef.current || optimisticMessages.length > 0) {
      scrollToBottom();
    }
  }, [messages, optimisticMessages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const scrollToBottom = () => {
    // Usar scrollTo com behavior instant para ser mais fluido
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, hierarchy')
        .neq('id', user?.id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar perfis:', error.message);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            hierarchy
          )
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      const members = data?.map((member: any) => member.profiles).filter(Boolean) || [];
      setGroupMembers(members);
    } catch (error: any) {
      console.error('Erro ao carregar membros do grupo:', error.message);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros do grupo.',
        variant: 'destructive',
      });
    }
  };

  const addMembersToGroup = async (groupId: string, memberIds: string[]) => {
    try {
      const membersToAdd = memberIds.map((userId) => ({
        group_id: groupId,
        user_id: userId,
      }));

      const { error } = await supabase.from('group_members').insert(membersToAdd);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${memberIds.length} membro(s) adicionado(s) ao grupo.`,
      });

      // Recarrega os membros
      await fetchGroupMembers(groupId);
      setIsAddMembersOpen(false);
      setSelectedNewMembers([]);
    } catch (error: any) {
      console.error('Erro ao adicionar membros:', error.message);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar os membros ao grupo.',
        variant: 'destructive',
      });
    }
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Membro removido do grupo.',
      });

      // Recarrega os membros
      await fetchGroupMembers(groupId);

      // Se o usuário removido é o próprio usuário logado, fecha o grupo e atualiza conversas
      if (userId === user?.id) {
        setSelectedConversation(null);
        setIsGroupMembersOpen(false);
        await fetchConversations();
      }
    } catch (error: any) {
      console.error('Erro ao remover membro:', error.message);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro do grupo.',
        variant: 'destructive',
      });
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setIsLoadingConversations(true);

      // Fetch groups - Apenas grupos onde o usuário é membro
      const { data: groupMembers, error: groupMembersError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (groupMembersError) {
        console.error('Erro ao carregar membros de grupos:', groupMembersError);
      }

      // Pega os IDs dos grupos
      const groupIds = groupMembers ? groupMembers.map(gm => gm.group_id) : [];

      // Busca os grupos completos (incluindo created_by para saber quem é o criador)
      let groups: any[] = [];
      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from('chat_groups')
          .select('id, name, avatar_url, description, created_by, created_at')
          .in('id', groupIds)
          .order('created_at', { ascending: false });

        if (groupsError) {
          console.error('Erro ao carregar grupos:', groupsError);
        } else {
          groups = groupsData || [];
        }
      }

      // Fetch direct messages
      const { data: directMessages, error: dmError } = await supabase
        .from('messages')
        .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)`)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .is('group_id', null)
        .order('created_at', { ascending: false });

      if (dmError) throw dmError;

      // Process groups
      const groupConversations: Conversation[] = await Promise.all(
        (groups || []).map(async (group) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: group.id,
            type: 'group' as const,
            name: group.name,
            avatar_url: group.avatar_url,
            last_message: lastMsg || undefined,
            unread_count: 0,
            created_by: group.created_by,
          };
        })
      );

      // Process direct messages
      const dmMap = new Map<string, Message[]>();
      (directMessages || []).forEach((msg) => {
        const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!otherId) return;
        if (!dmMap.has(otherId)) dmMap.set(otherId, []);
        dmMap.get(otherId)!.push(msg);
      });

      const dmConversations: Conversation[] = await Promise.all(
        Array.from(dmMap.entries()).map(async ([otherId, msgs]) => {
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherId)
            .single();

          return {
            id: otherId,
            type: 'direct' as const,
            name: otherUser?.full_name || 'Usuário',
            avatar_url: otherUser?.avatar_url,
            last_message: msgs[0],
            unread_count: 0,
            other_user: otherUser || undefined,
          };
        })
      );

      setConversations([...groupConversations, ...dmConversations]);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar conversas',
        description: error.message,
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchMessages = async (conversation: Conversation) => {
    if (!user) return;

    try {
      setIsLoadingMessages(true);

      let query = supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
        .is('is_thread_reply', false);  // Apenas mensagens principais, não respostas de thread

      if (conversation.type === 'group') {
        query = query.eq('group_id', conversation.id);
      } else {
        query = query
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${conversation.id}),and(sender_id.eq.${conversation.id},recipient_id.eq.${user.id})`
          )
          .is('group_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Skip marking as read to avoid permission errors
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar mensagens',
        description: error.message,
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const uploadFile = async (file: File, type: 'image' | 'video' | 'audio') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message,
      });
      return null;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user || !selectedConversation) return;

    const optimisticId = `temp-${Date.now()}`;
    const messageContent = newMessage.trim();

    // Detectar menções
    const mentionedUsers = await detectMentions(messageContent);

    // Create optimistic message
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: user.id,
      content: messageContent,
      media_url: null,
      media_type: null,
      group_id: selectedConversation.type === 'group' ? selectedConversation.id : null,
      recipient_id: selectedConversation.type === 'direct' ? selectedConversation.id : null,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Você',
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      mentioned_users: mentionedUsers,
    };

    // Add to optimistic messages immediately
    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setIsSending(true);

    // Stop typing indicator
    sendTypingIndicator(false);

    try {
      const messageData: any = {
        sender_id: user.id,
        content: messageContent,
        mentioned_users: mentionedUsers,
      };

      if (selectedConversation.type === 'group') {
        messageData.group_id = selectedConversation.id;
      } else {
        messageData.recipient_id = selectedConversation.id;
      }

      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
        .single();

      if (error) throw error;

      // Substituir optimistic message pela mensagem real SEM piscar
      if (insertedMessage) {
        setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
        setMessages((prev) => {
          // Verificar se já existe (evitar duplicação)
          const exists = prev.some(m => m.id === insertedMessage.id);
          if (exists) return prev;
          return [...prev, insertedMessage];
        });
      }

      // Atualizar conversas
      fetchConversations();
    } catch (error: any) {
      // Remove failed optimistic message
      setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));

      toast({
        variant: 'destructive',
        title: 'Erro ao enviar mensagem',
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File, mediaType: 'image' | 'video' | 'audio') => {
    if (!user || !selectedConversation) return;

    const optimisticId = `temp-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);

    // Create optimistic message
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: user.id,
      content: null,
      media_url: localUrl,
      media_type: mediaType,
      group_id: selectedConversation.type === 'group' ? selectedConversation.id : null,
      recipient_id: selectedConversation.type === 'direct' ? selectedConversation.id : null,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Você',
        avatar_url: user.user_metadata?.avatar_url || null,
      },
    };

    // Add to optimistic messages immediately
    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const mediaUrl = await uploadFile(file, mediaType);
      if (!mediaUrl) {
        // Remove failed optimistic message
        setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
        return;
      }

      const messageData: any = {
        sender_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        content: null,
      };

      if (selectedConversation.type === 'group') {
        messageData.group_id = selectedConversation.id;
      } else {
        messageData.recipient_id = selectedConversation.id;
      }

      const { error } = await supabase.from('messages').insert(messageData);
      if (error) throw error;

      // Remove from optimistic messages after successful send
      setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      URL.revokeObjectURL(localUrl);

      // Immediately fetch messages to ensure they appear without waiting for realtime
      if (selectedConversation) {
        await fetchMessages(selectedConversation);
        fetchConversations(); // Update conversation list with latest message
      }

      toast({
        title: 'Mídia enviada!',
        description: 'O arquivo foi enviado com sucesso.',
      });
    } catch (error: any) {
      // Remove failed optimistic message
      setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      URL.revokeObjectURL(localUrl);

      toast({
        variant: 'destructive',
        title: 'Erro ao enviar mídia',
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        await handleFileUpload(audioFile, 'audio');
        stream.getTracks().forEach((track) => track.stop());
        sendRecordingIndicator(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      sendRecordingIndicator(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gravar áudio',
        description: 'Não foi possível acessar o microfone.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      sendRecordingIndicator(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: groupForm.name,
          description: groupForm.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const members = [user.id, ...groupForm.members];
      const { error: membersError } = await supabase.from('group_members').insert(
        members.map((userId) => ({
          group_id: group.id,
          user_id: userId,
          role: userId === user.id ? 'admin' : 'member',
        }))
      );

      if (membersError) throw membersError;

      toast({
        title: 'Grupo criado!',
        description: 'O grupo foi criado com sucesso.',
      });

      setGroupForm({ name: '', description: '', members: [] });
      setIsNewGroupOpen(false);
      fetchConversations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar grupo',
        description: error.message,
      });
    }
  };

  const handleMemberToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setGroupForm({ ...groupForm, members: [...groupForm.members, userId] });
    } else {
      setGroupForm({
        ...groupForm,
        members: groupForm.members.filter((id) => id !== userId),
      });
    }
  };

  const handleStartDirectConversation = (profile: Profile) => {
    // Limpa mensagens antigas antes de abrir nova conversa
    setMessages([]);
    setOptimisticMessages([]);

    // Verifica se já existe conversa com esse usuário
    const existingConversation = conversations.find(
      (conv) => conv.type === 'direct' && conv.id === profile.id
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
    } else {
      // Cria uma conversa "virtual" até que a primeira mensagem seja enviada
      const newConversation: Conversation = {
        id: profile.id,
        type: 'direct',
        name: profile.full_name,
        avatar_url: profile.avatar_url,
        unread_count: 0,
        other_user: profile,
      };
      setSelectedConversation(newConversation);
    }

    setIsNewConversationOpen(false);
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      // If message has media, delete from storage first
      if (messageToDelete.media_url && messageToDelete.media_type) {
        const filePath = messageToDelete.media_url.split('/').slice(-2).join('/');
        await supabase.storage.from('chat-media').remove([filePath]);
      }

      // Delete message from database
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageToDelete.id);

      if (error) throw error;

      toast({
        title: 'Mensagem excluída',
        description: 'A mensagem foi removida com sucesso.',
      });

      setMessageToDelete(null);
      if (selectedConversation) {
        fetchMessages(selectedConversation);
      }
      fetchConversations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir mensagem',
        description: error.message,
      });
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete || !user) return;

    try {
      // Usa função RPC do lado do servidor para evitar problemas de permissão
      const { data, error } = await supabase.rpc('delete_conversation', {
        p_conversation_id: conversationToDelete.id,
        p_conversation_type: conversationToDelete.type,
        p_user_id: user.id
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.message);
      }

      toast({
        title: conversationToDelete.type === 'group' ? 'Grupo removido' : 'Conversa limpa',
        description: data?.message || 'Operação realizada com sucesso.',
      });

      setConversationToDelete(null);
      setSelectedConversation(null);
      fetchConversations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir conversa',
        description: error.message || 'Ocorreu um erro desconhecido',
      });
    }
  };

  const sendTypingIndicator = async (isTyping: boolean) => {
    if (!selectedConversation || !user || !presenceChannelRef.current) return;

    try {
      console.log('Sending typing indicator:', isTyping);
      await presenceChannelRef.current.track({
        user_id: user.id,
        typing: isTyping,
        recording: false,
      });
      console.log('Typing indicator sent successfully');
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  };

  const sendRecordingIndicator = async (isRecording: boolean) => {
    if (!selectedConversation || !user || !presenceChannelRef.current) return;

    try {
      await presenceChannelRef.current.track({
        user_id: user.id,
        typing: false,
        recording: isRecording,
      });
    } catch (error) {
      console.error('Error sending recording indicator:', error);
    }
  };

  const handleTyping = () => {
    sendTypingIndicator(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMentionSelect = (
    user: Profile,
    mentionStart: number,
    mentionEnd: number
  ) => {
    const before = newMessage.substring(0, mentionStart);
    const after = newMessage.substring(mentionEnd);
    const newText = `${before}@${user.full_name} ${after}`;
    setNewMessage(newText);

    // Reposiciona o cursor após a menção
    setTimeout(() => {
      if (messageInputRef.current) {
        const newPosition = mentionStart + user.full_name.length + 2;
        messageInputRef.current.setSelectionRange(newPosition, newPosition);
        setCursorPosition(newPosition);
      }
    }, 0);
  };

  const handleSlashCommand = (commandId: string) => {
    // Limpar o input do comando
    setNewMessage('');

    // Abrir modal correspondente
    switch (commandId) {
      case 'task':
        setIsTaskModalOpen(true);
        break;
      case 'deal':
        setIsDealModalOpen(true);
        break;
      case 'reminder':
        setIsReminderModalOpen(true);
        break;
      case 'meeting':
        setIsMeetingModalOpen(true);
        break;
      case 'timer':
        // TODO: Implementar modal de timer
        toast({
          variant: 'default',
          title: 'Em breve',
          description: 'Funcionalidade de timer em desenvolvimento',
        });
        break;
      default:
        break;
    }
  };

  return (
    <Layout>
      <div
        className="h-[calc(100dvh-64px)] flex bg-white lg:fixed lg:inset-0 lg:left-64 lg:h-screen lg:top-16"
        style={{ overflow: 'hidden' }}
      >
        {/* Conversations List */}
        <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 lg:flex-shrink-0 border-r border-gray-300 flex-col bg-white`} style={{ overflow: 'hidden' }}>
          {/* Header fixo */}
          <div className="px-4 py-3 bg-[#f0f2f5] flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">Conversas</h2>

              {/* Mobile: Botão simples que abre menu nativo */}
              <div className="lg:hidden relative">
                <button
                  type="button"
                  onClick={() => setShowMobilePlusMenu(!showMobilePlusMenu)}
                  className="h-10 w-10 rounded-full hover:bg-white/80 text-gray-700 flex-shrink-0 inline-flex items-center justify-center"
                >
                  <Plus className="h-5 w-5" />
                </button>
                {showMobilePlusMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={() => setShowMobilePlusMenu(false)}
                    />
                    <div className="fixed right-4 top-20 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[101]">
                      <button
                        onClick={() => {
                          setIsNewConversationOpen(true);
                          setShowMobilePlusMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                      >
                        <User className="h-4 w-4" />
                        Nova conversa
                      </button>
                      <button
                        onClick={() => {
                          setIsNewGroupOpen(true);
                          setShowMobilePlusMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                      >
                        <Users className="h-4 w-4" />
                        Novo grupo
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Desktop: Dropdown do Radix UI */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild className="hidden lg:inline-flex">
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full hover:bg-white/80 text-gray-700 flex-shrink-0 inline-flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end">
                  <DropdownMenuItem onClick={() => setIsNewConversationOpen(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Nova conversa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNewGroupOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Novo grupo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dialog Criar Grupo */}
              <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
                <DialogTrigger asChild>
                  <div className="hidden"></div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Grupo</DialogTitle>
                    <DialogDescription>
                      Crie um grupo e adicione membros para começar a conversar
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleCreateGroup} className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Nome do Grupo *</Label>
                      <Input
                        id="group-name"
                        value={groupForm.name}
                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        placeholder="Ex: Time de Marketing"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="group-description">Descrição</Label>
                      <Input
                        id="group-description"
                        value={groupForm.description}
                        onChange={(e) =>
                          setGroupForm({ ...groupForm, description: e.target.value })
                        }
                        placeholder="Descrição do grupo"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Membros *</Label>
                      <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
                        {profiles.map((profile) => (
                          <div key={profile.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={profile.id}
                              checked={groupForm.members.includes(profile.id)}
                              onCheckedChange={(checked) =>
                                handleMemberToggle(profile.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={profile.id}
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                                  {getInitials(profile.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{profile.full_name}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsNewGroupOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                        disabled={groupForm.members.length === 0}
                      >
                        Criar Grupo
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Pesquisar ou começar uma nova conversa"
                className="pl-12 bg-white border-0 rounded-lg h-10 text-sm focus-visible:ring-1 focus-visible:ring-[#2db4af]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {isLoadingConversations ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] border-b border-gray-100 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-[#f0f2f5]' : 'bg-white'
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={conversation.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#dfe5e7] text-gray-600 font-medium">
                        {conversation.type === 'group' ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(conversation.name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <h3 className="font-medium text-gray-900 truncate text-[15px]">
                          {conversation.name}
                        </h3>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {format(parseISO(conversation.last_message.created_at), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.last_message.content ||
                            (conversation.last_message.media_type === 'image'
                              ? '📷 Foto'
                              : conversation.last_message.media_type === 'video'
                              ? '🎥 Vídeo'
                              : conversation.last_message.media_type === 'audio'
                              ? '🎤 Áudio'
                              : 'Mídia')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        {selectedConversation ? (
          <>
          <div className={`${!selectedConversation ? 'hidden lg:flex' : 'flex'} ${selectedThread ? 'hidden lg:flex' : 'flex'} flex-1 flex-col lg:h-[calc(100vh-64px)]`} style={{ overflow: 'hidden', minWidth: 0 }}>
            {/* Chat Header - Fixed */}
            <div className="bg-[#f0f2f5] border-b border-gray-300 flex-shrink-0">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Back button - Mobile only */}
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden text-gray-600 hover:bg-white/50 flex-shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-md"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#2db4af] text-white">
                        {selectedConversation.type === 'group' ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(selectedConversation.name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      {selectedConversation.type === 'group' ? (
                        <button
                          onClick={() => {
                            fetchGroupMembers(selectedConversation.id);
                            setIsGroupMembersOpen(true);
                          }}
                          className="text-left hover:underline"
                        >
                          <h3 className="font-medium text-gray-900">{selectedConversation.name}</h3>
                        </button>
                      ) : (
                        <h3 className="font-medium text-gray-900">{selectedConversation.name}</h3>
                      )}
                      <p className="text-xs text-gray-500">
                        {selectedConversation.type === 'group' ? 'Grupo' : 'Mensagem direta'}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="text-gray-600 hover:bg-white/50 flex-shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-md relative"
                        style={{
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          cursor: 'pointer',
                          zIndex: 1000
                        }}
                      >
                        <MoreVertical className="h-5 w-5 pointer-events-none" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[10000]">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setConversationToDelete(selectedConversation)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Typing/Recording Indicators */}
              {(typingUsers.size > 0 || recordingUsers.size > 0) && (
                <div className="px-4 pb-3 text-xs text-gray-600 italic">
                  {recordingUsers.size > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Gravando áudio...</span>
                    </div>
                  ) : typingUsers.size > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span>Digitando...</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Messages - Scrollable */}
            <div
              ref={messagesContainerRef}
              className="flex-1 p-4 space-y-2"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#efeae2',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
                </div>
              ) : (
                <>
                  {[...messages, ...optimisticMessages].map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
                        style={{ minWidth: 0 }}
                      >
                        <div className="relative max-w-[65%]" style={{ wordBreak: 'break-word' }}>
                          <div
                            className={`rounded-lg shadow-sm relative ${
                              isOwn
                                ? 'bg-[#d9fdd3] text-gray-900'
                                : 'bg-white text-gray-900'
                            }`}
                            style={{
                              borderRadius: isOwn ? '7.5px 7.5px 0 7.5px' : '7.5px 7.5px 7.5px 0'
                            }}
                          >
                            {!isOwn && selectedConversation.type === 'group' && (
                              <div className="px-3 pt-2">
                                <p className="text-xs font-semibold text-[#2db4af]">
                                  {message.sender?.full_name}
                                </p>
                              </div>
                            )}

                            {isOwn && (
                              <div className="absolute -right-10 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-black/5">
                                      <MoreVertical className="h-4 w-4 text-gray-600" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() => setMessageToDelete(message)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir mensagem
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}

                            {message.media_type === 'image' && message.media_url && (
                              <div className="p-1">
                                <img
                                  src={message.media_url}
                                  alt="Imagem"
                                  className="rounded-md max-w-full max-h-80 object-cover"
                                />
                              </div>
                            )}

                            {message.media_type === 'video' && message.media_url && (
                              <div className="p-1">
                                <video
                                  src={message.media_url}
                                  controls
                                  className="rounded-md max-w-full max-h-80"
                                />
                              </div>
                            )}

                            {message.media_type === 'audio' && message.media_url && (
                              <div className="p-3">
                                <AudioPlayer src={message.media_url} isOwn={isOwn} />
                              </div>
                            )}

                            {message.content && (
                              <div className="px-3 py-1.5 pb-0">
                                <p className="text-sm whitespace-pre-wrap leading-5">
                                  {parseMentions(
                                    message.content,
                                    message.mentioned_users || [],
                                    profiles
                                  ).map((part, idx) => {
                                    if (part.type === 'mention') {
                                      return (
                                        <span
                                          key={idx}
                                          className="bg-[#2db4af]/20 text-[#2db4af] px-1 rounded font-semibold cursor-pointer hover:bg-[#2db4af]/30"
                                          title={part.content}
                                        >
                                          {part.content}
                                        </span>
                                      );
                                    }
                                    return <span key={idx}>{part.content}</span>;
                                  })}
                                </p>
                              </div>
                            )}

                            {/* Thread Reply Counter & Button */}
                            {!message.id.startsWith('temp-') && message.thread_reply_count !== undefined && message.thread_reply_count > 0 && (
                              <div className="px-3 py-1">
                                <button
                                  onClick={() => setSelectedThread(message)}
                                  className="text-xs text-[#2db4af] hover:underline flex items-center gap-1"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  {message.thread_reply_count} {message.thread_reply_count === 1 ? 'resposta' : 'respostas'}
                                </button>
                              </div>
                            )}

                            <div className="px-3 pb-1.5 pt-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                {!message.id.startsWith('temp-') && (
                                  <button
                                    onClick={() => setSelectedThread(message)}
                                    className="text-gray-500 hover:text-[#2db4af] transition-colors"
                                    title="Responder em thread"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-gray-500">
                                  {format(parseISO(message.created_at), 'HH:mm')}
                                </span>
                                {isOwn && <CheckCheck className="h-4 w-4 text-[#53bdeb]" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="p-4 bg-[#f0f2f5] flex-shrink-0">
              {isRecording ? (
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-700">
                      Gravando... {formatTime(recordingTime)}
                    </span>
                  </div>
                  <Button
                    onClick={stopRecording}
                    size="icon"
                    className="bg-red-500 hover:bg-red-600 h-10 w-10 rounded-full"
                  >
                    <StopCircle className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'image');
                    }}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'video');
                    }}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-gray-600 hover:bg-transparent h-10 w-10 flex-shrink-0"
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Foto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                        <Video className="h-4 w-4 mr-2" />
                        Vídeo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex-1 bg-white rounded-lg px-4 py-2.5 flex items-center gap-2 relative">
                    <MentionAutocomplete
                      inputValue={newMessage}
                      cursorPosition={cursorPosition}
                      onSelectUser={handleMentionSelect}
                      inputRef={messageInputRef}
                    />
                    <SlashCommandMenu
                      inputValue={newMessage}
                      cursorPosition={cursorPosition}
                      onSelectCommand={handleSlashCommand}
                      inputRef={messageInputRef}
                    />
                    <Input
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        setCursorPosition(e.target.selectionStart || 0);
                        handleTyping();
                      }}
                      onKeyUp={(e) => {
                        setCursorPosition((e.target as HTMLInputElement).selectionStart || 0);
                      }}
                      onClick={(e) => {
                        setCursorPosition((e.target as HTMLInputElement).selectionStart || 0);
                      }}
                      placeholder="Digite uma mensagem"
                      className="flex-1 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                      disabled={isSending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={startRecording}
                      className="text-gray-600 hover:bg-transparent h-8 w-8"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    size="icon"
                    disabled={isSending || !newMessage.trim()}
                    className="bg-[#25d366] hover:bg-[#20bd5a] h-10 w-10 rounded-full"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Thread View - Desktop: Side Panel, Mobile: Full Screen */}
          {selectedThread && (
            <div className={`${selectedThread ? 'flex' : 'hidden lg:flex'} w-full lg:w-96 border-l border-gray-300 flex-shrink-0`}>
              <ThreadView
                parentMessage={selectedThread}
                onClose={() => setSelectedThread(null)}
                allUsers={profiles}
              />
            </div>
          )}
          </>
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] border-b-4 border-[#25d366]">
            <div className="text-center text-gray-600 max-w-md px-8">
              <div className="mb-6 relative">
                <div className="w-80 h-80 mx-auto rounded-full bg-white/40 flex items-center justify-center">
                  {/* Ícone de Polvo SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 64 64"
                    className="h-32 w-32 text-[#2db4af] opacity-40"
                    fill="currentColor"
                  >
                    <g>
                      {/* Cabeça do polvo */}
                      <ellipse cx="32" cy="20" rx="18" ry="16" />

                      {/* Olhos */}
                      <circle cx="26" cy="18" r="3" fill="white" />
                      <circle cx="38" cy="18" r="3" fill="white" />
                      <circle cx="27" cy="18" r="1.5" fill="#333" />
                      <circle cx="39" cy="18" r="1.5" fill="#333" />

                      {/* Tentáculos */}
                      <path d="M 20 32 Q 15 40, 12 48 Q 10 52, 8 56" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 24 33 Q 20 42, 18 50 Q 17 54, 16 58" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 28 34 Q 26 44, 26 52 Q 26 56, 26 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 32 34 Q 32 44, 32 52 Q 32 56, 32 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 36 34 Q 38 44, 38 52 Q 38 56, 38 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 40 33 Q 44 42, 46 50 Q 47 54, 48 58" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 44 32 Q 49 40, 52 48 Q 54 52, 56 56" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                      <path d="M 28 30 Q 22 36, 18 42 Q 16 45, 14 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                      {/* Ventosas nos tentáculos */}
                      <circle cx="10" cy="50" r="1.5" opacity="0.6" />
                      <circle cx="20" cy="52" r="1.5" opacity="0.6" />
                      <circle cx="28" cy="54" r="1.5" opacity="0.6" />
                      <circle cx="36" cy="54" r="1.5" opacity="0.6" />
                      <circle cx="44" cy="52" r="1.5" opacity="0.6" />
                      <circle cx="54" cy="50" r="1.5" opacity="0.6" />
                    </g>
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-light mb-3 text-gray-800">
                T3ntaculos Chat
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Envie e receba mensagens sem precisar manter seu celular conectado.
              </p>
              <p className="text-xs text-gray-500">
                Selecione uma conversa na barra lateral para começar a conversar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alert Dialog for Delete Message */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será excluída permanentemente
              {messageToDelete?.media_url && ' e o arquivo de mídia será removido'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog for Delete Conversation */}
      <AlertDialog
        open={!!conversationToDelete}
        onOpenChange={() => setConversationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Toda a conversa com{' '}
              <span className="font-semibold">{conversationToDelete?.name}</span> e todas as
              mensagens serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir conversa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Membros do Grupo */}
      <Dialog open={isGroupMembersOpen} onOpenChange={setIsGroupMembersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Membros do Grupo</DialogTitle>
            <DialogDescription>
              {groupMembers.length} {groupMembers.length === 1 ? 'membro' : 'membros'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="max-h-96 overflow-y-auto space-y-1">
              {groupMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#2db4af] text-white font-medium">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {member.full_name}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      {member.hierarchy && USER_HIERARCHY_LABELS[member.hierarchy]}
                    </p>
                  </div>
                  {/* Botão remover - só aparece se você for o criador do grupo */}
                  {selectedConversation?.created_by === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (selectedConversation) {
                          removeMemberFromGroup(selectedConversation.id, member.id);
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {groupMembers.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Nenhum membro encontrado</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={() => setIsAddMembersOpen(true)}
                className="w-full bg-[#2db4af] hover:bg-[#259a94] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Membros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Membros */}
      <Dialog open={isAddMembersOpen} onOpenChange={setIsAddMembersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Membros</DialogTitle>
            <DialogDescription>
              Selecione os usuários que deseja adicionar ao grupo
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="max-h-96 overflow-y-auto space-y-1">
              {profiles
                .filter(
                  (profile) =>
                    !groupMembers.find((member) => member.id === profile.id) &&
                    profile.id !== user?.id
                )
                .map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (selectedNewMembers.includes(profile.id)) {
                        setSelectedNewMembers(selectedNewMembers.filter((id) => id !== profile.id));
                      } else {
                        setSelectedNewMembers([...selectedNewMembers, profile.id]);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedNewMembers.includes(profile.id)}
                      onCheckedChange={() => {
                        if (selectedNewMembers.includes(profile.id)) {
                          setSelectedNewMembers(selectedNewMembers.filter((id) => id !== profile.id));
                        } else {
                          setSelectedNewMembers([...selectedNewMembers, profile.id]);
                        }
                      }}
                    />
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#dfe5e7] text-gray-600 font-medium">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {profile.full_name}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {profile.hierarchy && USER_HIERARCHY_LABELS[profile.hierarchy]}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {profiles.filter(
              (p) =>
                !groupMembers.find((member) => member.id === p.id) && p.id !== user?.id
            ).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Todos os usuários já estão no grupo</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddMembersOpen(false);
                  setSelectedNewMembers([]);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedConversation && selectedNewMembers.length > 0) {
                    addMembersToGroup(selectedConversation.id, selectedNewMembers);
                  }
                }}
                disabled={selectedNewMembers.length === 0}
                className="flex-1 bg-[#2db4af] hover:bg-[#259a94] text-white disabled:opacity-50"
              >
                Adicionar ({selectedNewMembers.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Conversa */}
      <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Selecione uma pessoa para iniciar uma conversa
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="max-h-96 overflow-y-auto space-y-1">
              {profiles
                .filter((profile) => profile.id !== user?.id)
                .map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => handleStartDirectConversation(profile)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#dfe5e7] text-gray-600 font-medium">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {profile.full_name}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {profile.hierarchy && USER_HIERARCHY_LABELS[profile.hierarchy]}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {profiles.filter((p) => p.id !== user?.id).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Nenhum usuário disponível</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Slash Command Modals */}
      {selectedConversation && (
        <>
          <CreateTaskModal
            open={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            conversation={{ id: selectedConversation.id, type: selectedConversation.type }}
            onTaskCreated={() => {
              toast({
                variant: 'default',
                title: 'Tarefa criada!',
                description: 'A tarefa foi criada e compartilhada no chat.',
              });
            }}
          />

          <CreateDealModal
            open={isDealModalOpen}
            onClose={() => setIsDealModalOpen(false)}
            conversation={{ id: selectedConversation.id, type: selectedConversation.type }}
            onDealCreated={() => {
              toast({
                variant: 'default',
                title: 'Deal criado!',
                description: 'O deal foi criado e compartilhado no chat.',
              });
            }}
          />

          <CreateReminderModal
            open={isReminderModalOpen}
            onClose={() => setIsReminderModalOpen(false)}
            conversation={{ id: selectedConversation.id, type: selectedConversation.type }}
            onReminderCreated={() => {
              toast({
                variant: 'default',
                title: 'Lembrete criado!',
                description: 'O lembrete foi criado e as notificações foram agendadas.',
              });
            }}
          />

          <CreateMeetingModal
            open={isMeetingModalOpen}
            onClose={() => setIsMeetingModalOpen(false)}
            conversation={{ id: selectedConversation.id, type: selectedConversation.type }}
            onMeetingCreated={() => {
              toast({
                variant: 'default',
                title: 'Reunião agendada!',
                description: 'A reunião foi agendada e os participantes foram notificados.',
              });
            }}
          />
        </>
      )}
    </Layout>
  );
}
