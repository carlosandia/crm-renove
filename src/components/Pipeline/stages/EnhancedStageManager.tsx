import React, { useState, useCallback } from 'react';
import { CardContent } from '@/components/ui/card';
import { SimpleSortableStageItem } from './SimpleSortableStageItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatedCard } from '@/components/ui/animated-card';
import { BlurFade } from '@/components/ui/blur-fade';
import { MotionWrapper, HoverCard, StaggerContainer } from '@/components/ui/motion-wrapper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Edit, 
  Trash2, 
  Save, 
  Plus, 
  UserPlus, 
  Trophy, 
  XCircle, 
  Lock, 
  Info, 
  HelpCircle, 
  Target,
  Sparkles,
  Crown,
  Zap,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Interface simplificada para etapas
interface StageData {
  name: string;
  order_index: number;
  color: string;
  is_system_stage?: boolean;
  description?: string;
  id?: string;
}

// ✅ SIMPLIFICADO: Apenas 3 etapas obrigatórias do sistema
const SYSTEM_STAGES: StageData[] = [
  { 
    id: 'system-lead',
    name: 'Lead', 
    color: '#3B82F6', 
    order_index: 0, 
    is_system_stage: true,
    description: 'Etapa inicial onde todos os novos leads são criados. Ponto de entrada obrigatório para o funil de vendas.'
  },
  { 
    id: 'system-ganho',
    name: 'Ganho', 
    color: '#10B981', 
    order_index: 998, 
    is_system_stage: true,
    description: 'Etapa final para vendas ganhas. Leads convertidos em clientes são automaticamente movidos para cá.'
  },
  { 
    id: 'system-perdido',
    name: 'Perdido', 
    color: '#EF4444', 
    order_index: 999, 
    is_system_stage: true,
    description: 'Etapa final para vendas perdidas. Essencial para análise de conversão e otimização do funil.'
  },
];

// ✅ NOVO: Etapas sugeridas para criação customizada
const SUGGESTED_STAGES = [
  { name: 'MQL', color: '#8B5CF6', description: 'Marketing Qualified Lead - Lead qualificado pelo marketing' },
  { name: 'SQL', color: '#F59E0B', description: 'Sales Qualified Lead - Lead qualificado pela equipe de vendas' },
  { name: 'Qualificação', color: '#06B6D4', description: 'Processo de qualificação e descoberta de necessidades' },
  { name: 'Negociação', color: '#10B981', description: 'Apresentação de proposta e negociação comercial' },
  { name: 'Proposta', color: '#8B5CF6', description: 'Proposta comercial enviada e em análise' },
  { name: 'Aprovação', color: '#F59E0B', description: 'Aguardando aprovação interna do cliente' },
  { name: 'Contrato', color: '#059669', description: 'Elaboração e assinatura de contrato' },
  { name: 'Demonstração', color: '#3B82F6', description: 'Apresentação do produto ou serviço' },
  { name: 'Orçamento', color: '#DC2626', description: 'Elaboração e envio de orçamento' },
  { name: 'Follow-up', color: '#6B7280', description: 'Acompanhamento e reativação de leads' }
];

// ✅ SIMPLIFICADO: Função para obter ícone das 3 etapas do sistema
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

// ✅ SIMPLIFICADO: Função para obter emoji das 3 etapas do sistema
const getSystemStageEmoji = (stageName: string) => {
  switch (stageName) {
    case 'Lead':
      return '🎯';
    case 'Ganho':
      return '🏆';
    case 'Perdido':
      return '💔';
    default:
      return '⚡';
  }
};

// ✅ SIMPLIFICADO: Função para obter tooltip das 3 etapas do sistema
const getSystemStageTooltip = (stageName: string) => {
  switch (stageName) {
    case 'Lead':
      return {
        title: 'Etapa Inicial do Funil',
        description: 'Todos os novos leads começam aqui. Esta etapa é obrigatória e segue as melhores práticas de CRM como Salesforce e HubSpot.',
        tip: '💡 Tip: Configure campos customizados para qualificar melhor seus leads!'
      };
    case 'Ganho':
      return {
        title: 'Vendas Ganhas',
        description: 'Etapa final para negociações bem-sucedidas. Essencial para cálculos de ROI e métricas de conversão.',
        tip: '📊 Tip: Use esta etapa para gerar relatórios de receita e performance!'
      };
    case 'Perdido':
      return {
        title: 'Vendas Perdidas',
        description: 'Etapa para análise de perdas e otimização do funil. Identifica gargalos no processo de vendas.',
        tip: '🔍 Tip: Analise os motivos de perda para melhorar sua estratégia!'
      };
    default:
      return {
        title: 'Etapa do Sistema',
        description: 'Esta é uma etapa padrão do sistema.',
        tip: ''
      };
  }
};

