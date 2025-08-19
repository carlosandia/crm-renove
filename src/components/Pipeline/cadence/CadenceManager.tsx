import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
// ✅ NOVO: Imports do Dialog para modal unificado
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Save,
  Zap,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  ClipboardList,
  Building2,
  Send,
  PhoneCall,
  FileCheck,
  Clock,
  Play,
  Pause,
  Copy,
  // ✅ CORREÇÃO: Removidos Eye, EyeOff - ícones desnecessários conforme solicitação
} from 'lucide-react';

// ✅ REMOVIDO: SectionHeader não é mais usado com o padrão gradient

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';

export interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

export interface CadenceConfig {
  id?: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
}

export interface UseCadenceManagerProps {
  initialCadences?: CadenceConfig[];
  availableStages?: Array<{ name: string; order_index: number }>;
  onCadencesChange?: (cadences: CadenceConfig[]) => void;
  // ✅ NOVO: Props para integração com API
  pipelineId?: string;
  tenantId?: string;
  enableApiIntegration?: boolean;
}

export interface UseCadenceManagerReturn {
  cadenceConfigs: CadenceConfig[];
  // ✅ BUGFIX CRÍTICO: Alias para compatibilidade com ModernPipelineCreatorRefactored
  cadences: CadenceConfig[];
  setCadenceConfigs: React.Dispatch<React.SetStateAction<CadenceConfig[]>>;
  editingCadence: CadenceConfig | null;
  setEditingCadence: React.Dispatch<React.SetStateAction<CadenceConfig | null>>;
  editingTask: CadenceTask | null;
  setEditingTask: React.Dispatch<React.SetStateAction<CadenceTask | null>>;
  editCadenceIndex: number | null;
  setEditCadenceIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editTaskIndex: number | null;
  setEditTaskIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showCadenceModal: boolean;
  setShowCadenceModal: React.Dispatch<React.SetStateAction<boolean>>;
  showTaskModal: boolean;
  setShowTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleEditCadence: (index: number) => void;
  handleSaveCadence: () => void;
  handleDeleteCadence: (index: number) => void;
  handleToggleCadenceActive: (index: number) => void;
  handleAddTask: (cadenceIndex: number) => void;
  handleEditTask: (cadenceIndex: number, taskIndex: number) => void;
  handleSaveTask: () => void;
  handleDeleteTask: (cadenceIndex: number, taskIndex: number) => void;
  handleToggleTaskActive: (cadenceIndex: number, taskIndex: number) => void;
  getChannelIcon: (channel: string) => JSX.Element;
  getActionIcon: (actionType: string) => JSX.Element;
  // ✅ NOVA FUNÇÃO: Adicionar atividade diretamente para uma etapa
  handleAddActivityForStage: (stageName: string) => void;
  // ✅ NOVAS FUNÇÕES: Modal unificado
  showUnifiedModal: boolean;
  setShowUnifiedModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStage: string;
  newActivity: CadenceTask;
  setNewActivity: React.Dispatch<React.SetStateAction<CadenceTask>>;
  handleSaveUnifiedActivity: () => void;
  handleCancelUnified: () => void;
  // ✅ NOVA FUNÇÃO: Salvar todas as configurações no banco de dados
  handleSaveAllChanges: () => Promise<void>;
  // ✅ NOVO: Estados para feedback visual
  isSaving: boolean;
  savingMessage: string;
}

