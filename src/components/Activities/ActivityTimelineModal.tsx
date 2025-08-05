import React, { useState, useMemo } from 'react';
import { 
  X, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Presentation,
  Users,
  MapPin,
  Zap,
  Plus,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCombinedActivities } from '../../hooks/useCombinedActivities';
import type { CombinedActivityView } from '../../shared/types/cadenceTaskInstance';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// ===================================
// INTERFACES E TIPOS
// ===================================

// Usar tipo da nova arquitetura
type CombinedActivity = CombinedActivityView;

interface ActivityTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName?: string;
  pipelineId?: string;
  onAddManualActivity?: () => void;
}

type FilterType = 'all' | 'cadence' | 'manual';
type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';
type OutcomeFilter = 'all' | 'positive' | 'neutral' | 'negative';
type SortOrder = 'desc' | 'asc';

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export const ActivityTimelineModal: React.FC<ActivityTimelineModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName = 'Lead',
  pipelineId,
  onAddManualActivity
}) => {
  // Estados para filtros e busca
  const [sourceFilter, setSourceFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Hook para buscar atividades
  const { 
    data: activities = [], 
    isLoading, 
    error,
    refetch 
  } = useCombinedActivities(leadId, {
    sourceType: sourceFilter === 'all' ? 'all' : sourceFilter,
    status: statusFilter === 'all' ? undefined : [statusFilter as any],
    // outcome será tratado no frontend
  });

  // Atividades filtradas e ordenadas
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filtro por texto de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(term) ||
        activity.description?.toLowerCase().includes(term) ||
        activity.execution_notes?.toLowerCase().includes(term)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.completed_at || a.created_at);
      const dateB = new Date(b.scheduled_at || b.completed_at || b.created_at);
      
      return sortOrder === 'desc' 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [activities, searchTerm, sortOrder]);

  // Função para obter ícone do tipo de atividade
  const getActivityIcon = (type: string, sourceType: 'cadence' | 'manual') => {
    const iconClass = "w-4 h-4";
    const baseColor = sourceType === 'manual' ? 'text-blue-500' : 'text-purple-500';
    
    switch (type) {
      case 'call':
      case 'ligacao':
        return <Phone className={cn(iconClass, baseColor)} />;
      case 'email':
        return <Mail className={cn(iconClass, baseColor)} />;
      case 'whatsapp':
        return <MessageSquare className={cn(iconClass, baseColor)} />;
      case 'meeting':
        return <Calendar className={cn(iconClass, baseColor)} />;
      case 'note':
        return <FileText className={cn(iconClass, baseColor)} />;
      case 'presentation':
        return <Presentation className={cn(iconClass, baseColor)} />;
      case 'demo':
        return <Users className={cn(iconClass, baseColor)} />;
      case 'visit':
      case 'visita':
        return <MapPin className={cn(iconClass, baseColor)} />;
      case 'proposal':
        return <FileText className={cn(iconClass, baseColor)} />;
      default:
        return <Activity className={cn(iconClass, baseColor)} />;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Função para obter ícone do outcome
  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'positive':
        return <ThumbsUp className="w-3 h-3 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="w-3 h-3 text-red-500" />;
      case 'neutral':
      default:
        return <Minus className="w-3 h-3 text-gray-400" />;
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return date < now ? 'Ontem' : 'Amanhã';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  // Função para formatar duração
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    
    if (minutes < 60) {
      return `${minutes}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
    }
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSourceFilter('all');
    setStatusFilter('all');
    setOutcomeFilter('all');
    setSearchTerm('');
  };

  // Contadores para badges
  const totalCount = activities.length;
  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const overdueCount = activities.filter(a => a.status === 'overdue').length;
  const completedCount = activities.filter(a => a.status === 'completed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] max-h-[800px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Histórico de Atividades
              </h2>
              <p className="text-sm text-gray-500">
                {leadName} • {totalCount} atividades
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onAddManualActivity && (
              <Button
                onClick={onAddManualActivity}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Atividade
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {/* Busca */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar atividades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Ordenação */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2"
            >
              {sortOrder === 'desc' ? (
                <ArrowDown className="w-4 h-4" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
              Data
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Fonte */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-gray-500">Fonte:</span>
              {(['all', 'cadence', 'manual'] as FilterType[]).map((filter) => (
                <Button
                  key={filter}
                  variant={sourceFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSourceFilter(filter)}
                  className="h-7 text-xs"
                >
                  {filter === 'all' ? 'Todas' : 
                   filter === 'cadence' ? 'Cadência' : 'Manual'}
                </Button>
              ))}
            </div>

            {/* Filtro Status */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-gray-500">Status:</span>
              {(['all', 'pending', 'completed', 'overdue'] as StatusFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className="h-7 text-xs"
                >
                  {filter === 'all' ? 'Todos' :
                   filter === 'pending' ? 'Pendente' :
                   filter === 'completed' ? 'Concluída' : 'Vencida'}
                </Button>
              ))}
            </div>

            {/* Limpar Filtros */}
            {(sourceFilter !== 'all' || statusFilter !== 'all' || outcomeFilter !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-gray-500"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="flex items-center gap-4 p-4 bg-white border-b border-gray-100">
          <Badge variant="secondary" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {completedCount} Concluídas
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            {pendingCount} Pendentes
          </Badge>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {overdueCount} Vencidas
            </Badge>
          )}
        </div>

        {/* Timeline de Atividades */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Carregando atividades...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <span className="ml-2 text-red-600">Erro ao carregar atividades</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma atividade encontrada
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {searchTerm || sourceFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Nenhuma atividade corresponde aos filtros aplicados.'
                  : 'Este lead ainda não possui atividades registradas.'}
              </p>
              {onAddManualActivity && (
                <Button
                  onClick={onAddManualActivity}
                  className="mt-4 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Primeira Atividade
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => (
                <div 
                  key={activity.id}
                  className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      activity.status === 'completed' 
                        ? "bg-green-100 border-green-500" 
                        : activity.status === 'overdue'
                        ? "bg-red-100 border-red-500"
                        : "bg-yellow-100 border-yellow-500"
                    )}>
                      {getActivityIcon(activity.activity_type, activity.source_type)}
                    </div>
                    {index < filteredActivities.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Conteúdo da Atividade */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {activity.title}
                        </h4>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {getOutcomeIcon(activity.outcome)}
                        <Badge 
                          variant="secondary"
                          className={cn("text-xs", getStatusColor(activity.status))}
                        >
                          {activity.status === 'completed' ? 'Concluída' :
                           activity.status === 'pending' ? 'Pendente' :
                           activity.status === 'overdue' ? 'Vencida' : 'Cancelada'}
                        </Badge>
                      </div>
                    </div>

                    {/* Metadados */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(activity.scheduled_at || activity.completed_at || activity.created_at)}
                      </div>
                      
                      {activity.duration_minutes && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {formatDuration(activity.duration_minutes)}
                        </div>
                      )}
                      
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          activity.source_type === 'manual' 
                            ? "border-blue-200 text-blue-600" 
                            : "border-purple-200 text-purple-600"
                        )}
                      >
                        {activity.source_type === 'manual' ? 'Manual' : 'Cadência'}
                      </Badge>

                      {activity.day_offset !== undefined && (
                        <span className="text-xs text-gray-400">
                          Dia {activity.day_offset}
                        </span>
                      )}
                    </div>

                    {/* Notas */}
                    {activity.execution_notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <span className="font-medium">Observações:</span> {activity.execution_notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Exibindo {filteredActivities.length} de {totalCount} atividades
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityTimelineModal;