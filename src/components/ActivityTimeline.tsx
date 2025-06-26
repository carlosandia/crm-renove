import React, { useState } from 'react';
import { 
  Clock, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Plus, 
  Filter,
  User,
  Building
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BlurFade } from './ui/blur-fade';

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  due_date?: string;
  completed_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  contact_name?: string;
  deal_name?: string;
  created_by: string;
  created_at: string;
}

interface ActivityTimelineProps {
  contactId?: string;
  dealId?: string;
  className?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  contactId,
  dealId,
  className = ''
}) => {
  const [activities] = useState<Activity[]>([
    {
      id: '1',
      type: 'call',
      subject: 'Ligação de follow-up',
      description: 'Discutir proposta comercial e próximos passos',
      due_date: '2024-01-18T10:00:00Z',
      status: 'pending',
      contact_name: 'João Silva',
      deal_name: 'Venda Sistema CRM',
      created_by: 'Maria Santos',
      created_at: '2024-01-17T14:30:00Z'
    },
    {
      id: '2',
      type: 'email',
      subject: 'Proposta comercial enviada',
      description: 'Enviada proposta com desconto de 15% válida por 30 dias',
      completed_date: '2024-01-17T16:45:00Z',
      status: 'completed',
      contact_name: 'João Silva',
      deal_name: 'Venda Sistema CRM',
      created_by: 'Pedro Costa',
      created_at: '2024-01-17T16:45:00Z'
    },
    {
      id: '3',
      type: 'meeting',
      subject: 'Reunião de apresentação',
      description: 'Demo do sistema e alinhamento de requisitos',
      completed_date: '2024-01-16T14:00:00Z',
      status: 'completed',
      contact_name: 'João Silva',
      deal_name: 'Venda Sistema CRM',
      created_by: 'Maria Santos',
      created_at: '2024-01-16T14:00:00Z'
    },
    {
      id: '4',
      type: 'task',
      subject: 'Preparar documentação técnica',
      description: 'Compilar documentos técnicos para integração',
      due_date: '2024-01-19T17:00:00Z',
      status: 'pending',
      contact_name: 'João Silva',
      deal_name: 'Venda Sistema CRM',
      created_by: 'Ana Lima',
      created_at: '2024-01-17T09:15:00Z'
    },
    {
      id: '5',
      type: 'note',
      subject: 'Feedback da reunião',
      description: 'Cliente demonstrou interesse em módulo adicional de relatórios. Avaliar impacto no orçamento.',
      completed_date: '2024-01-16T15:30:00Z',
      status: 'completed',
      contact_name: 'João Silva',
      deal_name: 'Venda Sistema CRM',
      created_by: 'Maria Santos',
      created_at: '2024-01-16T15:30:00Z'
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const getActivityIcon = (type: string, status: string) => {
    const iconProps = {
      className: `w-4 h-4 ${
        status === 'completed' 
          ? 'text-emerald-600' 
          : status === 'overdue' 
          ? 'text-red-600' 
          : 'text-blue-600'
      }`
    };

    switch (type) {
      case 'call':
        return <Phone {...iconProps} />;
      case 'email':
        return <Mail {...iconProps} />;
      case 'meeting':
        return <Calendar {...iconProps} />;
      case 'task':
        return <CheckCircle {...iconProps} />;
      case 'note':
        return <FileText {...iconProps} />;
      default:
        return <Clock {...iconProps} />;
    }
  };

  const getActivityColor = (type: string, status: string) => {
    if (status === 'completed') return 'bg-emerald-100 border-emerald-200';
    if (status === 'overdue') return 'bg-red-100 border-red-200';
    
    switch (type) {
      case 'call':
        return 'bg-blue-100 border-blue-200';
      case 'email':
        return 'bg-purple-100 border-purple-200';
      case 'meeting':
        return 'bg-amber-100 border-amber-200';
      case 'task':
        return 'bg-cyan-100 border-cyan-200';
      case 'note':
        return 'bg-slate-100 border-slate-200';
      default:
        return 'bg-slate-100 border-slate-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 text-xs">Concluído</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs">Atrasado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
      default:
        return null;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter !== 'all' && activity.status !== filter) return false;
    if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
    return true;
  });

  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const overdueCount = activities.filter(a => a.status === 'overdue').length;

  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Timeline de Atividades
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Histórico completo de interações e tarefas
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Atividade
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {activities.length} Total
              </span>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                {pendingCount} Pendentes
              </span>
            </div>
          </div>
          {overdueCount > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  {overdueCount} Atrasadas
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="completed">Concluídos</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="call">Ligações</option>
            <option value="email">E-mails</option>
            <option value="meeting">Reuniões</option>
            <option value="task">Tarefas</option>
            <option value="note">Anotações</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Nenhuma atividade encontrada
            </h3>
            <p className="text-slate-500">
              Não há atividades que correspondam aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <BlurFade key={activity.id} delay={0.1 + (index * 0.05)} inView>
                <div className="flex gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getActivityColor(activity.type, activity.status)}`}>
                      {getActivityIcon(activity.type, activity.status)}
                    </div>
                    {index < filteredActivities.length - 1 && (
                      <div className="w-0.5 h-8 bg-slate-200 mt-2"></div>
                    )}
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-900 truncate">
                            {activity.subject}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">
                              por {activity.created_by}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(activity.created_at)}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(activity.status)}
                      </div>

                      {activity.description && (
                        <p className="text-sm text-slate-600 mb-3">
                          {activity.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {activity.contact_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {activity.contact_name}
                            </div>
                          )}
                          {activity.deal_name && (
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {activity.deal_name}
                            </div>
                          )}
                        </div>

                        {activity.due_date && activity.status === 'pending' && (
                          <div className="text-xs text-amber-600">
                            Vence em {formatDateTime(activity.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 