// Constantes
const CHANNEL_OPTIONS = [
  { value: 'email', label: 'E-mail', icon: Mail, color: 'bg-blue-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'bg-purple-500' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'bg-orange-500' },
  { value: 'tarefa', label: 'Tarefa', icon: ClipboardList, color: 'bg-gray-500' },
  { value: 'visita', label: 'Visita', icon: Building2, color: 'bg-indigo-500' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'mensagem', label: 'Enviar Mensagem', icon: Send },
  { value: 'ligacao', label: 'Fazer Ligação', icon: PhoneCall },
  { value: 'tarefa', label: 'Criar Tarefa', icon: ClipboardList },
  { value: 'email_followup', label: 'Follow-up Email', icon: Mail },
  { value: 'agendamento', label: 'Agendar Reunião', icon: Calendar },
  { value: 'proposta', label: 'Enviar Proposta', icon: FileCheck },
];

// ✅ CORREÇÃO: Removido DEFAULT_TASKS - usuário deve criar atividades do zero
// Template pré-pronto removido conforme solicitação do usuário

// ✅ CORREÇÃO: Importar hooks de API
import { useCadenceData } from '../../../hooks/useCadenceData';
import { cadenceQueryKeys } from '../../../services/cadenceApiService';

// Hook customizado para gerenciar cadências
export function useCadenceManager({ 
  initialCadences = [], 
  availableStages = [],
  onCadencesChange,
  // ✅ NOVO: Props para integração com API
  pipelineId,
  tenantId,
  enableApiIntegration = false
}: UseCadenceManagerProps = {}): UseCadenceManagerReturn {
  // ✅ NOVO: QueryClient para invalidação de cache
  const queryClient = useQueryClient();
  
  // ✅ NOVO: Hook para carregar dados da API (se habilitado)
  const apiData = useCadenceData(enableApiIntegration ? pipelineId : undefined);
  
  const [cadenceConfigs, setCadenceConfigs] = useState<CadenceConfig[]>([]);
  const [editingCadence, setEditingCadence] = useState<CadenceConfig | null>(null);
  const [editingTask, setEditingTask] = useState<CadenceTask | null>(null);
  const [editCadenceIndex, setEditCadenceIndex] = useState<number | null>(null);
  const [editTaskIndex, setEditTaskIndex] = useState<number | null>(null);
  const [showCadenceModal, setShowCadenceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // ✅ CORREÇÃO: Usar useRef para evitar comparações custosas durante render
  const initialCadencesRef = useRef<CadenceConfig[]>([]);
  
  // ✅ NOVO: Estado para controlar origem dos dados
  const [isLoadingFromApi, setIsLoadingFromApi] = useState(false);
  
  // ✅ NOVO: Estado para controlar se está editando (pausar sincronização API)
  const [isEditing, setIsEditing] = useState(false);
  
  // ✅ NOVO: Estados para modal unificado
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [newActivity, setNewActivity] = useState<CadenceTask>({
    day_offset: 0,
    task_order: 1,
    channel: 'email',
    action_type: 'mensagem',
    task_title: '',
    task_description: '',
    template_content: '',
    is_active: true
  });
  
  // ✅ CORREÇÃO: Estado para controlar se acabou de fazer uma exclusão
  const [isPostDeletion, setIsPostDeletion] = React.useState(false);
  
  // ✅ NOVO: Estado para feedback visual de salvamento
  const [isSaving, setIsSaving] = React.useState(false);
  const [savingMessage, setSavingMessage] = React.useState('');
  
  // ✅ OTIMIZADO: Throttling para logs de sincronização
  const syncLogThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncLogTimeRef = useRef<number>(0);
  
  // ✅ NOVO: Priorizar dados da API se disponível
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastLog = now - lastSyncLogTimeRef.current;
    const MIN_LOG_INTERVAL = 3000; // 3 segundos entre logs de sincronização
    
    // ✅ CORREÇÃO: Guard de comparação para evitar atualizações desnecessárias
    const hasApiDataChanged = JSON.stringify(apiData.data) !== JSON.stringify(cadenceConfigs);
    
    // ✅ CORREÇÃO: Não sincronizar se estiver editando OU logo após exclusão OU se dados não mudaram
    if (enableApiIntegration && apiData.data && !apiData.isLoading && !isEditing && !isPostDeletion && hasApiDataChanged) {
      // Log throttleado de sincronização
      if (timeSinceLastLog > MIN_LOG_INTERVAL) {
        if (syncLogThrottleRef.current) {
          clearTimeout(syncLogThrottleRef.current);
        }
        
        syncLogThrottleRef.current = setTimeout(() => {
          // ✅ Log silenciado para reduzir poluição do console durante digitação
          if (import.meta.env.VITE_ENABLE_COMPONENT_DEBUG === 'true') {
            console.log('🔄 [CadenceManager] Sincronização:', {
              pipelineId: pipelineId?.substring(0, 8),
              configs: apiData.data.length
            });
          }
          lastSyncLogTimeRef.current = Date.now();
        }, 500);
      }
      
      // ✅ MELHORIA: Forçar atualização apenas se realmente necessário
      const hasValidConfigs = apiData.data.length > 0;
      const shouldForceUpdate = hasValidConfigs && cadenceConfigs.length === 0;
      
      setCadenceConfigs(apiData.data);
      initialCadencesRef.current = [...apiData.data];
      setIsLoadingFromApi(false);
      return;
    }
    
    // Fallback para dados iniciais se API não estiver habilitada ou disponível
    const hasInitialData = initialCadences && initialCadences.length > 0;
    const currentIsEmpty = !cadenceConfigs || cadenceConfigs.length === 0;
    const isFirstLoad = initialCadencesRef.current.length === 0 && hasInitialData;
    
    if (isFirstLoad || (hasInitialData && currentIsEmpty && !enableApiIntegration)) {
      console.log('🔄 [useCadenceManager] Carregando dados iniciais (props):', {
        configsCount: initialCadences?.length || 0
      });
      setCadenceConfigs(initialCadences || []);
      initialCadencesRef.current = initialCadences || [];
    }
  }, [initialCadences, apiData.data, apiData.isLoading, enableApiIntegration, pipelineId, isEditing, isPostDeletion]); // ✅ CORREÇÃO LOOP: Removido 'cadenceConfigs' das dependências

  // ✅ SUPER OTIMIZADO: Debug com throttling agressivo
  const prevConfigsLengthRef = useRef(0);
  const configChangeLogThrottleRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (cadenceConfigs.length !== prevConfigsLengthRef.current) {
      // Throttling agressivo de 4 segundos para logs de mudança
      if (configChangeLogThrottleRef.current) {
        clearTimeout(configChangeLogThrottleRef.current);
      }
      
      configChangeLogThrottleRef.current = setTimeout(() => {
        // Log apenas em modo verbose ou quando há mudanças significativas
        if (import.meta.env.VITE_VERBOSE_LOGS === 'true' || Math.abs(cadenceConfigs.length - prevConfigsLengthRef.current) > 1) {
          console.log('🔄 [CadenceManager] Configs:', {
            count: cadenceConfigs.length,
            trend: cadenceConfigs.length > prevConfigsLengthRef.current ? '+' : '-'
          });
        }
      }, 4000);
      
      prevConfigsLengthRef.current = cadenceConfigs.length;
    }
  }, [cadenceConfigs]);

  // ✅ CORREÇÃO: Notificar mudanças usando ref pattern para evitar loops
  const prevCadenceConfigsRef = React.useRef<CadenceConfig[]>([]);
  const onCadencesChangeRef = React.useRef(onCadencesChange);
  onCadencesChangeRef.current = onCadencesChange;
  
  useEffect(() => {
    if (onCadencesChangeRef.current) {
      // ✅ CORREÇÃO CRÍTICA: Implementar comparação deep para detectar TODAS as mudanças
      const prevLength = prevCadenceConfigsRef.current.length;
      const currentLength = cadenceConfigs.length;
      
      // 1. Verificar mudanças de length (criação/remoção de etapas)
      const lengthChanged = prevLength !== currentLength;
      
      // 2. Verificar mudanças de conteúdo profundo (edição, toggle, modificação de tarefas)
      const contentChanged = JSON.stringify(prevCadenceConfigsRef.current) !== JSON.stringify(cadenceConfigs);
      
      if (lengthChanged || contentChanged) {
        // ✅ LOG CONDICIONAL: Apenas em desenvolvimento
        if (import.meta.env.DEV) {
          console.log('🔄 [CadenceManager] Mudança detectada:', {
            lengthChanged,
            contentChanged,
            prevLength,
            currentLength,
            timestamp: new Date().toISOString()
          });
        }
        
        onCadencesChangeRef.current(cadenceConfigs);
        prevCadenceConfigsRef.current = JSON.parse(JSON.stringify(cadenceConfigs)); // Deep clone
      }
    }
  }, [cadenceConfigs]); // ✅ CORREÇÃO: Remover onCadencesChange da dependency array

  const getChannelIcon = (channel: string) => {
    const channelOption = CHANNEL_OPTIONS.find(c => c.value === channel);
    if (!channelOption) return <Mail className="h-4 w-4" />;
    const IconComponent = channelOption.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActionIcon = (actionType: string) => {
    const actionOption = ACTION_TYPE_OPTIONS.find(a => a.value === actionType);
    if (!actionOption) return <Send className="h-4 w-4" />;
    const IconComponent = actionOption.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  // ✅ REMOVIDO: handleAddCadence - não mais necessário com workflow unificado

  // ✅ NOVA FUNÇÃO: Adicionar atividade usando modal unificado
  const handleAddActivityForStage = (stageName: string) => {
    const existingConfig = cadenceConfigs.find(c => c.stage_name === stageName);
    const nextOrder = existingConfig 
      ? Math.max(...existingConfig.tasks.map(t => t.task_order), 0) + 1
      : 1;
    const nextDayOffset = existingConfig 
      ? Math.max(...existingConfig.tasks.map(t => t.day_offset), 0) + 1
      : 0;
    
    setSelectedStage(stageName);
    setNewActivity({
      day_offset: nextDayOffset,
      task_order: nextOrder,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      template_content: '',
      is_active: true
    });
    setShowUnifiedModal(true);
  };

  // ✅ NOVA FUNÇÃO: Salvar atividade via modal unificado (criação e edição)
  const handleSaveUnifiedActivity = () => {
    if (!newActivity.task_title || !selectedStage) return;

    // ✅ NOVO: Ativar flag de edição para pausar sincronização API
    setIsEditing(true);

    const updatedCadences = [...cadenceConfigs];
    
    // ✅ NOVO: Verificar se está editando tarefa existente
    if (editCadenceIndex !== null && editTaskIndex !== null) {
      // Editando tarefa existente
      updatedCadences[editCadenceIndex].tasks[editTaskIndex] = { ...newActivity };
    } else if (editCadenceIndex !== null) {
      // Adicionando nova tarefa à configuração existente
      updatedCadences[editCadenceIndex].tasks.push(newActivity);
    } else {
      // ✅ CORREÇÃO REFORÇADA: Verificação ultra-robusta para evitar duplicação de etapas
      // Normalizar nome da etapa para comparação
      const normalizeStage = (stageName: string) => stageName.toLowerCase().trim().replace(/\s+/g, ' ');
      const normalizedSelectedStage = normalizeStage(selectedStage);
      
      // Buscar configuração existente com múltiplos critérios
      const existingConfigIndex = cadenceConfigs.findIndex(c => {
        const normalizedExistingStage = normalizeStage(c.stage_name);
        return normalizedExistingStage === normalizedSelectedStage;
      });
      
      if (existingConfigIndex !== -1) {
        // Etapa já existe - apenas adicionar atividade (REGRA DE NEGÓCIO CRÍTICA)
        console.log('🔄 [CadenceManager] REGRA APLICADA: Adicionando atividade à etapa existente:', {
          stageName: selectedStage,
          existingConfigId: updatedCadences[existingConfigIndex].id?.substring(0, 8) || 'novo',
          existingTasks: updatedCadences[existingConfigIndex].tasks.length,
          businessRule: 'multiplas_tarefas_uma_etapa'
        });
        
        // ✅ NOVA VALIDAÇÃO: Verificar se não estamos criando tarefa duplicada também
        const existingTask = updatedCadences[existingConfigIndex].tasks.find(task => 
          task.task_title.toLowerCase().trim() === newActivity.task_title.toLowerCase().trim() &&
          task.day_offset === newActivity.day_offset
        );
        
        if (existingTask) {
          console.warn('⚠️ [CadenceManager] Tarefa similar já existe nesta etapa:', {
            existingTitle: existingTask.task_title,
            newTitle: newActivity.task_title,
            dayOffset: newActivity.day_offset
          });
          // Continuar mesmo assim - usuário pode querer tarefas similares
        }
        
        updatedCadences[existingConfigIndex].tasks.push(newActivity);
      } else {
        // ✅ CORREÇÃO: Criar nova configuração para etapa (etapas já são validadas na UI)
        // Etapas só aparecem nos botões se já foram criadas na aba "Etapas"
        const stage = availableStages.find(s => normalizeStage(s.name) === normalizedSelectedStage);
        const stageOrder = stage?.order_index || 0;
        
        console.log('✅ [CadenceManager] Criando configuração para nova etapa:', {
          stageName: selectedStage,
          stageOrder: stageOrder,
          businessRule: 'primeira_tarefa_da_etapa'
        });
        
        const newConfig: CadenceConfig = {
          stage_name: selectedStage,
          stage_order: stageOrder,
          tasks: [newActivity],
          is_active: true
        };
        updatedCadences.push(newConfig);
      }
    }
    
    // Reorganizar ordem das tarefas na configuração afetada
    const configIndex = editCadenceIndex !== null ? editCadenceIndex : updatedCadences.findIndex(c => c.stage_name === selectedStage);
    if (configIndex !== -1) {
      updatedCadences[configIndex].tasks.sort((a, b) => a.day_offset - b.day_offset || a.task_order - b.task_order);
      updatedCadences[configIndex].tasks = updatedCadences[configIndex].tasks.map((task, index) => ({
        ...task,
        task_order: index + 1
      }));
    }
    
    setCadenceConfigs(updatedCadences);
    
    // Reset e fechar modal
    setShowUnifiedModal(false);
    setSelectedStage('');
    setEditCadenceIndex(null); // ✅ NOVO: Reset índices de edição
    setEditTaskIndex(null);
    setNewActivity({
      day_offset: 0,
      task_order: 1,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      template_content: '',
      is_active: true
    });
  };

  // ✅ NOVA FUNÇÃO: Cancelar modal unificado
  const handleCancelUnified = () => {
    setShowUnifiedModal(false);
    setSelectedStage('');
    setNewActivity({
      day_offset: 0,
      task_order: 1,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      template_content: '',
      is_active: true
    });
  };

  // ✅ NOVA FUNÇÃO: Salvar todas as configurações no banco de dados
  const handleSaveAllChanges = useCallback(async () => {
    if (!pipelineId || !tenantId) {
      console.warn('⚠️ [handleSaveAllChanges] pipelineId ou tenantId não disponível');
      return;
    }

    if (cadenceConfigs.length === 0) {
      console.log('ℹ️ [handleSaveAllChanges] Nenhuma configuração para salvar');
      return;
    }

    try {  
      setIsSaving(true);
      setSavingMessage('Preparando salvamento...');
      
      console.log('💾 [handleSaveAllChanges] Salvando configurações de cadência:', {
        pipelineId: pipelineId.substring(0, 8),
        configsCount: cadenceConfigs.length,
        configs: cadenceConfigs.map(c => ({ stage: c.stage_name, tasks: c.tasks.length }))
      });

      // Importar API diretamente para fazer as chamadas
      const { api } = await import('../../../lib/api');

      // ✅ NOVO: Detectar exclusões comparando estado inicial vs atual
      const initialConfigs = initialCadencesRef.current || [];
      const currentConfigs = cadenceConfigs;
      
      // Encontrar configurações que existiam inicialmente mas não estão no estado atual
      const deletedConfigs = initialConfigs.filter(initialConfig => 
        initialConfig.id && !currentConfigs.find(currentConfig => currentConfig.id === initialConfig.id)
      );

      // ✅ NOVO: Primeiro deletar configurações removidas
      if (deletedConfigs.length > 0) {
        setSavingMessage(`Excluindo ${deletedConfigs.length} configuração(ões)...`);
        console.log(`🗑️ [handleSaveAllChanges] Detectadas ${deletedConfigs.length} configuração(ões) para exclusão`);
        
        for (let i = 0; i < deletedConfigs.length; i++) {
          const configToDelete = deletedConfigs[i];
          setSavingMessage(`Excluindo "${configToDelete.stage_name}" (${i + 1}/${deletedConfigs.length})...`);
          try {
            console.log(`🔄 [handleSaveAllChanges] Deletando configuração:`, {
              configIdFull: configToDelete.id,
              configIdTruncated: configToDelete.id!.substring(0, 8),
              stageName: configToDelete.stage_name,
              tenantId: tenantId,
              requestUrl: `/cadence/config/${configToDelete.id}?tenant_id=${tenantId}`
            });
            
            const deleteResponse = await api.delete(`/cadence/config/${configToDelete.id}`, {
              params: { tenant_id: tenantId }
            });
            
            console.log(`✅ [handleSaveAllChanges] Configuração deletada com sucesso:`, {
              configId: configToDelete.id!.substring(0, 8),
              response: deleteResponse.data
            });
            
            // ✅ NOVA CORREÇÃO: Invalidar cache e forçar refetch após delete bem-sucedido
            const queryKey = cadenceQueryKeys.pipeline(pipelineId);
            console.log(`🔄 [handleSaveAllChanges] Invalidando cache para pipeline:`, {
              pipelineId: pipelineId?.substring(0, 8),
              queryKey: queryKey,
              cacheKeyString: JSON.stringify(queryKey)
            });
            
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: queryKey,
                exact: true
              }),
              queryClient.refetchQueries({
                queryKey: queryKey,
                exact: true
              }),
              // ✅ FALLBACK: Remover completamente da cache
              queryClient.removeQueries({
                queryKey: queryKey,
                exact: true
              })
            ]);
          } catch (deleteError: any) {
            console.error(`❌ [handleSaveAllChanges] Erro detalhado ao deletar configuração:`, {
              configId: configToDelete.id!.substring(0, 8),
              configIdFull: configToDelete.id,
              stageName: configToDelete.stage_name,
              error: deleteError.message,
              status: deleteError.response?.status,
              statusText: deleteError.response?.statusText,
              responseData: deleteError.response?.data,
              requestUrl: `/cadence/config/${configToDelete.id}?tenant_id=${tenantId}`
            });
            // Continuar com outras exclusões mesmo se uma falhar
          }
        }
        
        // ✅ NOVA CORREÇÃO: Verificar estado da API após todas as exclusões
        if (deletedConfigs.length > 0) {
          console.log(`🔍 [handleSaveAllChanges] Verificando estado final da API após ${deletedConfigs.length} exclusões`);
          
          try {
            // Forçar refetch dos dados para verificar se exclusões persistiram
            const { api } = await import('../../../lib/api');
            const verificationResponse = await api.get(`/cadence/load/${pipelineId}`);
            
            const currentDbConfigs = verificationResponse.data?.configs || [];
            const deletedIds = deletedConfigs.map(c => c.id).filter(Boolean);
            const stillExistInDb = currentDbConfigs.filter((config: any) => 
              deletedIds.includes(config.id)
            );
            
            console.log(`📊 [handleSaveAllChanges] Verificação pós-delete:`, {
              deletedConfigIds: deletedIds.map(id => id!.substring(0, 8)),
              currentDbConfigsCount: currentDbConfigs.length,
              stillExistInDbCount: stillExistInDb.length,
              deletionsPersisted: stillExistInDb.length === 0 ? '✅ Sim' : '❌ Não',
              remainingConfigs: currentDbConfigs.map((c: any) => ({
                id: c.id?.substring(0, 8),
                stage: c.stage_name
              }))
            });
            
            if (stillExistInDb.length > 0) {
              console.warn(`⚠️ [handleSaveAllChanges] ATENÇÃO: ${stillExistInDb.length} configurações ainda existem no banco após exclusão!`);
            }
            
          } catch (verificationError: any) {
            console.warn(`⚠️ [handleSaveAllChanges] Erro na verificação pós-delete (não crítico):`, {
              error: verificationError.message
            });
          }
        }
      }

      // ✅ EXISTENTE: Salvar configurações restantes
      setSavingMessage('Salvando configurações...');
      
      for (let i = 0; i < cadenceConfigs.length; i++) {
        const config = cadenceConfigs[i];
        
        if (config.tasks.length === 0) {
          console.log(`⏭️ [handleSaveAllChanges] Pulando etapa "${config.stage_name}" - sem tarefas`);
          continue;
        }

        setSavingMessage(`Salvando "${config.stage_name}" (${i + 1}/${cadenceConfigs.length})...`);
        console.log(`🔄 [handleSaveAllChanges] Salvando etapa "${config.stage_name}" com ${config.tasks.length} tarefa(s)`);

        // Usar endpoint seguro que não afeta outras configurações
        const response = await api.post('/cadence/save-stage', {
          pipeline_id: pipelineId,
          stage_name: config.stage_name,
          stage_order: config.stage_order,
          tasks: config.tasks,
          is_active: config.is_active,
          tenant_id: tenantId,
          created_by: 'cadence_manager'
        });

        console.log(`✅ [handleSaveAllChanges] Etapa "${config.stage_name}" salva com sucesso`);
      }

      setSavingMessage('Finalizando...');
      console.log('🎉 [handleSaveAllChanges] Todas as configurações de cadência foram salvas com sucesso');
      
      // ✅ NOVA CORREÇÃO: Invalidar cache final e forçar refetch completo
      if (deletedConfigs.length > 0) {
        setSavingMessage('Atualizando dados...');
        console.log(`🔄 [handleSaveAllChanges] Invalidação final de cache após ${deletedConfigs.length} exclusões`);
        
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: cadenceQueryKeys.pipeline(pipelineId),
            exact: true
          }),
          queryClient.refetchQueries({
            queryKey: cadenceQueryKeys.pipeline(pipelineId),
            exact: true,
            type: 'active'
          })
        ]);
        
        // ✅ NOVA CORREÇÃO: Aguardar propagação do cache antes de reativar sincronização
        console.log(`⏳ [handleSaveAllChanges] Aguardando propagação (800ms) antes de reativar sincronização`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // ✅ NOVA CORREÇÃO: Verificação pós-save com retry automático
      await verifyAndRetrySync(deletedConfigs.length > 0);

    } catch (error: any) {
      console.error('❌ [handleSaveAllChanges] Erro ao salvar configurações:', error);
      
      // ✅ NOVO: Limpar estado de salvamento em caso de erro
      setIsSaving(false);
      setSavingMessage('');
      // ✅ NOVO: Manter flag de edição ativa em caso de erro para permitir retry
      // setIsEditing(false); // Não desativar para permitir retry
      throw error; // Re-throw para que o componente pai possa tratar
    }
  }, [cadenceConfigs, pipelineId, tenantId]);

  // ✅ NOVA FUNÇÃO: Verificar e fazer retry da sincronização
  const verifyAndRetrySync = async (hasDeletes: boolean) => {
    const maxRetries = 3;
    const baseDelay = hasDeletes ? 2000 : 1500; // Delay maior para exclusões
    
    console.log(`🔍 [verifyAndRetrySync] Iniciando verificação pós-save:`, {
      pipelineId: pipelineId?.substring(0, 8),
      expectedConfigs: cadenceConfigs.length,
      hasDeletes,
      baseDelay
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setSavingMessage(`Verificando sincronização... (${attempt}/${maxRetries})`);
        
        // Aguardar propagação
        await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        
        // Forçar refetch direto da API para verificar estado atual
        const { api } = await import('../../../lib/api');
        const verificationResponse = await api.get(`/cadence/load/${pipelineId}`);
        const currentApiConfigs = verificationResponse.data?.configs || [];
        
        console.log(`📊 [verifyAndRetrySync] Tentativa ${attempt}:`, {
          pipelineId: pipelineId?.substring(0, 8),
          expectedCount: cadenceConfigs.length,
          apiReturnedCount: currentApiConfigs.length,
          apiConfigs: currentApiConfigs.map((c: any) => ({ 
            id: c.id?.substring(0, 8), 
            stage: c.stage_name,
            tasks: c.tasks?.length 
          })),
          isInSync: currentApiConfigs.length === cadenceConfigs.length
        });
        
        if (currentApiConfigs.length === cadenceConfigs.length) {
          console.log(`✅ [verifyAndRetrySync] Sincronização confirmada na tentativa ${attempt}`);
          
          // Forçar invalidação para garantir dados frescos
          const queryKey = cadenceQueryKeys.pipeline(pipelineId);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey, exact: true }),
            queryClient.refetchQueries({ queryKey, exact: true })
          ]);
          
          // Aguardar um pouco mais antes de reativar sincronização
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        }
        
        if (attempt === maxRetries) {
          console.warn(`⚠️ [verifyAndRetrySync] Sincronização não confirmada após ${maxRetries} tentativas`);
          // Não reativar sincronização automática - manter dados locais
          setSavingMessage('Dados salvos, mas pode haver atraso na sincronização');
          
          setTimeout(() => {
            console.log(`🔄 [verifyAndRetrySync] Reativando sincronização após timeout de emergência`);
            setIsPostDeletion(false);
            setIsEditing(false);
            setIsSaving(false);
            setSavingMessage('');
          }, 5000); // Timeout longo para dar tempo de propagação
          return;
        }
        
      } catch (verifyError: any) {
        console.warn(`⚠️ [verifyAndRetrySync] Erro na tentativa ${attempt}:`, verifyError.message);
        if (attempt === maxRetries) {
          console.error(`❌ [verifyAndRetrySync] Falha completa na verificação`);
        }
      }
    }
    
    // ✅ CORREÇÃO: Delay maior na reativação da sincronização
    if (hasDeletes) {
      setIsPostDeletion(true);
      console.log(`⏸️ [verifyAndRetrySync] Pausando sincronização por exclusões`);
      
      setTimeout(() => {
        console.log(`🔄 [verifyAndRetrySync] Reativando sincronização API após delay pós-exclusão`);
        setIsPostDeletion(false);
        setIsEditing(false);
        setIsSaving(false);
        setSavingMessage('');
      }, 3000); // Delay muito maior para exclusões
    } else {
      setTimeout(() => {
        console.log(`🔄 [verifyAndRetrySync] Reativando sincronização API após delay padrão aumentado`);
        setIsEditing(false);
        setIsSaving(false);
        setSavingMessage('');
      }, 2000); // Delay aumentado de 300ms para 2000ms
    }
  };

  const handleEditCadence = (index: number) => {
    setEditingCadence({ ...cadenceConfigs[index] });
    setEditCadenceIndex(index);
    setShowCadenceModal(true);
  };

  const handleSaveCadence = () => {
    if (!editingCadence || !editingCadence.stage_name) return;

    if (editCadenceIndex !== null) {
      // Editando cadência existente
      const updatedCadences = [...cadenceConfigs];
      updatedCadences[editCadenceIndex] = editingCadence;
      setCadenceConfigs(updatedCadences);
    } else {
      // Nova cadência
      setCadenceConfigs([...cadenceConfigs, editingCadence]);
    }

    setShowCadenceModal(false);
    setEditingCadence(null);
    setEditCadenceIndex(null);
  };

  const handleDeleteCadence = (index: number) => {
    const configToDelete = cadenceConfigs[index];
    
    console.log('🗑️ [handleDeleteCadence] Removendo da UI:', {
      configId: configToDelete.id?.substring(0, 8) || 'novo',
      stageName: configToDelete.stage_name,
      tasksCount: configToDelete.tasks.length
    });
    
    // ✅ NOVO: Ativar flag de edição para pausar sincronização API
    setIsEditing(true);
    
    // ✅ SIMPLIFICADO: Apenas remover da UI (visual)
    const updatedCadences = cadenceConfigs.filter((_, i) => i !== index);
    setCadenceConfigs(updatedCadences);
  };

  const handleToggleCadenceActive = (index: number) => {
    // ✅ NOVO: Ativar flag de edição para pausar sincronização API
    setIsEditing(true);
    
    const updatedCadences = [...cadenceConfigs];
    updatedCadences[index].is_active = !updatedCadences[index].is_active;
    setCadenceConfigs(updatedCadences);
  };

  const handleAddTask = (cadenceIndex: number) => {
    const cadence = cadenceConfigs[cadenceIndex];
    const nextOrder = Math.max(...cadence.tasks.map(t => t.task_order), 0) + 1;
    const nextDayOffset = Math.max(...cadence.tasks.map(t => t.day_offset), 0) + 1;

    // ✅ NOVO: Usar modal unificado em vez de inline
    setSelectedStage(cadence.stage_name);
    setNewActivity({
      day_offset: nextDayOffset,
      task_order: nextOrder,
      channel: 'email',
      action_type: 'mensagem',
      task_title: '',
      task_description: '',
      template_content: '',
      is_active: true
    });
    setEditCadenceIndex(cadenceIndex);
    setEditTaskIndex(null);
    setShowUnifiedModal(true); // ✅ Modal unificado
  };

  const handleEditTask = (cadenceIndex: number, taskIndex: number) => {
    const task = cadenceConfigs[cadenceIndex].tasks[taskIndex];
    const cadence = cadenceConfigs[cadenceIndex];
    
    // ✅ NOVO: Usar modal unificado para edição
    setSelectedStage(cadence.stage_name);
    setNewActivity({ ...task }); // Preencher com dados existentes
    setEditCadenceIndex(cadenceIndex);
    setEditTaskIndex(taskIndex);
    setShowUnifiedModal(true); // ✅ Modal unificado
  };

  const handleSaveTask = () => {
    if (!editingTask || editCadenceIndex === null) return;

    // ✅ NOVO: Ativar flag de edição para pausar sincronização API
    setIsEditing(true);

    const updatedCadences = [...cadenceConfigs];
    const cadence = updatedCadences[editCadenceIndex];

    if (editTaskIndex !== null) {
      // Editando tarefa existente
      cadence.tasks[editTaskIndex] = editingTask;
    } else {
      // Nova tarefa
      cadence.tasks.push(editingTask);
    }

    // Reorganizar ordem das tarefas
    cadence.tasks.sort((a, b) => a.day_offset - b.day_offset || a.task_order - b.task_order);
    cadence.tasks = cadence.tasks.map((task, index) => ({
      ...task,
      task_order: index + 1
    }));

    setCadenceConfigs(updatedCadences);
    setShowTaskModal(false);
    setEditingTask(null);
    setEditCadenceIndex(null);
    setEditTaskIndex(null);
  };

  const handleDeleteTask = (cadenceIndex: number, taskIndex: number) => {
    // ✅ NOVO: Ativar flag de edição para pausar sincronização API
    setIsEditing(true);
    
    const updatedCadences = [...cadenceConfigs];
    updatedCadences[cadenceIndex].tasks = updatedCadences[cadenceIndex].tasks.filter((_, i) => i !== taskIndex);
    setCadenceConfigs(updatedCadences);
  };

  const handleToggleTaskActive = (cadenceIndex: number, taskIndex: number) => {
    // ✅ NOVO: Ativar flag de edição para pausar sincronização API
    setIsEditing(true);
    
    const updatedCadences = [...cadenceConfigs];
    const task = updatedCadences[cadenceIndex].tasks[taskIndex];
    task.is_active = !task.is_active;
    setCadenceConfigs(updatedCadences);
  };

  return {
    cadenceConfigs,
    // ✅ BUGFIX CRÍTICO: Alias para compatibilidade com ModernPipelineCreatorRefactored
    cadences: cadenceConfigs,
    setCadenceConfigs,
    editingCadence,
    setEditingCadence,
    editingTask,
    setEditingTask,
    editCadenceIndex,
    setEditCadenceIndex,
    editTaskIndex,
    setEditTaskIndex,
    showCadenceModal,
    setShowCadenceModal,
    showTaskModal,
    setShowTaskModal,
    handleEditCadence,
    handleSaveCadence,
    handleDeleteCadence,
    handleToggleCadenceActive,
    handleAddTask,
    handleEditTask,
    handleSaveTask,
    handleDeleteTask,
    handleToggleTaskActive,
    getChannelIcon,
    getActionIcon,
    // ✅ NOVA FUNÇÃO: Adicionar atividade diretamente para uma etapa
    handleAddActivityForStage,
    // ✅ NOVAS FUNÇÕES: Modal unificado
    showUnifiedModal,
    setShowUnifiedModal,
    selectedStage,
    newActivity,
    setNewActivity,
    handleSaveUnifiedActivity,
    handleCancelUnified,
    // ✅ NOVA FUNÇÃO: Salvar todas as configurações no banco
    handleSaveAllChanges,
    // ✅ NOVO: Estados para feedback visual
    isSaving,
    savingMessage
  };
}

