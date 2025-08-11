import React, { useState, useCallback, useMemo } from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Edit, Trash2, Save, Plus, UserPlus, Trophy, XCircle, Lock, HelpCircle, Target, Workflow, X, ChevronUp, ChevronDown } from 'lucide-react';

// Shared components
import { SectionHeader } from '../shared/SectionHeader';
import StageDeleteConfirmModal from './StageDeleteConfirmModal';

// Hook para dados da pipeline
import { usePipelineKanban } from '../../../hooks/usePipelineKanban';

// Constants  
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';
import { BlurFade } from '@/components/ui/blur-fade';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interface simplificada para etapas sem sistema de temperatura
interface StageData {
  id?: string;
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
  allStages: StageData[]; // ✅ CORREÇÃO: Adicionar allStages na interface TypeScript
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
  // ✅ NOVOS ESTADOS DE LOADING PARA ANIMAÇÕES
  isSaving: boolean;
  isMoving: string | null;
  lastActionStage: string | null;
  isReordering: boolean;
  showDeleteModal: boolean;
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  stageToDelete: { 
    stage: StageData; 
    index: number; 
    validation?: { canDelete: boolean; reasons: string[]; warnings: string[]; severity: 'low' | 'medium' | 'high' }
  } | null;
  setStageToDelete: React.Dispatch<React.SetStateAction<{ 
    stage: StageData; 
    index: number; 
    validation?: { canDelete: boolean; reasons: string[]; warnings: string[]; severity: 'low' | 'medium' | 'high' }
  } | null>>;
  isDeleting: boolean;
  executeStageDelete: () => Promise<void>;
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
  
  // ✅ NOVOS ESTADOS: Loading e animações
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState<string | null>(null); // ID da etapa sendo movida
  const [lastActionStage, setLastActionStage] = useState<string | null>(null); // Para highlight temporário
  const [isReordering, setIsReordering] = useState(false);
  
