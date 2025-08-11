import React, { useState, useCallback } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Edit, Trash2, Save, Plus, UserPlus, Trophy, XCircle, Lock, Info, HelpCircle, Target, ChevronUp, ChevronDown } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interface simplificada para etapas sem sistema de temperatura
interface StageData {
  id?: string; // ✅ CORREÇÃO: Adicionado id para consistência
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
    description: 'Etapa inicial onde todos os novos leads são criados. Esta etapa é obrigatória e não pode ser removida.'
  },
  { 
    name: 'Ganho', 
    color: '#10B981', 
    order_index: 998, 
    is_system_stage: true,
    description: 'Etapa de vendas ganhas. Leads que se tornaram clientes são movidos para cá automaticamente.'
  },
  { 
    name: 'Perdido', 
    color: '#EF4444', 
    order_index: 999, 
    is_system_stage: true,
    description: 'Etapa final para leads perdidos. Vendas não concretizadas ficam aqui para análise posterior.'
  },
];

// Função para obter ícone da etapa do sistema
const getSystemStageIcon = (stageName: string) => {
  switch (stageName) {
    case 'Lead':
      return UserPlus;
    case 'Ganho':
      return Trophy;
    case 'Perdido':
      return XCircle;
    default:
      return Info;
  }
};

// Função para obter tooltip educativo
const getSystemStageTooltip = (stageName: string) => {
  switch (stageName) {
    case 'Lead':
      return 'Etapa obrigatória para todos os novos leads. Baseada em boas práticas de CRM como Salesforce e HubSpot.';
    case 'Ganho':
      return 'Etapa padrão para vendas ganhas. Facilita relatórios de conversão e ROI.';
    case 'Perdido':
      return 'Etapa padrão para análise de perdas. Essencial para otimização do funil de vendas.';
    default:
      return 'Etapa do sistema';
  }
};

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
  moveStageUp: (index: number) => void;
  moveStageDown: (index: number) => void;
  organizeStages: (stages: StageData[]) => StageData[];
  // ✅ NOVOS ESTADOS DE LOADING PARA ANIMAÇÕES
  isSaving: boolean;
  isMoving: string | null; // ✅ CORREÇÃO: string | null para consistência com ImprovedStageManager
  lastActionStage: string | null;
  isReordering: boolean;
  showDeleteModal: boolean;
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  stageToDelete: { 
    stage: StageData; 
    index: number; 
    validation?: { canDelete: boolean; reasons: string[]; warnings: string[]; severity: 'low' | 'medium' | 'high' }
  } | null; // ✅ CORREÇÃO: Objeto completo para consistência
  setStageToDelete: React.Dispatch<React.SetStateAction<{ 
    stage: StageData; 
    index: number; 
    validation?: { canDelete: boolean; reasons: string[]; warnings: string[]; severity: 'low' | 'medium' | 'high' }
  } | null>>;
  isDeleting: boolean;
  executeStageDelete: () => Promise<void>;
}

