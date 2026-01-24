import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, Building2, Mail, Phone, Globe, LayoutGrid, List, X } from 'lucide-react';
import { useToastContext } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import ClientDialog from '@/components/clients/ClientDialog';
import { Badge } from '@/components/ui/badge';
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

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToastContext();
  const { profile } = useAuth();

  // Controle de permissões
  const canCreateClient = profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager';

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtros combinados
  useEffect(() => {
    let filtered = clients;

    // Filtro de busca
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.description?.toLowerCase().includes(query) ||
          client.contact_email?.toLowerCase().includes(query)
      );
    }

    // Filtro por serviço
    if (filterService) {
      filtered = filtered.filter(
        (client) => client.services && client.services.includes(filterService)
      );
    }

    // Filtro por status
    if (filterStatus) {
      filtered = filtered.filter((client) => client.status === filterStatus);
    }

    setFilteredClients(filtered);
  }, [searchQuery, filterService, filterStatus, clients]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          team:teams(id, name),
          responsible:profiles(id, full_name, avatar_url)
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      // Filtrar clientes baseado em hierarquia
      let filteredByHierarchy = data || [];

      if (profile?.hierarchy === 'employee') {
        // Employee vê apenas clientes que ele é responsável
        filteredByHierarchy = filteredByHierarchy.filter(client =>
          client.responsible_id === profile.id
        );
      } else if (profile?.hierarchy === 'team_manager') {
        // Team manager vê clientes do seu time
        filteredByHierarchy = filteredByHierarchy.filter(client =>
          client.team_id === profile.team_id
        );
      }
      // Admin vê todos

      setClients(filteredByHierarchy);
      setFilteredClients(filteredByHierarchy);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clientes',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    const canEdit = profile?.hierarchy === 'admin' ||
                    profile?.hierarchy === 'team_manager' ||
                    (profile?.hierarchy === 'employee' && client.responsible_id === profile.id);

    if (!canEdit) {
      toast({
        variant: 'destructive',
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar este cliente.',
      });
      return;
    }

    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedClient(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedClient(null);
    fetchClients();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Extrair todos os serviços únicos
  const allServices = Array.from(
    new Set(clients.flatMap((client) => client.services || []))
  ).sort();

  // Limpar filtros
  const clearFilters = () => {
    setSearchQuery('');
    setFilterService('');
    setFilterStatus('');
  };

  const hasActiveFilters = searchQuery !== '' || filterService !== '' || filterStatus !== '';

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Clientes</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gerencie seus clientes e projetos
          </p>
        </div>

        {/* Actions bar */}
        <div className="space-y-4 mb-6">
          {/* Linha 1: Toggle View + Busca + Novo Cliente */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Toggle Card/Tabela */}
            <div className="flex rounded-lg border border-gray-200 p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-[#2db4af] hover:bg-[#28a39e]' : ''}
              >
                <List className="h-4 w-4 mr-2" />
                Tabela
              </Button>
            </div>

            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, descrição ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Botão Novo Cliente */}
            {canCreateClient && (
              <Button
                onClick={handleCreate}
                className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            )}
          </div>

          {/* Linha 2: Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtro por Serviço */}
            <Select value={filterService || 'all'} onValueChange={(value) => setFilterService(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todos os serviços" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os serviços</SelectItem>
                {allServices.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Status */}
            <Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>

            {/* Botão Limpar Filtros */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            )}

            {/* Contador de resultados */}
            {hasActiveFilters && (
              <div className="flex items-center text-sm text-gray-600">
                {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
              </div>
            )}
          </div>
        </div>

        {/* Clients content */}
        {isLoading ? (
          viewMode === 'cards' ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-16 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? 'Tente usar outros termos de busca'
                  : 'Comece adicionando seu primeiro cliente'}
              </p>
              {!searchQuery && canCreateClient && (
                <Button
                  onClick={handleCreate}
                  className="bg-[#2db4af] hover:bg-[#28a39e] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEdit(client)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={client.logo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#2db4af] to-[#28a39e] text-white text-lg">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{client.name}</CardTitle>
                      {client.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {client.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{client.contact_email}</span>
                    </div>
                  )}
                  {client.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{client.contact_phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{client.website}</span>
                    </div>
                  )}
                  {client.services && client.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {client.services.slice(0, 3).map((service, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-[#2db4af]/10 text-[#2db4af] text-xs font-medium"
                        >
                          {service}
                        </span>
                      ))}
                      {client.services.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                          +{client.services.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Team and Responsible info */}
                  {(client.team || client.responsible) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {client.team && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Time:</span> {client.team.name}
                        </div>
                      )}
                      {client.responsible && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Resp.:</span> {client.responsible.full_name}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Responsável/Time</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEdit(client)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={client.logo_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-[#2db4af] to-[#28a39e] text-white">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{client.name}</p>
                          {client.description && (
                            <p className="text-sm text-gray-500 truncate">{client.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.contact_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{client.contact_email}</span>
                          </div>
                        )}
                        {client.contact_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{client.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.responsible ? (
                          <div className="text-sm text-gray-900">
                            {client.responsible.full_name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                        {client.team && (
                          <div className="text-xs text-gray-500">
                            {client.team.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.services && client.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.services.slice(0, 2).map((service, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="bg-[#2db4af]/10 text-[#2db4af] hover:bg-[#2db4af]/20"
                            >
                              {service}
                            </Badge>
                          ))}
                          {client.services.length > 2 && (
                            <Badge variant="secondary">
                              +{client.services.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === 'active' ? 'default' : 'secondary'}
                        className={
                          client.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      >
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <ClientDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        client={selectedClient}
      />
    </Layout>
  );
}
