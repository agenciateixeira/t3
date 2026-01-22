import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, Client, Profile, TaskStatus, TASK_STATUS_LABELS } from '@/types';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, LayoutGrid, List, Workflow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import TaskDialog from '@/components/tasks/TaskDialog';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskList from '@/components/tasks/TaskList';
import PipelineView from '@/components/tasks/PipelineView';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'pipeline'>('pipeline');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  // Handle query params to auto-open task dialog
  useEffect(() => {
    const taskId = searchParams.get('open');
    if (taskId && tasks.length > 0 && !isLoading) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setDialogOpen(true);
        // Remove query param after opening
        setSearchParams({});
      }
    }
  }, [searchParams, tasks, isLoading]);

  // Handle query params to auto-open deal in pipeline
  useEffect(() => {
    const dealId = searchParams.get('deal');
    if (dealId) {
      setViewMode('pipeline');
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTasks(tasks);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTasks(
        tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query) ||
            task.client?.name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, tasks]);

  const fetchData = async () => {
    try {
      // Fetch tasks with relations
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          client:clients(*),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url, hierarchy)
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, hierarchy, team_id')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      setTasks(tasksData || []);
      setFilteredTasks(tasksData || []);
      setClients(clientsData || []);
      setProfiles(profilesData || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar tarefas',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update - update local state immediately
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
    setFilteredTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );

    try {
      // Sanitize updates - remove relation objects and fields that can't be updated
      const sanitizedUpdates: any = {};
      const allowedFields = [
        'title', 'description', 'client_id', 'assignee_id', 'created_by',
        'status', 'priority', 'due_date', 'due_time', 'meeting_link',
        'card_color', 'position', 'scheduled_date', 'scheduled_time',
        'end_date', 'end_time'
      ];

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = (updates as any)[key];
        }
      });

      const { error } = await supabase
        .from('tasks')
        .update(sanitizedUpdates)
        .eq('id', taskId);

      if (error) throw error;

      // Refetch to ensure data consistency
      await fetchData();
    } catch (error: any) {
      // Revert optimistic update on error
      await fetchData();
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar tarefa',
        description: error.message,
      });
    }
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTask(null);
    fetchData();
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Tarefas</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gerencie as tarefas e acompanhe o progresso
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Kanban"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'pipeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Pipeline"
              >
                <Workflow className="h-4 w-4" />
              </button>
            </div>

            <Button
              onClick={handleCreate}
              className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Tarefa</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskClick={handleEdit}
            onTaskUpdate={handleTaskUpdate}
          />
        ) : viewMode === 'list' ? (
          <TaskList tasks={filteredTasks} onTaskClick={handleEdit} />
        ) : (
          <PipelineView />
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={fetchData}
        task={selectedTask}
        clients={clients}
        profiles={profiles}
      />
    </Layout>
  );
}
