
import React from 'react';

interface PipelineAccessControlProps {
  userRole?: string;
  loading: boolean;
  children: React.ReactNode;
}

const PipelineAccessControl: React.FC<PipelineAccessControlProps> = ({
  userRole,
  loading,
  children
}) => {
  if (!userRole || userRole !== 'member') {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-600">Apenas vendedores podem acessar esta seção.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando suas pipelines...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PipelineAccessControl;
