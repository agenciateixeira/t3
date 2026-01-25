import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, CheckCheck, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseMentions, detectMentions } from '@/lib/chatUtils';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  sender?: Profile;
  mentioned_users?: string[];
  thread_reply_count?: number;
}

interface ThreadViewProps {
  parentMessage: Message;
  onClose: () => void;
  allUsers: Profile[];
}

export default function ThreadView({ parentMessage, onClose, allUsers }: ThreadViewProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReplies();

    // Real-time subscription for new replies
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${parentMessage.id}`,
        },
        () => {
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage.id]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
        .eq('thread_id', parentMessage.id)
        .eq('is_thread_reply', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar respostas:', error.message);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;

    setIsSending(true);

    try {
      // Detectar menções
      const mentionedUsers = await detectMentions(newReply);

      const messageData = {
        sender_id: user.id,
        content: newReply.trim(),
        thread_id: parentMessage.id,
        is_thread_reply: true,
        group_id: parentMessage.group_id,
        recipient_id: parentMessage.recipient_id,
        mentioned_users: mentionedUsers,
      };

      const { error } = await supabase.from('messages').insert(messageData);
      if (error) throw error;

      setNewReply('');
      await fetchReplies();
    } catch (error: any) {
      console.error('Erro ao enviar resposta:', error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageToDelete.id);

      if (error) throw error;

      setMessageToDelete(null);
      await fetchReplies();
    } catch (error: any) {
      console.error('Erro ao excluir mensagem:', error.message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-[#f0f2f5] border-b border-gray-300 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Thread</h3>
          <p className="text-xs text-gray-500">
            {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={parentMessage.sender?.avatar_url || undefined} />
            <AvatarFallback className="bg-[#2db4af] text-white text-sm">
              {getInitials(parentMessage.sender?.full_name || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900">
                {parentMessage.sender?.full_name}
              </p>
              <span className="text-xs text-gray-500">
                {format(parseISO(parentMessage.created_at), 'HH:mm', { locale: ptBR })}
              </span>
            </div>
            {parentMessage.content && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {parseMentions(
                  parentMessage.content,
                  parentMessage.mentioned_users || [],
                  allUsers
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
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {replies.map((reply) => {
          const isOwn = reply.sender_id === user?.id;
          return (
            <div key={reply.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={reply.sender?.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                  {getInitials(reply.sender?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {reply.sender?.full_name}
                  </p>
                  <span className="text-xs text-gray-500">
                    {format(parseISO(reply.created_at), 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block max-w-full">
                  {reply.content && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {parseMentions(
                        reply.content,
                        reply.mentioned_users || [],
                        allUsers
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
                  )}
                </div>
              </div>
              {isOwn && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                        <MoreVertical className="h-4 w-4 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setMessageToDelete(reply)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="px-4 py-3 bg-[#f0f2f5] border-t border-gray-300">
        <form onSubmit={handleSendReply} className="flex items-center gap-2">
          <Input
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Responder na thread..."
            className="flex-1 bg-white"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSending || !newReply.trim()}
            className="bg-[#2db4af] hover:bg-[#28a39e] h-10 w-10 rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* Delete Alert */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A resposta será excluída permanentemente.
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
    </div>
  );
}
