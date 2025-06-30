import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { AnimatedCard } from '../../ui/animated-card';
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
  Eye,
  EyeOff
} from 'lucide-react';

interface CadenceTask {
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

interface CadenceConfig {
  id?: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
}

interface UseCadenceManagerProps {
  initialCadences?: CadenceConfig[];
  availableStages?: Array<{ name: string; order_index: number }>;
  onCadencesChange?: (cadences: CadenceConfig[]) => void;
}

interface UseCadenceManagerReturn {
  cadenceConfigs: CadenceConfig[];
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
  handleAddCadence: () => void;
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

const DEFAULT_TASKS: CadenceTask[] = [
  {
    day_offset: 0,
    task_order: 1,
    channel: 'email',
    action_type: 'mensagem',
    task_title: 'Primeiro contato',
    task_description: 'Enviar e-mail de boas-vindas e apresentação',
    template_content: 'Olá [NOME], bem-vindo(a)! Gostaríamos de apresentar nossos serviços...',
    is_active: true
  },
  {
    day_offset: 1,
    task_order: 2,
    channel: 'whatsapp',
    action_type: 'mensagem',
    task_title: 'Follow-up WhatsApp',
    task_description: 'Mensagem de acompanhamento via WhatsApp',
    template_content: 'Oi [NOME]! Espero que tenha recebido nosso e-mail. Tem alguma dúvida?',
    is_active: true
  },
  {
    day_offset: 3,
    task_order: 3,
    channel: 'ligacao',
    action_type: 'ligacao',
    task_title: 'Ligação de qualificação',
    task_description: 'Realizar ligação para qualificar o lead',
    template_content: 'Roteiro: apresentar empresa, entender necessidades, agendar demonstração',
    is_active: true
  }
];

// Hook customizado para gerenciar cadências
export function useCadenceManager({ 
  initialCadences = [], 
  availableStages = [],
  onCadencesChange 
}: UseCadenceManagerProps = {}): UseCadenceManagerReturn {
  const [cadenceConfigs, setCadenceConfigs] = useState<CadenceConfig[]>([]);
  const [editingCadence, setEditingCadence] = useState<CadenceConfig | null>(null);
  const [editingTask, setEditingTask] = useState<CadenceTask | null>(null);
  const [editCadenceIndex, setEditCadenceIndex] = useState<number | null>(null);
  const [editTaskIndex, setEditTaskIndex] = useState<number | null>(null);
  const [showCadenceModal, setShowCadenceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Inicializar com dados fornecidos
  useEffect(() => {
    if (initialCadences.length > 0) {
      setCadenceConfigs(initialCadences);
    }
  }, [initialCadences]);

  // Notificar mudanças nas cadências
  useEffect(() => {
    if (onCadencesChange) {
      onCadencesChange(cadenceConfigs);
    }
  }, [cadenceConfigs, onCadencesChange]);

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

  const handleAddCadence = () => {
    setEditingCadence({
      stage_name: '',
      stage_order: 0,
      tasks: [...DEFAULT_TASKS],
      is_active: true
    });
    setEditCadenceIndex(null);
    setShowCadenceModal(true);
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
    const updatedCadences = cadenceConfigs.filter((_, i) => i !== index);
    setCadenceConfigs(updatedCadences);
  };

  const handleToggleCadenceActive = (index: number) => {
    const updatedCadences = [...cadenceConfigs];
    updatedCadences[index].is_active = !updatedCadences[index].is_active;
    setCadenceConfigs(updatedCadences);
  };

  const handleAddTask = (cadenceIndex: number) => {
    const cadence = cadenceConfigs[cadenceIndex];
    const nextOrder = Math.max(...cadence.tasks.map(t => t.task_order), 0) + 1;
    const nextDayOffset = Math.max(...cadence.tasks.map(t => t.day_offset), 0) + 1;

    setEditingTask({
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
    setShowTaskModal(true);
  };

  const handleEditTask = (cadenceIndex: number, taskIndex: number) => {
    const task = cadenceConfigs[cadenceIndex].tasks[taskIndex];
    setEditingTask({ ...task });
    setEditCadenceIndex(cadenceIndex);
    setEditTaskIndex(taskIndex);
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    if (!editingTask || editCadenceIndex === null) return;

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
    const updatedCadences = [...cadenceConfigs];
    updatedCadences[cadenceIndex].tasks = updatedCadences[cadenceIndex].tasks.filter((_, i) => i !== taskIndex);
    setCadenceConfigs(updatedCadences);
  };

  const handleToggleTaskActive = (cadenceIndex: number, taskIndex: number) => {
    const updatedCadences = [...cadenceConfigs];
    const task = updatedCadences[cadenceIndex].tasks[taskIndex];
    task.is_active = !task.is_active;
    setCadenceConfigs(updatedCadences);
  };

  return {
    cadenceConfigs,
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
    handleAddCadence,
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
    getActionIcon
  };
}

// Componente de renderização do gerenciador de cadências
interface CadenceManagerRenderProps {
  cadenceManager: UseCadenceManagerReturn;
  availableStages?: Array<{ name: string; order_index: number }>;
}

export function CadenceManagerRender({ cadenceManager, availableStages = [] }: CadenceManagerRenderProps) {
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
    handleAddCadence,
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
    getActionIcon
  } = cadenceManager;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Automação de Cadência
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure follow-ups automáticos para cada etapa do pipeline.
          </p>
        </div>
        <Button onClick={handleAddCadence} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Cadência
        </Button>
      </div>

      <div className="space-y-4">
        {cadenceConfigs.map((cadence, cadenceIndex) => (
          <BlurFade key={cadenceIndex} delay={0.1 * cadenceIndex} inView>
            <AnimatedCard>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cadence.is_active ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                      {cadence.is_active ? (
                        <Play className="h-4 w-4 text-green-500" />
                      ) : (
                        <Pause className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{cadence.stage_name}</CardTitle>
                      <CardDescription>
                        {cadence.tasks.length} tarefa(s) configurada(s)
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cadence.is_active}
                      onCheckedChange={() => handleToggleCadenceActive(cadenceIndex)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCadence(cadenceIndex)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCadence(cadenceIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {cadence.tasks.map((task, taskIndex) => (
                    <div key={taskIndex} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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

                      <div className="flex items-center gap-2">
                        {task.is_active ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTaskActive(cadenceIndex, taskIndex)}
                        >
                          {task.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(cadenceIndex, taskIndex)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(cadenceIndex, taskIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTask(cadenceIndex)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tarefa
                  </Button>
                </div>
              </CardContent>
            </AnimatedCard>
          </BlurFade>
        ))}
      </div>

      {/* Modal de Cadência */}
      <Dialog open={showCadenceModal} onOpenChange={setShowCadenceModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCadence?.stage_name ? `Editar Cadência: ${editingCadence.stage_name}` : 'Nova Cadência'}
            </DialogTitle>
            <DialogDescription>
              Configure a cadência de automação para uma etapa.
            </DialogDescription>
          </DialogHeader>

          {editingCadence && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="stageName">Etapa</Label>
                <Select
                  value={editingCadence.stage_name}
                  onValueChange={(value) => {
                    const stage = availableStages.find(s => s.name === value);
                    setEditingCadence({
                      ...editingCadence,
                      stage_name: value,
                      stage_order: stage?.order_index || 0
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStages.map(stage => (
                      <SelectItem key={stage.name} value={stage.name}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="cadenceActive"
                  checked={editingCadence.is_active}
                  onCheckedChange={(checked) => setEditingCadence({
                    ...editingCadence,
                    is_active: checked
                  })}
                />
                <Label htmlFor="cadenceActive">Cadência ativa</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCadenceModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCadence}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Tarefa */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask?.task_title ? `Editar Tarefa: ${editingTask.task_title}` : 'Nova Tarefa'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da tarefa de automação.
            </DialogDescription>
          </DialogHeader>

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
            </div>
          )}

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CadenceManagerRender; 