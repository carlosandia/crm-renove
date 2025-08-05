import React, { useState, useMemo } from 'react';
import { useMemberTools } from '../hooks/useMemberTools';
import { useAuth } from '../providers/AuthProvider';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Mail, 
  MessageSquare,
  TrendingUp,
  Users,
  Target,
  Activity,
  Settings,
  RefreshCw,
  Plus,
  Eye,
  Phone,
  Video,
  Award,
  BarChart3
} from 'lucide-react';

// Magic UI and shadcn/ui imports
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
import { TabNavigation, TabItem } from './ui/navigation';
import { MotionWrapper } from './ui/motion-wrapper';
import ModernStatsCards from './ModernStatsCards';

interface MemberDashboardProps {
  className?: string;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ className }) => {
  const { user } = useAuth();
  const {
    tasks,
    taskSummary,
    calendarIntegrations,
    emailTemplates,
    whatsappIntegrations,
    memberPerformance,
    isLoading,
    error,
    refreshData,
    createTask,
    completeTask,
    recordActivity
  } = useMemberTools();

  // Local states
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Check permissions
  const canViewDashboard = user?.role === 'member' || user?.role === 'admin' || user?.role === 'super_admin';

  // Computed data
  const statsData = useMemo(() => {
    if (!taskSummary) return [];

    return [
      {
        title: 'Tarefas do Dia',
        value: taskSummary.today_tasks.toString(),
        subtitle: `${taskSummary.pending_tasks} pendentes`,
        color: 'blue',
        icon: CheckSquare,
        trend: '+5%',
        trendType: 'positive' as const
      },
      {
        title: 'Em Progresso',
        value: taskSummary.in_progress_tasks.toString(),
        subtitle: `${taskSummary.urgent_tasks} urgentes`,
        color: 'orange',
        icon: Clock,
        trend: '12%',
        trendType: 'neutral' as const
      },
      {
        title: 'Concluídas',
        value: taskSummary.completed_tasks.toString(),
        subtitle: 'Este mês',
        color: 'green',
        icon: Target,
        trend: '+18%',
        trendType: 'positive' as const
      },
      {
        title: 'Atrasadas',
        value: taskSummary.overdue_tasks.toString(),
        subtitle: 'Requer atenção',
        color: 'red',
        icon: AlertTriangle,
        trend: '-8%',
        trendType: taskSummary.overdue_tasks > 0 ? 'negative' as const : 'positive' as const
      }
    ];
  }, [taskSummary]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by type
    if (selectedTaskType !== 'all') {
      filtered = filtered.filter(task => task.task_type === selectedTaskType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by completion status
    if (!showCompletedTasks) {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    return filtered;
  }, [tasks, selectedTaskType, searchTerm, showCompletedTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'pending': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'cancelled': return 'text-red-600 bg-red-100 border-red-200';
      case 'overdue': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Video;
      case 'follow_up': return Users;
      case 'demo': return Target;
      default: return Activity;
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const success = await completeTask(taskId, 'Tarefa concluída pelo usuário');
    if (success) {
      await recordActivity({
        activity_type: 'task_completed',
        description: 'Tarefa marcada como concluída',
        activity_data: { task_id: taskId }
      });
    }
  };

  const handleQuickTaskCreate = async (title: string, taskType: string, priority: string) => {
    const newTask = {
      tenant_id: user?.tenant_id || '',
      member_id: user?.id || '',
      task_type: taskType as any,
      title,
      status: 'pending' as const,
      priority: priority as any,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      automation_triggered: false
    };

    const success = await createTask(newTask);
    if (success) {
      await recordActivity({
        activity_type: 'task_created',
        description: `Nova tarefa criada: ${title}`,
        activity_data: { task_type: taskType, priority }
      });
    }
  };

  if (!canViewDashboard) {
    return (
      <div className="p-6">
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Acesso Restrito
          </h3>
          <p className="text-yellow-600">
            Você não tem permissão para visualizar o dashboard de membro.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Erro ao carregar dashboard
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refreshData} variant="outline">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'tasks', label: 'Minhas Tarefas', icon: CheckSquare },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'communications', label: 'Comunicações', icon: MessageSquare },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ];

  return (
    <MotionWrapper className={`space-y-6 ${className}`}>
      {/* Header */}
      <BlurFade delay={0.1}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Meu Dashboard
            </h1>
            <p className="text-gray-600">
              Gerencie suas tarefas, comunicações e performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <ShimmerButton onClick={() => handleQuickTaskCreate('Nova tarefa', 'follow_up', 'medium')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </ShimmerButton>
          </div>
        </div>
      </BlurFade>

      {/* Stats Cards */}
      {taskSummary && (
        <BlurFade delay={0.2}>
          <ModernStatsCards stats={statsData} />
        </BlurFade>
      )}

      {/* Navigation Tabs */}
      <BlurFade delay={0.3}>
        <TabNavigation 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </BlurFade>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <BlurFade delay={0.4}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Tasks */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Tarefas de Hoje
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks
                  .filter(task => {
                    const taskDate = new Date(task.due_date);
                    const today = new Date();
                    return taskDate.toDateString() === today.toDateString() && task.status !== 'completed';
                  })
                  .slice(0, 5)
                  .map((task) => {
                    const TaskIcon = getTaskTypeIcon(task.task_type);
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <TaskIcon className="h-4 w-4 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-600 capitalize">{task.task_type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <Button
                            onClick={() => handleCompleteTask(task.id)}
                            size="sm"
                            variant="outline"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                {tasks.filter(task => {
                  const taskDate = new Date(task.due_date);
                  const today = new Date();
                  return taskDate.toDateString() === today.toDateString() && task.status !== 'completed';
                }).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Nenhuma tarefa para hoje! 🎉
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Ações Rápidas
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => handleQuickTaskCreate('Ligar para lead', 'call', 'high')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Agendar Ligação
                </Button>
                <Button 
                  onClick={() => handleQuickTaskCreate('Enviar follow-up', 'email', 'medium')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </Button>
                <Button 
                  onClick={() => handleQuickTaskCreate('Agendar reunião', 'meeting', 'medium')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Agendar Reunião
                </Button>
                <Button 
                  onClick={() => setActiveTab('tasks')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todas as Tarefas
                </Button>
              </CardContent>
            </Card>

            {/* Integrations Status */}
            <Card className="p-6">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Integrações
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-700">Calendário</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    calendarIntegrations.length > 0 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-600 bg-gray-100'
                  }`}>
                    {calendarIntegrations.length > 0 ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <span className="text-gray-700">Email Templates</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    emailTemplates.length > 0 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-600 bg-gray-100'
                  }`}>
                    {emailTemplates.length} templates
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700">WhatsApp</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    whatsappIntegrations.length > 0 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-600 bg-gray-100'
                  }`}>
                    {whatsappIntegrations.length > 0 ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            {memberPerformance && (
              <Card className="p-6">
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Minha Performance
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score de Produtividade:</span>
                    <span className="font-semibold">{memberPerformance.productivity_score.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tarefas Concluídas:</span>
                    <span className="font-semibold text-green-600">{memberPerformance.tasks_completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leads Contatados:</span>
                    <span className="font-semibold text-blue-600">{memberPerformance.leads_contacted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grade:</span>
                    <span className={`font-semibold px-2 py-1 rounded text-sm ${
                      memberPerformance.performance_grade.startsWith('A') ? 'text-green-600 bg-green-100' :
                      memberPerformance.performance_grade.startsWith('B') ? 'text-blue-600 bg-blue-100' :
                      memberPerformance.performance_grade.startsWith('C') ? 'text-yellow-600 bg-yellow-100' :
                      'text-red-600 bg-red-100'
                    }`}>
                      {memberPerformance.performance_grade}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </BlurFade>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Minhas Tarefas
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar tarefas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48"
                  />
                  <select
                    value={selectedTaskType}
                    onChange={(e) => setSelectedTaskType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="call">Ligação</option>
                    <option value="email">Email</option>
                    <option value="meeting">Reunião</option>
                    <option value="demo">Demo</option>
                    <option value="proposal">Proposta</option>
                    <option value="contract">Contrato</option>
                  </select>
                  <Button
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    variant="outline"
                    size="sm"
                  >
                    {showCompletedTasks ? 'Ocultar' : 'Mostrar'} Concluídas
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const TaskIcon = getTaskTypeIcon(task.task_type);
                  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <TaskIcon className="h-5 w-5 text-gray-600 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Vencimento: {new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                              <span className="capitalize">{task.task_type.replace('_', ' ')}</span>
                              {task.estimated_duration && (
                                <span>{task.estimated_duration} min</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          {task.status !== 'completed' && (
                            <Button
                              onClick={() => handleCompleteTask(task.id)}
                              size="sm"
                              variant="outline"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma tarefa encontrada para os filtros selecionados.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Other tabs content placeholder */}
      {activeTab !== 'overview' && activeTab !== 'tasks' && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Conteúdo da aba "{activeTab}" será implementado em breve.
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      )}
    </MotionWrapper>
  );
};

export default MemberDashboard; 