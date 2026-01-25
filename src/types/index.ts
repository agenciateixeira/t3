export type UserRole = 'admin' | 'gerente' | 'designer' | 'social_media' | 'gestor_trafego';
export type UserHierarchy = 'admin' | 'team_manager' | 'employee';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'aprovado' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type PostPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  designer: 'Designer',
  social_media: 'Social Media',
  gestor_trafego: 'Gestor de Tráfego',
};

export const USER_HIERARCHY_LABELS: Record<UserHierarchy, string> = {
  admin: 'Administrador',
  team_manager: 'Gerente de Time',
  employee: 'Colaborador',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  in_review: 'Em Revisão',
  aprovado: 'Aprovado',
  done: 'Concluído',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
  failed: 'Falhou',
};

export const POST_PLATFORM_LABELS: Record<PostPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
};

export interface JobTitle {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  hierarchy?: UserHierarchy;
  job_title_id?: string | null;
  team_id?: string | null;
  phone?: string | null;
  cpf?: string | null;
  created_at: string;
  updated_at: string;
  job_title?: JobTitle;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cnpj: string | null;
  razao_social: string | null;
  endereco: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_value: number | null;
  company_phone: string | null;
  responsible_phone: string | null;
  responsible_name: string | null;
  responsible_id: string | null;
  team_id: string | null;
  services: string[] | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  team?: Team;
  responsible?: Profile;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  meeting_link: string | null;
  card_color: string | null;
  position: number;
  scheduled_date: string | null;
  scheduled_time: string | null;
  end_date: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  assignee?: Profile;
  creator?: Profile;
}

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platform: PostPlatform;
  client_id: string;
  created_by: string | null;
  scheduled_for: string;
  published_at: string | null;
  status: PostStatus;
  media_urls: string[] | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  deal_id: string | null;
  created_by: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
  attendees: string[] | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  deal?: Deal;
}

export interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  created_at: string;
}

export interface ManagerEmployee {
  id: string;
  manager_id: string;
  employee_id: string;
  created_at: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  client_id?: string;
  assignee_id?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: Date;
}

export interface ClientFormData {
  name: string;
  description?: string;
  logo_url?: string;
  cnpj?: string;
  razao_social?: string;
  endereco?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_value?: number;
  company_phone?: string;
  responsible_phone?: string;
  responsible_name?: string;
  responsible_id?: string;
  team_id?: string;
  services?: string[];
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  status?: string;
}

export interface PostFormData {
  title: string;
  content: string;
  platform: PostPlatform;
  client_id: string;
  scheduled_for: Date;
  status: PostStatus;
  media_urls?: string[];
}

export interface CalendarEventFormData {
  title: string;
  description?: string;
  client_id?: string;
  deal_id?: string;
  start_date: Date;
  end_date?: Date;
  all_day?: boolean;
  location?: string;
  attendees?: string[];
}

// ============================================
// PIPELINE TYPES
// ============================================

export type PipelineFieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'textarea'
  | 'cnpj'
  | 'cpf'
  | 'percentage'
  | 'user'
  | 'client'
  | 'file';

export type PipelineStageType = 'active' | 'won' | 'lost';

export type DealActivityType =
  | 'note'
  | 'call'
  | 'meeting'
  | 'email'
  | 'task'
  | 'status_change'
  | 'stage_change'
  | 'field_update';

export const PIPELINE_FIELD_TYPE_LABELS: Record<PipelineFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  currency: 'Moeda',
  date: 'Data',
  datetime: 'Data e Hora',
  email: 'E-mail',
  phone: 'Telefone',
  url: 'URL',
  select: 'Seleção',
  multiselect: 'Múltipla Escolha',
  checkbox: 'Checkbox',
  textarea: 'Área de Texto',
  cnpj: 'CNPJ',
  cpf: 'CPF',
  percentage: 'Porcentagem',
  user: 'Usuário',
  client: 'Cliente',
  file: 'Arquivo',
};

