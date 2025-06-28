import React from 'react';
import { Company } from '../../types/Company';
import CompanyFormModal from './CompanyFormModal';

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
  return (
    <CompanyFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      company={company}
      mode="edit"
    />
  );
};

export default CompanyEditModal; 