import { Task } from '@/types';
import { Card } from '@/components/ui/card';
import { TaskItem } from '@/components/dashboard/TaskItem';
import { CheckSquare } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function TaskList({ tasks, onTaskClick }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhuma tarefa encontrada
        </h3>
        <p className="text-gray-600">
          Tente usar outros termos de busca ou crie uma nova tarefa
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y divide-gray-100">
        {tasks.map((task) => (
          <div key={task.id} className="p-2">
            <TaskItem task={task} onClick={() => onTaskClick(task)} />
          </div>
        ))}
      </div>
    </Card>
  );
}
