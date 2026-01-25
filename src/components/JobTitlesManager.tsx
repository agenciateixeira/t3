import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToastContext } from '@/contexts/ToastContext';
import { Plus, Pencil, Trash2, Briefcase, Lock } from 'lucide-react';
import type { JobTitle } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

export default function JobTitlesManager() {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);
  const [deletingJobTitle, setDeletingJobTitle] = useState<JobTitle | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { toast } = useToastContext();

  useEffect(() => {
    fetchJobTitles();
  }, []);

  const fetchJobTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('job_titles')
        .select('*')
        .order('name');

      if (error) throw error;
      setJobTitles(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cargos',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (jobTitle?: JobTitle) => {
    if (jobTitle) {
      setEditingJobTitle(jobTitle);
      setFormData({ name: jobTitle.name, description: jobTitle.description || '' });
    } else {
      setEditingJobTitle(null);
      setFormData({ name: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingJobTitle(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'O nome do cargo é obrigatório',
      });
      return;
    }

    try {
      if (editingJobTitle) {
        // Atualizar
        const { error } = await supabase
          .from('job_titles')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          })
          .eq('id', editingJobTitle.id);

        if (error) throw error;

        toast({
          title: 'Cargo atualizado',
          description: 'O cargo foi atualizado com sucesso',
        });
      } else {
        // Criar
        const { error } = await supabase
          .from('job_titles')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_system: false,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: 'Cargo criado',
          description: 'O cargo foi criado com sucesso',
        });
      }

      fetchJobTitles();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar cargo',
        description: error.message,
      });
    }
  };

  const handleDeleteClick = (jobTitle: JobTitle) => {
    setDeletingJobTitle(jobTitle);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingJobTitle) return;

    try {
      const { error } = await supabase
        .from('job_titles')
        .delete()
        .eq('id', deletingJobTitle.id);

      if (error) throw error;

      toast({
        title: 'Cargo excluído',
        description: 'O cargo foi excluído com sucesso',
      });

      fetchJobTitles();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cargo',
        description: error.message,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingJobTitle(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando cargos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Cargos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os cargos/funções disponíveis para os colaboradores
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobTitles.map((jobTitle) => (
          <Card key={jobTitle.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{jobTitle.name}</CardTitle>
                </div>
                {jobTitle.is_system && (
                  <Lock className="h-4 w-4 text-muted-foreground" title="Cargo do sistema" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {jobTitle.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {jobTitle.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(jobTitle)}
                  className="flex-1"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                {!jobTitle.is_system && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(jobTitle)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingJobTitle ? 'Editar Cargo' : 'Novo Cargo'}
            </DialogTitle>
            <DialogDescription>
              {editingJobTitle ? 'Edite as informações do cargo' : 'Preencha as informações para criar um novo cargo'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cargo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Social Media"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do cargo..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingJobTitle ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Deletar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir o cargo "{deletingJobTitle?.name}".
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingJobTitle(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
