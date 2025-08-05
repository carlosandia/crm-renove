import React, { useCallback, useMemo, useEffect, useState } from 'react';
import CRMHeader from './CRMHeader';

interface CRMLayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeModule?: string;
  onNavigate?: (module: string) => void;
  subHeaderContent?: React.ReactNode;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activeModule = 'Relatório',
  onNavigate = () => {},
  subHeaderContent
}) => {
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
  
  // ✅ MEMOIZAÇÃO: Módulos full-width (array constante)
  const fullWidthModules = useMemo(() => ['Pipeline', 'Gestão de pipeline'], []);
  const isFullWidth = useMemo(() => 
    fullWidthModules.includes(activeModule), 
    [fullWidthModules, activeModule]
  );

  // ✅ MEMOIZAÇÃO DE CLASSES CSS RESPONSIVAS: Layout com header fixo + subheader dinâmico
  const mainContentClasses = useMemo(() => {
    // Padding dinâmico baseado na presença do subheader
    if (subHeaderContent) {
      return "flex-1 flex flex-col pt-[110px] overflow-hidden"; // 60px + 50px
    }
    return "flex-1 flex flex-col pt-[60px] overflow-hidden"; // Apenas header
  }, [subHeaderContent]);

  // ✅ MEMOIZAÇÃO DE CLASSES RESPONSIVAS
  const containerClasses = useMemo(() => {
    const baseClasses = "h-full";
    
    if (isFullWidth) {
      return `${baseClasses} overflow-visible`;
    }
    return `${baseClasses} overflow-y-auto overflow-x-hidden`;
  }, [isFullWidth]);

  // ✅ MEMOIZAÇÃO DE PADDING RESPONSIVO
  const contentPadding = useMemo(() => {
    if (isMobile) return "p-3"; // Padding reduzido em mobile
    if (isTablet) return "p-4"; // Padding médio em tablet
    return "p-6"; // Padding normal em desktop
  }, [isMobile, isTablet]);

  // ✅ MEMOIZAÇÃO DE CLASSES DO CARD: Layout com header fixo + subheader dinâmico
  const cardClasses = useMemo(() => {
    const baseCard = "card-modern";
    const padding = isMobile ? "p-3" : isTablet ? "p-4" : "p-6";
    
    // Altura ajustada dinamicamente com classes Tailwind fixas
    let minHeight: string;
    if (subHeaderContent) {
      minHeight = isMobile ? "min-h-[calc(100vh-150px)]" : "min-h-[calc(100vh-170px)]"; // Com subheader (110px + padding)
    } else {
      minHeight = isMobile ? "min-h-[calc(100vh-100px)]" : "min-h-[calc(100vh-120px)]"; // Sem subheader
    }
    
    return `${baseCard} ${padding} ${minHeight}`;
  }, [isMobile, isTablet, subHeaderContent]);

  return (
    <div className="h-screen flex flex-col w-full overflow-hidden" style={{ backgroundColor: '#F1F1FA' }}>
      {/* Header fixo no topo com subheader condicional */}
      <CRMHeader 
        activeModule={activeModule}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        subHeaderContent={subHeaderContent}
      />
      
      {/* Conteúdo principal - ocupa largura total abaixo do header */}
      <div className={mainContentClasses}>
        <main className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#F1F1FA' }}>
          {isFullWidth ? (
            <div className="h-full w-full overflow-visible" style={{ backgroundColor: '#F1F1FA' }}>
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
