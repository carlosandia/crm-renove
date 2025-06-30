import React from 'react';
import { DetailsModal } from '../ui/details-modal';
import { Deal } from '../../types/deals';
import { formatCurrency } from '../../utils/formatUtils';

interface DealDetailsModalProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const DealDetailsModal: React.FC<DealDetailsModalProps> = ({
  deal,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  // ✅ REFATORAÇÃO TAREFA 5: Usar DetailsModal base
  const sections = [
    {
      id: 'financial',
      title: 'Informações Financeiras',
      icon: 'DollarSign',
      fields: [
        {
          key: 'amount',
          label: 'Valor do Deal',
          value: deal.amount,
          type: 'currency' as const
        },
        {
          key: 'probability',
          label: 'Probabilidade',
          value: deal.probability ? `${deal.probability}%` : 'Não definida',
          type: 'text' as const
        },
        {
          key: 'close_date',
          label: 'Data de Fechamento',
          value: deal.close_date,
          type: 'text' as const
        }
      ]
    },
    {
      id: 'status',
      title: 'Status e Pipeline',
      icon: 'TrendingUp',
      fields: [
        {
          key: 'status',
          label: 'Status',
          value: deal.status === 'won' ? 'Ganho' : 
                 deal.status === 'lost' ? 'Perdido' : 'Aberto',
          type: 'text' as const
        },
        {
          key: 'stage',
          label: 'Estágio',
          value: `Estágio ${deal.stage_id}`,
          type: 'text' as const
        },
        {
          key: 'pipeline',
          label: 'Pipeline',
          value: `Pipeline ${deal.pipeline_id}`,
          type: 'text' as const
        }
      ]
    },
    {
      id: 'company',
      title: 'Empresa e Contato',
      icon: 'Building',
      fields: [
        {
          key: 'company',
          label: 'Empresa',
          value: deal.company_name || 'Não informada',
          type: 'text' as const
        },
        {
          key: 'contact',
          label: 'Contato',
          value: deal.contact_name || 'Não informado',
          type: 'text' as const
        },
        {
          key: 'owner',
          label: 'Responsável',
          value: deal.owner_name || 'Não atribuído',
          type: 'text' as const
        }
      ]
    }
  ];

  if (deal.description) {
    sections.push({
      id: 'description',
      title: 'Descrição',
      icon: 'FileText',
      fields: [
        {
          key: 'description',
          label: 'Detalhes do Deal',
          value: deal.description,
          type: 'text' as const
        }
      ]
    });
  }

  const actions = [
    {
      id: 'edit',
      label: 'Editar',
      onClick: onEdit,
      variant: 'default' as const,
      icon: 'Edit'
    },
    {
      id: 'delete',
      label: 'Excluir',
      onClick: onDelete,
      variant: 'destructive' as const,
      icon: 'Trash2'
    }
  ];

  return (
    <DetailsModal
      isOpen={isOpen}
      onClose={onClose}
      title={deal.deal_name}
      item={deal}
      sections={sections}
      actions={actions}
    />
  );
}; 