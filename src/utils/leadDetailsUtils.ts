import { 
  Target, MessageCircle, ThumbsUp, User, Mail, CheckCircle, Phone, Calendar, 
  FileText, Activity, Thermometer, AlertCircle, Globe, Clock, ChevronDown,
  DollarSign, PlayCircle, MapPin
} from 'lucide-react';
import { LeadTask } from '../hooks/useLeadTasks';

// Função para traduzir ações do histórico
export const translateAction = (action: string): string => {
  const translations: { [key: string]: string } = {
    'stage_moved': 'Etapa Alterada',
    'comment_added': 'Comentário Adicionado',
    'feedback_added': 'Feedback Adicionado',
    'lead_created': 'Lead Criado',
    'email_sent': 'E-mail Enviado',
    'email_received': 'E-mail Recebido',
    'task_created': 'Tarefa Criada',
    'task_completed': 'Tarefa Concluída',
    'note_added': 'Nota Adicionada',
    'call_made': 'Ligação Realizada',
    'meeting_scheduled': 'Reunião Agendada',
    'proposal_sent': 'Proposta Enviada',
    'contract_signed': 'Contrato Assinado',
    'lead_updated': 'Lead Atualizado',
    'status_changed': 'Status Alterado',
    'priority_changed': 'Prioridade Alterada',
    'assigned_to': 'Atribuído Para',
    'test_direct': 'Teste Direto',
    'test_function': 'Teste de Função',
    'manual_test': 'Teste Manual',
    'lead_imported': 'Lead Importado',
    'data_updated': 'Dados Atualizados',
    'field_changed': 'Campo Alterado',
    'temperature_changed': 'Temperatura Alterada',
    'source_updated': 'Origem Atualizada',
    'pipeline_moved': 'Pipeline Alterada',
    'owner_changed': 'Responsável Alterado'
  };
  
  return translations[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Função para obter ícone específico por tipo de ação
export const getActionIcon = (action: string) => {
  switch (action) {
    case 'stage_moved':
    case 'pipeline_moved':
      return Target;
    case 'comment_added':
      return MessageCircle;
    case 'feedback_added':
      return ThumbsUp;
    case 'lead_created':
    case 'lead_imported':
      return User;
    case 'email_sent':
    case 'email_received':
      return Mail;
    case 'task_created':
    case 'task_completed':
      return CheckCircle;
    case 'call_made':
      return Phone;
    case 'meeting_scheduled':
      return Calendar;
    case 'proposal_sent':
    case 'contract_signed':
      return FileText;
    case 'lead_updated':
    case 'data_updated':
    case 'field_changed':
      return Activity;
    case 'temperature_changed':
      return Thermometer;
    case 'status_changed':
    case 'priority_changed':
      return AlertCircle;
    case 'assigned_to':
    case 'owner_changed':
      return User;
    case 'source_updated':
      return Globe;
    default:
      return Clock;
  }
};

// Função para obter cor específica por tipo de ação
export const getActionColor = (action: string) => {
  switch (action) {
    case 'stage_moved':
    case 'pipeline_moved':
      return { bg: 'bg-blue-500', text: 'text-blue-600', bgLight: 'bg-blue-50' };
    case 'comment_added':
      return { bg: 'bg-green-500', text: 'text-green-600', bgLight: 'bg-green-50' };
    case 'feedback_added':
      return { bg: 'bg-purple-500', text: 'text-purple-600', bgLight: 'bg-purple-50' };
    case 'lead_created':
    case 'lead_imported':
      return { bg: 'bg-indigo-500', text: 'text-indigo-600', bgLight: 'bg-indigo-50' };
    case 'email_sent':
    case 'email_received':
      return { bg: 'bg-cyan-500', text: 'text-cyan-600', bgLight: 'bg-cyan-50' };
    case 'task_created':
    case 'task_completed':
      return { bg: 'bg-emerald-500', text: 'text-emerald-600', bgLight: 'bg-emerald-50' };
    case 'call_made':
      return { bg: 'bg-orange-500', text: 'text-orange-600', bgLight: 'bg-orange-50' };
    case 'meeting_scheduled':
      return { bg: 'bg-pink-500', text: 'text-pink-600', bgLight: 'bg-pink-50' };
    case 'proposal_sent':
    case 'contract_signed':
      return { bg: 'bg-yellow-500', text: 'text-yellow-600', bgLight: 'bg-yellow-50' };
    case 'lead_updated':
    case 'data_updated':
    case 'field_changed':
      return { bg: 'bg-gray-500', text: 'text-gray-600', bgLight: 'bg-gray-50' };
    case 'temperature_changed':
      return { bg: 'bg-red-500', text: 'text-red-600', bgLight: 'bg-red-50' };
    case 'status_changed':
    case 'priority_changed':
      return { bg: 'bg-amber-500', text: 'text-amber-600', bgLight: 'bg-amber-50' };
    case 'assigned_to':
    case 'owner_changed':
      return { bg: 'bg-teal-500', text: 'text-teal-600', bgLight: 'bg-teal-50' };
    case 'source_updated':
      return { bg: 'bg-violet-500', text: 'text-violet-600', bgLight: 'bg-violet-50' };
    default:
      return { bg: 'bg-blue-500', text: 'text-blue-600', bgLight: 'bg-blue-50' };
  }
};

// Função para obter ícone do campo
export const getFieldIcon = (fieldType: string) => {
  switch (fieldType) {
    case 'email': return Mail;
    case 'phone': return Phone;
    case 'number': return DollarSign;
    case 'date': return Calendar;
    case 'textarea': return FileText;
    case 'select': return ChevronDown;
    case 'text':
    default: return User;
  }
};

// Função para obter ícone do canal
export const getChannelIcon = (canal: string) => {
  switch (canal) {
    case 'email': return Mail;
    case 'whatsapp': return MessageCircle;
    case 'ligacao': return Phone;
    case 'sms': return MessageCircle;
    case 'tarefa': return FileText;
    case 'visita': return MapPin;
    default: return Activity;
  }
};

// Função para obter cor do canal
export const getChannelColor = (canal: string): string => {
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

// Função para obter informações de status da tarefa (sem JSX)
export const getTaskStatusInfo = (task: LeadTask) => {
  const isOverdue = task.status === 'pendente' && new Date(task.data_programada) < new Date();
  
  if (isOverdue) {
    return { label: 'Vencida', className: 'bg-red-100 text-red-800' };
  }
  
  switch (task.status) {
    case 'pendente':
      return { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' };
    case 'concluida':
      return { label: 'Concluída', className: 'bg-green-100 text-green-800' };
    case 'cancelada':
      return { label: 'Cancelada', className: 'bg-gray-100 text-gray-800' };
    default:
      return null;
  }
};

// Função para formatar data da tarefa
export const formatTaskDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (taskDate.getTime() === today.getTime()) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (taskDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
    return `Amanhã às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Função para formatar data no horário do Brasil
export const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return 'Data inválida';
  }
};

// Função para obter informações de mudanças de valores (sem JSX)
export const getValueChangeInfo = (oldValues: any, newValues: any, action: string) => {
  if (!oldValues && !newValues) return null;

  // Para mudança de etapa, mostrar de/para
  if (action === 'stage_moved' && oldValues?.stage_id && newValues?.stage_id) {
    return {
      type: 'stage_change',
      message: `Mudança: ${oldValues.stage_id} → ${newValues.stage_id}`
    };
  }

  // Para outros tipos, mostrar valores novos
  if (newValues && typeof newValues === 'object') {
    const changes = Object.entries(newValues).map(([key, value]) => ({
      key,
      value: String(value)
    }));
    
    if (changes.length > 0) {
      return {
        type: 'field_changes',
        changes
      };
    }
  }

  return null;
}; 