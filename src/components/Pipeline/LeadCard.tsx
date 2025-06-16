
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

  const formatFieldValue = (field: CustomField, value: any) => {
    if (!value) return '-';
    
    switch (field.field_type) {
      case 'email':
        return value.length > 20 ? `${value.substring(0, 20)}...` : value;
      case 'phone':
        return value;
      case 'number':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(value) || 0);
      default:
        return value.length > 30 ? `${value.substring(0, 30)}...` : value;
    }
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'email': return '📧';
      case 'phone': return '📞';
      case 'number': return '💰';
      case 'date': return '📅';
      case 'textarea': return '📝';
      default: return '📄';
    }
  };

  if (isDragging || isSortableDragging) {
    return (
      <div className="modern-card p-4 opacity-50 transform rotate-2 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="modern-card p-4 cursor-move hover:shadow-md transition-all duration-200 bg-white"
    >
      {/* Lead Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              #{lead.id.slice(-3)}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900">
            Lead
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {new Date(lead.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Lead Fields */}
      <div className="space-y-2">
        {customFields
          .sort((a, b) => a.field_order - b.field_order)
          .slice(0, 3) // Mostrar apenas os 3 primeiros campos
          .map((field) => (
            <div key={field.id} className="flex items-center space-x-2">
              <span className="text-sm">{getFieldIcon(field.field_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-medium">
                  {field.field_label}
                </div>
                <div className="text-sm text-gray-900 truncate">
                  {formatFieldValue(field, lead.custom_data[field.field_name])}
                </div>
              </div>
            </div>
          ))}

        {customFields.length > 3 && (
          <div className="text-xs text-gray-500 text-center py-1">
            +{customFields.length - 3} campos adicionais
          </div>
        )}
      </div>

      {/* Lead Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Arraste para mover
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-gray-500">Ativo</span>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
