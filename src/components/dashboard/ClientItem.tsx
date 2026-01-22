import { Link } from 'react-router-dom';
import { Client } from '@/types';
import { cn } from '@/lib/utils';
import { Building2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ClientItemProps {
  client: Client;
  taskCount?: number;
}

const serviceColors = [
  'bg-[#2db4af]/15 text-[#2db4af]',
  'bg-blue-100 text-blue-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
];

export function ClientItem({ client, taskCount }: ClientItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link
      to={`/clients`}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg relative overflow-hidden',
        'transition-all duration-150 ease-out',
        'hover:bg-gray-50/50'
      )}
    >
      {/* Hover accent */}
      <div className="absolute inset-y-0 left-0 w-0.5 bg-[#2db4af] opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Avatar with glow on hover */}
      <div className="relative">
        <div className="absolute inset-0 bg-[#2db4af]/20 rounded-lg blur-md opacity-0 group-hover:opacity-60 transition-opacity" />
        <Avatar className="h-10 w-10 rounded-lg ring-2 ring-transparent group-hover:ring-[#2db4af]/30 transition-all">
          <AvatarImage src={client.logo_url || undefined} className="object-cover" />
          <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#2db4af]/20 to-[#2db4af]/10 text-[#2db4af] font-semibold">
            {getInitials(client.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#2db4af] transition-colors">
          {client.name}
        </p>
        {client.services && client.services.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {client.services.slice(0, 2).map((service, idx) => (
              <Badge
                key={service}
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0 border-0", serviceColors[idx % serviceColors.length])}
              >
                {service}
              </Badge>
            ))}
            {client.services.length > 2 && (
              <span className="text-[10px] text-gray-500">
                +{client.services.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {taskCount !== undefined && taskCount > 0 && (
        <Badge variant="outline" className="text-xs shrink-0 bg-[#2db4af]/5 border-[#2db4af]/20">
          {taskCount} tarefa{taskCount !== 1 ? 's' : ''}
        </Badge>
      )}

      <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}
