import React, { useState } from 'react';
import { FileDown, Filter, Calendar, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';

interface LeadsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  assignedTo: string;
  includeSearch: boolean;
  includeDateRange: boolean;
  includeAssignedTo: boolean;
}

const LeadsExportModal: React.FC<LeadsExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    assignedTo: '',
    includeSearch: false,
    includeDateRange: false,
    includeAssignedTo: false,
  });

  const handleFilterChange = (key: keyof ExportFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const buildExportUrl = () => {
    const baseUrl = `${import.meta.env.VITE_API_URL}/api/leads/export`;
    const params = new URLSearchParams();
    
    params.append('format', format);
    
    if (filters.includeSearch && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    
    if (filters.includeDateRange) {
      if (filters.dateFrom) {
        params.append('date_from', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('date_to', filters.dateTo);
      }
    }
    
    if (filters.includeAssignedTo && filters.assignedTo.trim()) {
      params.append('assigned_to', filters.assignedTo.trim());
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    
    try {
      const exportUrl = buildExportUrl();
      
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-tenant-id': user.tenant_id,
          'x-user-id': user.id,
          'x-user-role': user.role,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro na exportação');
      }

      // Criar blob e download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extrair nome do arquivo do header ou usar padrão
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `leads-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccessToast(
        'Export concluído!',
        `Arquivo ${fileName} foi baixado com sucesso.`
      );

      onClose();

    } catch (error: any) {
      console.error('Erro na exportação:', error);
      showErrorToast(
        'Erro no export',
        error.message || 'Não foi possível exportar os leads.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getFilterSummary = () => {
    const activeFilters = [];
    
    if (filters.includeSearch && filters.search.trim()) {
      activeFilters.push(`Busca: "${filters.search}"`);
    }
    
    if (filters.includeDateRange) {
      if (filters.dateFrom && filters.dateTo) {
        activeFilters.push(`Período: ${filters.dateFrom} até ${filters.dateTo}`);
      } else if (filters.dateFrom) {
        activeFilters.push(`A partir de: ${filters.dateFrom}`);
      } else if (filters.dateTo) {
        activeFilters.push(`Até: ${filters.dateTo}`);
      }
    }
    
    if (filters.includeAssignedTo && filters.assignedTo.trim()) {
      activeFilters.push(`Responsável: ${filters.assignedTo}`);
    }
    
    return activeFilters.length > 0 
      ? activeFilters.join(', ')
      : 'Todos os leads serão exportados';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown size={20} />
            Exportar Leads
          </DialogTitle>
          <DialogDescription>
            Configure as opções de exportação e baixe seus leads em formato CSV ou XLSX. 
            Use filtros para exportar apenas os dados desejados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato de arquivo */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato do arquivo</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as 'csv')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">CSV (.csv)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={(e) => setFormat(e.target.value as 'xlsx')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Excel (.xlsx)</span>
              </label>
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <Label className="text-sm font-medium">Filtros de exportação</Label>
            </div>

            {/* Filtro de busca */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-search"
                  checked={filters.includeSearch}
                  onCheckedChange={(checked) => 
                    handleFilterChange('includeSearch', checked as boolean)
                  }
                />
                <Label htmlFor="include-search" className="text-sm">
                  Filtrar por busca
                </Label>
              </div>
              {filters.includeSearch && (
                <Input
                  placeholder="Digite nome, email ou empresa..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="ml-6"
                />
              )}
            </div>

            {/* Filtro de data */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-date-range"
                  checked={filters.includeDateRange}
                  onCheckedChange={(checked) => 
                    handleFilterChange('includeDateRange', checked as boolean)
                  }
                />
                <Label htmlFor="include-date-range" className="text-sm">
                  Filtrar por período
                </Label>
              </div>
              {filters.includeDateRange && (
                <div className="ml-6 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date-from" className="text-xs text-gray-600">
                      Data inicial
                    </Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to" className="text-xs text-gray-600">
                      Data final
                    </Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filtro de responsável */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-assigned-to"
                  checked={filters.includeAssignedTo}
                  onCheckedChange={(checked) => 
                    handleFilterChange('includeAssignedTo', checked as boolean)
                  }
                />
                <Label htmlFor="include-assigned-to" className="text-sm">
                  Filtrar por responsável
                </Label>
              </div>
              {filters.includeAssignedTo && (
                <Input
                  placeholder="ID do usuário responsável..."
                  value={filters.assignedTo}
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                  className="ml-6"
                />
              )}
            </div>
          </div>

          {/* Resumo dos filtros */}
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Resumo da exportação:
            </div>
            <div className="text-xs text-gray-600">
              {getFilterSummary()}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExporting ? 'Exportando...' : `Exportar ${format.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadsExportModal;