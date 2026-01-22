import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Task, CalendarEvent } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Clock, User, Edit2, X, Plus, ExternalLink, MapPin, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ViewMode = 'month' | 'today' | 'week' | 'day';

interface Client {
  id: string;
  name: string;
}

export default function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 15)); // 15/01/2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    end_date: '',
    end_time: '',
  });
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    client_id: '',
    assignee_id: '',
    scheduled_date: '',
    scheduled_time: '',
    end_date: '',
    end_time: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    fetchCalendarEvents();
    fetchClients();
    fetchProfiles();
  }, [currentDate, viewMode, selectedDate]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error.message);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar perfis:', error.message);
    }
  };

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'today') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(addDays(currentDate, 6));
      } else if (viewMode === 'day') {
        startDate = startOfDay(selectedDate || currentDate);
        endDate = endOfDay(selectedDate || currentDate);
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          client:clients(*),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url)
        `)
        .not('scheduled_date', 'is', null)
        .gte('scheduled_date', format(startDate, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(endDate, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
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

  const fetchCalendarEvents = async () => {
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'today') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(addDays(currentDate, 6));
      } else if (viewMode === 'day') {
        startDate = startOfDay(selectedDate || currentDate);
        endDate = endOfDay(selectedDate || currentDate);
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      // Usa a mesma lógica do kanban - comparação por data
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          client:clients(*),
          deal:deals(*)
        `)
        .not('start_date', 'is', null)
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lt('start_date', format(addDays(endDate, 1), 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (error) throw error;

      setCalendarEvents(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar eventos',
        description: error.message,
      });
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (!task.scheduled_date) return false;
      return isSameDay(parseISO(task.scheduled_date), day);
    });
  };

  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => {
      if (!event.start_date) return false;
      try {
        const eventDate = parseISO(event.start_date.split('T')[0]);
        return isSameDay(eventDate, day);
      } catch {
        return false;
      }
    });
  };

  const getEventsForHour = (hour: number) => {
    const viewDate = viewMode === 'day' && selectedDate ? selectedDate : currentDate;
    return calendarEvents.filter((event) => {
      if (!event.start_date) return false;
      try {
        const eventDate = parseISO(event.start_date);
        const eventHour = eventDate.getHours();
        const sameDay = isSameDay(eventDate, viewDate);
        const sameHour = eventHour === hour;
        return sameDay && sameHour;
      } catch (error) {
        return false;
      }
    });
  };

  const getTasksForHour = (hour: number) => {
    const viewDate = viewMode === 'day' && selectedDate ? selectedDate : currentDate;
    return tasks.filter((task) => {
      if (!task.scheduled_date || !task.scheduled_time) return false;
      if (!isSameDay(parseISO(task.scheduled_date), viewDate)) return false;
      const taskHour = parseInt(task.scheduled_time.split(':')[0]);
      return taskHour === hour;
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      scheduled_date: task.scheduled_date || '',
      scheduled_time: task.scheduled_time || '',
      end_date: task.end_date || '',
      end_time: task.end_time || '',
    });
    setIsEditing(false);
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleGoToDeal = () => {
    if (selectedEvent?.deal_id) {
      navigate(`/tasks?deal=${selectedEvent.deal_id}`);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const handleHourClick = (hour: number) => {
    const viewDate = viewMode === 'day' && selectedDate ? selectedDate : currentDate;
    const hourStr = hour.toString().padStart(2, '0');
    setNewTaskForm({
      ...newTaskForm,
      scheduled_date: format(viewDate, 'yyyy-MM-dd'),
      scheduled_time: `${hourStr}:00`,
      end_date: format(viewDate, 'yyyy-MM-dd'),
      end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editForm.title,
          description: editForm.description || null,
          scheduled_date: editForm.scheduled_date || null,
          scheduled_time: editForm.scheduled_time || null,
          end_date: editForm.end_date || null,
          end_time: editForm.end_time || null,
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: 'Tarefa atualizada!',
        description: 'As alterações foram salvas com sucesso.',
      });

      setIsDialogOpen(false);
      setIsEditing(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar tarefa',
        description: error.message,
      });
    }
  };

  const handleCreateTask = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('tasks').insert({
        title: newTaskForm.title,
        description: newTaskForm.description || null,
        client_id: newTaskForm.client_id || null,
        assignee_id: newTaskForm.assignee_id || null,
        created_by: user.id,
        status: 'todo',
        priority: newTaskForm.priority,
        scheduled_date: newTaskForm.scheduled_date || null,
        scheduled_time: newTaskForm.scheduled_time || null,
        end_date: newTaskForm.end_date || null,
        end_time: newTaskForm.end_time || null,
        position: 0,
      });

      if (error) throw error;

      toast({
        title: 'Agendamento criado!',
        description: 'A tarefa foi agendada com sucesso.',
      });

      setNewTaskForm({
        title: '',
        description: '',
        client_id: '',
        assignee_id: '',
        scheduled_date: '',
        scheduled_time: '',
        end_date: '',
        end_time: '',
        priority: 'medium',
      });

      setIsDialogOpen(false);
      setIsCreating(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar agendamento',
        description: error.message,
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-700 border-gray-300',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
      in_review: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      done: 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[status] || colors.todo;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      todo: 'A Fazer',
      in_progress: 'Em Progresso',
      in_review: 'Em Revisão',
      done: 'Concluída',
    };
    return labels[status] || status;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Layout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendário</h1>
          <p className="text-gray-600">Visualize e gerencie tarefas agendadas</p>
        </div>

        {/* Calendar Card */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            {/* View Mode Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'today' ? 'default' : 'outline'}
                  onClick={() => {
                    setCurrentDate(new Date(2026, 0, 15));
                    setViewMode('today');
                  }}
                  className={viewMode === 'today' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
                >
                  Hoje
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  onClick={() => setViewMode('week')}
                  className={viewMode === 'week' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
                >
                  7 Dias
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                  className={viewMode === 'month' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
                >
                  30 Dias
                </Button>
              </div>

              {viewMode === 'month' && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
                    {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {(viewMode === 'today' || viewMode === 'day') && (
                <h2 className="text-xl font-bold text-gray-900">
                  {format(viewMode === 'day' && selectedDate ? selectedDate : currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
              )}

              {viewMode === 'week' && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addDays(currentDate, -7))}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-bold text-gray-900">
                    {format(currentDate, 'dd/MM')} - {format(addDays(currentDate, 6), 'dd/MM/yyyy')}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addDays(currentDate, 7))}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Calendar Views */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2db4af]"></div>
              </div>
            ) : viewMode === 'month' ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-semibold text-gray-700 py-3 border-r border-gray-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const dayTasks = getTasksForDay(day);
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);
                    const totalItems = dayTasks.length + dayEvents.length;

                    return (
                      <div
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={`min-h-[120px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          index % 7 === 6 ? 'border-r-0' : ''
                        } ${index >= calendarDays.length - 7 ? 'border-b-0' : ''} ${
                          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        } ${isDayToday ? 'bg-blue-50' : ''}`}
                      >
                        <div
                          className={`text-sm font-medium mb-2 ${
                            isDayToday
                              ? 'text-white bg-[#2db4af] rounded-full h-6 w-6 flex items-center justify-center'
                              : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {/* Eventos de Calendário (Deals do Pipeline) */}
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                              className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity bg-purple-100 border border-purple-300 text-purple-900"
                            >
                              <div className="font-medium truncate">{event.title}</div>
                              {event.start_date && (
                                <div className="text-[10px] opacity-75">
                                  {format(parseISO(event.start_date), 'HH:mm')}
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Tarefas */}
                          {dayTasks.slice(0, Math.max(0, 3 - dayEvents.length)).map((task) => (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(task);
                              }}
                              className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity border ${getStatusColor(
                                task.status
                              )}`}
                            >
                              <div className="font-medium truncate">{task.title}</div>
                              {task.scheduled_time && (
                                <div className="text-[10px] opacity-75">
                                  {task.scheduled_time.substring(0, 5)}
                                </div>
                              )}
                            </div>
                          ))}
                          {totalItems > 3 && (
                            <div className="text-xs text-gray-500 pl-2">
                              +{totalItems - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === 'week' ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(currentDate, i);
                    return (
                      <div
                        key={i}
                        className="text-center py-3 border-r border-gray-200 last:border-r-0"
                      >
                        <div className="text-xs font-medium text-gray-500">
                          {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            isToday(day) ? 'text-[#2db4af]' : 'text-gray-900'
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(currentDate, i);
                    const dayTasks = getTasksForDay(day);
                    return (
                      <div
                        key={i}
                        onClick={() => handleDateClick(day)}
                        className="min-h-[300px] p-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="space-y-1">
                          {dayTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(task);
                              }}
                              className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 border ${getStatusColor(
                                task.status
                              )}`}
                            >
                              <div className="font-medium truncate">{task.title}</div>
                              {task.scheduled_time && (
                                <div className="text-[10px] opacity-75">
                                  {task.scheduled_time.substring(0, 5)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Today/Day view - Timeline
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                  {hours.map((hour) => {
                    const hourTasks = getTasksForHour(hour);
                    const hourEvents = getEventsForHour(hour);
                    const hourStr = hour.toString().padStart(2, '0');
                    const hasItems = hourTasks.length > 0 || hourEvents.length > 0;

                    return (
                      <div
                        key={hour}
                        onClick={() => handleHourClick(hour)}
                        className="flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-20 flex-shrink-0 p-3 bg-gray-50 border-r border-gray-200 text-sm font-medium text-gray-600">
                          {hourStr}:00
                        </div>
                        <div className="flex-1 p-2 min-h-[60px]">
                          {!hasItems ? (
                            <div className="text-xs text-gray-400 flex items-center h-full">
                              <Plus className="h-3 w-3 mr-1" />
                              Clique para agendar
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {/* Eventos de Calendário (Deals do Pipeline) */}
                              {hourEvents.map((event) => (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                  className="px-3 py-2 rounded border bg-purple-100 border-purple-300 text-purple-900"
                                >
                                  <div className="font-medium text-sm">{event.title}</div>
                                  <div className="text-xs opacity-75 mt-1">
                                    {event.start_date && format(parseISO(event.start_date), 'HH:mm')}
                                    {event.end_date && ` - ${format(parseISO(event.end_date), 'HH:mm')}`}
                                  </div>
                                  {event.client && (
                                    <div className="text-xs opacity-75 mt-1">
                                      📊 {event.client.name}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Tarefas */}
                              {hourTasks.map((task) => (
                                <div
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task);
                                  }}
                                  className={`px-3 py-2 rounded border ${getStatusColor(
                                    task.status
                                  )}`}
                                >
                                  <div className="font-medium text-sm">{task.title}</div>
                                  <div className="text-xs opacity-75 mt-1">
                                    {task.scheduled_time?.substring(0, 5)}
                                    {task.end_time && ` - ${task.end_time.substring(0, 5)}`}
                                  </div>
                                  {task.client && (
                                    <div className="text-xs opacity-75 mt-1">
                                      {task.client.name}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>
                    {isCreating
                      ? 'Novo Agendamento'
                      : isEditing
                      ? 'Editar Tarefa'
                      : 'Detalhes da Tarefa'}
                  </DialogTitle>
                  <DialogDescription>
                    {isCreating
                      ? 'Crie um novo agendamento no calendário'
                      : isEditing
                      ? 'Edite as informações da tarefa'
                      : 'Visualize os detalhes da tarefa agendada'}
                  </DialogDescription>
                </div>
                {!isCreating && (
                  <div className="flex gap-2">
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>

            {isCreating ? (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-title">Título *</Label>
                  <Input
                    id="new-title"
                    value={newTaskForm.title}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-description">Descrição</Label>
                  <Textarea
                    id="new-description"
                    value={newTaskForm.description}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-client">Cliente</Label>
                    <Select
                      value={newTaskForm.client_id}
                      onValueChange={(value) =>
                        setNewTaskForm({ ...newTaskForm, client_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-assignee">Responsável</Label>
                    <Select
                      value={newTaskForm.assignee_id}
                      onValueChange={(value) =>
                        setNewTaskForm({ ...newTaskForm, assignee_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-scheduled-date">Data de Início</Label>
                    <Input
                      id="new-scheduled-date"
                      type="date"
                      value={newTaskForm.scheduled_date}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, scheduled_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-scheduled-time">Hora de Início</Label>
                    <Input
                      id="new-scheduled-time"
                      type="time"
                      value={newTaskForm.scheduled_time}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, scheduled_time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-end-date">Data de Término</Label>
                    <Input
                      id="new-end-date"
                      type="date"
                      value={newTaskForm.end_date}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, end_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-end-time">Hora de Término</Label>
                    <Input
                      id="new-end-time"
                      type="time"
                      value={newTaskForm.end_time}
                      onChange={(e) =>
                        setNewTaskForm({ ...newTaskForm, end_time: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-priority">Prioridade</Label>
                  <Select
                    value={newTaskForm.priority}
                    onValueChange={(value: any) =>
                      setNewTaskForm({ ...newTaskForm, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setIsCreating(false);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                  >
                    Criar Agendamento
                  </Button>
                </div>
              </div>
            ) : selectedTask && (
              <div className="space-y-4 mt-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Título *</Label>
                      <Input
                        id="edit-title"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Descrição</Label>
                      <Textarea
                        id="edit-description"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm({ ...editForm, description: e.target.value })
                        }
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-scheduled-date">Data de Início</Label>
                        <Input
                          id="edit-scheduled-date"
                          type="date"
                          value={editForm.scheduled_date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, scheduled_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-scheduled-time">Hora de Início</Label>
                        <Input
                          id="edit-scheduled-time"
                          type="time"
                          value={editForm.scheduled_time}
                          onChange={(e) =>
                            setEditForm({ ...editForm, scheduled_time: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-end-date">Data de Término</Label>
                        <Input
                          id="edit-end-date"
                          type="date"
                          value={editForm.end_date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, end_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-end-time">Hora de Término</Label>
                        <Input
                          id="edit-end-time"
                          type="time"
                          value={editForm.end_time}
                          onChange={(e) =>
                            setEditForm({ ...editForm, end_time: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleUpdateTask}
                        className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                      >
                        Salvar Alterações
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedTask.title}
                      </h3>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          selectedTask.status
                        )}`}
                      >
                        {getStatusLabel(selectedTask.status)}
                      </span>
                    </div>

                    {selectedTask.description && (
                      <div className="border-t pt-4">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {selectedTask.description}
                        </p>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-3">
                      {selectedTask.scheduled_date && (
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <span className="font-medium text-gray-700">Início: </span>
                            <span className="text-gray-600">
                              {format(parseISO(selectedTask.scheduled_date), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                              {selectedTask.scheduled_time &&
                                ` às ${selectedTask.scheduled_time.substring(0, 5)}`}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedTask.end_date && (
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <span className="font-medium text-gray-700">Término: </span>
                            <span className="text-gray-600">
                              {format(parseISO(selectedTask.end_date), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                              {selectedTask.end_time &&
                                ` às ${selectedTask.end_time.substring(0, 5)}`}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedTask.creator && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <span className="font-medium text-gray-700">Criado por: </span>
                            <span className="text-gray-600">
                              {selectedTask.creator.full_name}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedTask.assignee && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <span className="font-medium text-gray-700">Responsável: </span>
                            <span className="text-gray-600">
                              {selectedTask.assignee.full_name}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedTask.client && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="h-4 w-4" />
                          <div>
                            <span className="font-medium text-gray-700">Cliente: </span>
                            <span className="text-gray-600">{selectedTask.client.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Event Dialog */}
        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Evento</DialogTitle>
              <DialogDescription>
                Evento vinculado ao Pipeline
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedEvent.title}
                  </h3>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 border border-purple-300">
                    Evento do Pipeline
                  </span>
                </div>

                {selectedEvent.description && (
                  <div className="border-t pt-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-3">
                  {selectedEvent.start_date && (
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="font-medium text-gray-700">Início: </span>
                        <span className="text-gray-600">
                          {format(parseISO(selectedEvent.start_date), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.end_date && (
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="font-medium text-gray-700">Término: </span>
                        <span className="text-gray-600">
                          {format(parseISO(selectedEvent.end_date), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="font-medium text-gray-700">Local: </span>
                        <span className="text-gray-600">{selectedEvent.location}</span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.client && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="font-medium text-gray-700">Cliente: </span>
                        <span className="text-gray-600">{selectedEvent.client.name}</span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.deal && (
                    <div className="border-t mt-4 pt-4">
                      <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                        <h4 className="font-semibold text-purple-900">Oportunidade Vinculada</h4>

                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex-1">
                            <span className="font-medium text-gray-700">Título: </span>
                            <span className="text-gray-600">{selectedEvent.deal.title}</span>
                          </div>
                        </div>

                        {selectedEvent.deal.value && (
                          <div className="flex items-center gap-3 text-sm">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <div>
                              <span className="font-medium text-gray-700">Valor: </span>
                              <span className="text-gray-600">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: selectedEvent.deal.currency || 'BRL',
                                }).format(selectedEvent.deal.value)}
                              </span>
                            </div>
                          </div>
                        )}

                        {selectedEvent.deal.probability !== undefined && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="h-4 w-4" />
                            <div>
                              <span className="font-medium text-gray-700">Probabilidade: </span>
                              <span className="text-gray-600">{selectedEvent.deal.probability}%</span>
                            </div>
                          </div>
                        )}

                        {selectedEvent.deal.description && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Descrição: </span>
                            <p className="text-gray-600 mt-1">{selectedEvent.deal.description}</p>
                          </div>
                        )}

                        <Button
                          onClick={handleGoToDeal}
                          className="w-full bg-[#2db4af] hover:bg-[#28a39e] mt-3"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir Oportunidade no Pipeline
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEventDialogOpen(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
