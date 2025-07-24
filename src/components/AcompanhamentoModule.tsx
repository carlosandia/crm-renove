import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLeadTasks, LeadTask, TaskStats } from '../hooks/useLeadTasks';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Circle, 
  Filter,
  Search,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  ClipboardList,
  MapPin,
  Eye,
  User,
  Building2,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  X
} from 'lucide-react';
import { BlurFade } from './ui/blur-fade';
import { ShimmerButton } from './ui/shimmer-button';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../hooks/useToast';

const AcompanhamentoModule: React.FC = () => {
  const { user } = useAuth();
  const { 
    tasks, 
    loading, 
    error,
    fetchTasks, 
    completeTask, 
    getStats, 
    filterTasks 
  } = useLeadTasks();
  
  // Estados locais
  const [filteredTasks, setFilteredTasks] = useState<LeadTask[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // all, pendente, concluida, vencida
    canal: 'all',
    data: 'all', // all, hoje, amanha, semana
  });

  // Modal de execução de tarefa
  const [executingTask, setExecutingTask] = useState<LeadTask | null>(null);
  const [executionNotes, setExecutionNotes] = useState('');

  // Aplicar filtros quando tasks ou filters mudarem
  useEffect(() => {
    const filtered = filterTasks(filters);
    setFilteredTasks(filtered);
  }, [tasks, filters, filterTasks]);

  // Calcular estatísticas
  const stats = getStats();

  const getChannelIcon = (canal: string) => {
    switch (canal) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'ligacao': return <Phone className="w-4 h-4" />;
      case 'sms': return <Smartphone className="w-4 h-4" />;
      case 'tarefa': return <ClipboardList className="w-4 h-4" />;
      case 'visita': return <MapPin className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getChannelColor = (canal: string): string => {
    switch (canal) {
      case 'email': return 'text-blue-600 bg-blue-100';
      case 'whatsapp': return 'text-green-600 bg-green-100';
      case 'ligacao': return 'text-purple-600 bg-purple-100';
      case 'sms': return 'text-orange-600 bg-orange-100';
      case 'tarefa': return 'text-gray-600 bg-gray-100';
      case 'visita': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadge = (task: LeadTask) => {
    const isOverdue = task.status === 'pendente' && new Date(task.data_programada) < new Date();
    
    if (isOverdue) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Vencida</span>;
    }
    
    switch (task.status) {
      case 'pendente':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendente</span>;
      case 'concluida':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Concluída</span>;
      case 'cancelada':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Cancelada</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date >= today && date < tomorrow) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
      return `Amanhã, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const handleCompleteTask = async (task: LeadTask) => {
    try {
      const success = await completeTask(task.id, executionNotes);
      
      if (success) {
        setExecutingTask(null);
        setExecutionNotes('');
        showSuccessToast('Tarefa concluída', 'A tarefa foi marcada como concluída com sucesso.');
      } else {
        showErrorToast('Erro ao concluir tarefa', 'Não foi possível marcar a tarefa como concluída. Tente novamente.');
      }
      
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      showErrorToast('Erro ao concluir tarefa', 'Ocorreu um erro inesperado. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando suas tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento</h1>
          <p className="text-gray-600">Suas tarefas de cadência e follow-ups</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendentes}</div>
              <div className="text-sm text-gray-500">Pendentes</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.concluidas}</div>
              <div className="text-sm text-gray-500">Concluídas</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.vencidas}</div>
              <div className="text-sm text-gray-500">Vencidas</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">Taxa Conclusão</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="vencida">Vencidas</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>

          <select
            value={filters.canal}
            onChange={(e) => setFilters(prev => ({ ...prev, canal: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Canais</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="ligacao">Ligação</option>
            <option value="sms">SMS</option>
            <option value="tarefa">Tarefa</option>
            <option value="visita">Visita</option>
          </select>

          <select
            value={filters.data}
            onChange={(e) => setFilters(prev => ({ ...prev, data: e.target.value }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Datas</option>
            <option value="hoje">Hoje</option>
            <option value="amanha">Amanhã</option>
            <option value="semana">Esta Semana</option>
          </select>

          <button
            onClick={fetchTasks}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Atualizar
          </button>

          <div className="text-sm text-gray-500 flex items-center">
            {filteredTasks.length} de {tasks.length} tarefas
          </div>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-gray-500">
              {tasks.length === 0 
                ? 'Você não possui tarefas de cadência no momento.'
                : 'Nenhuma tarefa corresponde aos filtros aplicados.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarefa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Programada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etapa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task, index) => (
                  <BlurFade key={task.id} delay={index * 0.05}>
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {task.lead_name || 'Lead sem nome'}
                            </div>
                                                         <div className="text-sm text-gray-500">
                               ID: {task.lead_id?.substring(0, 8) || 'N/A'}
                             </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getChannelIcon(task.canal)}
                          <span className="text-sm text-gray-900 capitalize">{task.canal}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                                                 <div className="text-sm font-medium text-gray-900">{task.descricao}</div>
                         <div className="text-sm text-gray-500 capitalize">{task.tipo}</div>
                         {task.day_offset !== undefined && (
                           <div className="text-xs text-blue-600 mt-1">D+{task.day_offset}</div>
                         )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(task.data_programada)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{task.stage_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(task)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {task.status === 'pendente' && (
                          <ShimmerButton
                            onClick={() => setExecutingTask(task)}
                            className="h-8 px-3 text-xs"
                            background="rgb(34 197 94)"
                            shimmerColor="#ffffff"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Marcar como Feito
                          </ShimmerButton>
                        )}
                        {task.status === 'concluida' && task.execution_notes && (
                          <button
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                            title={task.execution_notes}
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ver Notas</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  </BlurFade>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Execução de Tarefa */}
      {executingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Marcar como Concluída</h3>
              <button
                onClick={() => setExecutingTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Tarefa:</strong> {executingTask.descricao}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Lead:</strong> {executingTask.lead_name}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                <strong>Canal:</strong> <span className="capitalize">{executingTask.canal}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas de Execução (opcional)
              </label>
              <textarea
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                placeholder="Descreva como foi a execução da tarefa..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleCompleteTask(executingTask)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Marcar como Concluída
              </button>
              <button
                onClick={() => setExecutingTask(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcompanhamentoModule; 