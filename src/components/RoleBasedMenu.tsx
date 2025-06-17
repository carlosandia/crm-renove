import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClientesModule from './ClientesModule';
import VendedoresModule from './VendedoresModule';
import PipelineModule from './Pipeline/PipelineModule';
import PipelineViewModule from './PipelineViewModule';
import LeadsModule from './LeadsModule';
import FormBuilderModule from './FormBuilder/FormBuilderModule';
import FeedbackModule from './FeedbackModule';
import SequenceModule from './SequenceModule';
import './PipelineViewModule.css';

interface RoleBasedMenuProps {
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ 
  activeModule = 'Relatório',
  onNavigate = () => {}
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const renderContent = () => {
    switch (activeModule) {
      case 'Clientes':
        return <ClientesModule />;
      case 'Vendedores':
        return <VendedoresModule />;
      case 'Criador de pipeline':
        return <PipelineModule />;
      case 'Pipeline':
        return <PipelineViewModule />;
      case 'Leads':
        return <LeadsModule />;
      case 'Criador de formulários':
        return <FormBuilderModule />;
      case 'Feedback':
        return <FeedbackModule />;
      case 'Cadências':
        return <SequenceModule />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-700">
              Módulo {activeModule}
            </h2>
            <p className="text-gray-500 mt-2">
              Conteúdo em desenvolvimento...
            </p>
          </div>
        );
    }
  };

  return renderContent();
};

export default RoleBasedMenu;
