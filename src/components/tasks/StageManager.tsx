import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PipelineStage, PipelineStageType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

interface StageManagerProps {
  open: boolean;
  onClose: () => void;
  pipelineId: string;
  stages: PipelineStage[];
  onUpdate: () => void;
}

const STAGE_COLORS = [
  '#94a3b8', // Gray
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#10b981', // Green
  '#ef4444', // Red
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export default function StageManager({
  open,
  onClose,
  pipelineId,
  stages: initialStages,
  onUpdate,
}: StageManagerProps) {
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [newStageType, setNewStageType] = useState<PipelineStageType>('active');

  useEffect(() => {
    if (open) {
      setStages([...initialStages]);
    }
  }, [open, initialStages]);

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome da etapa é obrigatório.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const maxPosition = stages.length > 0
        ? Math.max(...stages.map(s => s.position))
        : 0;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert([
          {
            pipeline_id: pipelineId,
            name: newStageName,
            color: newStageColor,
            position: maxPosition + 1,
            stage_type: newStageType,
            is_final: newStageType === 'won' || newStageType === 'lost',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setStages([...stages, data]);
      setNewStageName('');
      setNewStageColor(STAGE_COLORS[0]);
      setNewStageType('active');

      toast({
        title: 'Etapa adicionada',
        description: 'A etapa foi adicionada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error adding stage:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar etapa',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<PipelineStage>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update(updates)
        .eq('id', stageId);

      if (error) throw error;

      setStages(stages.map(s => s.id === stageId ? { ...s, ...updates } : s));

      toast({
        title: 'Etapa atualizada',
        description: 'A etapa foi atualizada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating stage:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar etapa',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    setIsLoading(true);
    try {
      // Check if stage has deals
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id')
        .eq('stage_id', stageId)
        .limit(1);

      if (dealsError) throw dealsError;

      if (deals && deals.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Não é possível excluir',
          description: 'Esta etapa possui oportunidades. Mova-as para outra etapa primeiro.',
        });
        setDeleteStageId(null);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      setStages(stages.filter(s => s.id !== stageId));

      toast({
        title: 'Etapa excluída',
        description: 'A etapa foi excluída com sucesso.',
      });
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir etapa',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      setDeleteStageId(null);
    }
  };

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    const currentIndex = stages.findIndex(s => s.id === stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const newStages = [...stages];
    [newStages[currentIndex], newStages[newIndex]] = [newStages[newIndex], newStages[currentIndex]];

    setStages(newStages);

    // Update positions in database
    setIsLoading(true);
    try {
      const updates = newStages.map((stage, index) => ({
        id: stage.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('pipeline_stages')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      toast({
        title: 'Ordem atualizada',
        description: 'A ordem das etapas foi atualizada.',
      });
    } catch (error: any) {
      console.error('Error reordering stages:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao reordenar',
        description: error.message,
      });
      // Revert on error
      setStages([...initialStages]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onUpdate();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Etapas do Pipeline</DialogTitle>
            <DialogDescription>
              Adicione, edite ou reordene as etapas do seu pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Stage */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Adicionar Nova Etapa</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="new-stage-name">Nome</Label>
                  <Input
                    id="new-stage-name"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Ex: Negociação"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="new-stage-type">Tipo</Label>
                  <Select
                    value={newStageType}
                    onValueChange={(value) => setNewStageType(value as PipelineStageType)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddStage}
                    disabled={isLoading}
                    className="w-full bg-[#2db4af] hover:bg-[#28a39e]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2">
                  {STAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewStageColor(color)}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        newStageColor === color
                          ? 'border-[#2db4af] ring-2 ring-[#2db4af] ring-offset-1'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Existing Stages */}
            <div className="space-y-2">
              <h3 className="font-semibold">Etapas Existentes</h3>
              {stages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma etapa adicionada ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                    >
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <Input
                          value={stage.name}
                          onChange={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== stage.name) {
                              handleUpdateStage(stage.id, { name: e.target.value.trim() });
                            }
                          }}
                          className="font-medium"
                          disabled={isLoading}
                        />
                      </div>
                      <Select
                        value={stage.stage_type}
                        onValueChange={(value) =>
                          handleUpdateStage(stage.id, {
                            stage_type: value as PipelineStageType,
                            is_final: value === 'won' || value === 'lost',
                          })
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativa</SelectItem>
                          <SelectItem value="won">Ganho</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveStage(stage.id, 'up')}
                          disabled={index === 0 || isLoading}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveStage(stage.id, 'down')}
                          disabled={index === stages.length - 1 || isLoading}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteStageId(stage.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStageId} onOpenChange={() => setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta etapa? Esta ação não pode ser desfeita.
              {'\n\n'}
              Nota: Etapas com oportunidades não podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStageId && handleDeleteStage(deleteStageId)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
