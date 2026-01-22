import { Link } from 'react-router-dom';
import { Task, CalendarEvent } from '@/types';
import { cn } from '@/lib/utils';
import { Calendar, Clock, CheckSquare, AlertCircle } from 'lucide-react';
import { format, parseISO, isAfter, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AgendaItemType =
  | { type: 'task'; data: Task; clientName?: string }
  | { type: 'event'; data: CalendarEvent; clientName?: string };

interface WeeklyAgendaItemProps {
  item: AgendaItemType;
}

const priorityColors: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

export function WeeklyAgendaItem({ item }: WeeklyAgendaItemProps) {
  const isTask = item.type === 'task';
  const task = isTask ? item.data : null;
  const event = !isTask ? item.data : null;

  const dateStr = isTask ? task!.due_date! : event!.start_date;
  const date = parseISO(dateStr);
  const isOverdue = isTask && isAfter(new Date(), date) && task!.status !== 'done';
  const color = isTask ? priorityColors[task!.priority] : '#2db4af';

  const Icon = isTask
    ? (isOverdue ? AlertCircle : CheckSquare)
    : Calendar;

  const getDateLabel = () => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, 'dd MMM', { locale: ptBR });
  };

  const getTypeLabel = () => {
    if (isTask) {
      return task!.status === 'done' ? 'Concluída' : isOverdue ? 'Atrasada' : 'Tarefa';
    }
    return 'Evento';
  };

  const linkTo = isTask ? `/tasks` : '/calendar';

  return (
    <Link
      to={linkTo}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl',
        'transition-all duration-200 ease-out',
        'hover:bg-gray-50/50 hover:shadow-sm',
        'border-l-3',
        isOverdue && 'bg-red-50/5'
      )}
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      {/* Icon */}
      <div
        className={cn(
          "p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105",
          isOverdue && "animate-pulse"
        )}
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate transition-colors",
          isOverdue ? "text-red-600" : "text-gray-900 group-hover:text-[#2db4af]"
        )}>
          {isTask ? task!.title : event!.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {item.clientName && (
            <span className="text-xs text-gray-600 truncate max-w-[120px]">
              {item.clientName}
            </span>
          )}
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isOverdue && "animate-pulse"
            )}
            style={{
              backgroundColor: `${color}15`,
              color
            }}
          >
            {getTypeLabel()}
          </span>
        </div>
      </div>

      {/* Date and time */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          isToday(date) ? "text-[#2db4af]" : "text-gray-600",
          isOverdue && "text-red-600"
        )}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{getDateLabel()}</span>
        </div>
        {!isTask && event && !event.all_day && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(date, 'HH:mm')}</span>
          </div>
        )}
        {isTask && task && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
