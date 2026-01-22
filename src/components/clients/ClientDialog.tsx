import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Client, ClientFormData, Profile, Team } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Upload, X } from 'lucide-react';
import { DeleteClientDialog } from './DeleteClientDialog';

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}

// Serviços comuns pré-definidos
const COMMON_SERVICES = [
  'Social Media',
  'Design',
  'Tráfego Pago',
  'SEO',
  'Desenvolvimento Web',
  'Branding',
  'Copywriting',
  'E-mail Marketing',
  'Consultoria',
  'Produção de Conteúdo',
  'Fotografia',
  'Videomaking',
];

export default function ClientDialog({ open, onClose, client }: ClientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    description: '',
    logo_url: '',
    cnpj: '',
    razao_social: '',
    endereco: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_value: undefined,
    company_phone: '',
    responsible_phone: '',
    responsible_name: '',
    responsible_id: '',
    team_id: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    services: [],
    status: 'active',
  });
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [newService, setNewService] = useState('');

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch employees and teams
  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchTeams();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar colaboradores:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar times:', error);
    }
  };

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        description: client.description || '',
        logo_url: client.logo_url || '',
        cnpj: client.cnpj || '',
        razao_social: client.razao_social || '',
        endereco: client.endereco || '',
        contract_start_date: client.contract_start_date ? client.contract_start_date.split('T')[0] : '',
        contract_end_date: client.contract_end_date ? client.contract_end_date.split('T')[0] : '',
        contract_value: client.contract_value || undefined,
        company_phone: client.company_phone || '',
        responsible_phone: client.responsible_phone || '',
        responsible_name: client.responsible_name || '',
        responsible_id: client.responsible_id || '',
        team_id: client.team_id || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        website: client.website || '',
        services: client.services || [],
        status: client.status || 'active',
      });
      setLogoFile(null);
      setNewService('');
    } else {
      setFormData({
        name: '',
        description: '',
        logo_url: '',
        cnpj: '',
        razao_social: '',
        endereco: '',
        contract_start_date: '',
        contract_end_date: '',
        contract_value: undefined,
        company_phone: '',
        responsible_phone: '',
        responsible_name: '',
        responsible_id: '',
        team_id: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        services: [],
        status: 'active',
      });
      setLogoFile(null);
      setNewService('');
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate CNPJ uniqueness if provided
      if (formData.cnpj) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('cnpj', formData.cnpj)
          .neq('id', client?.id || '')
          .single();

        if (existingClient) {
          toast({
            variant: 'destructive',
            title: 'CNPJ já cadastrado',
            description: 'Já existe um cliente com este CNPJ no sistema.',
          });
          setIsLoading(false);
          return;
        }
      }

      let logo_url = formData.logo_url;

      // Upload logo if a new file was selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('client-logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('client-logos')
          .getPublicUrl(fileName);

        logo_url = publicUrl;

        // Delete old logo if updating and had one
        if (client?.logo_url) {
          const oldFileName = client.logo_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage.from('client-logos').remove([oldFileName]);
          }
        }
      }

      // Get responsible name from selected employee
      let responsible_name = formData.responsible_name;
      if (formData.responsible_id) {
        const selectedEmployee = employees.find((e) => e.id === formData.responsible_id);
        if (selectedEmployee) {
          responsible_name = selectedEmployee.full_name;
        }
      }

      const dataToSave = {
        name: formData.name,
        description: formData.description || null,
        logo_url: logo_url || null,
        cnpj: formData.cnpj || null,
        razao_social: formData.razao_social || null,
        endereco: formData.endereco || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        contract_value: formData.contract_value || null,
        company_phone: formData.company_phone || null,
        responsible_phone: formData.responsible_phone || null,
        responsible_name: responsible_name || null,
        responsible_id: formData.responsible_id || null,
        team_id: formData.team_id || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website: formData.website || null,
        services: formData.services && formData.services.length > 0 ? formData.services : null,
        status: formData.status || 'active',
      };

      console.log('🔍 Dados que serão salvos:', dataToSave);

      if (client) {
        console.log('📝 Atualizando cliente:', client.id);
        const { error, data } = await supabase
          .from('clients')
          .update(dataToSave)
          .eq('id', client.id)
          .select();

        console.log('✅ Resposta do UPDATE:', { error, data });

        if (error) {
          console.error('❌ Erro no UPDATE:', error);
          throw error;
        }

        toast({
          title: 'Cliente atualizado!',
          description: 'As informações foram salvas com sucesso.',
        });
      } else {
        console.log('➕ Criando novo cliente');
        const { error, data } = await supabase.from('clients').insert([dataToSave]).select();

        console.log('✅ Resposta do INSERT:', { error, data });

        if (error) {
          console.error('❌ Erro no INSERT:', error);
          throw error;
        }

        toast({
          title: 'Cliente criado!',
          description: 'O cliente foi adicionado com sucesso.',
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar cliente',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.from('clients').delete().eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Cliente excluído!',
        description: 'O cliente foi removido com sucesso.',
      });

      setShowDeleteAlert(false);
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cliente',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
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

  const handleAddService = () => {
    if (newService.trim() && !formData.services?.includes(newService.trim())) {
      setFormData({
        ...formData,
        services: [...(formData.services || []), newService.trim()],
      });
      setNewService('');
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    setFormData({
      ...formData,
      services: (formData.services || []).filter((s) => s !== serviceToRemove),
    });
  };

  return (
    <>
      {/* Desktop: Dialog */}
      {!isMobile ? (
        <Dialog open={open && !showDeleteAlert} onOpenChange={onClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-2xl">
                {client ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {client ? 'Atualize as informações do cliente' : 'Preencha os dados para adicionar um novo cliente'}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header with Avatar and Basic Info */}
                <div className="flex flex-col md:flex-row gap-6 md:items-start pb-6 border-b">
                  {/* Logo/Avatar Section */}
                  <div className="flex flex-col items-center gap-3">
                    <Avatar className="h-24 w-24 border-2 border-gray-200">
                      <AvatarImage src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#2db4af] to-[#28a39e] text-white text-2xl">
                        {formData.name ? getInitials(formData.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-center gap-2">
                      <Label htmlFor="logo" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
                          <Upload className="h-3.5 w-3.5" />
                          Alterar Logo
                        </div>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setLogoFile(file);
                          }}
                          className="hidden"
                        />
                      </Label>
                      {logoFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogoFile(null)}
                          className="text-xs text-gray-500"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Name, Description and Status */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Nome do Cliente <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: Empresa XYZ"
                        className="text-lg font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Breve descrição sobre o cliente..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Label>Status:</Label>
                      <div className="flex gap-2">
                        <Badge
                          variant={formData.status === 'active' ? 'default' : 'outline'}
                          className={
                            formData.status === 'active'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                              : 'cursor-pointer'
                          }
                          onClick={() => setFormData({ ...formData, status: 'active' })}
                        >
                          Ativo
                        </Badge>
                        <Badge
                          variant={formData.status === 'inactive' ? 'default' : 'outline'}
                          className={
                            formData.status === 'inactive'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                              : 'cursor-pointer'
                          }
                          onClick={() => setFormData({ ...formData, status: 'inactive' })}
                        >
                          Inativo
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two-column layout with Accordion sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <Accordion type="single" collapsible defaultValue="servicos">
                      {/* Serviços */}
                      <AccordionItem value="servicos">
                        <AccordionTrigger className="text-base font-semibold">
                          Serviços Contratados
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {/* Select de serviços pré-definidos */}
                            <div className="space-y-2">
                              <Label>Adicionar Serviço</Label>
                              <div className="flex gap-2">
                                <Select
                                  value={newService}
                                  onValueChange={(value) => {
                                    if (value !== 'none' && !formData.services?.includes(value)) {
                                      setFormData({
                                        ...formData,
                                        services: [...(formData.services || []), value],
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um serviço" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Selecione...</SelectItem>
                                    {COMMON_SERVICES.map((service) => (
                                      <SelectItem
                                        key={service}
                                        value={service}
                                        disabled={formData.services?.includes(service)}
                                      >
                                        {service}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Input para serviço customizado */}
                            <div className="space-y-2">
                              <Label>Ou adicione um serviço customizado</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={newService}
                                  onChange={(e) => setNewService(e.target.value)}
                                  placeholder="Digite o nome do serviço"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddService();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  onClick={handleAddService}
                                  disabled={!newService.trim()}
                                  size="sm"
                                  className="bg-[#2db4af] hover:bg-[#28a39e]"
                                >
                                  Adicionar
                                </Button>
                              </div>
                            </div>

                            {/* Lista de serviços selecionados */}
                            {formData.services && formData.services.length > 0 && (
                              <div className="space-y-2">
                                <Label>Serviços Selecionados</Label>
                                <div className="flex flex-wrap gap-2">
                                  {formData.services.map((service) => (
                                    <Badge
                                      key={service}
                                      variant="secondary"
                                      className="bg-[#2db4af]/10 text-[#2db4af] hover:bg-[#2db4af]/20"
                                    >
                                      {service}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveService(service)}
                                        className="ml-1 rounded-full outline-none hover:bg-[#2db4af]/30"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Responsável e Time */}
                      <AccordionItem value="responsavel">
                        <AccordionTrigger className="text-base font-semibold">
                          Responsável e Time
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="responsible_id">Colaborador Responsável</Label>
                              <Select
                                value={formData.responsible_id || 'none'}
                                onValueChange={(value) => setFormData({ ...formData, responsible_id: value === 'none' ? '' : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {employees.map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id}>
                                      {employee.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="team_id">Time Responsável</Label>
                              <Select
                                value={formData.team_id || 'none'}
                                onValueChange={(value) => setFormData({ ...formData, team_id: value === 'none' ? '' : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um time" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Dados da Empresa */}
                      <AccordionItem value="empresa">
                        <AccordionTrigger className="text-base font-semibold">
                          Dados da Empresa
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="cnpj">CNPJ</Label>
                                <Input
                                  id="cnpj"
                                  value={formData.cnpj}
                                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                  placeholder="00.000.000/0000-00"
                                  maxLength={18}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="razao_social">Razão Social</Label>
                                <Input
                                  id="razao_social"
                                  value={formData.razao_social}
                                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                                  placeholder="Razão Social da empresa"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="endereco">Endereço</Label>
                              <Input
                                id="endereco"
                                value={formData.endereco}
                                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                placeholder="Endereço completo"
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Contrato */}
                      <AccordionItem value="contrato">
                        <AccordionTrigger className="text-base font-semibold">
                          Informações de Contrato
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="contract_start_date">Início do Contrato</Label>
                                <Input
                                  id="contract_start_date"
                                  type="date"
                                  value={formData.contract_start_date}
                                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="contract_end_date">Término do Contrato</Label>
                                <Input
                                  id="contract_end_date"
                                  type="date"
                                  value={formData.contract_end_date}
                                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="contract_value">Valor do Contrato (R$)</Label>
                              <Input
                                id="contract_value"
                                type="number"
                                step="0.01"
                                value={formData.contract_value || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  contract_value: e.target.value ? parseFloat(e.target.value) : undefined
                                })}
                                placeholder="Ex: 5000.00"
                              />
                              <p className="text-xs text-gray-500">
                                Valor mensal ou total negociado do contrato
                              </p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <Accordion type="single" collapsible defaultValue="contato">
                      {/* Contato */}
                      <AccordionItem value="contato">
                        <AccordionTrigger className="text-base font-semibold">
                          Informações de Contato
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="contact_email">E-mail</Label>
                                <Input
                                  id="contact_email"
                                  type="email"
                                  value={formData.contact_email}
                                  onChange={(e) =>
                                    setFormData({ ...formData, contact_email: e.target.value })
                                  }
                                  placeholder="contato@empresa.com"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="contact_phone">Telefone</Label>
                                <Input
                                  id="contact_phone"
                                  value={formData.contact_phone}
                                  onChange={(e) =>
                                    setFormData({ ...formData, contact_phone: e.target.value })
                                  }
                                  placeholder="(11) 99999-9999"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="website">Website</Label>
                              <Input
                                id="website"
                                type="url"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                placeholder="https://www.empresa.com"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="company_phone">Tel. da Empresa</Label>
                                <Input
                                  id="company_phone"
                                  value={formData.company_phone}
                                  onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                                  placeholder="(11) 3333-3333"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="responsible_phone">Tel. do Responsável</Label>
                                <Input
                                  id="responsible_phone"
                                  value={formData.responsible_phone}
                                  onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                                  placeholder="(11) 99999-9999"
                                />
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
                  {client && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteAlert(true)}
                      className="sm:mr-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Cliente
                    </Button>
                  )}
                  <div className="flex gap-2 ml-auto w-full sm:w-auto">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#2db4af] hover:bg-[#28a39e] flex-1 sm:flex-initial"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {client ? 'Salvar Alterações' : 'Criar Cliente'}
                    </Button>
                  </div>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      ) : (
        // Mobile: Drawer
        <Drawer open={open && !showDeleteAlert} onOpenChange={onClose}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader>
              <DrawerTitle className="text-xl">
                {client ? 'Editar Cliente' : 'Novo Cliente'}
              </DrawerTitle>
              <DrawerDescription>
                {client ? 'Atualize as informações do cliente' : 'Preencha os dados para adicionar um novo cliente'}
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="max-h-[calc(95vh-120px)] px-4">
              {/* Same form as desktop - copy paste from above */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Simplified mobile version - just show the essential form */}
                <div className="space-y-4">
                  <Input
                    placeholder="Nome do Cliente *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <p className="text-sm text-gray-500">Use a versão desktop para mais opções</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-[#2db4af] hover:bg-[#28a39e] flex-1">
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      )}

      {/* Delete Confirmation - Rendered outside Dialog/Drawer via Portal */}
      <DeleteClientDialog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
    </>
  );
}
