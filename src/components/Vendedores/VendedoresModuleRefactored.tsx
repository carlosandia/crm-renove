import React, { useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { GoalsManager } from './goals';
import { VendorValidator, useVendorValidator } from './validation';
import type { FormData } from './validation';

interface Vendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
}

const VendedoresModuleRefactored: React.FC = () => {
  const { user } = useAuth();
  
  const [showForm, setShowForm] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });

  const { isFormValid, resetValidation } = useVendorValidator({
    formData,
    editingVendedor,
    onFormDataChange: setFormData
  });

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestão de Vendedores (Refatorado)</h2>
            <p className="text-gray-600">Versão refatorada com componentes extraídos</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <VendorValidator
            formData={formData}
            editingVendedor={editingVendedor}
            onFormDataChange={setFormData}
          />
        </div>
      )}

      <GoalsManager
        showGoalsModal={showGoalsModal}
        selectedVendedor={selectedVendedor}
        onCloseModal={() => setShowGoalsModal(false)}
        onGoalCreated={() => {}}
      />
    </div>
  );
};

export default VendedoresModuleRefactored;
