import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { differenceInHours, parseISO, isToday, isTomorrow } from 'date-fns';

export function useTaskReminders() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkTaskReminders = async () => {
      try {
        // Buscar tarefas atribuídas ao usuário que estão próximas do vencimento
        const { data: tasks, error } = await supabase
          .from('tasks')
          .select('id, title, due_date, due_time')
          .eq('assignee_id', user.id)
          .in('status', ['todo', 'in_progress'])
          .not('due_date', 'is', null);

        if (error) throw error;

        if (!tasks || tasks.length === 0) return;

        for (const task of tasks) {
          const dueDateTime = task.due_time
            ? parseISO(`${task.due_date}T${task.due_time}`)
            : parseISO(task.due_date);

          const hoursUntilDue = differenceInHours(dueDateTime, new Date());

          // Verificar se já foi enviada notificação para esta tarefa
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('reference_id', task.id)
            .eq('type', 'reminder')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
            .single();

          if (existingNotification) continue; // Já notificou nas últimas 24h

          let shouldNotify = false;
          let message = '';

          // Notificar se falta 24 horas ou menos
          if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
            shouldNotify = true;
            if (isToday(dueDateTime)) {
              message = `A tarefa "${task.title}" vence hoje!`;
            } else if (isTomorrow(dueDateTime)) {
              message = `A tarefa "${task.title}" vence amanhã!`;
            } else {
              message = `A tarefa "${task.title}" vence em ${Math.ceil(
                hoursUntilDue
              )} horas`;
            }
          }

          // Notificar se está atrasada
          if (hoursUntilDue < 0) {
            shouldNotify = true;
            message = `A tarefa "${task.title}" está atrasada!`;
          }

          if (shouldNotify) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: 'Lembrete de Tarefa',
              message,
              type: 'reminder',
              reference_id: task.id,
              reference_type: 'task',
            });
          }
        }
      } catch (error) {
        console.error('Erro ao verificar lembretes de tarefas:', error);
      }
    };

    // Verificar imediatamente
    checkTaskReminders();

    // Verificar a cada 1 hora
    const interval = setInterval(checkTaskReminders, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);
}
