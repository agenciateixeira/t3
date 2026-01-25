// Service Worker para Web Push Notifications
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'Nova Notificação',
    body: 'Você tem uma nova notificação',
    icon: '/logo-sidebar.png',
    badge: '/logo-sidebar.png',
    tag: 'notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: data.tag || data.type || 'notification',
        requireInteraction: data.requireInteraction || false,
        data: {
          url: data.url || '/',
          reference_id: data.reference_id,
          reference_type: data.reference_type,
          notification_id: data.notification_id
        }
      };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Abrir'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    }
  );

  event.waitUntil(promiseChain);
});

// Quando o usuário clica na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Determinar URL baseado no tipo de notificação
  let url = '/dashboard';

  if (event.notification.data) {
    const { reference_type, reference_id } = event.notification.data;

    if (reference_type === 'task' && reference_id) {
      url = `/tasks?open=${reference_id}`;
    } else if (reference_type === 'deal' && reference_id) {
      url = `/tasks?deal=${reference_id}`;
    } else if (reference_type === 'event') {
      url = '/calendar';
    } else if (event.notification.data.url) {
      url = event.notification.data.url;
    }
  }

  // Abrir ou focar na janela
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Procurar por uma janela já aberta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(client => {
              // Navegar para a URL correta
              if ('navigate' in client) {
                return client.navigate(url);
              }
            });
          }
        }
        // Se não encontrou janela aberta, abrir nova
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Instalar e ativar o service worker
self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});