  // ✅ NOVOS ESTADOS: Modal de exclusão robusta
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<{ 
    stage: StageData; 
    index: number; 
    validation?: { canDelete: boolean; reasons: string[]; warnings: string[]; severity: 'low' | 'medium' | 'high' }
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Removido: Estado local de mudanças não salvas (agora gerenciado pelo componente pai)

  // ✅ EFFECT: Limpar highlight após ação
  React.useEffect(() => {
    if (lastActionStage) {
      const timer = setTimeout(() => {
        setLastActionStage(null);
      }, 2000); // Highlight por 2 segundos
      
      return () => clearTimeout(timer);
    }
  }, [lastActionStage]);

  // ✅ NOVA FUNÇÃO: Validações robustas de exclusão
  const validateStageForDeletion = React.useCallback((stage: StageData, allStages: StageData[]): { 
    canDelete: boolean; 
    reasons: string[]; 
    warnings: string[];
    severity: 'low' | 'medium' | 'high';
  } => {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // ✅ VALIDAÇÃO 1: Etapas do sistema não podem ser excluídas
    if (stage.is_system_stage) {
      reasons.push('Esta é uma etapa do sistema e não pode ser removida');
      severity = 'high';
      return { canDelete: false, reasons, warnings, severity };
    }

    // ✅ VALIDAÇÃO 2: Pipeline deve ter pelo menos uma etapa customizada
    const customStages = allStages.filter(s => !s.is_system_stage);
    if (customStages.length <= 1) {
      reasons.push('O pipeline deve ter pelo menos uma etapa customizada');
      severity = 'high';
      return { canDelete: false, reasons, warnings, severity };
    }

    // ✅ VALIDAÇÃO 3: Verificar se é a primeira etapa customizada (posição crítica)
    const firstCustomStage = customStages.find(s => s.order_index === 1);
    if (firstCustomStage && firstCustomStage.name === stage.name) {
      warnings.push('Esta é a primeira etapa do processo de vendas');
      warnings.push('Leads existentes serão movidos para a próxima etapa');
      severity = 'medium';
    }

    // ✅ VALIDAÇÃO 4: Verificar etapas com nomes críticos
    const criticalNames = ['qualificação', 'proposta', 'negociação', 'contrato'];
    const isCritical = criticalNames.some(name => 
      stage.name.toLowerCase().includes(name.toLowerCase())
    );
    if (isCritical) {
      warnings.push('Esta etapa parece ser crítica para o processo de vendas');
      warnings.push('Verifique se não há automações ou relatórios dependentes');
      severity = severity === 'low' ? 'medium' : severity;
    }

    // ✅ VALIDAÇÃO 5: Verificar se há muitas etapas (limite recomendado)
    if (customStages.length > 7) {
      warnings.push('Você tem muitas etapas no pipeline (mais de 7)');
      warnings.push('Considere manter apenas as etapas essenciais');
    }

    return { canDelete: true, reasons, warnings, severity };
  }, []);

  // ✅ FUNÇÃO OTIMIZADA: Detectar posição visual com validação robusta
  const findStageVisualPosition = React.useCallback((targetStage: StageData, displayStages: StageData[]): number => {
    // ✅ VALIDAÇÃO DE ENTRADA
    if (!targetStage || !Array.isArray(displayStages)) {
      console.error('❌ [findStageVisualPosition] Parâmetros inválidos:', {
        hasTargetStage: !!targetStage,
        displayStagesIsArray: Array.isArray(displayStages),
        displayStagesLength: displayStages?.length || 0
      });
      return -1;
    }
    
    // Filtrar apenas etapas customizadas para análise de posição
    const customOnlyStages = displayStages.filter(s => s && !s.is_system_stage);
    
    if (customOnlyStages.length === 0) {
      console.log('🔍 [findStageVisualPosition] Nenhuma etapa customizada encontrada - retornando 0');
      return 0; // Primeira posição se não há etapas customizadas
    }
    
    // ✅ BUSCA OTIMIZADA: Priorizar ID, fallback para nome+order_index
    let position = -1;
    
    // Método 1: Busca por ID (único e mais confiável)
    if (targetStage.id) {
      position = customOnlyStages.findIndex(stage => 
        stage.id && stage.id === targetStage.id
      );
      
      if (position >= 0) {
        console.log('🎯 [findStageVisualPosition] Encontrada por ID:', {
          targetId: targetStage.id.substring(0, 8) + '...',
          targetName: targetStage.name,
          position,
          method: 'ID_MATCH'
        });
        return position;
      }
    }
    
    // Método 2: Busca por nome (para etapas novas ou sem ID)
    if (targetStage.name?.trim()) {
      position = customOnlyStages.findIndex(stage => 
        stage.name === targetStage.name
      );
      
      if (position >= 0) {
        console.log('🎯 [findStageVisualPosition] Encontrada por nome:', {
          targetName: targetStage.name,
          position,
          method: 'NAME_MATCH'
        });
        return position;
      }
    }
    
    // Mãtodo 3: Busca por order_index (fallback)
    if (typeof targetStage.order_index === 'number') {
      position = customOnlyStages.findIndex(stage => 
        stage.order_index === targetStage.order_index
      );
      
      if (position >= 0) {
        console.log('🎯 [findStageVisualPosition] Encontrada por order_index:', {
          targetName: targetStage.name,
          orderIndex: targetStage.order_index,
          position,
          method: 'ORDER_MATCH'
        });
        return position;
      }
    }
    
    // ✅ FALLBACK: Se não encontrou, retornar última posição (adicionar no final)
    const fallbackPosition = customOnlyStages.length;
    
    console.log('🔍 [findStageVisualPosition] Não encontrada - usando fallback:', {
      targetName: targetStage.name,
      targetId: targetStage.id?.substring(0, 8) || 'nova',
      fallbackPosition,
      totalCustomStages: customOnlyStages.length,
      customStageNames: customOnlyStages.map(s => s.name),
      searchMethods: 'ID -> NAME -> ORDER_INDEX -> FALLBACK'
    });
    
    return fallbackPosition;
  }, []);
  
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

  // ✅ FUNÇÃO OTIMIZADA: OrganizeStages com reindexacao sequencial garantida
  const organizeStages = React.useCallback((stages: StageData[]) => {
    // ✅ VALIDAÇÃO DE ENTRADA
    if (!Array.isArray(stages)) {
      console.error('❌ [organizeStages] Entrada inválida - stages deve ser um array');
      return [];
    }
    
    const nonSystemStages = stages.filter(stage => stage && !stage.is_system_stage);
    const systemStages = stages.filter(stage => stage && stage.is_system_stage);

    // ✅ OTIMIZADO: Log consolidado apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [organizeStages] Organizando etapas:', {
        total: stages.length,
        custom: nonSystemStages.length,
        system: systemStages.length
      });
    }

    // ✅ REINDEXACAO SEQUENCIAL FORÇADA: Garantir 1, 2, 3, 4...
    const reindexedStages = nonSystemStages
      .sort((a, b) => {
        // Ordenar por order_index primeiro, depois por nome como fallback
        const orderA = a.order_index ?? 999;
        const orderB = b.order_index ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      })
      .map((stage, arrayIndex) => {
        const newOrderIndex = arrayIndex + 1; // Forçar sequência 1, 2, 3...
        
        return {
          ...stage,
          order_index: newOrderIndex // SEMPRE aplicar nova indexação sequencial
        };
      });

    // ✅ ENCONTRAR ETAPAS DO SISTEMA (nomenclatura em português)
    const leadStage = systemStages.find(s => s.name === 'Lead');
    const closedWonStage = systemStages.find(s => s.name === 'Ganho');
    const closedLostStage = systemStages.find(s => s.name === 'Perdido');

    // ✅ MONTAGEM FINAL NA ORDEM CORRETA
    const organized = [];
    
    // 1. Lead sempre primeiro (order_index: 0)
    if (leadStage) {
      organized.push({ ...leadStage, order_index: 0 });
    }
    
    // 2. Etapas customizadas no meio (order_index: 1, 2, 3...)
    organized.push(...reindexedStages);
    
    // 3. Ganho penúltimo (order_index: 998)
    if (closedWonStage) {
      organized.push({ ...closedWonStage, order_index: 998 });
    }
    
    // 4. Perdido último (order_index: 999)
    if (closedLostStage) {
      organized.push({ ...closedLostStage, order_index: 999 });
    }

