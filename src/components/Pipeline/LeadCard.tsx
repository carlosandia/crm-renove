import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Trash2, Phone, Mail, MessageSquare, Zap, Plus, Clock, Calendar, User, Building, DollarSign, MapPin, MessageCircle, Star, Hash } from 'lucide-react';
import LeadActionsModal from './LeadActionsModal';
import FeedbackModal from './FeedbackModal';
import LeadEditModal from './LeadEditModal';
import { Lead, CustomField } from '../../types/Pipeline';

interface LeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  isDragging?: boolean;
  onEdit?: (lead: Lead) => void;
  onUpdate?: (leadId: string, updatedData: any) => void;
  onDelete?: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, customFields, isDragging = false, onEdit, onUpdate, onDelete }) => {
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
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

  // Função para formatar valores monetários
  const formatCurrency = (value: any): string => {
    if (!value) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  // Função para calcular tempo na etapa atual
  const getTimeInCurrentStage = (): string => {
    const movedAt = lead.moved_at ? new Date(lead.moved_at) : new Date(lead.created_at);
    const now = new Date();
    const diffMs = now.getTime() - movedAt.getTime();
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);
    const remainingMinutes = totalMinutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }
    return `${totalMinutes}min`;
  };

  // Função para obter ícone do campo
  const getFieldIcon = (fieldType: string, fieldName?: string) => {
    if (fieldName === 'nome') return User;
    if (fieldName === 'email') return Mail;
    if (fieldName === 'telefone') return Phone;
    if (fieldName === 'valor') return DollarSign;
    if (fieldName === 'empresa') return Building;
    if (fieldName === 'endereco') return MapPin;
    
    switch (fieldType) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'number': return Hash;
      case 'date': return Calendar;
      default: return MessageCircle;
    }
  };

  // Função para formatar valor do campo
  const formatFieldValue = (field: CustomField, value: any): string => {
    if (!value) return '';
    
    if (field.field_name === 'valor' || field.field_type === 'number') {
      return formatCurrency(value);
    }
    
    if (field.field_type === 'date') {
      try {
        return new Date(value).toLocaleDateString('pt-BR');
      } catch {
        return value;
      }
    }
    
    return value;
  };

  // Campos fixos que sempre aparecem (Nome e Valor)
  const fixedFields = ['nome', 'valor'];
  
  // Outros campos que podem ser exibidos (configuráveis)
  const configurableFields = customFields
    .filter(field => 
      !fixedFields.includes(field.field_name) && 
      field.show_in_card && 
      lead.custom_data[field.field_name]
    )
    .sort((a, b) => a.field_order - b.field_order)
    .slice(0, 2); // Máximo 2 campos adicionais

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(lead);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta oportunidade?')) {
      if (onDelete) {
        onDelete(lead.id);
      } else {
        // Fallback - remover lead localmente se não há handler
        console.log('Lead deletion requested but no handler provided:', lead.id);
        alert('Funcionalidade de exclusão em desenvolvimento');
      }
    }
  };

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'feedback') {
      setShowFeedbackModal(true);
      return;
    }
    
    setShowActionsModal(true);
  };

  const handleOpenActions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionsModal(true);
  };

  const handleUpdateLead = (updatedData: any) => {
    if (onUpdate) {
      onUpdate(lead.id, updatedData);
    }
    setShowEditModal(false);
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

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-150 group"
      >
        {/* Header com avatar, tempo e botões de ação */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {/* ÁREA DE DRAG - Handle específico */}
            <div 
              {...listeners}
              className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center cursor-move text-white text-sm font-semibold"
              title="Arrastar para mover"
            >
              {lead.custom_data.nome ? lead.custom_data.nome.charAt(0).toUpperCase() : 'L'}
            </div>
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{getTimeInCurrentStage()}</span>
            </div>
          </div>
          
          {/* Botões de ação (visíveis no hover) */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={handleEdit}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150"
              title="Editar lead"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
              title="Excluir lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Campo Nome (sempre visível) */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-1">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 truncate">
              {lead.custom_data.nome || 'Nome não informado'}
            </span>
          </div>
        </div>

        {/* Campo Valor (sempre visível) */}
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(lead.custom_data.valor)}
            </span>
          </div>
        </div>

        {/* Campos configuráveis adicionais */}
        {configurableFields.map(field => {
          const IconComponent = getFieldIcon(field.field_type, field.field_name);
          const value = formatFieldValue(field, lead.custom_data[field.field_name]);
          
          return (
            <div key={field.field_name} className="mb-2">
              <div className="flex items-center space-x-2">
                <IconComponent className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate" title={value}>
                  {value}
                </span>
              </div>
            </div>
          );
        })}

        {/* Footer com ações */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <button className="text-gray-400 hover:text-blue-600 transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-blue-600 transition-colors">
              <Mail className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-blue-600 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-blue-600 transition-colors">
              <Star className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={handleCardClick}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            + Ações
          </button>
        </div>
      </div>

      {/* Modal de ações */}
      <LeadActionsModal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        leadId={lead.id}
        leadName={lead.custom_data.nome || 'Lead sem nome'}
      />

      {/* Modal de feedback */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        leadId={lead.id}
        leadName={lead.custom_data.nome || 'Lead sem nome'}
      />

      {/* Modal de edição */}
      <LeadEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        lead={lead}
        customFields={customFields}
        onUpdate={handleUpdateLead}
      />
    </>
  );
};

export default LeadCard;
