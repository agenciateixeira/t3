import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Pipeline, PipelineFormData } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Smile } from 'lucide-react';

interface PipelineDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  pipeline?: Pipeline | null;
}

const DEFAULT_STAGES = [
  { name: 'Prospecção', color: '#94a3b8', stage_type: 'active' },
  { name: 'Qualificação', color: '#3b82f6', stage_type: 'active' },
  { name: 'Proposta', color: '#8b5cf6', stage_type: 'active' },
  { name: 'Negociação', color: '#f59e0b', stage_type: 'active' },
  { name: 'Fechado - Ganho', color: '#10b981', stage_type: 'won' },
  { name: 'Fechado - Perdido', color: '#ef4444', stage_type: 'lost' },
];

const ICON_OPTIONS = [
  '💼', '💰', '🎯', '📊', '🚀', '⭐',
  '🏆', '📈', '💡', '🎨', '🛠️', '📱',
  '💻', '🌟', '🔥', '⚡', '🎪', '🎭',
  '🎬', '🎮', '🏅', '🎓', '💎', '🌈',
];

export default function PipelineDialog({
  open,
  onClose,
  onSuccess,
  pipeline,
}: PipelineDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [formData, setFormData] = useState<PipelineFormData>({
    name: '',
    description: '',
    icon: '💼',
    color: '#2db4af',
  });

  useEffect(() => {
    if (pipeline) {
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        icon: pipeline.icon || '💼',
        color: pipeline.color,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '💼',
        color: '#2db4af',
      });
    }
  }, [pipeline, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called');
    console.log('Form data:', formData);

    if (!formData.name || formData.name.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome do pipeline é obrigatório.',
      });
      return;
    }

    setIsLoading(true);
    console.log('Loading set to true');

    try {
      // Get user's team_id from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      if (pipeline) {
        // Update existing pipeline
        const { error } = await supabase
          .from('pipelines')
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon || null,
            color: formData.color || '#2db4af',
          })
          .eq('id', pipeline.id);

        if (error) throw error;

        toast({
          title: 'Pipeline atualizado!',
          description: 'As informações foram salvas com sucesso.',
        });
      } else {
        // Create new pipeline
        console.log('Creating pipeline with data:', {
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon || '💼',
          color: formData.color || '#2db4af',
          created_by: user?.id,
          team_id: profileData.team_id,
          is_active: true,
        });

        const { data: pipelineData, error: pipelineError } = await supabase
          .from('pipelines')
          .insert([
            {
              name: formData.name,
              description: formData.description || null,
              icon: formData.icon || '💼',
              color: formData.color || '#2db4af',
              created_by: user?.id,
              team_id: profileData.team_id,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (pipelineError) {
          console.error('Pipeline creation error:', pipelineError);
          throw pipelineError;
        }

        console.log('Pipeline created successfully:', pipelineData);

        // Create default stages for new pipeline
        const stagesToCreate = DEFAULT_STAGES.map((stage, index) => ({
          pipeline_id: pipelineData.id,
          name: stage.name,
          color: stage.color,
          position: index,
          stage_type: stage.stage_type,
          is_final: stage.stage_type === 'won' || stage.stage_type === 'lost',
        }));

        console.log('Creating stages:', stagesToCreate);

        const { error: stagesError } = await supabase
          .from('pipeline_stages')
          .insert(stagesToCreate);

        if (stagesError) {
          console.error('Stages creation error:', stagesError);
          throw stagesError;
        }

        console.log('Stages created successfully');

        toast({
          title: 'Pipeline criado!',
          description: `${formData.name} foi criado com 6 etapas padrão.`,
        });
      }

      if (onSuccess) {
        await onSuccess();
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar pipeline',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {pipeline ? 'Editar Pipeline' : 'Criar Novo Pipeline'}
          </DialogTitle>
          <DialogDescription>
            {pipeline
              ? 'Edite as informações do pipeline'
              : 'Configure um novo pipeline para gerenciar suas oportunidades'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome do Pipeline <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ex: Vendas, Projetos, Recrutamento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o objetivo deste pipeline..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Ícone</Label>
            <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 border rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span className="text-3xl">{formData.icon || '💼'}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-700">
                      {formData.icon ? 'Ícone selecionado' : 'Escolher ícone'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Clique para escolher ou digite um emoji
                    </p>
                  </div>
                  <Smile className="h-4 w-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-2 block">
                      Escolha um ícone
                    </Label>
                    <div className="grid grid-cols-8 gap-2">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, icon });
                            setIconPopoverOpen(false);
                          }}
                          className={`text-2xl p-2 rounded hover:bg-gray-100 transition-colors ${
                            formData.icon === icon
                              ? 'bg-[#2db4af] ring-2 ring-[#2db4af] ring-offset-1'
                              : 'bg-white border'
                          }`}
                          title={icon}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <Label htmlFor="custom-icon" className="text-xs text-gray-600 mb-1 block">
                      Ou digite um emoji personalizado
                    </Label>
                    <Input
                      id="custom-icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Digite aqui..."
                      maxLength={2}
                      className="text-xl text-center"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 p-1"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#2db4af"
                className="flex-1"
              />
            </div>
          </div>

          {!pipeline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium mb-1">
                📋 Etapas padrão incluídas:
              </p>
              <p className="text-xs text-blue-700">
                Prospecção → Qualificação → Proposta → Negociação → Fechado (Ganho/Perdido)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Você poderá personalizar as etapas depois de criar o pipeline.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#2db4af] hover:bg-[#28a39e]"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pipeline ? 'Salvar' : 'Criar Pipeline'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
