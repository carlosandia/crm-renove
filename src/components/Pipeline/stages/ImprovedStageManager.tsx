import React, { useState, useCallback } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Edit, Trash2, Save, Plus, UserPlus, Trophy, XCircle, Lock, HelpCircle, Target, Workflow, X, ChevronUp, ChevronDown } from 'lucide-react';

// Shared components
import { SectionHeader } from '../shared/SectionHeader';

// Constants  
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';
import { BlurFade } from '@/components/ui/blur-fade';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interface simplificada para etapas sem sistema de temperatura
interface StageData {
  name: string;
  order_index: number;
  color: string;
  is_system_stage?: boolean;
  description?: string;
}


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
      return Target;
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
  handleAddStage: (event?: React.MouseEvent) => void;
  handleEditStage: (index: number, event?: React.MouseEvent) => void;
  handleSaveStage: () => void;
  handleDeleteStage: (index: number) => void;
  moveStageUp: (index: number, event?: React.MouseEvent) => void;
  moveStageDown: (index: number, event?: React.MouseEvent) => void;
  organizeStages: (stages: StageData[]) => StageData[];
  // Removido: Controle local de mudanças não salvas (agora gerenciado pelo componente pai)
}

export function useStageManager({ 
  initialStages = [], 
  onStagesChange 
}: UseStageManagerProps = {}): UseStageManagerReturn {
  
  // 🔧 CORREÇÃO: Verificar se já foi inicializado para evitar logs excessivos
  const [initialized, setInitialized] = useState(false);
  
  // 🔧 CORREÇÃO: Só logar na primeira inicialização
  React.useEffect(() => {
    if (!initialized && initialStages.length === 0) {
      console.log('🔍 [useStageManager] Primeira inicialização:', {
        initialStagesCount: initialStages.length,
        initialStages: initialStages.map(s => ({ name: s.name, order: s.order_index }))
      });
      setInitialized(true);
    }
  }, [initialStages, initialized]);
  
  const [stages, setStages] = useState<StageData[]>(() => {
    // 🔧 CORREÇÃO: Inicialização lazy para evitar re-renders
    return initialStages.length > 0 ? initialStages : [];
  });
  const [editingStage, setEditingStage] = useState<StageData | null>(null);
  const [editStageIndex, setEditStageIndex] = useState<number | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  
  // Removido: Estado local de mudanças não salvas (agora gerenciado pelo componente pai)
  
  // 🔧 CORREÇÃO: Memoizar initialStages para evitar comparação desnecessária
  const memoizedInitialStages = React.useMemo(() => initialStages, [
    initialStages.length,
    JSON.stringify(initialStages.map(s => ({ name: s.name, order: s.order_index })))
  ]);
  
  // ✅ CORREÇÃO CRÍTICA: Evitar useEffect que causa loop infinito
  React.useEffect(() => {
    // Só atualizar se realmente houve mudança nos dados e stages está vazio
    if (stages.length === 0 && memoizedInitialStages.length > 0) {
      console.log('🔄 [useStageManager] Inicializando stages vazios com initialStages');
      setStages(memoizedInitialStages);
    }
  }, [memoizedInitialStages.length]); // Só depende do length, não do array completo

  // 🔧 CORREÇÃO: Memoizar organizeStages para evitar re-criação constante
  const organizeStages = React.useCallback((stages: StageData[]) => {
    const nonSystemStages = stages.filter(stage => !stage.is_system_stage);
    const systemStages = stages.filter(stage => stage.is_system_stage);

    // ✅ REMOVIDO: Log de debug interno desnecessário

    // ✅ CORREÇÃO: Preservar ordem real após movimento (não forçar reindexação sequencial)
    // Manter posição do drag e atualizar order_index baseado na posição real
    const reindexedStages = nonSystemStages.map((stage, index) => ({
      ...stage,
      order_index: index + 1 // ✅ Agora reflete posição real pós-movimento
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
      organized.push({ ...closedWonStage, order_index: 998 });
    }
    
    // Perdido último
    if (closedLostStage) {
      organized.push({ ...closedLostStage, order_index: 999 });
    }

    if (organized.length > 0) {
      console.log('🔄 [organizeStages] Etapas organizadas:', {
        organized: organized.map(s => ({ name: s.name, order: s.order_index, isSystem: s.is_system_stage }))
      });
    }

    return organized;
  }, []); // 🔧 CORREÇÃO: Sem dependências para memoização completa

  const handleAddStage = (event?: React.MouseEvent) => {
    // ✅ CRÍTICO: Prevenir propagação e form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setEditingStage({
      name: '',
      order_index: stages.filter(s => !s.is_system_stage).length + 1,
      color: '#3B82F6',
      is_system_stage: false
    });
    setEditStageIndex(null);
    setShowStageModal(true);
    
    console.log('🆕 [ImprovedStageManager] Nova etapa iniciada - modal deve permanecer aberto');
  };

  const handleEditStage = (index: number, event?: React.MouseEvent) => {
    // ✅ CRÍTICO: Prevenir propagação e form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // ✅ CORREÇÃO: Usar allStages (estado atual) para encontrar etapa correta após movimento
    const currentStages = allStages;
    const stage = currentStages[index];
    
    // ✅ VALIDAÇÃO: Verificar se etapa existe no índice fornecido
    if (!stage) {
      console.warn('⚠️ [handleEditStage] Etapa não encontrada no índice:', index, 'Total stages:', currentStages.length);
      return;
    }
    
    console.log('✏️ [handleEditStage] Editando etapa:', {
      index,
      stageName: stage.name,
      isSystemStage: stage.is_system_stage,
      totalStages: currentStages.length
    });
    
    // Para etapas do sistema, apenas mostrar informações (visualização)
    if (stage.is_system_stage) {
      setEditingStage({ ...stage });
      setEditStageIndex(index);
      setShowStageModal(true);
      console.log('👀 [handleEditStage] Visualizando etapa do sistema - modal deve permanecer aberto');
      return;
    }
    
    // Para etapas customizadas, permitir edição normal
    setEditingStage({ ...stage });
    setEditStageIndex(index);
    setShowStageModal(true);
    console.log('✏️ [handleEditStage] Editando etapa customizada - modal deve permanecer aberto');
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

    // ✅ CORREÇÃO: Usar allStages para verificações, pois stages pode estar desatualizado
    const currentStages = allStages.filter(s => !s.is_system_stage); // Só etapas customizadas
    const newStages = [...currentStages];
    
    if (editStageIndex !== null) {
      // ✅ VALIDAÇÃO DUPLA: Verificar se o índice ainda corresponde à etapa correta
      const currentStageAtIndex = allStages[editStageIndex];
      if (currentStageAtIndex?.is_system_stage) {
        console.warn('⚠️ Tentativa de sobrescrever etapa do sistema bloqueada');
        setShowStageModal(false);
        setEditingStage(null);
        setEditStageIndex(null);
        return;
      }
      
      // Encontrar a posição correta na lista de etapas customizadas
      const customIndex = currentStages.findIndex(s => 
        s.name === editingStage.name || 
        (currentStageAtIndex && s.name === currentStageAtIndex.name)
      );
      
      if (customIndex >= 0) {
        newStages[customIndex] = editingStage;
        console.log('✏️ [handleSaveStage] Etapa atualizada no índice customizado:', customIndex);
      } else {
        // Se não encontrou, adicionar como nova
        newStages.push(editingStage);
        console.log('✏️ [handleSaveStage] Etapa adicionada como nova (não encontrada para edição)');
      }
    } else {
      newStages.push(editingStage);
    }

    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
    setShowStageModal(false);
    setEditingStage(null);
    setEditStageIndex(null);
    // ✅ NOVO: Etapa salva (estado de mudanças gerenciado pelo componente pai)
  };

  const handleDeleteStage = (index: number) => {
    if (stages[index].is_system_stage) return;
    
    const newStages = stages.filter((_, i) => i !== index);
    const organizedStages = organizeStages(newStages);
    setStages(organizedStages);
    onStagesChange?.(organizedStages);
  };

  const moveStageUp = (index: number, event?: React.MouseEvent) => {
    // ✅ CRÍTICO: Prevenir propagação e form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // ✅ CORREÇÃO: Usar allStages para movimento visual
    const currentStages = [...allStages];
    
    if (index <= 0 || currentStages[index]?.is_system_stage) return;
    
    // Não permitir mover para posição de etapa do sistema
    if (currentStages[index - 1]?.is_system_stage) return;
    
    // ✅ MOVIMENTO DIRETO: Swap de posições sem reorganizar
    [currentStages[index], currentStages[index - 1]] = [currentStages[index - 1], currentStages[index]];
    
    // ✅ ATUALIZAR APENAS CUSTOM STAGES para persistência COM ORDER_INDEX CORRETO
    const customStagesOnly = currentStages.filter(s => !s.is_system_stage);
    
    // ✅ CRÍTICO: Recalcular order_index baseado na nova posição no array
    const customStagesWithCorrectOrder = customStagesOnly.map((stage, arrayIndex) => ({
      ...stage,
      order_index: arrayIndex + 1 // ✅ Posição real no array = order_index correto
    }));
    
    setStages(customStagesWithCorrectOrder);
    
    // ✅ MODIFICADO: Chamar onStagesChange diretamente para propagar mudanças ao componente pai
    if (onStagesChange) {
      onStagesChange(customStagesWithCorrectOrder);
    }
    
    console.log('⬆️ [moveStageUp] Etapa movida para cima - mudanças propagadas', {
      movedStage: currentStages[index - 1]?.name,
      newPosition: index - 1,
      newOrder: customStagesWithCorrectOrder.map(s => ({ name: s.name, order_index: s.order_index }))
    });
  };

  const moveStageDown = (index: number, event?: React.MouseEvent) => {
    // ✅ CRÍTICO: Prevenir propagação e form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // ✅ CORREÇÃO: Usar allStages para movimento visual
    const currentStages = [...allStages];
    
    if (index >= currentStages.length - 1 || currentStages[index]?.is_system_stage) return;
    
    // Não permitir mover para posição de etapa do sistema
    if (currentStages[index + 1]?.is_system_stage) return;
    
    // ✅ MOVIMENTO DIRETO: Swap de posições sem reorganizar
    [currentStages[index], currentStages[index + 1]] = [currentStages[index + 1], currentStages[index]];
    
    // ✅ ATUALIZAR APENAS CUSTOM STAGES para persistência COM ORDER_INDEX CORRETO
    const customStagesOnly = currentStages.filter(s => !s.is_system_stage);
    
    // ✅ CRÍTICO: Recalcular order_index baseado na nova posição no array  
    const customStagesWithCorrectOrder = customStagesOnly.map((stage, arrayIndex) => ({
      ...stage,
      order_index: arrayIndex + 1 // ✅ Posição real no array = order_index correto
    }));
    
    setStages(customStagesWithCorrectOrder);
    
    // ✅ MODIFICADO: Chamar onStagesChange diretamente para propagar mudanças ao componente pai
    if (onStagesChange) {
      onStagesChange(customStagesWithCorrectOrder);
    }
    
    console.log('⬇️ [moveStageDown] Etapa movida para baixo - mudanças propagadas', {
      movedStage: currentStages[index + 1]?.name,
      newPosition: index + 1,
      newOrder: customStagesWithCorrectOrder.map(s => ({ name: s.name, order_index: s.order_index }))
    });
  };

  // Calcular allStages combinando etapas do sistema com customizadas
  const allStages = React.useMemo(() => {
    const currentStages = stages.length > 0 ? stages : [];
    const systemStages = SYSTEM_STAGES.map(stage => ({ ...stage }));
    const customStages = currentStages.filter(stage => !stage.is_system_stage);
    
    // ✅ REMOVIDO: Log de debug interno desnecessário
    
    // Combinar etapas do sistema com customizadas, mantendo organização
    const organized = organizeStages([...systemStages, ...customStages]);
    
    // ✅ REMOVIDO: Log de debug interno desnecessário
    
    return organized;
  }, [stages]);

  // Removido: handleSaveAllChanges (agora todas as mudanças são propagadas diretamente via onStagesChange)

  return {
    stages: allStages || [], // ✅ SEGURANÇA: Garantir que nunca seja undefined
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
    organizeStages
    // Removido: hasUnsavedChanges e handleSaveAllChanges (agora gerenciado pelo componente pai)
  };
}