interface UseEnhancedStageManagerProps {
  initialStages?: StageData[];
  onStagesChange?: (stages: StageData[]) => void;
}

interface UseEnhancedStageManagerReturn {
  stages: StageData[];
  setStages: React.Dispatch<React.SetStateAction<StageData[]>>;
  editingStage: StageData | null;
  setEditingStage: React.Dispatch<React.SetStateAction<StageData | null>>;
  editStageIndex: number | null;
  setEditStageIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showStageModal: boolean;
  setShowStageModal: React.Dispatch<React.SetStateAction<boolean>>;
  allStages: StageData[];
  getStableId: (stage: StageData, isSystem?: boolean) => string;
  handleAddStage: () => void;
  handleEditStage: (index: number, systemStage?: StageData) => void;
  handleSaveStage: () => void;
  handleDeleteStage: (index: number) => void;
  organizeStages: (customStagesOnly: StageData[]) => StageData[];
  combineStagesForCallback: (customStagesOnly: StageData[]) => StageData[];
  onStagesChange?: (stages: StageData[]) => void;
}

export function useEnhancedStageManager({ 
  initialStages = [], 
  onStagesChange 
}: UseEnhancedStageManagerProps = {}): UseEnhancedStageManagerReturn {
  const [stages, setStages] = useState<StageData[]>([]);
  const [editingStage, setEditingStage] = useState<StageData | null>(null);
  const [editStageIndex, setEditStageIndex] = useState<number | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  
  // ✅ ESTADOS PARA DROPDOWN DE ETAPAS SUGERIDAS
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localColor, setLocalColor] = useState('#3B82F6');
  const [selectedSuggestedStage, setSelectedSuggestedStage] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);

  // ✅ FUNÇÃO UTILITÁRIA: Gerar IDs estáveis consistentes
  const getStableId = useCallback((stage: StageData, isSystem = false) => {
    if (stage.id && typeof stage.id === 'string' && stage.id.length > 0) return stage.id;
    const prefix = isSystem ? 'system' : 'custom';
    const normalizedName = stage.name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return `${prefix}-${normalizedName}-${stage.order_index || 0}`;
  }, []);

  // ✅ NOVA LÓGICA UNIFICADA: Combinar todas as etapas numa lista ordenada
  const allStages = React.useMemo(() => {
    const lead = SYSTEM_STAGES.find(s => s.name === 'Lead')!;
    const ganho = SYSTEM_STAGES.find(s => s.name === 'Ganho')!;
    const perdido = SYSTEM_STAGES.find(s => s.name === 'Perdido')!;
    
    // Reorganizar etapas customizadas com order_index entre 1 e 997
    const orderedCustomStages = [...stages]
      .sort((a, b) => a.order_index - b.order_index)
      .map((stage, index) => ({
        ...stage,
        order_index: index + 1 // Começar em 1
      }));
    
    // Combinar: Lead (0) + Custom (1-997) + Ganho (998) + Perdido (999)
    return [
      { ...lead, id: getStableId(lead, true) },
      ...orderedCustomStages.map(stage => ({ ...stage, id: getStableId(stage) })),
      { ...ganho, id: getStableId(ganho, true) },
      { ...perdido, id: getStableId(perdido, true) }
    ];
  }, [stages, getStableId]);

  // ✅ NOVA LÓGICA: Organizar etapas customizadas mantendo ordem entre sistema
  const organizeStages = React.useCallback((customStagesOnly: StageData[]) => {
    // Ordenar por order_index
    const sorted = [...customStagesOnly].sort((a, b) => a.order_index - b.order_index);
    
    // Reorganizar índices sequenciais entre Lead (0) e Ganho/Perdido (998/999)
    return sorted.map((stage, index) => ({
      ...stage,
      id: stage.id || `custom-${stage.name.replace(/\s+/g, '-').toLowerCase()}-${index + 1}`,
      order_index: index + 1 // 1, 2, 3, ... até 997
    }));
  }, []); // Sem dependências - função pura

  // ✅ CORREÇÃO CRITICAL: Prevenir loop infinito com comparação mais robusta
  const customOnlyStages = React.useMemo(() => {
    return initialStages.filter(stage => !stage.is_system_stage);
  }, [initialStages]);

  // ✅ CORREÇÃO: Usar deep comparison mais eficiente
  const prevCustomOnlyStagesRef = React.useRef<StageData[]>([]);
  
  React.useEffect(() => {
    // Comparação mais robusta - comparar propriedades essenciais
    const hasActuallyChanged = (
      customOnlyStages.length !== prevCustomOnlyStagesRef.current.length ||
      customOnlyStages.some((stage, index) => {
        const prevStage = prevCustomOnlyStagesRef.current[index];
        return !prevStage || 
               stage.name !== prevStage.name ||
               stage.order_index !== prevStage.order_index ||
               stage.color !== prevStage.color ||
               stage.description !== prevStage.description;
      })
    );
    
    if (hasActuallyChanged) {
      const organized = organizeStages(customOnlyStages);
      setStages(organized);
      prevCustomOnlyStagesRef.current = customOnlyStages;
    }
  }, [customOnlyStages]); // Removido organizeStages da dependência

  // ✅ CORREÇÃO CRITICAL: Enviar apenas etapas customizadas - etapas do sistema já existem no banco
  const combineStagesForCallback = React.useCallback((customStagesOnly: StageData[]) => {
    // ✅ CORREÇÃO: Retornar apenas etapas customizadas para evitar duplicação
    // As etapas do sistema já são criadas quando o pipeline é criado inicialmente
    return customStagesOnly;
  }, []);

  const handleAddStage = () => {
    const newStage: StageData = {
      id: `custom-${Date.now()}`,
      name: '',
      order_index: stages.length + 1,
      color: '#3B82F6',
      is_system_stage: false
    };
    setEditingStage(newStage);
    setEditStageIndex(null);
    
    // ✅ LIMPAR ESTADOS DO DROPDOWN QUANDO ABRINDO NOVA ETAPA
    setLocalName('');
    setLocalDescription('');
    setLocalColor('#3B82F6');
    setSelectedSuggestedStage('');
    setShowManualInput(false);
    
    setShowStageModal(true);
  };

  const handleEditStage = (index: number, systemStage?: StageData) => {
    // Para etapas do sistema (index === -1), usar systemStage diretamente
    if (index === -1 && systemStage) {
      setEditingStage({ ...systemStage });
      setEditStageIndex(-1);
      
      // ✅ CONFIGURAR ESTADOS LOCAIS PARA ETAPAS DO SISTEMA
      setLocalName(systemStage.name);
      setLocalDescription(systemStage.description || '');
      setLocalColor(systemStage.color);
      setSelectedSuggestedStage('');
      setShowManualInput(false);
      
      setShowStageModal(true);
      return;
    }
    
    // Para etapas customizadas, usar índice normal
    const stage = stages[index];
    if (stage) {
      setEditingStage({ ...stage });
      setEditStageIndex(index);
      
      // ✅ CONFIGURAR ESTADOS LOCAIS PARA ETAPAS CUSTOMIZADAS
      setLocalName(stage.name);
      setLocalDescription(stage.description || '');
      setLocalColor(stage.color);
      setSelectedSuggestedStage('');
      setShowManualInput(true); // Mostrar campos manuais para etapas existentes
      
      setShowStageModal(true);
    }
  };

  const handleSaveStage = () => {
    // ✅ CORREÇÃO: Esta função agora é apenas um wrapper para compatibilidade
    // A lógica real foi movida para handleSaveLocal para evitar timing issues
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

    const organizedCustomStages = organizeStages(newStages);
    setStages(organizedCustomStages);
    
    onStagesChange?.(combineStagesForCallback(organizedCustomStages));
    
    setShowStageModal(false);
    setEditingStage(null);
    setEditStageIndex(null);
  };

  const handleDeleteStage = (index: number) => {
    if (stages[index].is_system_stage) return;
    
    const newStages = stages.filter((_, i) => i !== index);
    const organizedCustomStages = organizeStages(newStages);
    setStages(organizedCustomStages);
    
    onStagesChange?.(combineStagesForCallback(organizedCustomStages));
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
    allStages,
    getStableId,
    handleAddStage,
    handleEditStage,
    handleSaveStage,
    handleDeleteStage,
    organizeStages,
    combineStagesForCallback,
    onStagesChange
  };
}

