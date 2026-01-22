import { useMemo } from 'react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';

interface StatusDistributionProps {
  tasks: Task[];
}

const statusConfig = [
  { key: 'todo', label: 'A fazer', color: 'bg-gray-500' },
  { key: 'in_progress', label: 'Em andamento', color: 'bg-[#2db4af]' },
  { key: 'in_review', label: 'Revisão', color: 'bg-violet-500' },
  { key: 'done', label: 'Concluído', color: 'bg-green-500' },
] as const;

export function StatusDistribution({ tasks }: StatusDistributionProps) {
  const distribution = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return statusConfig.map(s => ({ ...s, count: 0, percent: 0 }));

    return statusConfig.map(status => {
      const count = tasks.filter(t => t.status === status.key).length;
      return {
        ...status,
        count,
        percent: Math.round((count / total) * 100),
      };
    });
  }, [tasks]);

  const total = tasks.length;

  if (total === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Nenhuma tarefa encontrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
        {distribution.map((status) => (
          <div
            key={status.key}
            className={cn('h-full transition-all duration-500', status.color)}
            style={{ width: `${status.percent}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {distribution.map((status) => (
          <div key={status.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', status.color)} />
              <span className="text-xs text-gray-600">{status.label}</span>
            </div>
            <span className="text-xs font-medium tabular-nums">{status.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