// Componente StageItem simplificado
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
      <BlurFade delay={index * 0.03}>
        <AnimatedCard
          className={`h-full ${
            stage.is_system_stage 
              ? 'border-2 border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700' 
              : 'border-solid hover:shadow-md'
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
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onMoveUp(index)}
                      disabled={!canMoveUp}
                      className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
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
                  null
                ) : (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
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
                          type="button"
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
    editStageIndex,
    setEditStageIndex,
    showStageModal,
    setShowStageModal,
    handleAddStage,
    handleEditStage,
    handleSaveStage,
    handleDeleteStage,
    moveStageUp,
    moveStageDown
    // Removido: hasUnsavedChanges e handleSaveAllChanges (agora gerenciado pelo componente pai)
  } = stageManager;
  
  const stagesToRender = stages;



  const stageIds = stagesToRender.map((_: StageData, index: number) => `stage-${index}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        icon={Workflow}
        title="Etapas da Pipeline"
        action={
          <Button 
            type="button" 
            onClick={handleAddStage}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Etapa
          </Button>
        }
      />

      {/* Indicador de Reordenação */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
        <Target className="h-4 w-4" />
        <span>Use os botões de seta para reordenar as etapas customizadas</span>
      </div>

      {/* Removido: Botão de salvamento local - agora usamos apenas o botão azul do componente pai */}

      {/* ✅ FORMULÁRIO INLINE EXPANSÍVEL - Posicionado após o indicador */}
      {showStageModal && (
        <BlurFade>
          <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
            {/* Header do Formulário Inline */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {editingStage?.is_system_stage && (
                  <>
                    {(() => {
                      const SystemIcon = getSystemStageIcon(editingStage?.name || '');
                      return <SystemIcon className="h-5 w-5 text-blue-600" />;
                    })()}
                  </>
                )}
                <h4 className="text-lg font-semibold">
                  {editStageIndex !== null ? (
                    editingStage?.is_system_stage 
                      ? `Etapa do Sistema: ${editingStage.name}` 
                      : `Editar Etapa: ${editingStage.name}`
                  ) : 'Nova Etapa'}
                </h4>
                {editingStage?.is_system_stage && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    <Lock className="h-3 w-3 mr-1" />
                    Sistema
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStageModal(false)}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Corpo do Formulário Simplificado */}
            <div className="space-y-4">
              {/* Nome da Etapa */}
              <div>
                <Label htmlFor="stageName" className="text-sm font-medium mb-2 block">
                  Nome da Etapa
                </Label>
                <Input
                  id="stageName"
                  type="text"
                  placeholder="Ex: Qualificação"
                  value={editingStage?.name || ''}
                  onChange={(e) => setEditingStage({ 
                    ...editingStage!, 
                    name: e.target.value 
                  })}
                  disabled={editingStage?.is_system_stage}
                  className={editingStage?.is_system_stage ? "bg-gray-100 text-gray-600" : ""}
                />
              </div>
            </div>

            {/* Footer com Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => setShowStageModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveStage}
                disabled={!editingStage?.name?.trim()}
                className="min-w-[100px]"
              >
                <Save className="h-4 w-4 mr-2" />
                {editStageIndex !== null ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </BlurFade>
      )}

      {/* Lista de Etapas - NOVA ORDEM: Customizadas primeiro */}
      <div className="space-y-4">
        {/* Etapas Customizadas - PRIMEIRA SEÇÃO */}
        {stagesToRender.some((stage: StageData) => !stage.is_system_stage) && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"></div>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full dark:bg-gray-800 dark:text-gray-300">
                <Target className="h-3 w-3" />
                Etapas Customizadas
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"></div>
            </div>
            
            {stagesToRender
              .filter((stage: StageData) => !stage.is_system_stage)
              .map((stage: StageData, originalIndex: number) => {
                const stageIndex = stagesToRender.findIndex((s: StageData) => s === stage);
                const customStages = stagesToRender.filter((s: StageData) => !s.is_system_stage);
                const customIndex = customStages.findIndex((s: StageData) => s === stage);
                
                return (
                  <StageItem
                    key={`custom-${stage.name}-${customIndex}`}
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
                <Button 
                  type="button" 
                  onClick={handleAddStage} 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira etapa
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Etapas do Sistema - SEGUNDA SEÇÃO */}
        {stagesToRender.some((stage: StageData) => stage.is_system_stage) && (
          <div className="space-y-3">
            {/* Separador visual quando há etapas customizadas */}
            {stagesToRender.some((stage: StageData) => !stage.is_system_stage) && (
              <div className="mt-6 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900"></div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full dark:bg-blue-900/50 dark:text-blue-200">
                    <Lock className="h-3 w-3" />
                    Etapas do Sistema
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-l from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900"></div>
                </div>
              </div>
            )}
            {/* Header quando não há etapas customizadas */}
            {!stagesToRender.some((stage: StageData) => !stage.is_system_stage) && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900"></div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full dark:bg-blue-900/50 dark:text-blue-200">
                  <Lock className="h-3 w-3" />
                  Etapas do Sistema
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-900"></div>
              </div>
            )}
            
            {stagesToRender
              .filter((stage: StageData) => stage.is_system_stage)
              .map((stage: StageData, originalIndex: number) => {
                const stageIndex = stagesToRender.findIndex((s: StageData) => s === stage);
                return (
                  <StageItem
                    key={`system-${stage.name}-${stage.order_index}`}
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
      </div>

    </div>
  );
}

export default StageManagerRender;