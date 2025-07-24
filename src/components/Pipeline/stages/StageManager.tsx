import React, { useState, useCallback } from 'react';
import { PipelineStage } from '@/types/Pipeline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AnimatedCard } from '@/components/ui/animated-card';
import { GripVertical, Edit, Trash2, Save, Plus } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';

// Interface simplificada para etapas sem sistema de temperatura
interface StageData {
  name: string;
  order_index: number;
  color: string;
  is_system_stage?: boolean;
  description?: string;
}

// Constantes
const SYSTEM_STAGES: StageData[] = [
  { 
    name: 'Lead', 
    color: '#3B82F6', 
    order_index: 0, 
    is_system_stage: true,
    description: 'Etapa inicial onde todos os novos leads são criados.'
  },
  { 
    name: 'Closed Won', 
    color: '#10B981', 
    order_index: 998, 
    is_system_stage: true,
    description: 'Penúltima etapa - leads convertidos em vendas.'
  },
  { 
    name: 'Closed Lost', 
    color: '#EF4444', 
    order_index: 999, 
    is_system_stage: true,
    description: 'Última etapa - leads perdidos ou vendas não concretizadas.'
  },
];

interface UseStageManagerProps {
  initialStages?: StageData[];
  onStagesChange?: (stages: StageData[]) => void;
}

interface UseStageManagerReturn {
  stages: StageData[];
  setStages: React.Dispatch<React.SetStateAction<StageData[]>>;
  editingStage: StageData | null;
  setEditingStage: React.Dispatch<React.SetStateAction<StageData | null>>;
  editStageIndex: number | null;
  setEditStageIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showStageModal: boolean;
  setShowStageModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddStage: () => void;
  handleEditStage: (index: number) => void;
  handleSaveStage: () => void;
  handleDeleteStage: (index: number) => void;
  handleStagesDragEnd: (result: DropResult) => void;
  organizeStages: (stages: StageData[]) => StageData[];
}

export function useStageManager({ 
  initialStages = [], 
  onStagesChange 
}: UseStageManagerProps = {}): UseStageManagerReturn {
  const [stages, setStages] = useState<StageData[]>(initialStages);
  const [editingStage, setEditingStage] = useState<StageData | null>(null);
  const [editStageIndex, setEditStageIndex] = useState<number | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);

  // Função para organizar etapas com sistema no lugar correto
  const organizeStages = (stages: StageData[]) => {
    const nonSystemStages = stages.filter(stage => !stage.is_system_stage);
    const systemStages = stages.filter(stage => stage.is_system_stage);

    // Ordenar etapas não-sistema por order_index
    nonSystemStages.sort((a, b) => a.order_index - b.order_index);
    
    // Reorganizar índices das etapas não-sistema
    const reindexedStages = nonSystemStages.map((stage, index) => ({
      ...stage,
      order_index: index + 1
    }));

    // Encontrar etapas do sistema por nome
    const leadStage = systemStages.find(s => s.name === 'Lead');
    const closedWonStage = systemStages.find(s => s.name === 'Closed Won');
    const closedLostStage = systemStages.find(s => s.name === 'Closed Lost');

    const organized = [];
    
    // Lead sempre primeiro
    if (leadStage) {
      organized.push({ ...leadStage, order_index: 0 });
    }
    
    // Etapas customizadas no meio
    organized.push(...reindexedStages);
    
    // Closed Won penúltimo
    if (closedWonStage) {
      organized.push({ ...closedWonStage, order_index: organized.length });
    }
    
    // Closed Lost último
    if (closedLostStage) {
      organized.push({ ...closedLostStage, order_index: organized.length });
    }

    return organized;
  };

  const handleAddStage = () => {
    setEditingStage({
      name: '',
      order_index: stages.filter(s => !s.is_system_stage).length + 1,
      color: '#3B82F6',
      is_system_stage: false
    });
    setEditStageIndex(null);
    setShowStageModal(true);
  };

  const handleEditStage = (index: number) => {
    setEditingStage({ ...stages[index] });
    setEditStageIndex(index);
    setShowStageModal(true);
  };

  const handleSaveStage = () => {
    if (!editingStage || !editingStage.name.trim()) return;

    const newStages = [...stages];
    
    if (editStageIndex !== null) {
      newStages[editStageIndex] = editingStage;
    } else {
      newStages.push(editingStage);
    }

    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
    setShowStageModal(false);
    setEditingStage(null);
    setEditStageIndex(null);
  };

  const handleDeleteStage = (index: number) => {
    if (stages[index].is_system_stage) return;
    
    const newStages = stages.filter((_, i) => i !== index);
    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
  };

  const handleStagesDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Não permitir mover etapas do sistema
    if (stages[sourceIndex].is_system_stage) return;

    const newStages = Array.from(stages);
    const [reorderedStage] = newStages.splice(sourceIndex, 1);
    newStages.splice(destinationIndex, 0, reorderedStage);

    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
  };

  return {
    stages,
    setStages,
    editingStage,
    setEditingStage,
    editStageIndex,
    setEditStageIndex,
    showStageModal,
    setShowStageModal,
    handleAddStage,
    handleEditStage,
    handleSaveStage,
    handleDeleteStage,
    handleStagesDragEnd,
    organizeStages
  };
}

interface StageManagerRenderProps {
  stageManager: UseStageManagerReturn;
}

export function StageManagerRender({ stageManager }: StageManagerRenderProps) {
  const {
    stages,
    editingStage,
    setEditingStage,
    showStageModal,
    setShowStageModal,
    handleAddStage,
    handleEditStage,
    handleSaveStage,
    handleDeleteStage,
    handleStagesDragEnd
  } = stageManager;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Etapas da Pipeline</h3>
          <p className="text-sm text-muted-foreground">
            Configure as etapas do seu processo de vendas
          </p>
        </div>
        <Button onClick={handleAddStage}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      {/* Lista de Etapas */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <BlurFade key={`${stage.name}-${index}`} delay={index * 0.1}>
            <AnimatedCard className="transition-all duration-200"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {!stage.is_system_stage && (
                                <div className="cursor-grab">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              )}
                              
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{stage.name}</h4>
                                  {stage.is_system_stage && (
                                    <Badge variant="secondary" className="text-xs">
                                      Sistema
                                    </Badge>
                                  )}
                                </div>
                                {stage.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {stage.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStage(index)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {!stage.is_system_stage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStage(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    </BlurFade>
        ))}
      </div>

      {/* Modal de Edição - Apenas Nome, Descrição e Cor */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingStage?.name ? `Editar Etapa: ${editingStage.name}` : 'Nova Etapa'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome e aparência da etapa.
            </DialogDescription>
          </DialogHeader>

          {editingStage && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="stageName">Nome da Etapa</Label>
                <Input
                  id="stageName"
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({
                    ...editingStage,
                    name: e.target.value
                  })}
                  placeholder="Ex: Contato Inicial"
                  disabled={editingStage.is_system_stage}
                />
              </div>

              <div>
                <Label htmlFor="stageDescription">Descrição</Label>
                <Textarea
                  id="stageDescription"
                  value={editingStage.description || ''}
                  onChange={(e) => setEditingStage({
                    ...editingStage,
                    description: e.target.value
                  })}
                  placeholder="Descreva o que acontece nesta etapa..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="stageColor">Cor</Label>
                <Input
                  id="stageColor"
                  type="color"
                  value={editingStage.color}
                  onChange={(e) => setEditingStage({
                    ...editingStage,
                    color: e.target.value
                  })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStageModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveStage}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StageManagerRender; 