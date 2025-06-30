import { useState, useCallback, useMemo } from 'react';
import { Lead } from '../../../types/Pipeline';

export interface ModalState {
  // Modal principal ativo
  activeModal: 'addLead' | 'editLead' | 'transfer' | 'deleteConfirm' | 'dealDetails' | 'email' | null;
  
  // Dados do modal ativo
  modalData: Lead | null;
  
  // Estados específicos para compatibilidade
  leadFormData: Record<string, any>;
  
  // Flag para loading/processing
  isProcessing: boolean;
}

export interface ModalManagerReturn {
  // AddLead Modal
  openAddLeadModal: () => void;
  closeAddLeadModal: () => void;
  isAddLeadModalOpen: boolean;

  // EditLead Modal  
  openEditLeadModal: (lead: Lead, formData?: Record<string, any>) => void;
  closeEditLeadModal: () => void;
  isEditLeadModalOpen: boolean;

  // Transfer Modal
  openTransferModal: (lead: Lead) => void;
  closeTransferModal: () => void;
  isTransferModalOpen: boolean;

  // Delete Confirm Modal
  openDeleteConfirmModal: (lead: Lead) => void;
  closeDeleteConfirmModal: () => void;
  isDeleteConfirmModalOpen: boolean;

  // Deal Details Modal
  openDealDetailsModal: (lead: Lead) => void;
  closeDealDetailsModal: () => void;
  isDealDetailsModalOpen: boolean;

  // Email Modal
  openEmailModal: (lead: Lead) => void;
  closeEmailModal: () => void;
  isEmailModalOpen: boolean;

  // Dados e estados
  modalData: Lead | null;
  leadFormData: Record<string, any>;
  isProcessing: boolean;
  setProcessing: (processing: boolean) => void;
  setLeadFormData: (data: Record<string, any>) => void;

  // Estado completo para debug
  modalState: ModalState;
}

export const useModalManager = (): ModalManagerReturn => {
  // Estado centralizado para todos os modais
  const [modalState, setModalState] = useState<ModalState>({
    activeModal: null,
    modalData: null,
    leadFormData: {},
    isProcessing: false
  });

  // Funções centralizadas para abrir modais
  const openModal = useCallback((modalType: ModalState['activeModal'], data?: Lead, formData?: Record<string, any>) => {
    console.log('🔄 [ModalManager] Abrindo modal:', modalType, data?.id);
    
    setModalState(prev => ({
      ...prev,
      activeModal: modalType,
      modalData: data || null,
      leadFormData: formData || {},
      isProcessing: false
    }));
  }, []);

  // Função centralizada para fechar modais
  const closeModal = useCallback(() => {
    console.log('🔄 [ModalManager] Fechando modal:', modalState.activeModal);
    
    setModalState(prev => ({
      ...prev,
      activeModal: null,
      modalData: null,
      leadFormData: {},
      isProcessing: false
    }));
  }, [modalState.activeModal]);

  // Função para definir estado de processamento
  const setProcessing = useCallback((processing: boolean) => {
    setModalState(prev => ({
      ...prev,
      isProcessing: processing
    }));
  }, []);

  // Função para atualizar dados do formulário
  const setLeadFormData = useCallback((data: Record<string, any>) => {
    setModalState(prev => ({
      ...prev,
      leadFormData: data
    }));
  }, []);

  // Funções específicas para compatibilidade com código existente
  const modalActions = useMemo(() => ({
    // AddLead Modal
    openAddLeadModal: () => openModal('addLead'),
    closeAddLeadModal: () => closeModal(),
    isAddLeadModalOpen: modalState.activeModal === 'addLead',

    // EditLead Modal  
    openEditLeadModal: (lead: Lead, formData?: Record<string, any>) => openModal('editLead', lead, formData),
    closeEditLeadModal: () => closeModal(),
    isEditLeadModalOpen: modalState.activeModal === 'editLead',

    // Transfer Modal
    openTransferModal: (lead: Lead) => openModal('transfer', lead),
    closeTransferModal: () => closeModal(),
    isTransferModalOpen: modalState.activeModal === 'transfer',

    // Delete Confirm Modal
    openDeleteConfirmModal: (lead: Lead) => openModal('deleteConfirm', lead),
    closeDeleteConfirmModal: () => closeModal(),
    isDeleteConfirmModalOpen: modalState.activeModal === 'deleteConfirm',

    // Deal Details Modal
    openDealDetailsModal: (lead: Lead) => openModal('dealDetails', lead),
    closeDealDetailsModal: () => closeModal(),
    isDealDetailsModalOpen: modalState.activeModal === 'dealDetails',

    // Email Modal
    openEmailModal: (lead: Lead) => openModal('email', lead),
    closeEmailModal: () => closeModal(),
    isEmailModalOpen: modalState.activeModal === 'email',

    // Dados e estados
    modalData: modalState.modalData,
    leadFormData: modalState.leadFormData,
    isProcessing: modalState.isProcessing,
    setProcessing,
    setLeadFormData,

    // Estado completo para debug
    modalState
  }), [modalState, openModal, closeModal, setProcessing, setLeadFormData]);

  return modalActions;
};

// Componente de compatibilidade para usar o hook diretamente
export interface ModalManagerProps {
  children: (modalManager: ModalManagerReturn) => React.ReactNode;
}

export const ModalManager: React.FC<ModalManagerProps> = ({ children }) => {
  const modalManager = useModalManager();
  return <>{children(modalManager)}</>;
};

export default { useModalManager, ModalManager }; 