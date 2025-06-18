
import React, { Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary, { PipelineErrorBoundary } from '../utils/errorBoundary';

// Lazy loading dos módulos pesados
const EmpresasModule = lazy(() => import('./EmpresasModule'));
const VendedoresModule = lazy(() => import('./VendedoresModule'));
const PipelineModule = lazy(() => import('./Pipeline/PipelineModule'));
const PipelineViewModule = lazy(() => import('./PipelineViewModule'));
const LeadsModule = lazy(() => import('./LeadsModule'));
const FormBuilderModule = lazy(() => import('./FormBuilder/FormBuilderModule'));
const FeedbackModule = lazy(() => import('./FeedbackModule'));
const SequenceModule = lazy(() => import('./SequenceModule'));
const IntegrationsModule = lazy(() => import('./IntegrationsModule'));
const ReportsModule = lazy(() => import('./ReportsModule'));

interface RoleBasedMenuProps {
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

// Componente de loading mais sofisticado
const ModuleLoader: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 animate-pulse">
        Carregando {moduleName}...
      </p>
      <div className="mt-4 bg-gray-100 rounded-lg p-4 max-w-sm mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

// Componente de erro específico para módulos
const ModuleErrorFallback: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
      <div className="text-red-600 text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        Erro ao carregar {moduleName}
      </h3>
      <p className="text-red-700 mb-4 text-sm">
        Não foi possível carregar este módulo. Tente recarregar a página.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Recarregar Página
      </button>
    </div>
  </div>
);

const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ 
  activeModule = 'Relatório',
  onNavigate = () => {}
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const renderContent = () => {
    switch (activeModule) {
      case 'Relatório':
      case 'Relatórios':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Relatórios" />}>
            <Suspense fallback={<ModuleLoader moduleName="Relatórios" />}>
              <ReportsModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Clientes':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Clientes" />}>
            <Suspense fallback={<ModuleLoader moduleName="Clientes" />}>
              <EmpresasModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Vendedores':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Vendedores" />}>
            <Suspense fallback={<ModuleLoader moduleName="Vendedores" />}>
              <VendedoresModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Criador de pipeline':
        return (
          <PipelineErrorBoundary>
            <Suspense fallback={<ModuleLoader moduleName="Criador de Pipeline" />}>
              <PipelineModule />
            </Suspense>
          </PipelineErrorBoundary>
        );
        
      case 'Pipeline':
        return (
          <PipelineErrorBoundary>
            <Suspense fallback={<ModuleLoader moduleName="Pipeline" />}>
              <PipelineViewModule />
            </Suspense>
          </PipelineErrorBoundary>
        );
        
      case 'Leads':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Leads" />}>
            <Suspense fallback={<ModuleLoader moduleName="Leads" />}>
              <LeadsModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Criador de formulários':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Criador de Formulários" />}>
            <Suspense fallback={<ModuleLoader moduleName="Criador de Formulários" />}>
              <FormBuilderModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Feedback':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Feedback" />}>
            <Suspense fallback={<ModuleLoader moduleName="Feedback" />}>
              <FeedbackModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Cadências':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Cadências" />}>
            <Suspense fallback={<ModuleLoader moduleName="Cadências" />}>
              <SequenceModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      case 'Integrações':
        return (
          <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Integrações" />}>
            <Suspense fallback={<ModuleLoader moduleName="Integrações" />}>
              <IntegrationsModule />
            </Suspense>
          </ErrorBoundary>
        );
        
      default:
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Módulo {activeModule}
            </h2>
            <p className="text-gray-500 mt-2">
              Conteúdo em desenvolvimento...
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                Este módulo será implementado em breve. Enquanto isso, explore os outros módulos disponíveis.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary
      resetKeys={[activeModule]}
      onError={(error, errorInfo) => {
        console.error(`Error in ${activeModule} module:`, error, errorInfo);
      }}
    >
      {renderContent()}
    </ErrorBoundary>
  );
};

export default RoleBasedMenu;