// ✅ ATUALIZADO: Componente SortableStageItem com suporte para esconder ações das etapas do sistema
interface SortableStageItemProps {
  stage: StageData;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  isDragging?: boolean;
  isSystemStage?: boolean;
}


interface EnhancedStageManagerRenderProps {
  stageManager: UseEnhancedStageManagerReturn;
}

export function EnhancedStageManagerRender({ stageManager }: EnhancedStageManagerRenderProps) {
  const {
    stages,
    setStages,
    editingStage,
    setEditingStage,
    editStageIndex,
    setEditStageIndex,
    showStageModal,
    setShowStageModal,
    allStages,
    getStableId,
    handleAddStage,
    handleEditStage,
    handleSaveStage,
    handleDeleteStage,
    organizeStages,
    combineStagesForCallback,
    onStagesChange
  } = stageManager;


  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localColor, setLocalColor] = useState('#3B82F6');
  const [selectedSuggestedStage, setSelectedSuggestedStage] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);

  // ✅ NOVO: Função para aplicar etapa sugerida
  const handleSuggestedStageSelect = (stageName: string) => {
    if (stageName === 'manual') {
      setShowManualInput(true);
      setSelectedSuggestedStage('');
      setLocalName('');
      setLocalDescription('');
      setLocalColor('#3B82F6');
      return;
    }

    const suggested = SUGGESTED_STAGES.find(s => s.name === stageName);
    if (suggested) {
      setLocalName(suggested.name);
      setLocalDescription(suggested.description);
      setLocalColor(suggested.color);
      setSelectedSuggestedStage(stageName);
      setShowManualInput(false);
    }
  };

  // Limpar campos quando modal abrir
  React.useEffect(() => {
    if (showStageModal && editingStage) {
      // Editando etapa existente
      setLocalName(editingStage.name || '');
      setLocalDescription(editingStage.description || '');
      setLocalColor(editingStage.color || '#3B82F6');
      setSelectedSuggestedStage('');
      setShowManualInput(false);
    } else if (showStageModal) {
      // Nova etapa - inicializar com select de sugestões
      setLocalName('');
      setLocalDescription('');
      setLocalColor('#3B82F6');
      setSelectedSuggestedStage('');
      setShowManualInput(false);
    }
  }, [showStageModal, editingStage]);


  // ✅ UTILIZANDO allStages e allStageIds do hook para garantir consistência

  return (
    <div className="space-y-6">
      {/* Header melhorado */}
      <BlurFade delay={0} direction="down">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Configuração de Etapas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Lead → Suas Etapas Customizadas → Ganho/Perdido. Lista de etapas sem reordenação.
                </p>
              </div>
            </div>
          </div>
          <MotionWrapper variant="scaleIn" delay={0.2}>
            <Button onClick={handleAddStage} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Nova Etapa
            </Button>
          </MotionWrapper>
        </div>
      </BlurFade>

      {/* Lista Unificada de Etapas sem DnD */}
          <div className="space-y-4">
            <StaggerContainer delay={0.3} staggerDelay={0.1}>
              {/* ETAPA LEAD (Sistema - Estática) */}
              {(() => {
                const leadStage = SYSTEM_STAGES.find(s => s.name === 'Lead')!;
                const stageWithId = { ...leadStage, id: getStableId(leadStage, true) };
                return (
                  <SimpleSortableStageItem
                    key={stageWithId.id}
                    stage={stageWithId}
                    index={-1}
                    onEdit={() => handleEditStage(-1, stageWithId)}
                    onDelete={handleDeleteStage}
                    onMoveUp={() => {}} // Sistema não pode mover
                    onMoveDown={() => {}} // Sistema não pode mover
                    canMoveUp={false}
                    canMoveDown={false}
                    isDragging={false}
                    isSystemStage={true}
                  />
                );
              })()}

              {/* ETAPAS CUSTOMIZADAS */}
              {stages.map((stage, customIndex) => {
                const stageWithId = { ...stage, id: getStableId(stage) };
                return (
                  <SimpleSortableStageItem
                    key={stageWithId.id}
                    stage={stageWithId}
                    index={customIndex}
                    onEdit={handleEditStage}
                    onDelete={handleDeleteStage}
                    onMoveUp={() => {}} // TODO: Implementar moveStageUp
                    onMoveDown={() => {}} // TODO: Implementar moveStageDown
                    canMoveUp={customIndex > 0}
                    canMoveDown={customIndex < stages.length - 1}
                    isDragging={false}
                    isSystemStage={false}
                  />
                );
              })}

              {/* ETAPAS GANHO E PERDIDO (Sistema - Estáticas) */}
              {['Ganho', 'Perdido'].map(stageName => {
                const systemStage = SYSTEM_STAGES.find(s => s.name === stageName)!;
                const stageWithId = { ...systemStage, id: getStableId(systemStage, true) };
                return (
                  <SimpleSortableStageItem
                    key={stageWithId.id}
                    stage={stageWithId}
                    index={-1}
                    onEdit={() => handleEditStage(-1, stageWithId)}
                    onDelete={handleDeleteStage}
                    onMoveUp={() => {}} // Sistema não pode mover
                    onMoveDown={() => {}} // Sistema não pode mover
                    canMoveUp={false}
                    canMoveDown={false}
                    isDragging={false}
                    isSystemStage={true}
                  />
                );
              })}
            </StaggerContainer>
            
            {/* Mensagem quando não há etapas customizadas */}
            {stages.length === 0 && (
              <BlurFade delay={0.8} direction="up">
                <div className="p-8 text-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900/50 dark:via-blue-950/30 dark:to-purple-950/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-inner mt-6">
                  <MotionWrapper variant="bounceIn" delay={0.9}>
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Adicione etapas personalizadas
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Crie etapas customizadas que aparecerão entre "Lead" e "Ganho/Perdido"
                        </p>
                      </div>
                      <MotionWrapper variant="scaleIn" delay={1}>
                        <Button onClick={handleAddStage} size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg">
                          <Plus className="h-5 w-5 mr-2" />
                          Criar primeira etapa customizada
                        </Button>
                      </MotionWrapper>
                    </div>
                  </MotionWrapper>
                </div>
              </BlurFade>
            )}
          </div>

      {/* Modal de Edição/Visualização melhorado */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editingStage?.is_system_stage && (
                <>
                  {(() => {
                    const SystemIcon = getSystemStageIcon(editingStage.name);
                    const emoji = getSystemStageEmoji(editingStage.name);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{emoji}</span>
                        <SystemIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    );
                  })()}
                </>
              )}
              <div className="flex-1">
                {editingStage?.name ? (
                  <span className={editingStage.is_system_stage ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' : ''}>
                    {editingStage.is_system_stage 
                      ? `Etapa do Sistema: ${editingStage.name}` 
                      : `Editar Etapa: ${editingStage.name}`}
                  </span>
                ) : 'Nova Etapa'}
              </div>
              {editingStage?.is_system_stage && (
                <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300 shadow-sm">
                  <Crown className="h-3 w-3 mr-1" />
                  Sistema
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingStage?.is_system_stage
                ? 'Esta é uma etapa padrão do sistema. Visualize as informações abaixo.'
                : 'Configure o nome, descrição e aparência da etapa personalizada.'
              }
            </DialogDescription>
          </DialogHeader>

          {editingStage && (
            <div className="space-y-6">
              {/* Aviso especial para etapas do sistema */}
              {editingStage.is_system_stage && (
                <BlurFade delay={0.1}>
                  <div className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 dark:border-blue-800 shadow-inner">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                        <Info className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          🏆 Etapa do Sistema Premium
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          {getSystemStageTooltip(editingStage.name).description}
                        </p>
                        <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {getSystemStageTooltip(editingStage.name).tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </BlurFade>
              )}

              <div className="grid gap-6">
                {/* ✅ NOVO: Select de etapas sugeridas - apenas para novas etapas */}
                {!editingStage?.name && !editingStage?.is_system_stage && (
                  <div>
                    <Label htmlFor="suggestedStage" className="flex items-center gap-2 text-base font-medium mb-3">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      Escolha uma etapa sugerida ou crie personalizada
                    </Label>
                    <Select value={selectedSuggestedStage} onValueChange={handleSuggestedStageSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma etapa sugerida ou crie manualmente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Criar etapa personalizada</span>
                          </div>
                        </SelectItem>
                        {SUGGESTED_STAGES.map((suggested) => (
                          <SelectItem key={suggested.name} value={suggested.name}>
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full border border-gray-300" 
                                style={{ backgroundColor: suggested.color }}
                              />
                              <div>
                                <div className="font-medium">{suggested.name}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                  {suggested.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedSuggestedStage && !showManualInput && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-white shadow-sm" 
                            style={{ backgroundColor: localColor }}
                          />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {localName}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {localDescription}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Campo de nome - mostrar apenas se for edição OU se selecionou "manual" */}
                {(editingStage?.name || showManualInput) && (
                  <div>
                    <Label htmlFor="stageName" className="flex items-center gap-2 text-base font-medium">
                      Nome da Etapa
                      {editingStage?.is_system_stage && <Lock className="h-4 w-4 text-gray-400" />}
                    </Label>
                    <Input
                      id="stageName"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      placeholder="Ex: Contato Inicial, Proposta Enviada..."
                      disabled={editingStage?.is_system_stage}
                      className={`mt-2 ${editingStage?.is_system_stage ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                    />
                    {editingStage?.is_system_stage && (
                      <p className="text-xs text-gray-500 mt-2">
                        Este nome não pode ser alterado pois é uma etapa padrão do sistema.
                      </p>
                    )}
                  </div>
                )}

                {/* Campo de descrição - mostrar apenas se for edição OU se selecionou uma etapa (sugerida ou manual) */}
                {(editingStage?.name || showManualInput || selectedSuggestedStage) && (
                  <div>
                    <Label htmlFor="stageDescription" className="text-base font-medium">
                      Descrição
                      {!editingStage?.is_system_stage && <span className="text-xs text-gray-500 ml-1">(opcional)</span>}
                    </Label>
                    <Textarea
                      id="stageDescription"
                      value={localDescription}
                      onChange={(e) => setLocalDescription(e.target.value)}
                      placeholder="Descreva o que acontece nesta etapa do processo..."
                      rows={4}
                      disabled={editingStage?.is_system_stage}
                      className={`mt-2 ${editingStage?.is_system_stage ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                    />
                  </div>
                )}

                {/* Campo de cor - mostrar apenas se for edição OU se selecionou uma etapa (sugerida ou manual) */}
                {(editingStage?.name || showManualInput || selectedSuggestedStage) && (
                  <div>
                    <Label htmlFor="stageColor" className="flex items-center gap-2 text-base font-medium">
                      Cor da Etapa
                      {editingStage?.is_system_stage && <Lock className="h-4 w-4 text-gray-400" />}
                    </Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Input
                        id="stageColor"
                        type="color"
                        value={localColor}
                        onChange={(e) => setLocalColor(e.target.value)}
                        disabled={editingStage?.is_system_stage}
                        className={`w-20 h-12 ${editingStage?.is_system_stage ? 'opacity-75' : ''}`}
                      />
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-gray-200 shadow-md"
                          style={{ backgroundColor: localColor }}
                        />
                        <div>
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {localColor.toUpperCase()}
                          </span>
                          {editingStage?.is_system_stage && (
                            <p className="text-xs text-gray-500">
                              Cor otimizada para UX profissional
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowStageModal(false)}
            >
              {editingStage?.is_system_stage ? 'Fechar' : 'Cancelar'}
            </Button>
{!editingStage?.is_system_stage && (localName.trim() || selectedSuggestedStage) && (
              <Button 
                onClick={() => {
                  // ✅ CORREÇÃO: Aplicar valores locais diretamente na função handleSaveStage
                  const stageToSave = {
                    ...editingStage,
                    name: localName.trim(),
                    description: localDescription.trim(),
                    color: localColor,
                    order_index: editingStage?.order_index || (stages.length + 1)
                  };
                  
                  // Usar a lógica do handleSaveStage mas com dados corretos
                  if (stageToSave.is_system_stage) {
                    console.warn('⚠️ Tentativa de editar etapa do sistema bloqueada:', stageToSave.name);
                    setShowStageModal(false);
                    setEditingStage(null);
                    setEditStageIndex(null);
                    return;
                  }

                  const newStages = [...stages];
                  
                  if (editStageIndex !== null) {
                    // Editando etapa existente
                    if (stages[editStageIndex]?.is_system_stage) {
                      console.warn('⚠️ Tentativa de sobrescrever etapa do sistema bloqueada');
                      setShowStageModal(false);
                      setEditingStage(null);
                      setEditStageIndex(null);
                      return;
                    }
                    newStages[editStageIndex] = stageToSave;
                  } else {
                    // Adicionando nova etapa
                    newStages.push(stageToSave);
                  }

                  const organizedCustomStages = organizeStages(newStages);
                  setStages(organizedCustomStages);
                  
                  onStagesChange?.(combineStagesForCallback(organizedCustomStages));
                  
                  setShowStageModal(false);
                  setEditingStage(null);
                  setEditStageIndex(null);
                }} 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={!localName.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {selectedSuggestedStage ? `Adicionar ${selectedSuggestedStage}` : 'Salvar Etapa'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EnhancedStageManagerRender;