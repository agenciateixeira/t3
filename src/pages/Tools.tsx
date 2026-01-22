import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, ExternalLink, Trash2, Search, Filter, X, Key } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string | null;
  category: string | null;
  instructions: string | null;
  required_hierarchy: string[];
  credentials: {
    login?: string;
    password?: string;
    api_key?: string;
    notes?: string;
  } | null;
  created_at: string;
}

const HIERARCHIES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'team_manager', label: 'Gerente de Time' },
  { value: 'strategy', label: 'Estratégia' },
  { value: 'traffic_manager', label: 'Gestor de Tráfego' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'designer', label: 'Designer' },
  { value: 'audiovisual', label: 'Audiovisual' },
];

export default function Tools() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    category: '',
    instructions: '',
    required_hierarchy: [] as string[],
    credentials: {
      login: '',
      password: '',
      api_key: '',
      notes: '',
    },
  });

  // Estados para filtros avançados
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');

  // Verifica se o usuário pode gerenciar ferramentas (apenas admin e team_manager)
  const canManageTools = profile?.hierarchy === 'admin' || profile?.hierarchy === 'team_manager';

  // Filtra ferramentas do setor do usuário
  const userSectorTools = tools.filter((tool) => {
    if (!profile?.hierarchy) return false;
    return tool.required_hierarchy.includes(profile.hierarchy);
  });

  // Extrai categorias únicas
  const categories = Array.from(new Set(userSectorTools.map(t => t.category || 'Sem Categoria'))).sort();

  // Extrai setores/serviços únicos (do required_hierarchy)
  const services = Array.from(
    new Set(
      userSectorTools.flatMap(t => t.required_hierarchy)
    )
  ).sort();

  // Aplica filtros avançados
  const filteredTools = userSectorTools.filter((tool) => {
    // Filtro de busca inteligente (nome, descrição, instruções)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      tool.name.toLowerCase().includes(searchLower) ||
      tool.description.toLowerCase().includes(searchLower) ||
      (tool.instructions && tool.instructions.toLowerCase().includes(searchLower)) ||
      (tool.category && tool.category.toLowerCase().includes(searchLower));

    // Filtro de categoria
    const matchesCategory = selectedCategory === 'all' ||
      (tool.category || 'Sem Categoria') === selectedCategory;

    // Filtro de serviço/setor
    const matchesService = selectedService === 'all' ||
      tool.required_hierarchy.includes(selectedService);

    return matchesSearch && matchesCategory && matchesService;
  });

  // Agrupa ferramentas por categoria/setor
  const groupedTools = filteredTools.reduce((acc, tool) => {
    const category = tool.category || 'Sem Categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  useEffect(() => {
    fetchTools();

    // Real-time subscription for tools
    const channel = supabase
      .channel('tools-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tools',
        },
        () => {
          fetchTools();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar ferramentas',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHierarchyChange = (hierarchy: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        required_hierarchy: [...formData.required_hierarchy, hierarchy],
      });
    } else {
      setFormData({
        ...formData,
        required_hierarchy: formData.required_hierarchy.filter((h) => h !== hierarchy),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepara as credenciais apenas se houver algum campo preenchido
      const hasCredentials = formData.credentials.login ||
                            formData.credentials.password ||
                            formData.credentials.api_key ||
                            formData.credentials.notes;

      const { error } = await supabase.from('tools').insert({
        name: formData.name,
        description: formData.description,
        url: formData.url || null,
        category: formData.category,
        instructions: formData.instructions,
        required_hierarchy: formData.required_hierarchy,
        credentials: hasCredentials ? formData.credentials : null,
      });

      if (error) throw error;

      toast({
        title: 'Ferramenta cadastrada!',
        description: 'A ferramenta foi adicionada com sucesso.',
      });

      // Limpar formulário
      setFormData({
        name: '',
        description: '',
        url: '',
        category: '',
        instructions: '',
        required_hierarchy: [],
        credentials: {
          login: '',
          password: '',
          api_key: '',
          notes: '',
        },
      });

      setIsDialogOpen(false);
      fetchTools();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar ferramenta',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ferramenta?')) return;

    try {
      const { error } = await supabase.from('tools').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Ferramenta excluída!',
        description: 'A ferramenta foi removida com sucesso.',
      });

      fetchTools();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir ferramenta',
        description: error.message,
      });
    }
  };

  const getHierarchyLabel = (value: string) => {
    return HIERARCHIES.find((h) => h.value === value)?.label || value;
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ferramentas</h1>
            <p className="text-gray-600">Ferramentas disponíveis para o seu setor</p>
          </div>

          {canManageTools && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2db4af] hover:bg-[#28a39e]">
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Ferramenta
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Ferramenta</DialogTitle>
                <DialogDescription>
                  Preencha as informações da ferramenta e selecione quais setores terão acesso
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Ferramenta *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Meta Ads, Canva, Google Analytics"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva brevemente a ferramenta"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL de Acesso</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Tráfego, Design, Social Media"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instruções de Uso</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Como a ferramenta deve ser utilizada no dia a dia..."
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Setores com Acesso *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {HIERARCHIES.map((hierarchy) => (
                      <div key={hierarchy.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={hierarchy.value}
                          checked={formData.required_hierarchy.includes(hierarchy.value)}
                          onCheckedChange={(checked) =>
                            handleHierarchyChange(hierarchy.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={hierarchy.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {hierarchy.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credenciais de Acesso */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-600" />
                    <Label className="text-base font-semibold">Credenciais de Acesso (Opcional)</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cred-login">Login / Usuário</Label>
                      <Input
                        id="cred-login"
                        value={formData.credentials.login}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, login: e.target.value }
                        })}
                        placeholder="usuario@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cred-password">Senha</Label>
                      <Input
                        id="cred-password"
                        type="password"
                        value={formData.credentials.password}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, password: e.target.value }
                        })}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cred-api">API Key / Token</Label>
                    <Input
                      id="cred-api"
                      value={formData.credentials.api_key}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, api_key: e.target.value }
                      })}
                      placeholder="token_abc123xyz"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cred-notes">Observações</Label>
                    <Textarea
                      id="cred-notes"
                      value={formData.credentials.notes}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, notes: e.target.value }
                      })}
                      placeholder="Informações adicionais sobre o acesso..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
                    disabled={isSubmitting || formData.required_hierarchy.length === 0}
                  >
                    {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Filtros Avançados */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca Inteligente */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome, descrição ou categoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filtro por Categoria */}
              <div className="w-full lg:w-64">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Categoria" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Setor/Serviço */}
              <div className="w-full lg:w-64">
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Setor" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Setores</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {HIERARCHIES.find(h => h.value === service)?.label || service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contador de Resultados */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                {filteredTools.length} {filteredTools.length === 1 ? 'ferramenta encontrada' : 'ferramentas encontradas'}
              </span>
              {(searchQuery || selectedCategory !== 'all' || selectedService !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedService('all');
                  }}
                  className="text-[#2db4af] hover:text-[#259a94]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Ferramentas Agrupadas por Setor */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando ferramentas...</div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Nenhuma ferramenta disponível para o seu setor</p>
            <p className="text-sm">Entre em contato com o administrador para mais informações</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTools).map(([category, categoryTools]) => (
              <div key={category}>
                {/* Cabeçalho do Setor */}
                <div className="mb-4 pb-2 border-b-2 border-[#2db4af]">
                  <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {categoryTools.length} {categoryTools.length === 1 ? 'ferramenta' : 'ferramentas'}
                  </p>
                </div>

                {/* Grid de Ferramentas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryTools.map((tool) => (
                    <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{tool.name}</CardTitle>
                          </div>
                          {canManageTools && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tool.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <CardDescription className="mt-2 line-clamp-2">
                          {tool.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {tool.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(tool.url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Acessar Ferramenta
                          </Button>
                        )}

                        {tool.instructions && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-gray-700 mb-1">Instruções:</p>
                            <p className="text-xs text-gray-600 line-clamp-3">{tool.instructions}</p>
                          </div>
                        )}

                        {/* Credenciais - Apenas para ADMIN e GERENTE */}
                        {canManageTools && tool.credentials && (
                          <div className="pt-2 border-t bg-yellow-50 -mx-6 -mb-6 p-4 rounded-b-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Key className="h-4 w-4 text-yellow-700" />
                              <p className="text-xs font-semibold text-yellow-900">Credenciais de Acesso</p>
                            </div>
                            <div className="space-y-2 text-xs">
                              {tool.credentials.login && (
                                <div>
                                  <span className="font-medium text-yellow-800">Login:</span>
                                  <span className="ml-2 text-yellow-900 font-mono">{tool.credentials.login}</span>
                                </div>
                              )}
                              {tool.credentials.password && (
                                <div>
                                  <span className="font-medium text-yellow-800">Senha:</span>
                                  <span className="ml-2 text-yellow-900 font-mono">{tool.credentials.password}</span>
                                </div>
                              )}
                              {tool.credentials.api_key && (
                                <div>
                                  <span className="font-medium text-yellow-800">API Key:</span>
                                  <span className="ml-2 text-yellow-900 font-mono break-all">{tool.credentials.api_key}</span>
                                </div>
                              )}
                              {tool.credentials.notes && (
                                <div>
                                  <span className="font-medium text-yellow-800">Obs:</span>
                                  <span className="ml-2 text-yellow-900">{tool.credentials.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
