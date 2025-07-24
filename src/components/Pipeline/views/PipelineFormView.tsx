import React from 'react';
import { Pipeline } from '../../../types/Pipeline';
import { User } from '../../../types/User';
import ModernPipelineCreatorRefactored from '../ModernPipelineCreatorRefactored';

export interface PipelineFormViewProps {
  editingPipeline: Pipeline | null;
  availableMembers: User[];
  onSubmit: (data: any, shouldRedirect?: boolean, options?: any) => Promise<void>;
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
  console.log('🎯 [PipelineFormView] Renderizando ModernPipelineCreator:', {
    membersCount: availableMembers.length,
    isEdit,
    hasEditingPipeline: !!editingPipeline,
    editingPipelineId: editingPipeline?.id
  });
  
  return (
    <ModernPipelineCreatorRefactored
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