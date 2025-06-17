
import React from 'react';
import { Plus, Download, Upload, Settings, Users, MoreVertical } from 'lucide-react';

interface PipelineActionsProps {
  onAddLead: () => void;
  onExport: () => void;
  onImport: () => void;
  onSettings: () => void;
  onManageMembers: () => void;
  canManage?: boolean;
}

const PipelineActions: React.FC<PipelineActionsProps> = ({
  onAddLead,
  onExport,
  onImport,
  onSettings,
  onManageMembers,
  canManage = true
}) => {
  return (
    <div className="flex items-center space-x-2">
      {/* Ação principal - Adicionar Lead */}
      <button
        onClick={onAddLead}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Criar Oportunidade</span>
      </button>

      {/* Ações secundárias */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onExport}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Exportar dados"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onImport}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Importar leads"
        >
          <Upload className="w-4 h-4" />
        </button>

        {canManage && (
          <>
            <button
              onClick={onManageMembers}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Gerenciar membros"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={onSettings}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Configurações da pipeline"
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Menu de ações extras */}
        <div className="relative">
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineActions;
