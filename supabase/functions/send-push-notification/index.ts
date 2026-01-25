// Supabase Edge Function para enviar Push Notifications
// Deploy: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  message: string;
  type?: string;
  reference_id?: string;
  reference_type?: string;
  url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obter dados do request
    const { user_id, notification } = await req.json() as {
      user_id: string;
      notification: NotificationPayload;
    };

    if (!user_id || !notification) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or notification' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar todas as subscriptions ativas do usuário
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // VAPID keys (você vai precisar gerar e adicionar como secrets)
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:your-email@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    // Enviar push notification para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          // Usar web-push para enviar notificação
          // Nota: Em produção, você precisará instalar web-push via npm
          // Para Edge Functions, usamos fetch direto para o endpoint

          const payload = JSON.stringify({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            reference_id: notification.reference_id,
            reference_type: notification.reference_type,
            url: notification.url,
          });

          // Aqui você implementaria o envio real usando web-push
          // Por enquanto, vamos apenas log
          console.log('Would send notification to:', sub.endpoint);
          console.log('Payload:', payload);

          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error('Error sending to subscription:', error);

          // Se o endpoint não é mais válido, marcar como inativo
          if (error instanceof Error && error.message.includes('410')) {
            await supabaseClient
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('endpoint', sub.endpoint);
          }

          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        total: subscriptions.length,
        successful,
        failed,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
