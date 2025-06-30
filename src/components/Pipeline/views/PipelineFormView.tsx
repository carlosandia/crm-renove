import React from 'react';
import { Pipeline } from '../../../types/Pipeline';
import { User } from '../../../types/User';
import ModernPipelineCreator from '../ModernPipelineCreator';

export interface PipelineFormViewProps {
  editingPipeline: Pipeline | null;
  availableMembers: User[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export const PipelineFormView: React.FC<PipelineFormViewProps> = ({
  editingPipeline,
  availableMembers,
  onSubmit,
  onCancel,
  isEdit = false
}) => {
  console.log('🎯 [PipelineFormView] Renderizando ModernPipelineCreator com members:', availableMembers.length);
  
  return (
    <ModernPipelineCreator
      members={availableMembers}
      pipeline={editingPipeline || undefined}
      onSubmit={onSubmit}
      onCancel={onCancel}
      title={isEdit ? 'Editar Pipeline' : 'Nova Pipeline'}
      submitText={isEdit ? 'Atualizar Pipeline' : 'Criar Pipeline'}
    />
  );
};

export default PipelineFormView; 