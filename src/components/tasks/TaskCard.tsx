import { Task, TASK_PRIORITY_LABELS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Briefcase } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-[#2db4af]"
      onClick={onClick}
      style={{ backgroundColor: task.card_color || '#ffffff' }}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and Priority */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
              {task.title}
            </h4>
            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="space-y-2">
            {task.client && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Briefcase className="h-3 w-3" />
                <span className="truncate">{task.client.name}</span>
              </div>
            )}

            {task.due_date && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
              </div>
            )}
          </div>

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar_url || undefined} />
                <AvatarFallback className="bg-[#2db4af] text-white text-xs">
                  {getInitials(task.assignee.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600 truncate">
                {task.assignee.full_name}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
