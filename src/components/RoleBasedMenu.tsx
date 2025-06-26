import React, { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SafeErrorBoundary from './SafeErrorBoundary';

// Lazy loading dos módulos principais
const ModernAdminPipelineManager = lazy(() => import('./ModernAdminPipelineManager'));
const ModernMemberPipelineView = lazy(() => import('./Pipeline/ModernMemberPipelineView'));
const PlatformIntegrationsManager = lazy(() => import('./PlatformIntegrationsManager'));

// Módulos consolidados
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const MemberDashboard = lazy(() => import('./MemberDashboard'));
const EmpresasModule = lazy(() => import('./EmpresasModule'));
const VendedoresModule = lazy(() => import('./VendedoresModule'));
const LeadsModule = lazy(() => import('./LeadsModule'));
const FormBuilderModule = lazy(() => import('./FormBuilder/FormBuilderModule'));
const AcompanhamentoModule = lazy(() => import('./AcompanhamentoModule'));
const IntegrationsModule = lazy(() => import('./IntegrationsModule'));
const FeedbackModule = lazy(() => import('./FeedbackModule'));
const ReportsModule = lazy(() => import('./ReportsModule'));


// Componentes de loading e erro consolidados
const ModuleLoader: React.FC<{ moduleName: string; isV2?: boolean }> = ({ moduleName, isV2 }) => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-sm text-gray-600">
        Carregando {moduleName}{isV2 ? ' (Nova Versão)' : ''}...
      </p>
    </div>
  </div>
);

const ModuleErrorFallback: React.FC<{ 
  moduleName: string; 
  onFallback: () => void;
  isV2?: boolean;
}> = ({ moduleName, onFallback, isV2 }) => (
  <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg p-8">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      Erro ao carregar {moduleName}{isV2 ? ' (V2)' : ''}
    </h3>
    <p className="text-red-600 text-center mb-4">
      Houve um problema ao carregar este módulo. Tentando modo de recuperação...
    </p>
    <button 
      onClick={onFallback}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Tentar Novamente
    </button>
  </div>
);

interface RoleBasedMenuProps {
  selectedItem: string;
  userRole: string;
}

const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ selectedItem, userRole }) => {
  const { user } = useAuth();

  // Sistema de fallback consolidado
  const enableFallback = (moduleType: string) => {
    console.warn(`🔄 Ativando fallback para módulo: ${moduleType}`);
    // Implementar lógica de fallback se necessário
  };

  const renderContent = () => {
    switch (selectedItem) {
      case 'Dashboard Admin':
        // 🔒 VALIDAÇÃO DE ROLE: Só carregar AdminDashboard se for admin ou super_admin
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-yellow-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Acesso Restrito</h3>
                <p className="text-yellow-600">Você não tem permissão para visualizar o dashboard administrativo.</p>
              </div>
            </div>
          );
        }
        
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Dashboard Admin" 
                onFallback={() => enableFallback('admin-dashboard')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Dashboard Admin" />}>
              <AdminDashboard />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Dashboard Member':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Dashboard Member" 
                onFallback={() => enableFallback('member-dashboard')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Dashboard Member" />}>
              <MemberDashboard />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Meu Dashboard':
        // 👤 MEMBER: Dashboard pessoal (mesmo que acima, para compatibilidade)
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Meu Dashboard" 
                onFallback={() => enableFallback('member-dashboard')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Meu Dashboard" />}>
              <MemberDashboard />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Gestão de pipeline':
        // ✅ ARQUITETURA ENTERPRISE: Separação correta por role
        if (userRole === 'admin' || userRole === 'super_admin') {
          // 🔧 ADMIN: Interface administrativa completa (CRUD de pipelines)
          return (
            <SafeErrorBoundary 
              fallback={
                <ModuleErrorFallback 
                  moduleName="Admin Pipeline Manager" 
                  onFallback={() => enableFallback('admin-pipeline-manager')}
                />
              }
            >
              <Suspense fallback={<ModuleLoader moduleName="Gestão de Pipeline (Admin)" />}>
                <ModernAdminPipelineManager />
              </Suspense>
            </SafeErrorBoundary>
          );
        } else {
          // 👤 MEMBER: Interface operacional (visualização e trabalho com leads)
          return (
            <SafeErrorBoundary 
              fallback={
                <ModuleErrorFallback 
                  moduleName="Member Pipeline" 
                  onFallback={() => enableFallback('member-pipeline')}
                  isV2={true}
                />
              }
            >
              <Suspense fallback={<ModuleLoader moduleName="Pipeline (Vendedor)" isV2={true} />}>
                <ModernMemberPipelineView />
              </Suspense>
            </SafeErrorBoundary>
          );
        }

      case 'Pipeline':
        // 👤 MEMBER: Interface operacional (mesmo que acima, para compatibilidade)
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Member Pipeline" 
                onFallback={() => enableFallback('member-pipeline')}
                isV2={true}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Pipeline (Vendedor)" isV2={true} />}>
              <ModernMemberPipelineView />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Clientes':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Clientes" 
                onFallback={() => enableFallback('empresas')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Clientes" />}>
              <EmpresasModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Vendedores':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Vendedores" 
                onFallback={() => enableFallback('vendedores')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Vendedores" />}>
              <VendedoresModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Gestão de formulários':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Gestão de Formulários" 
                onFallback={() => enableFallback('form-builder')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Gestão de Formulários" />}>
              <FormBuilderModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Acompanhamento':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Acompanhamento" 
                onFallback={() => enableFallback('acompanhamento')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Acompanhamento" />}>
              <AcompanhamentoModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Leads':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Leads" 
                onFallback={() => enableFallback('leads')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Leads" />}>
              <LeadsModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Integrações':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Integrações" 
                onFallback={() => enableFallback('integrations')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Integrações" />}>
              <IntegrationsModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Feedback':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Feedback" 
                onFallback={() => enableFallback('feedback')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Feedback" />}>
              <FeedbackModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Relatório':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Relatórios" 
                onFallback={() => enableFallback('reports')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Relatórios" />}>
              <ReportsModule />
            </Suspense>
          </SafeErrorBoundary>
        );

      case 'Notificações':
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Sistema de Notificações Removido
              </h3>
              <p className="text-gray-500">
                O sistema de notificações foi removido do sistema.
              </p>
            </div>
          </div>
        );

      case 'Configurações da Plataforma':
        return (
          <SafeErrorBoundary 
            fallback={
              <ModuleErrorFallback 
                moduleName="Configurações da Plataforma" 
                onFallback={() => enableFallback('platform-integrations')}
              />
            }
          >
            <Suspense fallback={<ModuleLoader moduleName="Configurações da Plataforma" />}>
              <PlatformIntegrationsManager />
            </Suspense>
          </SafeErrorBoundary>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Módulo não encontrado
              </h3>
              <p className="text-gray-500">
                O módulo "{selectedItem}" não foi encontrado ou ainda não foi implementado.
              </p>
            </div>
          </div>
        );
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
};

export default RoleBasedMenu;
