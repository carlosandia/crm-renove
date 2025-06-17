
import React from 'react';
import { Eye, Edit, Trash2, Phone, Mail, Building, Thermometer } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  assigned_to?: string;
  estimated_value?: number;
  created_by: string;
  job_title?: string;
  last_contact_date?: string;
  next_action_date?: string;
  lead_score?: number;
  probability?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface LeadsListProps {
  leads: Lead[];
  loading: boolean;
  onViewDetails: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  currentUserRole: string;
}

const LeadsList: React.FC<LeadsListProps> = ({
  leads,
  loading,
  onViewDetails,
  onEditLead,
  onDeleteLead,
  currentUserRole
}) => {
  const getTemperatureBadge = (temperature?: string) => {
    const colors = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const labels = {
      hot: 'Quente',
      warm: 'Morno',
      cold: 'Frio'
    };

    const color = colors[temperature as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
    const label = labels[temperature as keyof typeof labels] || temperature || 'Não definido';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
        <Thermometer size={12} className="mr-1" />
        {label}
      </span>
    );
  };

  const getStatusBadge = (status?: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      converted: 'bg-purple-100 text-purple-800',
      lost: 'bg-red-100 text-red-800'
    };

    const labels = {
      active: 'Ativo',
      converted: 'Convertido',
      lost: 'Perdido'
    };

    const color = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    const label = labels[status as keyof typeof labels] || status || 'Ativo';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Carregando leads...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
        <p className="text-gray-500">
          Não foram encontrados leads com os filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lead
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contato
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Temperatura
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor Est.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Criado em
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </div>
                  {lead.company && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Building size={12} className="mr-1" />
                      {lead.company}
                    </div>
                  )}
                  {lead.lead_source && (
                    <div className="text-xs text-gray-400 mt-1">
                      Origem: {lead.lead_source}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-900">
                    <Mail size={12} className="mr-1 text-gray-400" />
                    {lead.email}
                  </div>
                  {lead.phone && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone size={12} className="mr-1 text-gray-400" />
                      {lead.phone}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(lead.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getTemperatureBadge(lead.lead_temperature)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(lead.estimated_value)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(lead.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onViewDetails(lead)}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
                
                {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
                  <>
                    <button
                      onClick={() => onEditLead(lead)}
                      className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteLead(lead.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadsList;
