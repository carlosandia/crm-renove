
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Trash2, Phone, Mail, MessageSquare, Zap, Plus, Clock, Calendar } from 'lucide-react';
import LeadActionsModal from './LeadActionsModal';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  field_order: number;
}

interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface LeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  isDragging?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, customFields, isDragging = false }) => {
  const [showActionsModal, setShowActionsModal] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calcular tempo na etapa
  const calculateTimeInStage = () => {
    const now = new Date();
    const updatedAt = new Date(lead.updated_at);
    const diffInHours = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  // Obter ícone do canal
  const getChannelIcon = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'meta':
      case 'facebook':
      case 'meta ads':
        return '📘';
      case 'google':
      case 'google ads':
        return '🟢';
      case 'linkedin':
        return '💼';
      case 'whatsapp':
        return '💬';
      default:
        return '🌐';
    }
  };

  // Formatar valor
  const formatCurrency = (value: any) => {
    if (!value) return 'R$ 0,00';
    const numValue = parseFloat(value.toString().replace(/[^\d,.-]/g, '').replace(',', '.'));
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue || 0);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Editar lead:', lead.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este lead?')) {
      console.log('Excluir lead:', lead.id);
    }
  };

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Ação ${action} para lead:`, lead.id);
  };

  const handleOpenActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionsModal(true);
  };

  if (isDragging || isSortableDragging) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 opacity-50 transform rotate-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              #{lead.id.slice(-3)}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900">
            Lead em movimento...
          </div>
        </div>
      </div>
    );
  }

  const leadName = lead.custom_data?.nome_cliente || 'Lead sem nome';
  const leadEmail = lead.custom_data?.email_cliente || '';
  const leadPhone = lead.custom_data?.telefone_cliente || '';
  const leadValue = lead.custom_data?.valor_proposta || 0;
  const leadSource = lead.custom_data?.canal_origem || 'Web';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white border border-gray-200 rounded-xl p-4 cursor-move hover:shadow-lg hover:border-blue-200 transition-all duration-200 group"
      >
        {/* Header com botões de ação */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                #{lead.id.slice(-3)}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                {leadName}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">{getChannelIcon(leadSource)} {leadSource}</span>
              </div>
            </div>
          </div>
          
          {/* Botões de ação (visíveis no hover) */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Editar lead"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Excluir lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Informações principais */}
        <div className="space-y-2 mb-3">
          {leadEmail && (
            <div className="flex items-center space-x-2 text-xs">
              <Mail className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 truncate">{leadEmail}</span>
            </div>
          )}
          
          {leadPhone && (
            <div className="flex items-center space-x-2 text-xs">
              <Phone className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">{leadPhone}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">Criado: {formatDate(lead.created_at)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-orange-500" />
              <span className="text-orange-600 font-medium">{calculateTimeInStage()}</span>
            </div>
          </div>
        </div>

        {/* Valor da oportunidade */}
        {leadValue && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
            <div className="text-xs text-green-600 font-medium">Valor</div>
            <div className="text-sm font-bold text-green-700">
              {formatCurrency(leadValue)}
            </div>
          </div>
        )}

        {/* Botões de interação */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => handleAction('phone', e)}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Ligar"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => handleAction('email', e)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Enviar e-mail"
            >
              <Mail className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => handleAction('chat', e)}
              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => handleAction('quick', e)}
              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
              title="Ação rápida"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenActions}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Ações</span>
          </button>
        </div>
      </div>

      {/* Modal de ações */}
      <LeadActionsModal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        leadId={lead.id}
        leadName={leadName}
      />
    </>
  );
};

export default LeadCard;
