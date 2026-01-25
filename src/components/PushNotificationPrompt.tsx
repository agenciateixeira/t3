import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, BellOff, X } from 'lucide-react';

export default function PushNotificationPrompt() {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar se já foi dismissed antes (localStorage)
  useEffect(() => {
    const dismissed = localStorage.getItem('push-notification-prompt-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    const success = await subscribe();
    setIsLoading(false);
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    await unsubscribe();
    setIsLoading(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('push-notification-prompt-dismissed', 'true');
  };

  // Não mostrar se:
  // - Navegador não suporta
  // - Já foi dismissed
  // - Já está subscrito
  // - Permissão foi negada
  if (
    !isSupported ||
    isDismissed ||
    isSubscribed ||
    permission === 'denied'
  ) {
    return null;
  }

  // Se a permissão ainda não foi solicitada, mostrar o prompt
  if (permission === 'default') {
    return (
      <Card className="fixed bottom-20 lg:bottom-4 right-4 z-50 max-w-sm shadow-lg border-[#2db4af]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-[#2db4af]/10">
              <Bell className="h-5 w-5 text-[#2db4af]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                Ativar Notificações Push?
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Receba notificações em tempo real mesmo quando não estiver com a
                página aberta.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
                >
                  {isLoading ? 'Ativando...' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  disabled={isLoading}
                >
                  Agora não
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
