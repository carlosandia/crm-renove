import React, { useState } from 'react';
import { Company, CompanyAdmin } from '../../types/Company';
import { 
  Eye, User, Calendar, Mail, 
  ToggleRight, ToggleLeft, CheckCircle, Clock, AlertTriangle, XCircle 
} from 'lucide-react';
import CompanyViewModal from './CompanyViewModal';

// UI Components
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';
import { ActionButton } from '../ui/action-button';

interface CompanyListProps {
  companies: Company[];
  onToggleStatus: (company: Company) => Promise<void>;
  onRefetch: () => void;
  onResendEmail?: (company: Company) => Promise<{ success: boolean; message: string; }>;
}

const CompanyList: React.FC<CompanyListProps> = ({ 
  companies, 
  onToggleStatus,
  onRefetch,
  onResendEmail
}) => {
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

  const handleToggleClick = async (company: Company) => {
    const acao = company.is_active ? 'desativar' : 'ativar';
    const confirmMessage = `Tem certeza que deseja ${acao} a empresa "${company.name}"?`;
    
    if (confirm(confirmMessage)) {
      await onToggleStatus(company);
    }
  };

  const handleViewCompany = (company: Company) => {
    setViewingCompany(company);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para renderizar status de ativação
  const renderActivationStatus = (admin: CompanyAdmin) => {
    if (!admin.activation_status || admin.activation_status === 'activated') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    }

    const statusConfig = {
      pending: { 
        icon: Clock, 
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        text: 'Pendente' 
      },
      sent: { 
        icon: Mail, 
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        text: 'Email Enviado' 
      },
      activated: { 
        icon: CheckCircle, 
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
        text: 'Ativado' 
      },
      expired: { 
        icon: AlertTriangle, 
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
        text: 'Expirado' 
      }
    };

    const config = statusConfig[admin.activation_status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Função para renderizar célula da empresa
  const renderCompanyCell = (company: Company) => (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-semibold text-sm flex-shrink-0">
        {company.name.charAt(0)}
      </div>
      <div>
        <div className="font-semibold text-slate-900">
          {company.name}
        </div>
        <Badge 
          variant={company.is_active ? "default" : "destructive"}
          className={company.is_active 
            ? 'bg-green-100 text-green-800 hover:bg-green-100' 
            : 'bg-red-100 text-red-800 hover:bg-red-100'
          }
        >
          {company.is_active ? 'Ativa' : 'Inativa'}
        </Badge>
      </div>
    </div>
  );

  // Função para renderizar célula do admin
  const renderAdminCell = (company: Company) => (
    <div className="flex items-center space-x-2">
      <User className="w-4 h-4 text-slate-400" />
      <div className="flex flex-col space-y-1">
        <span className="text-sm font-medium text-slate-700">
          {company.admin ? company.admin.name : 'Sem admin'}
        </span>
        {company.admin && renderActivationStatus(company.admin)}
      </div>
    </div>
  );

  // Função para renderizar ações
  const renderActionsCell = (company: Company) => (
    <div className="flex items-center space-x-1">
      <ActionButton
        icon={Eye}
        onClick={() => handleViewCompany(company)}
        tooltip="Visualizar e editar detalhes"
        variant="ghost"
        size="sm"
      />
      
      {/* Botão de reenvio de email para admins não ativados */}
      {company.admin && 
       company.admin.activation_status && 
       company.admin.activation_status !== 'activated' && onResendEmail && (
        <ActionButton
          icon={Mail}
          onClick={async () => {
            try {
              const result = await onResendEmail(company);
              if (result.success) {
                alert(`✅ ${result.message}`);
                onRefetch(); // Atualizar lista após reenvio
              } else {
                alert(`❌ ${result.message}`);
              }
            } catch (error) {
              alert('❌ Erro ao reenviar email de ativação');
              console.error('Erro ao reenviar email:', error);
            }
          }}
          tooltip="Reenviar email de ativação"
          variant="ghost"
          size="sm"
          className="hover:text-orange-600 hover:bg-orange-50"
        />
      )}
      
      <ActionButton
        icon={company.is_active ? ToggleRight : ToggleLeft}
        onClick={() => handleToggleClick(company)}
        tooltip={company.is_active ? 'Desativar empresa' : 'Ativar empresa'}
        variant="ghost"
        size="sm"
        className={company.is_active 
          ? 'hover:text-red-600 hover:bg-red-50' 
          : 'hover:text-green-600 hover:bg-green-50'
        }
      />
    </div>
  );

  if (companies.length === 0) {
    return (
      <EmptyState
        variant="companies"
        title="Nenhuma empresa encontrada"
        description="Ainda não há empresas cadastradas. Comece criando sua primeira empresa."
        actionLabel="Nova Empresa"
        onAction={onRefetch}
      />
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Administrador</TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id} className="hover:bg-slate-50">
                <TableCell>
                  {renderCompanyCell(company)}
                </TableCell>
                
                <TableCell>
                  {renderAdminCell(company)}
                </TableCell>
                
                <TableCell>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                    {company.industry}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {formatDate(company.created_at)}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell className="text-right">
                  {renderActionsCell(company)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Visualização */}
      {viewingCompany && (
        <CompanyViewModal
          company={viewingCompany}
          isOpen={!!viewingCompany}
          onClose={() => setViewingCompany(null)}
          onRefetch={onRefetch}
        />
      )}
    </>
  );
};

export default CompanyList; 