    // ✅ OTIMIZADO: Log final apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [organizeStages] Concluído:', {
        total: organized.length,
        sequence: organized.map(s => s.order_index).join('→')
      });
    }

    return organized;
  }, []); // Sem dependências para máxima performance

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

  const handleSaveStage = async () => {
    if (!editingStage || !editingStage.name.trim()) return;

    // ✅ ANIMAÇÃO: Iniciar estado de loading
    setIsSaving(true);
    
    try {
      // Simular delay para operação assíncrona (pode ser removido quando integrar com API real)
      await new Promise(resolve => setTimeout(resolve, 500));

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
      // ✅ NOVA LÓGICA HÍBRIDA: Detectar posição visual atual da nova etapa
      console.log('🆕 [handleSaveStage] Processando nova etapa com lógica híbrida:', {
        stageName: editingStage.name,
        originalOrderIndex: editingStage.order_index,
        allStagesCount: allStages.length,
        customStagesCount: currentStages.length
      });
      
      // Tentar detectar posição visual atual
      const visualPosition = findStageVisualPosition(editingStage, allStages);
      
      if (visualPosition >= 0 && visualPosition < currentStages.length) {
        // ✅ POSIÇÃO VISUAL DETECTADA: Inserir onde está visualmente
        newStages.splice(visualPosition, 0, editingStage);
        console.log('✅ [handleSaveStage] Nova etapa inserida na posição VISUAL detectada:', {
          visualPosition,
          stageName: editingStage.name
        });
      } else {
        // ✅ FALLBACK: Usar order_index atualizado durante movimento
        const targetPosition = Math.max(0, Math.min(editingStage.order_index - 1, currentStages.length));
        
        if (targetPosition >= 0 && targetPosition < currentStages.length) {
          newStages.splice(targetPosition, 0, editingStage);
          console.log('✅ [handleSaveStage] Nova etapa inserida na posição ORDER_INDEX:', {
            targetPosition,
            orderIndex: editingStage.order_index,
            stageName: editingStage.name
          });
        } else {
          // Último fallback: adicionar no final
          newStages.push(editingStage);
          console.log('⚠️ [handleSaveStage] Nova etapa adicionada no final (fallback):', {
            stageName: editingStage.name,
            reason: 'posição visual e order_index inválidos'
          });
        }
      }
    }

    // ✅ CORREÇÃO CRÍTICA: Recalcular order_index ANTES de organizar
    // Garantir que a ordem seja preservada após a inserção
    const newStagesWithCorrectOrder = newStages.map((stage, index) => ({
      ...stage,
      order_index: index + 1
    }));

      setStages(newStagesWithCorrectOrder);
      onStagesChange?.(newStagesWithCorrectOrder); // ✅ Enviar stages já com order_index correto
      
      // ✅ ANIMAÇÃO: Destacar etapa criada/editada
      const stageId = editingStage.id || editingStage.name;
      setLastActionStage(stageId);
      
      setShowStageModal(false);
      setEditingStage(null);
      setEditStageIndex(null);
      
      console.log('✅ [handleSaveStage] Etapa salva com ordem preservada (SOLUÇÃO HÍBRIDA):', {
        savedStage: editingStage.name,
        wasNewStage: editStageIndex === null,
        hasStageId: !!editingStage.id,
        visualPositionUsed: editStageIndex === null ? 'detectado via findStageVisualPosition' : 'N/A (etapa existente)',
        finalOrder: newStagesWithCorrectOrder.map(s => ({ name: s.name, order_index: s.order_index })),
        totalStagesAfterSave: newStagesWithCorrectOrder.length
      });
      
    } catch (error) {
      console.error('❌ [handleSaveStage] Erro ao salvar etapa:', error);
      // TODO: Exibir toast de erro para o usuário
    } finally {
      // ✅ ANIMAÇÃO: Finalizar estado de loading
      setIsSaving(false);
    }
  };

  // ✅ FUNÇÃO MELHORADA: Abrir modal de confirmação com validações robustas
  const handleDeleteStage = (index: number) => {
    // ✅ CORREÇÃO CRÍTICA: O index recebido é baseado no array de etapas CUSTOMIZADAS
    const customStages = stages.filter(stage => !stage.is_system_stage);
    
    // 🔍 DEBUG: Validar mapeamento de arrays antes da correção
    // ✅ OTIMIZAÇÃO: Debug condicional - apenas quando VITE_VERBOSE_LOGS=true
    if (import.meta.env.DEV && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('🐛 [handleDeleteStage] INICIANDO DEBUG:', {
        index,
        'stages.length': stages.length,
        'customStages.length': customStages.length,
        'stages': stages.map((s, i) => `${i}: ${s.name}`),
        'customStages': customStages.map((s, i) => `${i}: ${s.name}`)
      });
    }
    
    // ✅ CORREÇÃO FUNDAMENTAL: O index recebido é baseado no array de etapas customizadas
    const targetStage = customStages[index];
    
    // ✅ OTIMIZAÇÃO: Debug condicional - logs detalhados apenas quando necessário
    if (import.meta.env.DEV && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('✅ [handleDeleteStage] APÓS CORREÇÃO:', {
        index,
        'targetStage': targetStage?.name,
        'expectedStage': 'Etapa que foi clicada pelo usuário'
      });
    }
    
    // ✅ VALIDAÇÕES DE SEGURANÇA BÁSICAS
    if (!targetStage) {
      console.error('❌ [handleDeleteStage] Etapa não encontrada no índice:', {
        index,
        totalStages: allStages.length,
        availableStages: allStages.map(s => s.name)
      });
      return;
    }
    
    // ✅ VALIDAÇÕES ROBUSTAS DE EXCLUSÃO
    const validation = validateStageForDeletion(targetStage, allStages);
    
    console.log('🛡️ [handleDeleteStage] Resultado da validação:', {
      stageName: targetStage.name,
      canDelete: validation.canDelete,
      severity: validation.severity,
      reasons: validation.reasons,
      warnings: validation.warnings
    });
    
    // ✅ BLOQUEAR EXCLUSÃO SE NÃO PODE SER DELETADA
    if (!validation.canDelete) {
      console.error('❌ [handleDeleteStage] Exclusão bloqueada por validação:', {
        stageName: targetStage.name,
        reasons: validation.reasons
      });
      
      // TODO: Exibir toast ou modal de erro para o usuário
      alert(`Não é possível excluir a etapa "${targetStage.name}":\n\n${validation.reasons.join('\n')}`);
      return;
    }
    
    // ✅ EXIBIR AVISOS SE HOUVER (mas permite prosseguir)
    if (validation.warnings.length > 0) {
      console.warn('⚠️ [handleDeleteStage] Avisos de exclusão:', {
        stageName: targetStage.name,
        warnings: validation.warnings
      });
    }
    
    // ✅ ABRIR MODAL DE CONFIRMAÇÃO COM DADOS DE VALIDAÇÃO
    console.log('📋 [handleDeleteStage] Abrindo modal de confirmação para:', {
      index,
      stageName: targetStage.name,
      stageId: targetStage.id?.substring(0, 8) + '...' || 'nova',
      validationSeverity: validation.severity
    });
    
    setStageToDelete({ 
      stage: targetStage, 
      index, 
      validation // ✅ ADICIONAR dados de validação
    });
    setShowDeleteModal(true);
  };
  
  // ✅ NOVA FUNÇÃO: Executar exclusão após confirmação
  const executeStageDelete = async () => {
    if (!stageToDelete) {
      console.error('❌ [executeStageDelete] stageToDelete é null');
      return;
    }
    
    const { stage: targetStage, index } = stageToDelete;
    setIsDeleting(true);
    
    try {
      console.log('🗑️ [executeStageDelete] EXECUTANDO DELEÇÃO CONFIRMADA:', {
        index,
        stageName: targetStage.name,
        stageId: targetStage.id?.substring(0, 8) + '...' || 'nova'
      });
    
      // ✅ VALIDAÇÃO ADICIONAL: Verificar se há leads na etapa antes de deletar
      // TODO: Implementar verificação com backend quando disponível
      
      // ✅ CORREÇÃO FUNDAMENTAL: Buscar etapa por ID/nome em vez de índice
      const allStages = [...stages];
      
      // 🔍 DEBUG: Validar antes da exclusão
      console.log('🐛 [executeStageDelete] VALIDANDO ANTES DA EXCLUSÃO:', {
        'targetStage': targetStage.name,
        'targetId': targetStage.id?.substring(0, 8) + '...' || 'sem-id',
        'allStages': allStages.map((s, i) => `${i}: ${s.name}`)
      });
      
      // ✅ BUSCA ROBUSTA: Sempre buscar por ID primeiro, depois por nome
      let targetStageInArray = null;
      
      // Tentar por ID primeiro (mais confiável para etapas persistidas)
      if (targetStage.id) {
        targetStageInArray = allStages.find(s => s.id === targetStage.id) || null;
        console.log('🔍 [executeStageDelete] Busca por ID:', {
          targetId: targetStage.id.substring(0, 8) + '...',
          found: !!targetStageInArray,
          foundName: targetStageInArray?.name
        });
      }
      
      // Fallback por nome + propriedades se ID não funcionar
      if (!targetStageInArray) {
        targetStageInArray = allStages.find(s => 
          s.name === targetStage.name && 
          s.is_system_stage === targetStage.is_system_stage
        ) || null;
        console.log('🔍 [executeStageDelete] Busca por nome:', {
          targetName: targetStage.name,
          found: !!targetStageInArray
        });
      }
      
      if (!targetStageInArray) {
        console.error('❌ [executeStageDelete] Etapa não encontrada para exclusão:', targetStage.name);
        setIsDeleting(false);
        setShowDeleteModal(false);
        setStageToDelete(null);
        return;
      }
      
      console.log('✅ [executeStageDelete] Etapa confirmada para exclusão:', targetStageInArray.name);
      
      // ✅ REMOÇÃO COM IDENTIFICAÇÃO PRECISA
      const newStages = allStages.filter((stage) => {
        // Para etapas existentes (com ID), comparar por ID único
        if (targetStage.id && stage.id) {
          const shouldKeep = stage.id !== targetStage.id;
          if (!shouldKeep) {
            console.log('📝 [executeStageDelete] Removendo etapa existente por ID:', {
              id: stage.id.substring(0, 8) + '...',
              name: stage.name,
              orderIndex: stage.order_index
            });
          }
          return shouldKeep;
        }
        
        // Para etapas novas (sem ID), comparar por nome + order_index para máxima precisão
        const shouldKeep = !(stage.name === targetStage.name && 
                            stage.order_index === targetStage.order_index &&
                            !stage.is_system_stage); // Extra segurança
        if (!shouldKeep) {
          console.log('📝 [executeStageDelete] Removendo etapa nova por nome+order:', {
            name: stage.name,
            orderIndex: stage.order_index
          });
        }
        return shouldKeep;
      });
      
      // ✅ RECÁLCULO SEQUENCIAL DE ORDER_INDEX (1, 2, 3...)
      const customStages = newStages.filter(s => !s.is_system_stage);
      const systemStages = newStages.filter(s => s.is_system_stage);
      
      // Reindexar etapas customizadas sequencialmente
      const reindexedCustomStages = customStages.map((stage, arrayIndex) => {
        const newOrderIndex = arrayIndex + 1; // 1, 2, 3...
        console.log(`🔢 [executeStageDelete] Reindexando "${stage.name}": ${stage.order_index} → ${newOrderIndex}`);
        
        return {
          ...stage,
          order_index: newOrderIndex
        };
      });
      
      // Combinar com etapas do sistema
      const finalStages = [...reindexedCustomStages, ...systemStages];
      
      console.log('✅ [executeStageDelete] DELEÇÃO CONCLUÍDA COM SUCESSO:', {
        etapaRemovida: targetStage.name,
        stagesAntes: allStages.length,
        stagesDepois: finalStages.length,
        customStagesAntes: allStages.filter(s => !s.is_system_stage).length,
        customStagesDepois: reindexedCustomStages.length,
        novaSequencia: reindexedCustomStages.map(s => `${s.name}(${s.order_index})`).join(', ')
      });
      
      // ✅ APLICAR ORGANIZAÇÃO E PROPAGAR MUDANÇAS
      const organizedStages = organizeStages(finalStages);
      setStages(organizedStages);
      onStagesChange?.(organizedStages);
      
    } catch (error: any) {
      console.error('❌ [executeStageDelete] Erro durante exclusão:', error);
    } finally {
      // ✅ LIMPEZA: Fechar modal e resetar estados
      setIsDeleting(false);
      setShowDeleteModal(false);
      setStageToDelete(null);
    }
  };

  const moveStageUp = async (index: number, event?: React.MouseEvent) => {
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

    // ✅ ANIMAÇÃO: Iniciar estado de movimento
    const stageBeingMoved = currentStages[index];
    const stageId = stageBeingMoved.id || stageBeingMoved.name;
    setIsMoving(stageId);
    setIsReordering(true);
    
    try {
      // Simular delay para animação suave
      await new Promise(resolve => setTimeout(resolve, 300));
    
      // ✅ MOVIMENTO DIRETO: Swap de posições sem reorganizar
      [currentStages[index], currentStages[index - 1]] = [currentStages[index - 1], currentStages[index]];
    
    // ✅ NOVA LÓGICA HÍBRIDA: Atualizar editingStage se é a etapa sendo movida
    if (editingStage && !editingStage.id && stageBeingMoved.name === editingStage.name) {
      const customStagesBeforeMovement = currentStages.filter(s => !s.is_system_stage);
      const newPositionInCustomArray = customStagesBeforeMovement.findIndex(s => s.name === editingStage.name);
      
      console.log('🔄 [moveStageUp] Atualizando editingStage order_index:', {
        stageName: editingStage.name,
        oldOrderIndex: editingStage.order_index,
        newOrderIndex: newPositionInCustomArray + 1
      });
      
      setEditingStage({
        ...editingStage,
        order_index: newPositionInCustomArray + 1
      });
    }
    
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
      
      // ✅ ANIMAÇÃO: Destacar etapa movida
      setLastActionStage(stageId);
      
      console.log('⬆️ [moveStageUp] Etapa movida para cima - mudanças propagadas', {
        movedStage: currentStages[index - 1]?.name,
        newPosition: index - 1,
        newOrder: customStagesWithCorrectOrder.map(s => ({ name: s.name, order_index: s.order_index }))
      });
      
    } catch (error) {
      console.error('❌ [moveStageUp] Erro ao mover etapa:', error);
    } finally {
      // ✅ ANIMAÇÃO: Finalizar estados de loading
      setIsMoving(null);
      setIsReordering(false);
    }
  };

  const moveStageDown = async (index: number, event?: React.MouseEvent) => {
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

    // ✅ ANIMAÇÃO: Iniciar estado de movimento
    const stageBeingMoved = currentStages[index];
    const stageId = stageBeingMoved.id || stageBeingMoved.name;
    setIsMoving(stageId);
    setIsReordering(true);
    
    try {
      // Simular delay para animação suave
      await new Promise(resolve => setTimeout(resolve, 300));
    
      // ✅ MOVIMENTO DIRETO: Swap de posições sem reorganizar
      [currentStages[index], currentStages[index + 1]] = [currentStages[index + 1], currentStages[index]];
    
    // ✅ NOVA LÓGICA HÍBRIDA: Atualizar editingStage se é a etapa sendo movida
    if (editingStage && !editingStage.id && stageBeingMoved.name === editingStage.name) {
      const customStagesBeforeMovement = currentStages.filter(s => !s.is_system_stage);
      const newPositionInCustomArray = customStagesBeforeMovement.findIndex(s => s.name === editingStage.name);
      
      console.log('🔄 [moveStageDown] Atualizando editingStage order_index:', {
        stageName: editingStage.name,
        oldOrderIndex: editingStage.order_index,
        newOrderIndex: newPositionInCustomArray + 1
      });
      
      setEditingStage({
        ...editingStage,
        order_index: newPositionInCustomArray + 1
      });
    }
    
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
      
      // ✅ ANIMAÇÃO: Destacar etapa movida
      setLastActionStage(stageId);
      
      console.log('⬇️ [moveStageDown] Etapa movida para baixo - mudanças propagadas', {
        movedStage: currentStages[index + 1]?.name,
        newPosition: index + 1,
        newOrder: customStagesWithCorrectOrder.map(s => ({ name: s.name, order_index: s.order_index }))
      });
      
    } catch (error) {
      console.error('❌ [moveStageDown] Erro ao mover etapa:', error);
    } finally {
      // ✅ ANIMAÇÃO: Finalizar estados de loading
      setIsMoving(null);
      setIsReordering(false);
    }
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
    allStages, // ✅ CORREÇÃO: Adicionar allStages para acesso no componente de renderização
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
    // ✅ NOVOS ESTADOS: Para animações e loading
    isSaving,
    isMoving,
    lastActionStage,
    isReordering,
    // ✅ NOVOS ESTADOS: Modal de exclusão robusta
    showDeleteModal,
    setShowDeleteModal,
    stageToDelete,
    setStageToDelete,
    isDeleting,
    executeStageDelete
    // Removido: hasUnsavedChanges e handleSaveAllChanges (agora gerenciado pelo componente pai)
  };
}

