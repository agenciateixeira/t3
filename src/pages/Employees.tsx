import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users as UsersIcon, UserPlus, Mail, Phone, Pencil, Trash2, Search, X, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToastContext } from '@/contexts/ToastContext';
import { isValidCPF, formatCPFInput, onlyNumbers } from '@/utils/validators';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Team {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
  manager?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  managers?: Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
  }>;
  manager_count?: number;
  member_count?: number;
}

interface JobTitle {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  cpf: string | null;
  avatar_url: string | null;
  hierarchy: string | null;
  job_title_id: string | null;
  team_id: string | null;
  team?: {
    name: string;
  };
  job_title?: {
    name: string;
  };
}

const HIERARCHIES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'team_manager', label: 'Gerente de Time' },
  { value: 'employee', label: 'Colaborador' },
];

export default function Employees() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToastContext();

  const [teams, setTeams] = useState<Team[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Controle de permissões
  const hasPermission = profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager';
  const canManageEmployees = profile?.hierarchy === 'admin';
  const isAdmin = profile?.hierarchy === 'admin';

  // Filtrar hierarquias disponíveis: apenas ADMs podem criar ADMs
  const availableHierarchies = isAdmin
    ? HIERARCHIES
    : HIERARCHIES.filter(h => h.value !== 'admin');

  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
  });

  const [employeeFormData, setEmployeeFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    hierarchy: '',
    job_title_id: '',
    team_id: '',
  });

  // Estados para filtros de colaboradores
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterHierarchy, setFilterHierarchy] = useState('');

  // Verificação de acesso
  useEffect(() => {
    // Aguardar o profile carregar antes de verificar permissões
    if (loading) return;

    if (!hasPermission) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Apenas administradores e gerentes podem gerenciar a equipe.',
      });
      navigate('/dashboard');
      return;
    }

    fetchEmployees();
    fetchTeams();
    fetchJobTitles();
  }, [hasPermission, loading]);

  useEffect(() => {
    fetchTeams();
    fetchJobTitles();
    fetchEmployees();

    // Real-time subscriptions
    const teamsChannel = supabase
      .channel('teams-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);

      // Tentar usar a nova view teams_with_managers (múltiplos gerentes)
      const { data: newViewData, error: newViewError } = await supabase
        .from('teams_with_managers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!newViewError && newViewData) {
        // Mapear para o formato esperado
        const mappedTeams = newViewData.map((team: any) => ({
          id: team.team_id,
          name: team.team_name,
          description: team.description,
          created_at: team.created_at,
          updated_at: team.updated_at,
          manager: team.managers && team.managers.length > 0 ? team.managers[0] : null,
          managers: team.managers || [],
          member_count: team.member_count || 0,
          manager_count: team.manager_count || 0,
        }));
        setTeams(mappedTeams);
      } else {
        // Fallback para a view antiga se a nova não existir ainda
        const { data: oldViewData, error: oldViewError } = await supabase
          .from('teams_with_counts')
          .select(`
            *,
            manager:profiles!teams_manager_id_fkey(id, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (oldViewError) throw oldViewError;
        setTeams(oldViewData || []);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar times',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('job_titles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setJobTitles(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cargos',
        description: error.message,
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          team:teams!profiles_team_id_fkey(name),
          job_title:job_titles!profiles_job_title_id_fkey(name)
        `)
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Filtrar colaboradores baseado na hierarquia
      let filteredEmployees = data || [];

      if (profile?.hierarchy === 'team_manager') {
        // Team manager vê apenas membros do seu time
        filteredEmployees = filteredEmployees.filter(emp =>
          emp.team_id === profile.team_id
        );
      }
      // Admin vê todos

      setEmployees(filteredEmployees);
    } catch (error: any) {
      console.error('Erro ao carregar colaboradores:', error.message);
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('teams').insert({
        name: teamFormData.name,
        description: teamFormData.description || null,
        manager_id: teamFormData.manager_id || null,
      });

      if (error) throw error;

      toast({
        title: 'Time cadastrado!',
        description: 'O time foi criado com sucesso.',
      });

      setTeamFormData({
        name: '',
        description: '',
        manager_id: '',
      });

      setIsTeamDialogOpen(false);
      fetchTeams();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar time',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Verificação de permissão
    if (!canManageEmployees) {
      toast({
        variant: 'destructive',
        title: 'Sem permissão',
        description: 'Apenas administradores podem cadastrar colaboradores.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Validar campos obrigatórios
      if (!employeeFormData.hierarchy) {
        toast({
          variant: 'destructive',
          title: 'Campos obrigatórios',
          description: 'Por favor, selecione o cargo/hierarquia.',
        });
        setIsSubmitting(false);
        return;
      }

      // Validar permissão para criar administrador
      if (employeeFormData.hierarchy === 'admin' && !isAdmin) {
        toast({
          variant: 'destructive',
          title: 'Sem permissão',
          description: 'Apenas administradores podem criar outros administradores.',
        });
        setIsSubmitting(false);
        return;
      }

      // Validar CPF
      if (!employeeFormData.cpf || !isValidCPF(employeeFormData.cpf)) {
        toast({
          variant: 'destructive',
          title: 'CPF inválido',
          description: 'Por favor, insira um CPF válido.',
        });
        setIsSubmitting(false);
        return;
      }

      // PASSO 1: Salvar sessão atual do admin ANTES de qualquer operação
      const { data: sessionData } = await supabase.auth.getSession();
      const adminSession = sessionData.session;

      if (!adminSession) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }

      // PASSO 2: Criar usuário via Supabase Auth
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: employeeFormData.email,
        password: tempPassword,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: employeeFormData.full_name,
            phone: onlyNumbers(employeeFormData.phone),
            cpf: onlyNumbers(employeeFormData.cpf),
            hierarchy: employeeFormData.hierarchy,
            job_title_id: employeeFormData.job_title_id || null,
            team_id: employeeFormData.team_id || null,
          },
        },
      });

      // IMPORTANTE: Imediatamente após signUp, restaurar sessão do admin
      if (!authError && adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      if (authError) {
        if (authError.message.includes('already registered') || authError.status === 422) {
          throw new Error(`O e-mail "${employeeFormData.email}" já está cadastrado.`);
        }
        throw authError;
      }

      // PASSO 3: Aguardar e restaurar sessão
      await new Promise(resolve => setTimeout(resolve, 100));

      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // PASSO 4: Atualizar profile (SEM campo email!)
      if (authData && authData.user) {
        await supabase
          .from('profiles')
          .update({
            phone: onlyNumbers(employeeFormData.phone),
            cpf: onlyNumbers(employeeFormData.cpf),
            hierarchy: employeeFormData.hierarchy,
            job_title_id: employeeFormData.job_title_id || null,
            team_id: employeeFormData.team_id || null,
            full_name: employeeFormData.full_name,
          })
          .eq('id', authData.user.id);
      }

      toast({
        title: 'Colaborador cadastrado!',
        description: `Email: ${employeeFormData.email}\nSenha: ${tempPassword}`,
      });

      setEmployeeFormData({
        full_name: '',
        email: '',
        phone: '',
        cpf: '',
        hierarchy: '',
        job_title_id: '',
        team_id: '',
      });

      setIsEmployeeDialogOpen(false);
      await fetchEmployees();

    } catch (error: any) {
      console.error('Erro ao cadastrar colaborador:', error);

      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar colaborador',
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    // Verificação de permissão
    if (!canManageEmployees) {
      toast({
        variant: 'destructive',
        title: 'Sem permissão',
        description: 'Apenas administradores podem editar colaboradores.',
      });
      return;
    }

    setEditingEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsSubmitting(true);

    try {
      // Validar CPF se fornecido
      if (editingEmployee.cpf && !isValidCPF(editingEmployee.cpf)) {
        toast({
          variant: 'destructive',
          title: 'CPF inválido',
          description: 'Por favor, insira um CPF válido.',
        });
        setIsSubmitting(false);
        return;
      }

      // Validar permissão para editar para administrador
      if (editingEmployee.hierarchy === 'admin' && !isAdmin) {
        toast({
          variant: 'destructive',
          title: 'Sem permissão',
          description: 'Apenas administradores podem definir outros como administradores.',
        });
        setIsSubmitting(false);
        return;
      }

      const updateData = {
        full_name: editingEmployee.full_name,
        phone: editingEmployee.phone ? onlyNumbers(editingEmployee.phone) : null,
        cpf: editingEmployee.cpf ? onlyNumbers(editingEmployee.cpf) : null,
        hierarchy: editingEmployee.hierarchy,
        job_title_id: editingEmployee.job_title_id || null,
        team_id: editingEmployee.team_id || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingEmployee.id);

      if (error) throw error;

      toast({
        title: 'Colaborador atualizado!',
        description: 'As informações foram atualizadas com sucesso.',
      });

      await fetchEmployees();

      setIsEditDialogOpen(false);
      setEditingEmployee(null);
    } catch (error: any) {
      console.error('Erro ao atualizar colaborador:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar colaborador',
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', deletingTeam.id);

      if (error) throw error;

      toast({
        title: 'Time excluído!',
        description: 'O time foi removido com sucesso.',
      });

      setShowDeleteDialog(false);
      setDeletingTeam(null);
      fetchTeams();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir time',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;

    // Verificação de permissão
    if (!canManageEmployees) {
      toast({
        variant: 'destructive',
        title: 'Sem permissão',
        description: 'Apenas administradores podem deletar colaboradores.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Chamar função SQL que deleta de auth.users E profiles
      const { error } = await supabase.rpc('delete_user_completely', {
        user_id: deletingEmployee.id
      });

      if (error) throw error;

      toast({
        title: 'Colaborador excluído!',
        description: 'O colaborador foi removido com sucesso.',
      });

      setShowDeleteDialog(false);
      setDeletingEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      console.error('Erro ao excluir colaborador:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir colaborador',
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getHierarchyLabel = (value: string) => {
    return HIERARCHIES.find((h) => h.value === value)?.label || value;
  };

  // Filtrar colaboradores baseado nos filtros
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = searchQuery === '' ||
      employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.phone && employee.phone.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTeam = filterTeam === '' || employee.team_id === filterTeam;
    const matchesHierarchy = filterHierarchy === '' || employee.hierarchy === filterHierarchy;

    return matchesSearch && matchesTeam && matchesHierarchy;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setFilterTeam('');
    setFilterHierarchy('');
  };

  const hasActiveFilters = searchQuery !== '' || filterTeam !== '' || filterHierarchy !== '';

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Equipe</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Gerencie times e colaboradores
          </p>

          <div className="flex gap-3">
            {/* Cadastrar Time */}
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2db4af] hover:bg-[#28a39e] text-white">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Criar Time
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Time</DialogTitle>
                  <DialogDescription>
                    Preencha as informações do time e selecione um gerente
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleTeamSubmit} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Nome do Time *</Label>
                    <Input
                      id="team-name"
                      value={teamFormData.name}
                      onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                      placeholder="Ex: Time de Estratégia, Time de Design"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team-description">Descrição</Label>
                    <Textarea
                      id="team-description"
                      value={teamFormData.description}
                      onChange={(e) =>
                        setTeamFormData({ ...teamFormData, description: e.target.value })
                      }
                      placeholder="Descreva brevemente as responsabilidades do time"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team-manager">Gerente do Time</Label>
                    <Select
                      value={teamFormData.manager_id || ''}
                      onValueChange={(value) =>
                        setTeamFormData({ ...teamFormData, manager_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um gerente (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTeamDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Cadastrar Colaborador */}
            <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[#2db4af] text-[#2db4af] hover:bg-[#2db4af] hover:text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo colaborador
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleEmployeeSubmit} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee-name">Nome Completo *</Label>
                    <Input
                      id="employee-name"
                      value={employeeFormData.full_name}
                      onChange={(e) =>
                        setEmployeeFormData({ ...employeeFormData, full_name: e.target.value })
                      }
                      placeholder="Ex: João Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee-email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="employee-email"
                        type="email"
                        value={employeeFormData.email}
                        onChange={(e) =>
                          setEmployeeFormData({ ...employeeFormData, email: e.target.value })
                        }
                        placeholder="joao@exemplo.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee-phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="employee-phone"
                        type="tel"
                        value={employeeFormData.phone}
                        onChange={(e) =>
                          setEmployeeFormData({ ...employeeFormData, phone: e.target.value })
                        }
                        placeholder="(11) 98765-4321"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee-cpf">CPF *</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="employee-cpf"
                        type="text"
                        value={employeeFormData.cpf}
                        onChange={(e) => {
                          const formatted = formatCPFInput(e.target.value);
                          setEmployeeFormData({ ...employeeFormData, cpf: formatted });
                        }}
                        placeholder="000.000.000-00"
                        className="pl-10"
                        maxLength={14}
                        required
                      />
                      {employeeFormData.cpf && !isValidCPF(employeeFormData.cpf) && (
                        <p className="text-xs text-destructive mt-1">CPF inválido</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee-hierarchy">Cargo/Hierarquia *</Label>
                    <Select
                      value={employeeFormData.hierarchy || ''}
                      onValueChange={(value) => {
                        // Se selecionar admin, limpar job_title_id pois não é necessário
                        if (value === 'admin') {
                          setEmployeeFormData({ ...employeeFormData, hierarchy: value, job_title_id: '' });
                        } else {
                          setEmployeeFormData({ ...employeeFormData, hierarchy: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent className="z-[10002]">
                        {availableHierarchies.map((hierarchy) => (
                          <SelectItem key={hierarchy.value} value={hierarchy.value}>
                            {hierarchy.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isAdmin && (
                      <p className="text-xs text-gray-500">
                        Apenas administradores podem criar outros administradores
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee-job-title">
                      Cargo {employeeFormData.hierarchy === 'admin' && '(não obrigatório para administradores)'}
                    </Label>
                    <select
                      id="employee-job-title"
                      value={employeeFormData.job_title_id}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, job_title_id: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={employeeFormData.hierarchy === 'admin'}
                    >
                      <option value="">
                        {employeeFormData.hierarchy === 'admin' ? 'Acesso total - cargo não necessário' : 'Selecione um cargo...'}
                      </option>
                      {jobTitles.map((jobTitle) => (
                        <option key={jobTitle.id} value={jobTitle.id}>
                          {jobTitle.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee-team">Time</Label>
                    <Select
                      value={employeeFormData.team_id || ''}
                      onValueChange={(value) =>
                        setEmployeeFormData({ ...employeeFormData, team_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um time (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="z-[10002]">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEmployeeDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog de Edição de Colaborador */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Colaborador</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do colaborador
                  </DialogDescription>
                </DialogHeader>

                {editingEmployee && (
                  <form onSubmit={handleUpdateEmployee} className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-employee-name">Nome Completo *</Label>
                      <Input
                        id="edit-employee-name"
                        value={editingEmployee.full_name}
                        onChange={(e) =>
                          setEditingEmployee({ ...editingEmployee, full_name: e.target.value })
                        }
                        placeholder="Ex: João Silva"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-employee-phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-employee-phone"
                          type="tel"
                          value={editingEmployee.phone || ''}
                          onChange={(e) =>
                            setEditingEmployee({ ...editingEmployee, phone: e.target.value })
                          }
                          placeholder="(11) 98765-4321"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-employee-cpf">CPF</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-employee-cpf"
                          type="text"
                          value={editingEmployee.cpf ? formatCPFInput(editingEmployee.cpf) : ''}
                          onChange={(e) => {
                            const formatted = formatCPFInput(e.target.value);
                            setEditingEmployee({ ...editingEmployee, cpf: onlyNumbers(formatted) });
                          }}
                          placeholder="000.000.000-00"
                          className="pl-10"
                          maxLength={14}
                        />
                        {editingEmployee.cpf && !isValidCPF(editingEmployee.cpf) && (
                          <p className="text-xs text-destructive mt-1">CPF inválido</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-employee-hierarchy">Cargo/Hierarquia *</Label>
                      <Select
                        value={editingEmployee.hierarchy || ''}
                        onValueChange={(value) => {
                          // Se selecionar admin, limpar job_title_id pois não é necessário
                          if (value === 'admin') {
                            setEditingEmployee({ ...editingEmployee, hierarchy: value, job_title_id: null });
                          } else {
                            setEditingEmployee({ ...editingEmployee, hierarchy: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                        <SelectContent className="z-[10002]">
                          {availableHierarchies.map((hierarchy) => (
                            <SelectItem key={hierarchy.value} value={hierarchy.value}>
                              {hierarchy.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isAdmin && (
                        <p className="text-xs text-gray-500">
                          Apenas administradores podem criar outros administradores
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-employee-job-title">
                        Cargo {editingEmployee.hierarchy === 'admin' && '(não obrigatório para administradores)'}
                      </Label>
                      <select
                        id="edit-employee-job-title"
                        value={editingEmployee.job_title_id || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, job_title_id: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={editingEmployee.hierarchy === 'admin'}
                      >
                        <option value="">
                          {editingEmployee.hierarchy === 'admin' ? 'Acesso total - cargo não necessário' : 'Selecione um cargo...'}
                        </option>
                        {jobTitles.map((jobTitle) => (
                          <option key={jobTitle.id} value={jobTitle.id}>
                            {jobTitle.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-employee-team">Time</Label>
                      <Select
                        value={editingEmployee.team_id || ''}
                        onValueChange={(value) =>
                          setEditingEmployee({ ...editingEmployee, team_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um time (opcional)" />
                        </SelectTrigger>
                        <SelectContent className="z-[10002]">
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditDialogOpen(false);
                          setEditingEmployee(null);
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs: Times e Colaboradores */}
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="teams">
              Times {teams.length > 0 && <span className="ml-1">({teams.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="employees">
              Colaboradores {employees.length > 0 && <span className="ml-1">({employees.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Times */}
          <TabsContent value="teams" className="mt-6">
            {isLoading ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : teams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum time cadastrado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Comece criando times para organizar sua equipe
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="group hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-[#2db4af] flex items-center justify-center">
                            <UsersIcon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-lg">{team.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTeam(team);
                            setDeletingEmployee(null);
                            setTimeout(() => setShowDeleteDialog(true), 50);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {team.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {team.description}
                        </p>
                      )}

                      <div className="space-y-3 pt-3 border-t">
                        {team.managers && team.managers.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500">
                              {team.managers.length === 1 ? 'Gerente' : `Gerentes (${team.managers.length})`}
                            </p>
                            <div className="space-y-2">
                              {team.managers.slice(0, 2).map((manager) => (
                                <div key={manager.id} className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={manager.avatar_url || undefined} />
                                    <AvatarFallback className="bg-[#2db4af] text-white text-xs">
                                      {getInitials(manager.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {manager.full_name}
                                  </p>
                                </div>
                              ))}
                              {team.managers.length > 2 && (
                                <p className="text-xs text-gray-500 pl-9">
                                  + {team.managers.length - 2} {team.managers.length - 2 === 1 ? 'outro' : 'outros'}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : team.manager ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={team.manager.avatar_url || undefined} />
                              <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                                {getInitials(team.manager.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500">Gerente</p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {team.manager.full_name}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Sem gerente atribuído</div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-gray-500">Membros</span>
                          <Badge variant="secondary" className="bg-[#2db4af]/10 text-[#2db4af] hover:bg-[#2db4af]/20">
                            {team.member_count || 0} {(team.member_count || 0) === 1 ? 'membro' : 'membros'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Colaboradores */}
          <TabsContent value="employees" className="mt-6">
            {/* Barra de Busca e Filtros */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Busca */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filtro por Time */}
                <Select value={filterTeam || 'all'} onValueChange={(value) => setFilterTeam(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todos os times" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os times</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro por Cargo */}
                <Select value={filterHierarchy || 'all'} onValueChange={(value) => setFilterHierarchy(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {HIERARCHIES.map((hierarchy) => (
                      <SelectItem key={hierarchy.value} value={hierarchy.value}>
                        {hierarchy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botão Limpar Filtros */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={clearFilters}
                    className="shrink-0"
                    title="Limpar filtros"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Contador de resultados */}
              {hasActiveFilters && (
                <p className="text-sm text-gray-600">
                  {filteredEmployees.length} {filteredEmployees.length === 1 ? 'colaborador encontrado' : 'colaboradores encontrados'}
                </p>
              )}
            </div>

            {employees.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum colaborador cadastrado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Cadastre colaboradores para sua equipe
                  </p>
                </CardContent>
              </Card>
            ) : filteredEmployees.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum colaborador encontrado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Tente ajustar os filtros de busca
                  </p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                  >
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredEmployees.map((employee) => (
                  <Card key={employee.id} className="group hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback className="bg-[#2db4af] text-white">
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {employee.full_name}
                          </h3>
                          {employee.job_title && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {employee.job_title.name}
                            </Badge>
                          )}
                          {employee.phone && (
                            <p className="text-xs text-gray-500 mt-1">{employee.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEmployee(employee)}
                            className="h-8 w-8 text-gray-600 hover:text-[#2db4af]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingEmployee(employee);
                              setDeletingTeam(null);
                              setTimeout(() => setShowDeleteDialog(true), 50);
                            }}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex flex-wrap gap-2">
                          {employee.hierarchy && (
                            <Badge variant="outline" className="text-xs">
                              {getHierarchyLabel(employee.hierarchy)}
                            </Badge>
                          )}
                          {employee.team && (
                            <Badge className="bg-[#2db4af]/10 text-[#2db4af] hover:bg-[#2db4af]/20 text-xs">
                              {employee.team.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* AlertDialog Único para Deletar (Time ou Colaborador) */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setDeletingTeam(null);
            setDeletingEmployee(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente{' '}
              {deletingTeam ? (
                <>o time <span className="font-semibold">{deletingTeam.name}</span>.</>
              ) : deletingEmployee ? (
                <>o colaborador <span className="font-semibold">{deletingEmployee.full_name}</span>.</>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingTeam(null);
                setDeletingEmployee(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTeam) {
                  handleDeleteTeam();
                } else if (deletingEmployee) {
                  handleDeleteEmployee();
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
