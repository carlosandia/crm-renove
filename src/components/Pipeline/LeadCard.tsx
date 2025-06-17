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
        return value.length > 25 ? `${value.substring(0, 25)}...` : value;
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
      <div className="bg-white border border-gray-200 rounded-lg p-3 opacity-50 transform rotate-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
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
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md hover:border-green-200 transition-all duration-200"
    >
      {/* Lead Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              #{lead.id.slice(-3)}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900">
            {lead.custom_data?.nome_cliente || 'Lead'}
          </div>
        </div>
      </div>

      {/* Lead Fields */}
      <div className="space-y-1">
        {customFields
          .sort((a, b) => a.field_order - b.field_order)
          .slice(0, 3) // Mostrar apenas os 3 primeiros campos
          .map((field) => (
            <div key={field.id} className="text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-xs">{getFieldIcon(field.field_type)}</span>
                <span className="font-medium text-gray-600">
                  {field.field_label}:
                </span>
                <span className="text-gray-900">
                  {formatFieldValue(field, lead.custom_data[field.field_name])}
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Lead Value */}
      {lead.custom_data?.valor_proposta && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-sm font-semibold text-green-600">
            {formatFieldValue({ field_type: 'number' } as CustomField, lead.custom_data.valor_proposta)}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCard;
