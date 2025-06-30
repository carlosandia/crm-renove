import React from 'react';
import { Company } from '../../types/Company';
import { FormModal } from '../ui/form-modal';

interface CompanyEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: Company | null;
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  company 
}) => {
  const handleSave = async (updatedCompany: Company) => {
    // Aqui viria a lógica de salvamento
    // Por enquanto só chama onSuccess para manter compatibilidade
    onSuccess();
    onClose();
  };

  return (
    <FormModal<Company>
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar ${company?.name || 'Empresa'}`}
      item={company}
      onSave={handleSave}
      mode="edit"
      saving={false}
    >
      {/* O conteúdo do formulário seria renderizado aqui */}
      {/* Por compatibilidade, mantendo a chamada original por enquanto */}
      <div className="p-4 text-center text-gray-500">
        Conteúdo do formulário de edição da empresa será migrado em próxima iteração
      </div>
    </FormModal>
  );
};

export default CompanyEditModal; 