// Componente StageItem com animações
interface StageItemProps {
  stage: StageData;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  // ✅ NOVOS PROPS: Para animações
  isMoving?: boolean;
  isHighlighted?: boolean;
  isReordering?: boolean;
}

function StageItem({ 
  stage, 
  index, 
  onEdit, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  canMoveUp, 
  canMoveDown,
  isMoving = false,
  isHighlighted = false,
  isReordering = false 
}: StageItemProps) {
  const SystemIcon = stage.is_system_stage ? getSystemStageIcon(stage.name) : null;

  // ✅ CLASSES CSS DINÂMICAS: Para animações e estados
  const containerClasses = `
    bg-gradient-to-br transition-all duration-300 rounded-xl p-4 shadow-sm
    ${stage.is_system_stage 
      ? 'from-blue-50 to-blue-100/50 border border-blue-200/80' 
      : 'from-white to-slate-50 border border-slate-200/80 hover:border-slate-300/80'
    }
    ${isMoving ? 'scale-105 shadow-lg ring-2 ring-indigo-200' : ''}
    ${isHighlighted ? 'ring-2 ring-green-300 shadow-lg bg-gradient-to-br from-green-50 to-white' : ''}
    ${isReordering ? 'opacity-70' : ''}
  `.replace(/\s+/g, ' ').trim();

  return (
    <TooltipProvider>
      <BlurFade delay={index * 0.05}>
        <div className={containerClasses}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Ícone de Sistema ou Controles de Ordem */}
              {stage.is_system_stage ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {SystemIcon && <SystemIcon className="h-5 w-5 text-blue-600" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">{getSystemStageTooltip(stage.name)}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveUp(index)}
                    disabled={!canMoveUp || isMoving || isReordering}
                    className={`h-6 w-6 p-0 rounded-md transition-all duration-200 ${
                      isMoving ? 'scale-110 bg-indigo-100 text-indigo-600' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    } disabled:opacity-30`}
                  >
                    {isMoving ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    ) : (
                      <ChevronUp className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveDown(index)}
                    disabled={!canMoveDown || isMoving || isReordering}
                    className={`h-6 w-6 p-0 rounded-md transition-all duration-200 ${
                      isMoving ? 'scale-110 bg-indigo-100 text-indigo-600' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    } disabled:opacity-30`}
                  >
                    {isMoving ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
              
              {/* Informações da Etapa */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className={`font-semibold text-base ${
                    stage.is_system_stage ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    {stage.name}
                  </h4>
                  {stage.is_system_stage && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 px-2 py-0.5">
                      <Lock className="h-3 w-3 mr-1" />
                      Sistema
                    </Badge>
                  )}
                </div>
                {stage.description && (
                  <p className={`text-sm mt-1.5 ${
                    stage.is_system_stage 
                      ? 'text-blue-600' 
                      : 'text-slate-500'
                  }`}>
                    {stage.description}
                  </p>
                )}
              </div>
            </div>

            {/* Ações com Design Aprimorado */}
            {!stage.is_system_stage && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(index)}
                      className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-600 hover:text-slate-700 rounded-lg"
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
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Excluir etapa</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </BlurFade>
    </TooltipProvider>
  );
}

interface StageManagerRenderProps {
  stageManager: UseStageManagerReturn;
  pipelineId?: string; // Para buscar dados reais de oportunidades por etapa
}

export function StageManagerRender({ stageManager, pipelineId }: StageManagerRenderProps) {
  const {
    stages,
    allStages, // ✅ CORREÇÃO: Adicionar allStages da desestruturação para usar na linha 1252
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
    // ✅ NOVOS ESTADOS DE LOADING E ANIMAÇÕES
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
    // Removido: hasUnsavedChanges e handleSaveAllChanges (agora gerenciado pelo componente pai)
  } = stageManager;

  // ✅ BUSCAR DADOS REAIS DE OPORTUNIDADES POR ETAPA
  const kanbanData = usePipelineKanban({
    pipelineId: pipelineId || '',
    autoRefresh: false,
    enableMetrics: false
  });

  // Calcular oportunidades por etapa usando dados reais
  const opportunitiesByStage = useMemo(() => {
    if (!pipelineId || !kanbanData.leadsByStage) {
      return {} as Record<string, number>;
    }

    const counts: Record<string, number> = {};
    Object.keys(kanbanData.leadsByStage).forEach(stageId => {
      counts[stageId] = kanbanData.leadsByStage[stageId]?.length || 0;
    });

    return counts;
  }, [pipelineId, kanbanData.leadsByStage]);

  const getOpportunitiesCountForStage = (stageId?: string): number => {
    if (!stageId) return 0;
    return opportunitiesByStage[stageId] || 0;
  };
  
  const stagesToRender = allStages;

  const stageIds = stagesToRender.map((_: StageData, index: number) => `stage-${index}`);

  return (
    <div className="space-y-6">
      {/* Header with Consistent Visual Design */}
      <BlurFade delay={0.1} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Workflow className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Etapas da Pipeline</h3>
                <p className="text-sm text-slate-500">Configure as etapas do seu processo de vendas</p>
              </div>
            </div>
            <Button 
              type="button" 
              onClick={handleAddStage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Etapa
            </Button>
          </div>

          {/* Indicador de Reordenação com Visual Aprimorado */}
          <div className="mt-4 flex items-center gap-3 text-sm bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
            <div className="p-1 bg-indigo-100 rounded">
              <Target className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-slate-600">Use os botões de seta para reordenar as etapas customizadas</span>
          </div>
        </div>
      </BlurFade>

      {/* Removido: Botão de salvamento local - agora usamos apenas o botão azul do componente pai */}

      {/* Formulário Inline Expansível - Mantendo posicionamento superior */}
      {showStageModal && (
        <BlurFade delay={0.2} direction="up">
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-xl p-6 shadow-sm">
            {/* Header do Formulário com Design Consistente */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  {editingStage?.is_system_stage ? (
                    (() => {
                      const SystemIcon = getSystemStageIcon(editingStage?.name || '');
                      return <SystemIcon className="h-5 w-5 text-blue-600" />;
                    })()
                  ) : (
                    <Target className="h-5 w-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    {editStageIndex !== null ? (
                      editingStage?.is_system_stage 
                        ? `Etapa do Sistema: ${editingStage.name}` 
                        : `Editar Etapa`
                    ) : 'Nova Etapa'}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {editingStage?.is_system_stage 
                      ? 'Visualizando informações da etapa do sistema'
                      : 'Configure o nome da etapa personalizada'
                    }
                  </p>
                </div>
                {editingStage?.is_system_stage && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Lock className="h-3 w-3 mr-1" />
                    Sistema
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStageModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Corpo do Formulário com Visual Aprimorado */}
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="stageName" className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Nome da Etapa
                </Label>
                <Input
                  id="stageName"
                  type="text"
                  placeholder="Ex: Qualificação, Proposta, Negociação..."
                  value={editingStage?.name || ''}
                  onChange={(e) => setEditingStage({ 
                    ...editingStage!, 
                    name: e.target.value 
                  })}
                  disabled={editingStage?.is_system_stage}
                  className={editingStage?.is_system_stage 
                    ? "bg-slate-100 text-slate-600 border-slate-200" 
                    : "border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  }
                />
                {editingStage?.is_system_stage && (
                  <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Esta etapa faz parte do sistema e não pode ser modificada.
                  </p>
                )}
              </div>
            </div>

            {/* Footer com Botões Estilizados */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowStageModal(false)}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              {!editingStage?.is_system_stage && (
                <Button
                  onClick={handleSaveStage}
                  disabled={!editingStage?.name?.trim() || isSaving}
                  className={`text-white min-w-[120px] transition-all duration-200 ${
                    isSaving 
                      ? 'bg-indigo-500 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  } disabled:opacity-50`}
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {editStageIndex !== null ? 'Salvando...' : 'Criando...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editStageIndex !== null ? 'Salvar' : 'Criar'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </BlurFade>
      )}

      {/* Lista de Etapas com Visual Aprimorado */}
      <div className="space-y-6">
        {/* Etapas Customizadas - Primeira Seção com Design Consistente */}
        {stagesToRender.some((stage: StageData) => !stage.is_system_stage) && (
          <BlurFade delay={0.3} direction="up">
            <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Etapas Customizadas</h4>
                  <p className="text-sm text-slate-500">Etapas personalizadas do seu processo de vendas</p>
                </div>
              </div>
            
              <div className="space-y-3">
                {stagesToRender
                  .filter((stage: StageData) => !stage.is_system_stage)
                  .map((stage: StageData, customIndex: number) => {
                    // ✅ CORREÇÃO SIMPLIFICADA: customIndex do .map() já é o índice correto para DELETE
                    const customStages = stagesToRender.filter((s: StageData) => !s.is_system_stage);
                    
                    // ✅ CORREÇÃO CRÍTICA: Calcular stageIndex real para MOVE operations
                    const stageIndex = stagesToRender.findIndex((s: StageData) => {
                      // Para etapas com ID, comparar por ID (mais confiável)
                      if (stage.id && s.id) {
                        return s.id === stage.id;
                      }
                      // Para etapas sem ID, comparar por nome + propriedades
                      return s.name === stage.name && 
                             s.is_system_stage === stage.is_system_stage &&
                             s.order_index === stage.order_index;
                    });
                    
                    // ✅ OTIMIZAÇÃO: Log de render removido para evitar spam
                    // Logs de debug disponíveis via VITE_VERBOSE_LOGS=true se necessário
                    
                    return (
                      <StageItem
                        key={`custom-${stage.id || stage.name}-${customIndex}`}
                        stage={stage}
                        index={customIndex}  // Para handleDeleteStage (usa array filtrado)
                        onEdit={handleEditStage}
                        onDelete={handleDeleteStage}
                        onMoveUp={(index) => moveStageUp(stageIndex)}  // Para moveStageUp (usa array completo)
                        onMoveDown={(index) => moveStageDown(stageIndex)}  // Para moveStageDown (usa array completo)
                        canMoveUp={customIndex > 0}
                        canMoveDown={customIndex < customStages.length - 1}
                        isMoving={isMoving === (stage.id || stage.name)}
                        isHighlighted={lastActionStage === (stage.id || stage.name)}
                        isReordering={isReordering && isMoving !== (stage.id || stage.name)}
                      />
                    );
                  })
                }
              </div>
            
            {stagesToRender.filter(stage => !stage.is_system_stage).length === 0 && (
              <div className="p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-dashed border-slate-300/60">
                <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto mb-4">
                  <Target className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Nenhuma etapa customizada
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                  Crie etapas personalizadas para refletir seu processo de vendas único. 
                  Ex: Qualificação, Proposta, Negociação.
                </p>
                <Button 
                  type="button" 
                  onClick={handleAddStage} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira etapa
                </Button>
              </div>
            )}
            </div>
          </BlurFade>
        )}

        {/* Etapas do Sistema - Segunda Seção com Design Consistente */}
        {stagesToRender.some((stage: StageData) => stage.is_system_stage) && (
          <BlurFade delay={0.4} direction="up">
            <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200/60 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Etapas do Sistema</h4>
                  <p className="text-sm text-slate-500">Etapas obrigatórias para o funcionamento do CRM</p>
                </div>
              </div>
            
              <div className="space-y-3">
                {stagesToRender
                  .filter((stage: StageData) => stage.is_system_stage)
                  .map((stage: StageData, originalIndex: number) => {
                    // ✅ CORREÇÃO CRÍTICA: Encontrar índice da etapa do sistema usando identificação única
                    const stageIndex = stagesToRender.findIndex((s: StageData) => {
                      // Para etapas do sistema, comparar por ID se existir, senão por nome + is_system_stage
                      if (stage.id && s.id) {
                        return s.id === stage.id;
                      }
                      return s.name === stage.name && 
                             s.is_system_stage === stage.is_system_stage;
                    });
                    
                    // ✅ OTIMIZAÇÃO: Log de render removido para evitar spam
                    // Mapeamento sistema: customIndex vs stageIndex controlado via dual mapping
                    
                    return (
                      <StageItem
                        key={`system-${stage.id || stage.name}-${stage.order_index}`}
                        stage={stage}
                        index={stageIndex}
                        onEdit={handleEditStage}
                        onDelete={handleDeleteStage}
                        onMoveUp={moveStageUp}
                        onMoveDown={moveStageDown}
                        canMoveUp={false}
                        canMoveDown={false}
                        isMoving={false} // Etapas do sistema não se movem
                        isHighlighted={false} // Etapas do sistema não são destacadas
                        isReordering={isReordering}
                      />
                    );
                  })
                }
              </div>
            </div>
          </BlurFade>
        )}
      </div>

      {/* ✅ MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <StageDeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={executeStageDelete}
        stage={stageToDelete?.stage || null}
        opportunitiesCount={getOpportunitiesCountForStage(stageToDelete?.stage?.id)} // Número real de oportunidades na etapa
        isLoading={isDeleting}
        validation={stageToDelete?.validation} // ✅ NOVOS DADOS: Validações robustas
      />

    </div>
  );
}

export default StageManagerRender;