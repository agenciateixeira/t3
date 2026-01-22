import { useState } from 'react';
import { Task, TaskStatus, TaskPriority, TASK_STATUS_LABELS } from '@/types';
import TaskCard from './TaskCard';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'aprovado', 'done'];

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-[#2db4af] ring-opacity-50' : ''}`}
    >
      {children}
    </div>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onTaskUpdate }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'border-t-gray-400';
      case 'in_progress':
        return 'border-t-blue-500';
      case 'in_review':
        return 'border-t-yellow-500';
      case 'aprovado':
        return 'border-t-purple-500';
      case 'done':
        return 'border-t-green-500';
      default:
        return 'border-t-gray-400';
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);
    setOverId(null);

    if (!over) return;

    const taskId = active.id as string;
    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    // Check if over is a status column
    const overStatus = STATUSES.find(s => s === over.id);

    if (overStatus) {
      // Dropped directly on a column
      if (draggedTask.status !== overStatus) {
        // Different column = change status
        onTaskUpdate(taskId, { status: overStatus });
      }
      return;
    }

    // Dropped over another task
    const overTask = tasks.find((t) => t.id === over.id);
    if (!overTask) return;

    if (overTask.status !== draggedTask.status) {
      // Different column = change status
      onTaskUpdate(taskId, { status: overTask.status });
    } else {
      // Same column = change priority based on position
      const columnTasks = getTasksByStatus(draggedTask.status);
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);
      const draggedIndex = columnTasks.findIndex((t) => t.id === taskId);

      if (overIndex !== draggedIndex) {
        // Determine new priority based on where it was dropped
        let newPriority: TaskPriority;
        const totalTasks = columnTasks.length;

        // Simple logic: top 1/3 = high, middle 1/3 = medium, bottom 1/3 = low
        if (overIndex === 0) {
          newPriority = 'high';
        } else if (overIndex >= totalTasks - 1) {
          newPriority = 'low';
        } else {
          // Middle position
          const ratio = overIndex / (totalTasks - 1);
          if (ratio < 0.33) {
            newPriority = 'high';
          } else if (ratio < 0.67) {
            newPriority = 'medium';
          } else {
            newPriority = 'low';
          }
        }

        if (draggedTask.priority !== newPriority) {
          onTaskUpdate(taskId, { priority: newPriority });
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 auto-rows-fr">
        {STATUSES.map((status) => {
          const statusTasks = getTasksByStatus(status);
          const isActiveColumn = overId === status || statusTasks.some(t => t.id === overId);

          return (
            <div key={status} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {statusTasks.length}
                </span>
              </div>

              <DroppableColumn
                id={status}
                className={`flex-1 space-y-3 p-3 bg-gray-50 rounded-lg border-t-4 ${getStatusColor(
                  status
                )} min-h-[400px] transition-all ${
                  isActiveColumn && activeTask?.status !== status
                    ? 'bg-[#2db4af] bg-opacity-5'
                    : ''
                }`}
              >
                <SortableContext
                  items={statusTasks.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {statusTasks.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-8">
                      Nenhuma tarefa
                    </div>
                  ) : (
                    statusTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 cursor-grabbing">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