// Componente de renderização do gerenciador de cadências
export interface CadenceManagerRenderProps {
  cadenceManager: UseCadenceManagerReturn;
  availableStages?: Array<{ name: string; order_index: number }>;
  isLoading?: boolean;
  isApiEnabled?: boolean;
}

export function CadenceManagerRender({ 
  cadenceManager, 
  availableStages = [], 
  isLoading = false,
  isApiEnabled = false 
}: CadenceManagerRenderProps) {
  const {
    cadenceConfigs,
    editingCadence,
    setEditingCadence,
    editingTask,
    setEditingTask,
    showCadenceModal,
    setShowCadenceModal,
    showTaskModal,
    setShowTaskModal,
    handleEditCadence,
    handleSaveCadence,
    handleDeleteCadence,
    handleToggleCadenceActive,
    handleAddTask,
    handleEditTask,
    handleSaveTask,
    handleDeleteTask,
    handleToggleTaskActive,
    getChannelIcon,
    getActionIcon,
    handleAddActivityForStage,
    showUnifiedModal,
    setShowUnifiedModal,
    selectedStage,
    newActivity,
    setNewActivity,
    handleSaveUnifiedActivity,
    handleCancelUnified,
    isSaving,
    savingMessage
  } = cadenceManager;

  // ✅ NOVO: Exibir loading se estiver carregando dados da API
  if (isLoading && isApiEnabled) {
    return (
      <div className="space-y-6">
        <BlurFade delay={0.1} direction="up">
          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Automação de Atividades</h3>
                <p className="text-sm text-slate-500">Configure atividades automáticas por etapa da pipeline</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="text-sm text-muted-foreground">
                  Carregando atividades existentes...
                </p>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== HEADER PRINCIPAL ===== */}
      <BlurFade delay={0.1} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Automação de Atividades</h3>
              <p className="text-sm text-slate-500">Configure atividades automáticas por etapa da pipeline</p>
            </div>
          </div>

          {/* ✅ NOVO: Indicador de salvamento */}
          {isSaving && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Salvando alterações...
                  </p>
                  {savingMessage && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {savingMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ NOVA SEÇÃO: Atalhos rápidos por etapa OU mensagem explicativa */}
          {availableStages.length > 0 ? (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Criar Atividades por Etapa
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableStages
                  // ✅ CORREÇÃO: Filtrar etapas finais - nunca devem ter atividades de cadência
                  .filter(stage => stage.order_index < 998) // Excluir "Ganho" (998) e "Perdido" (999)
                  .map(stage => {
                    const hasActivities = cadenceConfigs.some(c => c.stage_name === stage.name);
                    const activitiesCount = cadenceConfigs.find(c => c.stage_name === stage.name)?.tasks?.length || 0;
                    
                    return (
                      <Button
                        key={stage.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddActivityForStage(stage.name)}
                        disabled={isSaving}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{stage.name}</span>
                        {hasActivities && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                            {activitiesCount}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                ⚠️ Nenhuma etapa disponível para atividades
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                As etapas finais (Ganho/Perdido) não podem ter atividades de follow-up automáticas. 
                Crie etapas intermediárias na aba "Etapas" para configurar automações de cadência.
              </p>
            </div>
          )}
        </div>
      </BlurFade>

      {/* ===== CONFIGURAÇÕES EXISTENTES ===== */}
      {isApiEnabled && cadenceConfigs.length === 0 && (
        <BlurFade delay={0.2} direction="up">
          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <ClipboardList className="h-8 w-8 text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Nenhuma atividade configurada para esta pipeline.
                </p>
                <p className="text-xs text-slate-500">
                  Use os botões acima para criar atividades automáticas por etapa.
                </p>
              </div>
            </div>
          </div>
        </BlurFade>
      )}
      
      {cadenceConfigs.map((cadence, cadenceIndex) => (
          <BlurFade key={cadenceIndex} delay={0.3 + (0.1 * cadenceIndex)} direction="up">
            <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cadence.is_active ? 'bg-green-50' : 'bg-slate-50'}`}>
                    {cadence.is_active ? (
                      <Play className="h-5 w-5 text-green-600" />
                    ) : (
                      <Pause className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{cadence.stage_name}</h4>
                    <p className="text-sm text-slate-500">
                      {cadence.tasks.length} tarefa(s) configurada(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cadence.is_active}
                    onCheckedChange={() => handleToggleCadenceActive(cadenceIndex)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCadence(cadenceIndex)}
                    disabled={isSaving}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-3">
                  {cadence.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50/50 to-white border border-slate-200/40 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Dia {task.day_offset}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(task.channel)}
                            <span className="text-sm">
                              {CHANNEL_OPTIONS.find(c => c.value === task.channel)?.label}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{task.task_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ACTION_TYPE_OPTIONS.find(a => a.value === task.action_type)?.label}
                          </p>
                        </div>
                      </div>

                      {/* ✅ CORREÇÃO: Interface simplificada - apenas editar e excluir */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(cadenceIndex, taskIndex)}
                          title="Editar atividade"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(cadenceIndex, taskIndex)}
                          className="text-destructive hover:text-destructive"
                          title="Excluir atividade"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTask(cadenceIndex)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tarefa
                  </Button>
                </div>
              </div>
            </div>
          </BlurFade>
        ))}

      {/* ✅ REMOVIDO: Modal de cadência inline - substituído por workflow unificado */}

      {/* ✅ MODAL UNIFICADO: Dialog responsivo para criar atividades */}
      <Dialog open={showUnifiedModal} onOpenChange={setShowUnifiedModal}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Atividade - {selectedStage}</DialogTitle>
            <DialogDescription>
              Configure uma nova atividade para a etapa selecionada
            </DialogDescription>
          </DialogHeader>
          
          {/* ✅ FORMULÁRIO COMPACTO: Grid layout otimizado */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dayOffset">Dia</Label>
              <Input
                id="dayOffset"
                type="number"
                min="0"
                className="h-9"
                value={newActivity.day_offset}
                onChange={(e) => setNewActivity({
                  ...newActivity,
                  day_offset: parseInt(e.target.value) || 0
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select
                value={newActivity.channel}
                onValueChange={(value: CadenceTask['channel']) => 
                  setNewActivity({
                    ...newActivity,
                    channel: value
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map(channel => {
                    const IconComponent = channel.icon;
                    return (
                      <SelectItem key={channel.value} value={channel.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {channel.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <Select
                value={newActivity.action_type}
                onValueChange={(value: CadenceTask['action_type']) => 
                  setNewActivity({
                    ...newActivity,
                    action_type: value
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map(action => {
                    const IconComponent = action.icon;
                    return (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {action.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="taskTitle">Título</Label>
              <Input
                id="taskTitle"
                className="h-9"
                value={newActivity.task_title}
                onChange={(e) => setNewActivity({
                  ...newActivity,
                  task_title: e.target.value
                })}
                placeholder="Ex: Primeiro contato"
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="taskDescription">Descrição</Label>
              <Textarea
                id="taskDescription"
                rows={2}
                className="resize-none"
                value={newActivity.task_description}
                onChange={(e) => setNewActivity({
                  ...newActivity,
                  task_description: e.target.value
                })}
                placeholder="Descreva o que deve ser feito nesta atividade..."
              />
            </div>
            
            {/* ✅ REMOVIDO: Campo Template/Conteúdo conforme solicitado */}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelUnified}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUnifiedActivity}
              disabled={!newActivity.task_title}
            >
              Salvar Atividade
            </Button>
          </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* ✅ MODAL DE EDIÇÃO: Manter modal inline para editar tarefas existentes */}
      {showTaskModal && (
        <BlurFade delay={0.1} direction="up">
          <div className="mt-6 p-6 bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl space-y-4">
            {/* Header do Formulário Inline */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold">
                  {editingTask?.task_title ? `Editar Tarefa: ${editingTask.task_title}` : 'Nova Tarefa'}
                </h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTaskModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>

            <p className="text-sm text-slate-500">
              Configure os detalhes da tarefa de automação.
            </p>

            {editingTask && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dayOffset">Dia de Execução</Label>
                    <Input
                      id="dayOffset"
                      type="number"
                      min="0"
                      value={editingTask.day_offset}
                      onChange={(e) => setEditingTask({
                        ...editingTask,
                        day_offset: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="channel">Canal</Label>
                    <Select
                      value={editingTask.channel}
                      onValueChange={(value: CadenceTask['channel']) => 
                        setEditingTask({
                          ...editingTask,
                          channel: value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map(channel => {
                          const IconComponent = channel.icon;
                          return (
                            <SelectItem key={channel.value} value={channel.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                {channel.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="actionType">Tipo de Ação</Label>
                  <Select
                    value={editingTask.action_type}
                    onValueChange={(value: CadenceTask['action_type']) => 
                      setEditingTask({
                        ...editingTask,
                        action_type: value
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPE_OPTIONS.map(action => {
                        const IconComponent = action.icon;
                        return (
                          <SelectItem key={action.value} value={action.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {action.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="taskTitle">Título da Tarefa</Label>
                  <Input
                    id="taskTitle"
                    value={editingTask.task_title}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task_title: e.target.value
                    })}
                    placeholder="Ex: Primeiro contato"
                  />
                </div>

                <div>
                  <Label htmlFor="taskDescription">Descrição</Label>
                  <Textarea
                    id="taskDescription"
                    value={editingTask.task_description}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      task_description: e.target.value
                    })}
                    placeholder="Descreva o que deve ser feito nesta tarefa..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="templateContent">Template/Conteúdo</Label>
                  <Textarea
                    id="templateContent"
                    value={editingTask.template_content || ''}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      template_content: e.target.value
                    })}
                    placeholder="Template de mensagem ou roteiro de ligação..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="taskActive"
                    checked={editingTask.is_active}
                    onCheckedChange={(checked) => setEditingTask({
                      ...editingTask,
                      is_active: checked
                    })}
                  />
                  <Label htmlFor="taskActive">Tarefa ativa</Label>
                </div>

                {/* Botões de Ação Inline */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowTaskModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveTask}
                    disabled={!editingTask?.task_title}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </BlurFade>
      )}
    </div>
  );
}

export default CadenceManagerRender; 