export const DEAL_ACTIVITY_TYPE_LABELS: Record<DealActivityType, string> = {
  note: 'Nota',
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'E-mail',
  task: 'Tarefa',
  status_change: 'Mudança de Status',
  stage_change: 'Mudança de Etapa',
  field_update: 'Atualização de Campo',
};

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  created_by: string | null;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  is_final: boolean;
  stage_type: PipelineStageType;
  created_at: string;
  updated_at: string;
}

export interface PipelineField {
  id: string;
  pipeline_id: string;
  stage_id: string | null;
  field_name: string;
  field_label: string;
  field_type: PipelineFieldType;
  field_options: string[] | null;
  is_required: boolean;
  position: number;
  default_value: string | null;
  placeholder: string | null;
  help_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  value: number | null;
  currency: string;
  probability: number;
  start_date: string | null;
  start_time: string | null;
  expected_close_date: string | null;
  expected_close_time: string | null;
  actual_close_date: string | null;
  assignee_id: string | null;
  created_by: string | null;
  priority: TaskPriority;
  position: number;
  card_color: string;
  tags: string[] | null;
  next_responsible_sector: UserHierarchy | null;
  next_responsible_user: string | null;
  last_activity_at: string | null;
  last_activity_type: string | null;
  source: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  assignee?: Profile;
  creator?: Profile;
  stage?: PipelineStage;
}

export interface DealFieldValue {
  id: string;
  deal_id: string;
  field_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
  field?: PipelineField;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string | null;
  activity_type: DealActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  scheduled_at: string | null;
  completed_at: string | null;
  reply_to: string | null;
  created_at: string;
  user?: Profile;
  replies?: DealActivity[];
}

export interface DealAttachment {
  id: string;
  deal_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  uploader?: Profile;
}

export interface DealChecklist {
  id: string;
  deal_id: string;
  title: string;
  position: number;
  created_at: string;
  items?: DealChecklistItem[];
}

export interface DealChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  is_completed: boolean;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  completed_at: string | null;
  assignee?: Profile;
}

// Pipeline Form Data Types
export interface PipelineFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface PipelineStageFormData {
  name: string;
  color?: string;
  position?: number;
  stage_type?: PipelineStageType;
}

export interface PipelineFieldFormData {
  field_name: string;
  field_label: string;
  field_type: PipelineFieldType;
  field_options?: string[];
  is_required?: boolean;
  position?: number;
  default_value?: string;
  placeholder?: string;
  help_text?: string;
  stage_id?: string | null;
}

export interface DealFormData {
  title: string;
  description?: string;
  client_id?: string;
  value?: number;
  currency?: string;
  probability?: number;
  start_date?: string;
  start_time?: string;
  expected_close_date?: string;
  expected_close_time?: string;
  assignee_id?: string;
  priority?: TaskPriority;
  card_color?: string;
  tags?: string[];
  source?: string;
}

// ============================================
// TIME TRACKING TYPES
// ============================================

export interface TimeLog {
  id: string;
  user_id: string;
  deal_id: string | null;
  task_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  description: string | null;
  is_active: boolean;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_seconds: number;
  created_at: string;
  updated_at: string;
  user?: Profile;
  deal?: Deal;
  task?: Task;
}

export interface TimeStats {
  deal_id?: string;
  task_id?: string;
  user_id: string;
  log_count: number;
  total_seconds: number;
  avg_seconds: number;
  last_logged_at: string | null;
}

// ============================================
// NOTIFICATIONS TYPES
// ============================================

export type NotificationType = 'task' | 'event' | 'deal' | 'assignment' | 'reminder' | 'system' | 'message';
export type NotificationReferenceType = 'task' | 'event' | 'deal' | 'message';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task: 'Tarefa',
  event: 'Evento',
  deal: 'Oportunidade',
  assignment: 'Atribuição',
  reminder: 'Lembrete',
  system: 'Sistema',
  message: 'Mensagem',
};

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id: string | null;
  reference_type: NotificationReferenceType | null;
  metadata?: {
    group_id?: string;
    sender_id?: string;
    type?: 'dm' | 'group' | 'group_mention';
  } | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}
