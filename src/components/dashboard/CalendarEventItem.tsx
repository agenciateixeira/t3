import { Link } from 'react-router-dom';
import { CalendarEvent } from '@/types';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Video, Flag, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarEventItemProps {
  event: CalendarEvent;
  clientName?: string;
}

const eventTypeIcons = {
  meeting: Video,
  deadline: Flag,
  event: Sparkles,
};

const eventTypeLabels = {
  meeting: 'Reunião',
  deadline: 'Prazo',
  event: 'Evento',
};

export function CalendarEventItem({ event, clientName }: CalendarEventItemProps) {
  const Icon = Calendar;
  const color = '#2db4af';

  return (
    <Link
      to="/calendar"
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg',
        'transition-all duration-150 ease-out',
        'hover:bg-gray-50/50',
        'border-l-2'
      )}
      style={{ borderLeftColor: color }}
    >
      {/* Event type icon */}
      <div
        className="p-2 rounded-lg shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#2db4af] transition-colors">
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {clientName && (
            <span className="text-xs text-gray-600 truncate max-w-[120px]">
              {clientName}
            </span>
          )}
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${color}15`,
              color
            }}
          >
            Evento
          </span>
        </div>
      </div>

      {/* Date and time */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar className="h-3 w-3" />
          <span>{format(parseISO(event.start_date), 'dd MMM', { locale: ptBR })}</span>
        </div>
        {!event.all_day && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Clock className="h-3 w-3" />
            <span>{format(parseISO(event.start_date), 'HH:mm')}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