export function useStageManager({ 
  initialStages = [], 
  onStagesChange 
}: UseStageManagerProps = {}): UseStageManagerReturn {
  const [stages, setStages] = useState<StageData[]>(initialStages);
  const [editingStage, setEditingStage] = useState<StageData | null>(null);
  const [editStageIndex, setEditStageIndex] = useState<number | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  
  // ✅ NOVOS ESTADOS DE LOADING PARA ANIMAÇÕES
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState<string | null>(null); // ✅ CORREÇÃO: string | null
  const [lastActionStage, setLastActionStage] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<{ 
    stage: StageData; 
    index: number; 
    validation?: { canDelete: boolean; reasons: string[]; warnings: string[]; severity: 'low' | 'medium' | 'high' }
  } | null>(null); // ✅ CORREÇÃO: Objeto completo
  const [isDeleting, setIsDeleting] = useState(false);

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
    const closedWonStage = systemStages.find(s => s.name === 'Ganho');
    const closedLostStage = systemStages.find(s => s.name === 'Perdido');

    const organized = [];
    
    // Lead sempre primeiro
    if (leadStage) {
      organized.push({ ...leadStage, order_index: 0 });
    }
    
    // Etapas customizadas no meio
    organized.push(...reindexedStages);
    
    // Ganho penúltimo
    if (closedWonStage) {
      organized.push({ ...closedWonStage, order_index: organized.length });
    }
    
    // Perdido último
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
    const stage = stages[index];
    
    // Para etapas do sistema, apenas mostrar informações (visualização)
    if (stage.is_system_stage) {
      setEditingStage({ ...stage });
      setEditStageIndex(index);
      setShowStageModal(true);
      return;
    }
    
    // Para etapas customizadas, permitir edição normal
    setEditingStage({ ...stage });
    setEditStageIndex(index);
    setShowStageModal(true);
  };

  const handleSaveStage = () => {
    if (!editingStage || !editingStage.name.trim()) return;

    // BLOQUEIO: Impedir qualquer salvamento de etapas do sistema
    if (editingStage.is_system_stage) {
      console.warn('⚠️ Tentativa de editar etapa do sistema bloqueada:', editingStage.name);
      setShowStageModal(false);
      setEditingStage(null);
      setEditStageIndex(null);
      return;
    }

    const newStages = [...stages];
    
    if (editStageIndex !== null) {
      // Verificação adicional: se o índice corresponde a uma etapa do sistema, abortar
      if (stages[editStageIndex]?.is_system_stage) {
        console.warn('⚠️ Tentativa de sobrescrever etapa do sistema bloqueada');
        setShowStageModal(false);
        setEditingStage(null);
        setEditStageIndex(null);
        return;
      }
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

  const moveStageUp = (index: number) => {
    if (index <= 0 || stages[index].is_system_stage) return;
    
    // Não permitir mover para posição de etapa do sistema
    if (stages[index - 1].is_system_stage) return;
    
    const newStages = [...stages];
    [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
    
    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
  };

  const moveStageDown = (index: number) => {
    if (index >= stages.length - 1 || stages[index].is_system_stage) return;
    
    // Não permitir mover para posição de etapa do sistema
    if (stages[index + 1].is_system_stage) return;
    
    const newStages = [...stages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    
    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
  };

  // ✅ NOVA FUNÇÃO: Executar exclusão de etapa com validações
  const executeStageDelete = async (): Promise<void> => {
    if (!stageToDelete) return;

    try {
      setIsDeleting(true);
      
      // Simular operação async (futura integração com backend)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const stageIndex = stages.findIndex(s => s.name === stageToDelete.stage.name);
      if (stageIndex === -1) return;
      
      handleDeleteStage(stageIndex);
      
      setShowDeleteModal(false);
      setStageToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
    } finally {
      setIsDeleting(false);
    }
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
    moveStageUp,
    moveStageDown,
    organizeStages,
    // ✅ NOVOS ESTADOS DE LOADING PARA ANIMAÇÕES
    isSaving,
    isMoving,
    lastActionStage,
    isReordering,
    showDeleteModal,
    setShowDeleteModal,
    stageToDelete,
    setStageToDelete,
    isDeleting,
    executeStageDelete
  };
}

// Componente StageItem simplificado sem drag and drop
interface StageItemProps {
  stage: StageData;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function StageItem({ stage, index, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: StageItemProps) {
  const SystemIcon = stage.is_system_stage ? getSystemStageIcon(stage.name) : null;

  return (
    <TooltipProvider>
      <BlurFade delay={index * 0.1}>
        <AnimatedCard
          className={`h-full ${
            stage.is_system_stage 
              ? 'border-2 border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700' 
              : 'border-solid'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Ícone de Sistema ou Controles de Ordem */}
                {stage.is_system_stage ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/50">
                        {SystemIcon && <SystemIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">{getSystemStageTooltip(stage.name)}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMoveUp(index)}
                      disabled={!canMoveUp}
                      className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMoveDown(index)}
                      disabled={!canMoveDown}
                      className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Indicador de Cor */}
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    stage.is_system_stage ? 'border-white shadow-md' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: stage.color }}
                />
                
                {/* Informações da Etapa */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${
                      stage.is_system_stage ? 'text-blue-900 dark:text-blue-100' : ''
                    }`}>
                      {stage.name}
                    </h4>
                    {stage.is_system_stage && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200">
                            <Lock className="h-3 w-3 mr-1" />
                            Sistema
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-sm">Esta etapa é parte do sistema e não pode ser removida ou reordenada.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {stage.description && (
                    <p className={`text-sm mt-1 ${
                      stage.is_system_stage 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-muted-foreground'
                    }`}>
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                {stage.is_system_stage ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(index)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver informações da etapa do sistema</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(index)}
                          className="hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar etapa</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(index)}
                          className="text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excluir etapa</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </BlurFade>
    </TooltipProvider>
  );
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
    moveStageUp,
    moveStageDown
  } = stageManager;

  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localColor, setLocalColor] = useState('#3B82F6');

  // Limpar campos quando modal abrir
  React.useEffect(() => {
    if (showStageModal && editingStage) {
      setLocalName(editingStage.name || '');
      setLocalDescription(editingStage.description || '');
      setLocalColor(editingStage.color || '#3B82F6');
    } else if (showStageModal) {
      setLocalName('');
      setLocalDescription('');
      setLocalColor('#3B82F6');
    }
  }, [showStageModal, editingStage]);

  const handleSaveLocal = () => {
    setEditingStage({
      ...editingStage,
      name: localName,
      description: localDescription,
      color: localColor,
      order_index: editingStage?.order_index || stages.length,
    } as StageData);
    handleSaveStage();
  };

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
      <div className="space-y-4">
        {/* Etapas do Sistema */}
        {stages.some(stage => stage.is_system_stage) && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900"></div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full dark:bg-blue-900/50 dark:text-blue-200">
                <Lock className="h-3 w-3" />
                Etapas do Sistema
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900"></div>
            </div>
            
            {stages
              .filter(stage => stage.is_system_stage)
              .map((stage, originalIndex) => {
                const stageIndex = stages.findIndex(s => s === stage);
                return (
                  <StageItem
                    key={`${stage.name}-${stageIndex}`}
                    stage={stage}
                    index={stageIndex}
                    onEdit={handleEditStage}
                    onDelete={handleDeleteStage}
                    onMoveUp={moveStageUp}
                    onMoveDown={moveStageDown}
                    canMoveUp={false}
                    canMoveDown={false}
                  />
                );
              })
            }
          </div>
        )}

        {/* Etapas Customizadas */}
        {stages.some(stage => !stage.is_system_stage) && (
          <div className="space-y-3">
            {stages.some(stage => stage.is_system_stage) && (
              <div className="flex items-center gap-3 mt-6">
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"></div>
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full dark:bg-gray-800 dark:text-gray-300">
                  <Target className="h-3 w-3" />
                  Etapas Customizadas
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"></div>
              </div>
            )}
            
            {stages
              .filter(stage => !stage.is_system_stage)
              .map((stage, originalIndex) => {
                const stageIndex = stages.findIndex(s => s === stage);
                const customStages = stages.filter(s => !s.is_system_stage);
                const customIndex = customStages.findIndex(s => s === stage);
                
                return (
                  <StageItem
                    key={`${stage.name}-${stageIndex}`}
                    stage={stage}
                    index={stageIndex}
                    onEdit={handleEditStage}
                    onDelete={handleDeleteStage}
                    onMoveUp={moveStageUp}
                    onMoveDown={moveStageDown}
                    canMoveUp={customIndex > 0}
                    canMoveDown={customIndex < customStages.length - 1}
                  />
                );
              })
            }
            
            {stages.filter(stage => !stage.is_system_stage).length === 0 && (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <Target className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Nenhuma etapa customizada
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Adicione etapas personalizadas para seu processo de vendas
                </p>
                <Button onClick={handleAddStage} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira etapa
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Edição/Visualização */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingStage?.is_system_stage && (
                <>
                  {(() => {
                    const SystemIcon = getSystemStageIcon(editingStage.name);
                    return <SystemIcon className="h-5 w-5 text-blue-600" />;
                  })()}
                </>
              )}
              {editingStage?.name ? (
                editingStage.is_system_stage 
                  ? `Etapa do Sistema: ${editingStage.name}` 
                  : `Editar Etapa: ${editingStage.name}`
              ) : 'Nova Etapa'}
              {editingStage?.is_system_stage && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  <Lock className="h-3 w-3 mr-1" />
                  Sistema
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingStage?.is_system_stage
                ? 'Esta é uma etapa padrão do sistema. Visualize as informações abaixo.'
                : 'Configure o nome, descrição e aparência da etapa.'
              }
            </DialogDescription>
          </DialogHeader>

          {editingStage && (
            <div className="space-y-4">
              {/* Aviso especial para etapas do sistema */}
              {editingStage.is_system_stage && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Etapa do Sistema
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {getSystemStageTooltip(editingStage.name)}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        💡 Esta configuração segue as melhores práticas dos principais CRMs do mercado.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="stageName" className="flex items-center gap-2">
                  Nome da Etapa
                  {editingStage.is_system_stage && <Lock className="h-3 w-3 text-gray-400" />}
                </Label>
                <Input
                  id="stageName"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Ex: Contato Inicial"
                  disabled={editingStage.is_system_stage}
                  className={editingStage.is_system_stage ? 'bg-gray-50 dark:bg-gray-900' : ''}
                />
                {editingStage.is_system_stage && (
                  <p className="text-xs text-gray-500 mt-1">
                    Este nome não pode ser alterado pois é uma etapa padrão do sistema.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="stageDescription">
                  Descrição
                  {!editingStage.is_system_stage && <span className="text-xs text-gray-500 ml-1">(opcional)</span>}
                </Label>
                <Textarea
                  id="stageDescription"
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  placeholder="Descreva o que acontece nesta etapa..."
                  rows={3}
                  disabled={editingStage.is_system_stage}
                  className={editingStage.is_system_stage ? 'bg-gray-50 dark:bg-gray-900' : ''}
                />
              </div>

              <div>
                <Label htmlFor="stageColor" className="flex items-center gap-2">
                  Cor da Etapa
                  {editingStage.is_system_stage && <Lock className="h-3 w-3 text-gray-400" />}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="stageColor"
                    type="color"
                    value={localColor}
                    onChange={(e) => setLocalColor(e.target.value)}
                    disabled={editingStage.is_system_stage}
                    className={`w-16 h-10 ${editingStage.is_system_stage ? 'opacity-75' : ''}`}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: localColor }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {localColor.toUpperCase()}
                  </span>
                </div>
                {editingStage.is_system_stage && (
                  <p className="text-xs text-gray-500 mt-1">
                    A cor desta etapa foi definida seguindo padrões UX de CRMs profissionais.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStageModal(false)}
            >
              {editingStage?.is_system_stage ? 'Fechar' : 'Cancelar'}
            </Button>
            {!editingStage?.is_system_stage && (
              <Button onClick={handleSaveLocal}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StageManagerRender; 