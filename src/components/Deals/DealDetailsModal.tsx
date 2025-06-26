import React from 'react';
import { X, Edit, Trash2, DollarSign, Calendar, TrendingUp, Building, User, Phone, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Deal } from '../../types/deals';

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
  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'won':
        return <Badge className="bg-emerald-100 text-emerald-800">Ganho</Badge>;
      case 'lost':
        return <Badge variant="destructive">Perdido</Badge>;
      case 'open':
      default:
        return <Badge variant="secondary">Aberto</Badge>;
    }
  };

  const getProbabilityBadge = (probability?: number) => {
    if (probability === undefined) return null;
    
    if (probability >= 80) {
      return <Badge className="bg-emerald-100 text-emerald-800">{probability}%</Badge>;
    } else if (probability >= 50) {
      return <Badge className="bg-amber-100 text-amber-800">{probability}%</Badge>;
    } else {
      return <Badge variant="outline">{probability}%</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 truncate">
              {deal.deal_name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {deal.company_name || 'Empresa não informada'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deal Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valor do Deal</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(deal.amount || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Probabilidade</p>
                  <div className="mt-1">
                    {getProbabilityBadge(deal.probability) || (
                      <span className="text-slate-400">Não definida</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Data de Fechamento</p>
                  <p className="text-sm font-medium text-slate-900">
                    {deal.close_date ? formatDate(deal.close_date) : 'Não definida'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">Status</p>
                {getStatusBadge(deal.status)}
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Estágio</p>
                <p className="text-sm font-medium text-slate-900">
                  {/* This would come from stage lookup in real app */}
                  Estágio {deal.stage_id}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Pipeline</p>
                <p className="text-sm font-medium text-slate-900">
                  {/* This would come from pipeline lookup in real app */}
                  Pipeline {deal.pipeline_id}
                </p>
              </div>
            </div>
          </div>

          {/* Company & Contact Info */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Informações da Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Empresa</p>
                  <p className="text-sm font-medium text-slate-900">
                    {deal.company_name || 'Não informada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Contato</p>
                  <p className="text-sm font-medium text-slate-900">
                    {deal.contact_name || 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deal Details */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Detalhes do Deal
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">Responsável</p>
                <p className="text-sm font-medium text-slate-900">
                  {deal.owner_name || 'Não atribuído'}
                </p>
              </div>

              {deal.description && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Descrição</p>
                  <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg">
                    {deal.description}
                  </p>
                </div>
              )}

              {deal.next_step && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Próxima Ação</p>
                  <p className="text-sm text-slate-900 bg-blue-50 p-3 rounded-lg">
                    {deal.next_step}
                  </p>
                </div>
              )}

              {deal.source && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Origem</p>
                  <Badge variant="outline">{deal.source}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Win/Loss Reasons */}
          {(deal.won_reason || deal.lost_reason) && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Motivo do Resultado
              </h3>
              {deal.won_reason && (
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-emerald-800 mb-2">
                    Motivo da Vitória
                  </p>
                  <p className="text-sm text-emerald-700">{deal.won_reason}</p>
                </div>
              )}
              {deal.lost_reason && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Motivo da Perda
                  </p>
                  <p className="text-sm text-red-700">{deal.lost_reason}</p>
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Informações do Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Criado em</p>
                <p className="font-medium text-slate-900">
                  {formatDateTime(deal.created_at)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Última atualização</p>
                <p className="font-medium text-slate-900">
                  {formatDateTime(deal.updated_at)}
                </p>
              </div>
              {deal.last_activity_date && (
                <div>
                  <p className="text-slate-500">Última atividade</p>
                  <p className="font-medium text-slate-900">
                    {formatDateTime(deal.last_activity_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}; 