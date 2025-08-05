import React, { useState } from 'react';
import { MoreVertical, Download, Upload, FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../providers/AuthProvider';
import { showSuccessToast, showErrorToast } from '../../hooks/useToast';

interface LeadsImportExportDropdownProps {
  onImportClick: () => void;
  onExportClick: () => void;
  className?: string;
}

const LeadsImportExportDropdown: React.FC<LeadsImportExportDropdownProps> = ({
  onImportClick,
  onExportClick,
  className = '',
}) => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      
      // URL do endpoint de template usando configuração centralizada
      const { environmentConfig } = await import('../../config/environment');
      const templateUrl = `${environmentConfig.urls.api}/leads/template`;
      
      // Fazer download do template
      const response = await fetch(templateUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar template');
      }

      // Criar blob e download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-importacao-leads.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccessToast(
        'Template baixado',
        'O template para importação foi baixado com sucesso.'
      );
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      showErrorToast(
        'Erro no download',
        'Não foi possível baixar o template. Tente novamente.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Verificar permissões - apenas admin e super_admin podem importar/exportar
  const canImportExport = user?.role === 'admin' || user?.role === 'super_admin';

  if (!canImportExport) {
    return null; // Não mostrar o dropdown para members
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
          title="Ações de importação/exportação"
        >
          <MoreVertical size={20} />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Download size={16} />
          <span>{isDownloading ? 'Baixando...' : 'Baixar Template'}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onImportClick}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Upload size={16} />
          <span>Importar Leads</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={onExportClick}
          className="flex items-center gap-2 cursor-pointer"
        >
          <FileDown size={16} />
          <span>Exportar Leads</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LeadsImportExportDropdown;