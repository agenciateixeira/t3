import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Settings as SettingsIcon,
  Building2,
  Shield,
  Bell,
  FileText,
  Upload,
  Loader2,
  Plus,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OrganizationSettings {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  primary_color: string;
  timezone_default: string;
}

interface RolePermission {
  role: string;
  permissions: {
    [key: string]: {
      view?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
    };
  };
  description: string;
}

interface NotificationSettings {
  id: string;
  email_enabled: boolean;
  notify_task_created: boolean;
  notify_task_overdue: boolean;
  notify_pipeline_stage_changed: boolean;
}

interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  created_at: string;
}

export default function Settings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Organization state
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [orgForm, setOrgForm] = useState({
    company_name: '',
    primary_color: '#2db4af',
    timezone_default: 'America/Sao_Paulo',
  });

  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Notifications state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('all');

  // Check if user is admin
  useEffect(() => {
    if (profile && profile.hierarchy !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Apenas administradores podem acessar as configurações.',
      });
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Fetch all data on mount
  useEffect(() => {
    if (profile?.hierarchy === 'admin') {
      fetchOrganizationSettings();
      fetchRolePermissions();
      fetchNotificationSettings();
      fetchAuditLogs();
    }
  }, [profile]);

  // ============================================
  // ORGANIZATION FUNCTIONS
  // ============================================

  const fetchOrganizationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setOrgSettings(data);
        setOrgForm({
          company_name: data.company_name,
          primary_color: data.primary_color,
          timezone_default: data.timezone_default,
        });
      }
    } catch (error: any) {
      console.error('Error fetching org settings:', error);
    }
  };

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !orgSettings) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo de arquivo inválido',
        description: 'Use PNG, JPG, JPEG ou SVG',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'Tamanho máximo: 2MB',
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Delete old logo if exists
      if (orgSettings.company_logo_url) {
        const oldPath = orgSettings.company_logo_url.split('/').slice(-1)[0];
        await supabase.storage.from('org-logos').remove([oldPath]);
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const filePath = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('org-logos')
        .getPublicUrl(filePath);

      // Update organization settings
      const { error: updateError } = await supabase
        .from('organization_settings')
        .update({ company_logo_url: publicUrl })
        .eq('id', orgSettings.id);

      if (updateError) throw updateError;

      setOrgSettings({ ...orgSettings, company_logo_url: publicUrl });

      toast({
        title: 'Logo atualizado!',
        description: 'O logo da empresa foi alterado com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message,
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleSaveOrganization = async () => {
    if (!orgSettings) return;

    setIsLoadingOrg(true);

    try {
      const { error } = await supabase
        .from('organization_settings')
        .update({
          company_name: orgForm.company_name,
          primary_color: orgForm.primary_color,
          timezone_default: orgForm.timezone_default,
        })
        .eq('id', orgSettings.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações da organização foram atualizadas.',
      });

      fetchOrganizationSettings();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsLoadingOrg(false);
    }
  };

  // ============================================
  // PERMISSIONS FUNCTIONS
  // ============================================

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');

      if (error) throw error;

      setRolePermissions(data || []);
      if (data && data.length > 0) {
        setSelectedRole(data[0].role);
      }
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handlePermissionToggle = (role: string, resource: string, action: string, value: boolean) => {
    setRolePermissions(prev =>
      prev.map(rp => {
        if (rp.role === role) {
          return {
            ...rp,
            permissions: {
              ...rp.permissions,
              [resource]: {
                ...rp.permissions[resource],
                [action]: value,
              },
            },
          };
        }
        return rp;
      })
    );
  };

  const handleSavePermissions = async () => {
    setIsLoadingPermissions(true);

    try {
      const updates = rolePermissions.map(rp =>
        supabase
          .from('role_permissions')
          .update({ permissions: rp.permissions })
          .eq('role', rp.role)
      );

      await Promise.all(updates);

      toast({
        title: 'Permissões salvas!',
        description: 'As permissões foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // ============================================
  // NOTIFICATIONS FUNCTIONS
  // ============================================

  const fetchNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNotificationSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const handleSaveNotifications = async () => {
    if (!notificationSettings) return;

    setIsLoadingNotifications(true);

    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({
          email_enabled: notificationSettings.email_enabled,
          notify_task_created: notificationSettings.notify_task_created,
          notify_task_overdue: notificationSettings.notify_task_overdue,
          notify_pipeline_stage_changed: notificationSettings.notify_pipeline_stage_changed,
        })
        .eq('id', notificationSettings.id);

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: 'As preferências de notificação foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // ============================================
  // AUDIT FUNCTIONS
  // ============================================

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAuditLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const filteredAuditLogs = auditFilter === 'all'
    ? auditLogs
    : auditLogs.filter(log => log.entity_type === auditFilter);

  // ============================================
  // RENDER
  // ============================================

  if (profile?.hierarchy !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
                <p className="text-gray-600">Gerencie configurações globais da organização</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="organization" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-100 p-2 rounded-lg">
              <TabsTrigger value="organization" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Building2 className="h-4 w-4 mr-2" />
                Organização
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Shield className="h-4 w-4 mr-2" />
                Permissões
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Bell className="h-4 w-4 mr-2" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-2" />
                Auditoria
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ORGANIZATION */}
            <TabsContent value="organization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Organização</CardTitle>
                  <CardDescription>
                    Configure o nome, logo e preferências gerais da empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
                    <div className="relative">
                      <img
                        src={orgSettings?.company_logo_url || '/logo-sidebar.png'}
                        alt="Company logo"
                        className="h-32 w-32 object-contain rounded-lg border-2 border-gray-200 bg-white p-2"
                      />
                      {isUploadingLogo && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={handleLogoClick}
                      disabled={isUploadingLogo}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {orgSettings?.company_logo_url ? 'Trocar Logo' : 'Fazer Upload do Logo'}
                    </Button>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG ou SVG (máx. 2MB)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Nome da Empresa</Label>
                      <Input
                        id="company_name"
                        value={orgForm.company_name}
                        onChange={(e) => setOrgForm({ ...orgForm, company_name: e.target.value })}
                        placeholder="Nome da sua empresa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Cor Principal</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_color"
                          type="color"
                          value={orgForm.primary_color}
                          onChange={(e) => setOrgForm({ ...orgForm, primary_color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={orgForm.primary_color}
                          onChange={(e) => setOrgForm({ ...orgForm, primary_color: e.target.value })}
                          placeholder="#2db4af"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Fuso Horário Padrão</Label>
                      <Select
                        value={orgForm.timezone_default}
                        onValueChange={(value) => setOrgForm({ ...orgForm, timezone_default: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                          <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                          <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tóquio (GMT+9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveOrganization}
                      disabled={isLoadingOrg}
                      className="bg-[#2db4af] hover:bg-[#28a39e]"
                    >
                      {isLoadingOrg && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PERMISSIONS */}
            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Permissões (RBAC)</CardTitle>
                  <CardDescription>
                    Configure permissões por função/cargo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rolePermissions.length > 0 && (
                    <div className="space-y-6">
                      {/* Role Selector */}
                      <div className="space-y-2">
                        <Label>Selecione a Função</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger className="w-full md:w-96">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {rolePermissions.map((rp) => (
                              <SelectItem key={rp.role} value={rp.role}>
                                {rp.role} - {rp.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Permissions Table */}
                      {selectedRole && (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead>Recurso</TableHead>
                                <TableHead className="text-center">Ver</TableHead>
                                <TableHead className="text-center">Criar</TableHead>
                                <TableHead className="text-center">Editar</TableHead>
                                <TableHead className="text-center">Deletar</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(
                                rolePermissions.find((rp) => rp.role === selectedRole)?.permissions || {}
                              ).map(([resource, perms]) => (
                                <TableRow key={resource}>
                                  <TableCell className="font-medium capitalize">{resource}</TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={perms.view || false}
                                      onCheckedChange={(checked) =>
                                        handlePermissionToggle(selectedRole, resource, 'view', checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={perms.create || false}
                                      onCheckedChange={(checked) =>
                                        handlePermissionToggle(selectedRole, resource, 'create', checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={perms.edit || false}
                                      onCheckedChange={(checked) =>
                                        handlePermissionToggle(selectedRole, resource, 'edit', checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={perms.delete || false}
                                      onCheckedChange={(checked) =>
                                        handlePermissionToggle(selectedRole, resource, 'delete', checked)
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={handleSavePermissions}
                          disabled={isLoadingPermissions}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isLoadingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Salvar Permissões
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: NOTIFICATIONS */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências de Notificações</CardTitle>
                  <CardDescription>
                    Configure as notificações globais do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {notificationSettings && (
                    <>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-gray-600" />
                          <div>
                            <Label className="cursor-pointer">Notificações por E-mail</Label>
                            <p className="text-xs text-gray-500">
                              Ativar envio de e-mails do sistema
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.email_enabled}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, email_enabled: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Plus className="h-5 w-5 text-gray-600" />
                          <div>
                            <Label className="cursor-pointer">Tarefa Criada</Label>
                            <p className="text-xs text-gray-500">
                              Notificar quando uma tarefa é criada
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.notify_task_created}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, notify_task_created: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="h-5 w-5 text-gray-600" />
                          <div>
                            <Label className="cursor-pointer">Tarefa Atrasada</Label>
                            <p className="text-xs text-gray-500">
                              Notificar quando uma tarefa está atrasada
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.notify_task_overdue}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, notify_task_overdue: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Workflow className="h-5 w-5 text-gray-600" />
                          <div>
                            <Label className="cursor-pointer">Mudança de Etapa no Pipeline</Label>
                            <p className="text-xs text-gray-500">
                              Notificar quando um deal muda de etapa
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.notify_pipeline_stage_changed}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, notify_pipeline_stage_changed: checked })
                          }
                        />
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={handleSaveNotifications}
                          disabled={isLoadingNotifications}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {isLoadingNotifications && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Salvar Preferências
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: AUDIT */}
            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Logs de Auditoria</CardTitle>
                      <CardDescription>
                        Histórico de ações realizadas no sistema (somente leitura)
                      </CardDescription>
                    </div>
                    <Select value={auditFilter} onValueChange={setAuditFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as ações</SelectItem>
                        <SelectItem value="task">Tarefas</SelectItem>
                        <SelectItem value="deal">Deals</SelectItem>
                        <SelectItem value="client">Clientes</SelectItem>
                        <SelectItem value="user">Usuários</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAuditLogs.length > 0 ? (
                          filteredAuditLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {new Date(log.created_at).toLocaleString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.actor_user_id || 'Sistema'}
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                  {log.action}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{log.entity_type}</TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {JSON.stringify(log.metadata).substring(0, 50)}...
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12">
                              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600">Nenhum log de auditoria encontrado</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredAuditLogs.length > 0 && (
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      Mostrando os últimos 50 registros
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
