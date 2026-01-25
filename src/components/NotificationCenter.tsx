import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Notification, NOTIFICATION_TYPE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  CheckSquare,
  Calendar,
  Briefcase,
  UserPlus,
  AlertCircle,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Chamar a Edge Function para enviar push notification
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                notification_id: newNotification.id,
                user_id: newNotification.user_id,
                notification: {
                  title: newNotification.title,
                  message: newNotification.message,
                  type: newNotification.type,
                  reference_id: newNotification.reference_id,
                  reference_type: newNotification.reference_type,
                },
              },
            });
          } catch (error) {
            // Erro ao enviar push não deve bloquear a notificação in-app
            console.error('Erro ao enviar push notification:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
          setUnreadCount(
            (prev) => prev - (updatedNotification.is_read ? 1 : 0)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error: any) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Abrir modal com detalhes
    setSelectedNotification(notification);
    setIsDialogOpen(true);
    setIsOpen(false);
  };

  const handleGoToReference = () => {
    if (!selectedNotification) return;

    // Navegar para a referência se houver
    if (selectedNotification.reference_id && selectedNotification.reference_type) {
      switch (selectedNotification.reference_type) {
        case 'task':
          navigate(`/tasks?open=${selectedNotification.reference_id}`);
          break;
        case 'deal':
          navigate(`/tasks?deal=${selectedNotification.reference_id}`);
          break;
        case 'event':
          navigate('/calendar');
          break;
      }
    }

    setIsDialogOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'event':
        return <Calendar className="h-4 w-4" />;
      case 'deal':
        return <Briefcase className="h-4 w-4" />;
      case 'assignment':
        return <UserPlus className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 bg-blue-50';
      case 'event':
        return 'text-purple-600 bg-purple-50';
      case 'deal':
        return 'text-green-600 bg-green-50';
      case 'assignment':
        return 'text-[#2db4af] bg-[#2db4af]/10';
      case 'reminder':
        return 'text-amber-600 bg-amber-50';
      case 'system':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100 group transition-all duration-200"
        >
          <Bell className={`h-5 w-5 transition-all duration-300 ${
            unreadCount > 0
              ? 'text-[#2db4af] animate-pulse'
              : 'text-gray-600 group-hover:text-gray-900'
          }`} />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-xs flex items-center justify-center font-semibold shadow-lg shadow-red-500/50 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75"></span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl border-2">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#2db4af]/5 to-[#2db4af]/10">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#2db4af]" />
            <h3 className="font-bold text-base text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-[#2db4af] hover:text-white hover:bg-[#2db4af] transition-all duration-200 font-medium"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Todas lidas
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af] mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-all duration-200 group relative ${
                    !notification.is_read
                      ? 'bg-gradient-to-r from-blue-50/50 to-[#2db4af]/5 hover:from-blue-50 hover:to-[#2db4af]/10 border-l-4 border-[#2db4af]'
                      : 'hover:bg-gray-50/80'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`p-2.5 rounded-xl h-fit shadow-sm ${getNotificationColor(
                        notification.type
                      )} transition-transform duration-200 group-hover:scale-110`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-semibold leading-tight ${
                            !notification.is_read
                              ? 'text-gray-900'
                              : 'text-gray-600'
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#2db4af] to-blue-500 flex-shrink-0 mt-1 animate-pulse shadow-sm shadow-[#2db4af]/50"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500 font-medium">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

      {/* Modal de Detalhes da Notificação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  <div className={`p-2 rounded-full ${getNotificationColor(selectedNotification.type)}`}>
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification && (
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(selectedNotification.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className={`px-2 py-1 rounded-full ${getNotificationColor(selectedNotification.type)}`}>
                  {NOTIFICATION_TYPE_LABELS[selectedNotification.type as keyof typeof NOTIFICATION_TYPE_LABELS] || selectedNotification.type}
                </div>
                {selectedNotification.reference_type && (
                  <div className="px-2 py-1 bg-gray-100 rounded-full">
                    {selectedNotification.reference_type === 'task' && 'Tarefa'}
                    {selectedNotification.reference_type === 'deal' && 'Negócio'}
                    {selectedNotification.reference_type === 'event' && 'Evento'}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              Fechar
            </Button>
            {selectedNotification?.reference_id && selectedNotification?.reference_type && (
              <Button
                onClick={handleGoToReference}
                className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
