import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import CRMSidebar from './CRMSidebar';

// ✅ LAZY LOADING: NotificationCenter carregado apenas quando necessário
const NotificationCenter = lazy(() => 
  import('./NotificationCenter/NotificationCenter').then(module => ({
    default: module.NotificationCenter
  }))
);

interface CRMLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activeModule = 'Relatório',
  onNavigate = () => {}
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // ✅ RESPONSIVIDADE: Estado para detectar mobile
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // ✅ RESPONSIVIDADE: Hook para detectar tamanho da tela
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ✅ MOBILE: Auto-colapsar sidebar em mobile
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isMobile, sidebarCollapsed]);
  
  // ✅ MEMOIZAÇÃO: Módulos full-width (array constante)
  const fullWidthModules = useMemo(() => ['Pipeline'], []);
  const isFullWidth = useMemo(() => 
    fullWidthModules.includes(activeModule), 
    [fullWidthModules, activeModule]
  );

  // ✅ CALLBACK OTIMIZADO: Evitar recriação da função
  const handleSidebarToggle = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  // ✅ MEMOIZAÇÃO DE CLASSES CSS RESPONSIVAS: Evitar recálculo constante
  const mainContentClasses = useMemo(() => {
    let baseClasses = "flex-1 flex flex-col transition-all duration-300 overflow-hidden";
    
    if (isMobile) {
      // Mobile: sidebar sempre overlay, sem margin
      return `${baseClasses} ml-0`;
    } else if (isTablet) {
      // Tablet: margin reduzida
      return `${baseClasses} ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`;
    } else {
      // Desktop: margin normal
      return `${baseClasses} ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`;
    }
  }, [sidebarCollapsed, isMobile, isTablet]);

  // ✅ MEMOIZAÇÃO DE CLASSES RESPONSIVAS
  const containerClasses = useMemo(() => {
    const baseClasses = "h-full bg-background";
    
    if (isFullWidth) {
      return `${baseClasses} overflow-x-auto overflow-y-hidden`;
    }
    return `${baseClasses} overflow-y-auto overflow-x-hidden`;
  }, [isFullWidth]);

  // ✅ MEMOIZAÇÃO DE PADDING RESPONSIVO
  const contentPadding = useMemo(() => {
    if (isMobile) return "p-3"; // Padding reduzido em mobile
    if (isTablet) return "p-4"; // Padding médio em tablet
    return "p-6"; // Padding normal em desktop
  }, [isMobile, isTablet]);

  // ✅ MEMOIZAÇÃO DE CLASSES DO CARD
  const cardClasses = useMemo(() => {
    const baseCard = "card-modern";
    const padding = isMobile ? "p-3" : isTablet ? "p-4" : "p-6";
    const minHeight = isMobile ? "min-h-[calc(100vh-40px)]" : "min-h-[calc(100vh-60px)]";
    
    return `${baseCard} ${padding} ${minHeight}`;
  }, [isMobile, isTablet]);

  // ✅ MEMOIZAÇÃO DE POSIÇÃO DO NOTIFICATION CENTER
  const notificationPosition = useMemo(() => {
    if (isMobile) {
      return "absolute top-2 right-2 z-50 flex items-center gap-2";
    }
    return "absolute top-4 right-4 z-50 flex items-center gap-3";
  }, [isMobile]);

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {/* ✅ MOBILE OVERLAY: Overlay escuro quando sidebar aberta em mobile */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Sidebar responsiva */}
      <CRMSidebar 
        activeModule={activeModule}
        onNavigate={onNavigate}
        onToggle={handleSidebarToggle}
      />
      
      {/* Conteúdo principal responsivo */}
      <div className={mainContentClasses}>
        <main className="flex-1 bg-background relative overflow-hidden">
          {/* Sistema de notificações responsivo */}
          <div className={notificationPosition}>
            <Suspense fallback={
              <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-100 rounded-lg animate-pulse`} />
            }>
              <NotificationCenter className="order-2" />
            </Suspense>
          </div>
          
          {isFullWidth ? (
            <div className={containerClasses}>
              {children}
            </div>
          ) : (
            <div className={containerClasses}>
              <div className={contentPadding}>
                <div className={cardClasses}>
                  {children}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ✅ MEMOIZAÇÃO DO COMPONENTE: Evitar re-renders desnecessários
export default React.memo(CRMLayout);
