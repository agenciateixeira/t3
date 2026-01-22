import { Link } from 'react-router-dom';
import { Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, ArrowRight, Building2 } from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-500',
  in_progress: 'bg-[#2db4af]',
  in_review: 'bg-violet-500',
  done: 'bg-green-500',
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export function TaskItem({ task }: TaskItemProps) {
  const isOverdue = task.due_date && task.status !== 'done' && isAfter(new Date(), parseISO(task.due_date));
  const isDueSoon = task.due_date && task.status !== 'done' &&
    !isOverdue &&
    parseISO(task.due_date) <= addDays(new Date(), 2);

  return (
    <Link
      to="/tasks"
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg relative overflow-hidden',
        'transition-all duration-150 ease-out',
        'hover:bg-gray-50/50',
        isOverdue && 'bg-red-50/5'
      )}
    >
      {/* Hover accent */}
      <div className="absolute inset-y-0 left-0 w-0.5 bg-[#2db4af] opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Status indicator */}
      <div className={cn('w-1 h-8 rounded-full shrink-0', statusColors[task.status])} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#2db4af] transition-colors">
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {task.client && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              {task.client.logo_url ? (
                <img src={task.client.logo_url} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
              ) : (
                <Building2 className="h-3 w-3 text-[#2db4af]/60" />
              )}
              <span className="truncate max-w-[100px]">{task.client.name}</span>
            </span>
          )}
          <span className={cn('text-xs font-medium', priorityColors[task.priority])}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      </div>

      {/* Due date */}
      {task.due_date && (
        <div className={cn(
          'flex items-center gap-1 text-xs shrink-0',
          isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-yellow-600' : 'text-gray-500'
        )}>
          <Calendar className="h-3 w-3" />
          <span>{format(parseISO(task.due_date), 'dd MMM', { locale: ptBR })}</span>
        </div>
      )}

      <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}
