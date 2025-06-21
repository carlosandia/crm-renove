import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Lead, CustomField } from '../types/Pipeline';

// Tipos para o contexto do modal
interface ModalData {
  lead: Lead;
  customFields: CustomField[];
  activeTab: string;
  isOpen: boolean;
}

interface ModalContextType {
  openModal: (leadId: string, lead: Lead, customFields: CustomField[], activeTab?: string) => void;
  closeModal: (leadId: string) => void;
  updateModalLead: (leadId: string, updatedLead: Lead) => void;
  isModalOpen: (leadId: string) => boolean;
  getModalData: (leadId: string) => ModalData | null;
  setExternalUpdateHandler: (handler: (leadId: string, updatedData: any) => void) => void;
}

// Criar o contexto
const ModalContext = createContext<ModalContextType | null>(null);

// Hook para usar o contexto
export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext deve ser usado dentro de ModalProvider');
  }
  return context;
};

// Provider do contexto
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estado global dos modais - Map com leadId como chave
  const [modals, setModals] = useState<Map<string, ModalData>>(new Map());
  
  // Ref para portal container
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Ref para handler externo de atualizações
  const externalUpdateHandlerRef = useRef<((leadId: string, updatedData: any) => void) | null>(null);

  // Garantir que o container do portal existe
  React.useEffect(() => {
    if (!portalContainerRef.current) {
      const container = document.createElement('div');
      container.id = 'modal-portal-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      portalContainerRef.current = container;
    }

    return () => {
      if (portalContainerRef.current && document.body.contains(portalContainerRef.current)) {
        document.body.removeChild(portalContainerRef.current);
      }
    };
  }, []);

  // Função para abrir modal
  const openModal = React.useCallback((leadId: string, lead: Lead, customFields: CustomField[], activeTab: string = 'dados') => {
    console.log('🔓 MODAL-CONTEXT: Abrindo modal para lead:', leadId, { activeTab });
    
    setModals(prev => {
      const newModals = new Map(prev);
      newModals.set(leadId, {
        lead,
        customFields,
        activeTab,
        isOpen: true
      });
      return newModals;
    });
  }, []);

  // Função para fechar modal
  const closeModal = React.useCallback((leadId: string) => {
    console.log('🚪 MODAL-CONTEXT: Fechando modal para lead:', leadId);
    
    setModals(prev => {
      const newModals = new Map(prev);
      newModals.delete(leadId);
      return newModals;
    });
  }, []);

  // Função para atualizar lead do modal
  const updateModalLead = React.useCallback((leadId: string, updatedLead: Lead) => {
    console.log('🔄 MODAL-CONTEXT: Atualizando lead do modal:', leadId);
    
    setModals(prev => {
      const newModals = new Map(prev);
      const modalData = newModals.get(leadId);
      if (modalData) {
        newModals.set(leadId, {
          ...modalData,
          lead: updatedLead
        });
      }
      return newModals;
    });
  }, []);

  // Função para verificar se modal está aberto
  const isModalOpen = React.useCallback((leadId: string): boolean => {
    return modals.has(leadId) && modals.get(leadId)?.isOpen === true;
  }, [modals]);

  // Função para obter dados do modal
  const getModalData = React.useCallback((leadId: string): ModalData | null => {
    return modals.get(leadId) || null;
  }, [modals]);

  // Função para definir handler externo de atualizações
  const setExternalUpdateHandler = React.useCallback((handler: (leadId: string, updatedData: any) => void) => {
    externalUpdateHandlerRef.current = handler;
  }, []);

  const contextValue: ModalContextType = {
    openModal,
    closeModal,
    updateModalLead,
    isModalOpen,
    getModalData,
    setExternalUpdateHandler
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {/* Renderizar modais via Portal */}
      {portalContainerRef.current && Array.from(modals.entries()).map(([leadId, modalData]) => (
        modalData.isOpen && createPortal(
                  <GlobalModalRenderer
          key={leadId}
          leadId={leadId}
          modalData={modalData}
          onClose={() => closeModal(leadId)}
          onUpdate={(updatedLead) => updateModalLead(leadId, updatedLead)}
          externalUpdateHandler={externalUpdateHandlerRef.current}
        />,
          portalContainerRef.current!
        )
      ))}
    </ModalContext.Provider>
  );
};

// Componente para renderizar modal via portal
interface GlobalModalRendererProps {
  leadId: string;
  modalData: ModalData;
  onClose: () => void;
  onUpdate: (updatedLead: Lead) => void;
  externalUpdateHandler: ((leadId: string, updatedData: any) => void) | null;
}

const GlobalModalRenderer: React.FC<GlobalModalRendererProps> = ({
  leadId,
  modalData,
  onClose,
  onUpdate,
  externalUpdateHandler
}) => {
  // Import dinâmico do LeadDetailsModal para evitar dependência circular
  const [LeadDetailsModal, setLeadDetailsModal] = useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    import('../components/Pipeline/LeadDetailsModal').then(module => {
      setLeadDetailsModal(() => module.default);
    });
  }, []);

  if (!LeadDetailsModal) {
    return null; // Loading state
  }

  return (
    <LeadDetailsModal
      key={`global-modal-${leadId}`}
      isOpen={true}
      onClose={onClose}
      onForceClose={onClose}
      lead={modalData.lead}
      customFields={modalData.customFields}
      activeTab={modalData.activeTab}
      isUpdatingStage={false}
      onUpdate={(leadId: string, updatedData: any) => {
        console.log('🔄 GLOBAL-MODAL: onUpdate executado', { leadId, updatedData });
        
        // Atualizar lead local no Context
        const updatedLead = { ...modalData.lead, ...updatedData };
        onUpdate(updatedLead);
        
        // Notificar sistema externo (PipelineViewModule)
        if (externalUpdateHandler) {
          console.log('🔔 GLOBAL-MODAL: Notificando sistema externo');
          externalUpdateHandler(leadId, updatedData);
        }
      }}
    />
  );
}; 