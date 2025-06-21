import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User } from '../../types/User';
import { Pipeline } from '../../types/Pipeline';
import PipelineFormWithStagesAndFields from './PipelineFormWithStagesAndFields';

interface PipelineCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: any) => void;
}

const PipelineCreatorModal: React.FC<PipelineCreatorModalProps> = ({
  isOpen,
  onClose,
  members,
  pipeline,
  onSubmit
}) => {
  if (!isOpen) return null;

  const handleSubmit = (data: any) => {
    onSubmit(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">+</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {pipeline ? 'Editar Pipeline' : 'Criar Nova Pipeline'}
              </h2>
              <p className="text-sm text-gray-600">Configure sua pipeline de vendas completa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <PipelineFormWithStagesAndFields
            members={members}
            pipeline={pipeline}
            onSubmit={handleSubmit}
            onCancel={onClose}
            title=""
            submitText={pipeline ? 'Salvar Alterações' : 'Criar Pipeline'}
          />
        </div>
      </div>
    </div>
  );
};

export default PipelineCreatorModal; 