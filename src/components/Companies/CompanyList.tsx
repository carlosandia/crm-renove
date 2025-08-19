import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Company, CompanyAdmin } from '../../types/Company';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';
import { 
  Eye, User, Calendar, Mail,
  ToggleRight, ToggleLeft, CheckCircle, Clock, AlertTriangle, XCircle 
} from 'lucide-react';
import CompanyViewModal from './CompanyViewModal';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

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
}

const CompanyList: React.FC<CompanyListProps> = ({ 
  companies, 
  onToggleStatus,
  onRefetch
}) => {
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    company: Company | null;
    action: 'activate' | 'deactivate';
  }>({ company: null, action: 'activate' });

  // ✅ CORREÇÃO: Cache para evitar warnings repetitivos no console
  const warnedCompanies = useRef<Set<string>>(new Set());

  // ✅ MEMOIZAÇÃO: Callback memoizado para toggle de status
  const handleToggleClick = useCallback((company: Company) => {
    const action = company.is_active ? 'deactivate' : 'activate';
    setConfirmData({ company, action });
    setShowConfirmDialog(true);
  }, []);

  // ✅ NOVA FUNÇÃO: Confirmar ação de toggle via dialog
  const handleConfirmToggle = useCallback(async () => {
    if (!confirmData.company) return;
    
    try {
      await onToggleStatus(confirmData.company);
      const successMessage = confirmData.action === 'deactivate'
        ? `Empresa desativada e todos usuários perderam acesso!`
        : `Empresa ativada e todos usuários foram automaticamente ativados!`;
      showSuccessToast('Status Atualizado', successMessage);
    } catch (error) {
      showErrorToast('Erro', 'Erro ao atualizar status da empresa');
    }
  }, [confirmData, onToggleStatus]);

  // ✅ MEMOIZAÇÃO: Callback memoizado para visualização
  const handleViewCompany = useCallback((company: Company) => {
    setViewingCompany(company);
  }, []);

  // ✅ MEMOIZAÇÃO: Função de formatação de data memoizada com validação
  const formatDate = useCallback((dateString: string) => {
    try {
      if (!dateString) return 'Data não informada';
      
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn(`[CompanyList] Data inválida fornecida: ${dateString}`);
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error(`[CompanyList] Erro ao formatar data: ${dateString}`, error);
      return 'Erro na data';
    }
  }, []);

  // ✅ CORREÇÃO: Função para validar e formatar nome do administrador
  const getAdminDisplayName = useCallback((admin: CompanyAdmin | undefined) => {
    if (!admin) return 'Sem admin';
    
    // Priorizar campo 'name' se disponível, senão compor first_name + last_name
    if (admin.name && admin.name.trim() !== '') {
      return admin.name.trim();
    }
    
    if (admin.first_name || admin.last_name) {
      const firstName = admin.first_name?.trim() || '';
      const lastName = admin.last_name?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || 'Nome não definido';
    }
    
    return 'Dados incompletos';
  }, []);

  // ✅ CORREÇÃO: Função para validar e formatar segmento da empresa com logging inteligente
  const getSegmentoDisplay = useCallback((company: Company) => {
    if (!company.segmento || company.segmento.trim() === '') {
      // ✅ CORREÇÃO: Log apenas uma vez por empresa para evitar spam no console
      if (!warnedCompanies.current.has(company.id)) {
        console.warn(`[CompanyList] Empresa "${company.name}" sem segmento definido`);
        warnedCompanies.current.add(company.id);
      }
      return 'Não definido';
    }
    
    // ✅ LIMPEZA: Remover do cache se segmento foi corrigido
    if (warnedCompanies.current.has(company.id)) {
      warnedCompanies.current.delete(company.id);
    }
    
    return company.segmento.trim();
  }, []);

  // ✅ MEMOIZAÇÃO: Função de renderização de status memoizada
  const renderActivationStatus = useCallback((admin: CompanyAdmin) => {
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
      inactive: { 
        icon: XCircle, 
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
        text: 'Inativo' 
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
  }, []);

  // ✅ MEMOIZAÇÃO: Função de renderização de célula da empresa memoizada
  const renderCompanyCell = useCallback((company: Company) => (
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
  ), []);

  // ✅ MEMOIZAÇÃO: Função de renderização de célula do admin memoizada
  const renderAdminCell = useCallback((company: Company) => (
    <div className="flex items-center space-x-2">
      <User className="w-4 h-4 text-slate-400" />
      <div className="flex flex-col space-y-1">
        <span className="text-sm font-medium text-slate-700">
          {getAdminDisplayName(company.admin)}
        </span>
        {company.admin && renderActivationStatus(company.admin)}
      </div>
    </div>
  ), [renderActivationStatus, getAdminDisplayName]);

  // ✅ MEMOIZAÇÃO: Função de renderização de ações memoizada
  const renderActionsCell = useCallback((company: Company) => (
    <div className="flex items-center justify-end space-x-1">
      <ActionButton
        icon={Eye}
        onClick={() => handleViewCompany(company)}
        tooltip="Visualizar e editar detalhes"
        variant="ghost"
        size="sm"
      />
      
      
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
  ), [handleToggleClick, handleViewCompany, onRefetch]);

  // ✅ MEMOIZAÇÃO: Renderização das linhas da tabela otimizada
  const renderedTableRows = useMemo(() => {
    return companies.map((company) => (
      <TableRow key={company.id} className="hover:bg-slate-50">
        <TableCell>
          {renderCompanyCell(company)}
        </TableCell>
        
        <TableCell>
          {renderAdminCell(company)}
        </TableCell>
        
        <TableCell>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
            {getSegmentoDisplay(company)}
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
    ));
  }, [companies, renderCompanyCell, renderAdminCell, renderActionsCell, formatDate, getSegmentoDisplay]);

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
              <TableHead>Segmento</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderedTableRows}
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

      {/* Dialog de Confirmação */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmToggle}
        title={confirmData.action === 'deactivate' ? 'Desativar Empresa' : 'Ativar Empresa'}
        description={
          confirmData.action === 'deactivate'
            ? `Tem certeza que deseja desativar a empresa "${confirmData.company?.name}"?\n\n⚠️ ATENÇÃO: Todos os usuários (admin e member) desta empresa perderão o acesso ao sistema!`
            : `Tem certeza que deseja ativar a empresa "${confirmData.company?.name}"?`
        }
        confirmText={confirmData.action === 'deactivate' ? 'Desativar' : 'Ativar'}
        cancelText="Cancelar"
        variant={confirmData.action === 'deactivate' ? 'destructive' : 'default'}
      />
    </>
  );
};

export default CompanyList; 