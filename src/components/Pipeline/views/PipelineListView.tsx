import React, { useState } from 'react';
import { Pipeline } from '../../../types/Pipeline';
import { User } from '../../../types/User';
import { BlurFade } from '../../ui/blur-fade';
import { Button } from '../../ui/button';
import ModernPipelineList from '../ModernPipelineList';
import { Plus, Archive } from 'lucide-react';

export interface PipelineListViewProps {
  adminPipelines: Pipeline[];
  availableMembers: User[];
  loading: boolean;
  onCreatePipeline: () => void;
  onEditPipeline: (pipeline: Pipeline) => void;
  onViewPipeline: (pipeline: Pipeline) => void;
  onArchivePipeline?: (pipelineId: string, shouldArchive: boolean) => void;
  searchTerm?: string;
  selectedFilter?: 'all' | 'active' | 'archived';
}

export const PipelineListView: React.FC<PipelineListViewProps> = ({
  adminPipelines,
  availableMembers,
  loading,
  onCreatePipeline,
  onEditPipeline,
  onViewPipeline,
  onArchivePipeline,
  searchTerm = '',
  selectedFilter = 'active'
}) => {
  // Função de fallback para archive se não fornecida
  const handleArchivePipeline = onArchivePipeline || (() => {
    console.log('Archive pipeline não implementado');
  });

  return (
    <div className="h-full flex flex-col p-6">
      {/* SubHeader removido - agora é gerenciado pelo CRMLayout */}
      
      <BlurFade delay={0.1} className="flex-1 flex flex-col">
        <ModernPipelineList
          pipelines={adminPipelines}
          members={availableMembers}
          loading={loading}
          onEditPipeline={onEditPipeline}
          onViewPipeline={onViewPipeline}
          onArchivePipeline={handleArchivePipeline}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
        />
      </BlurFade>
    </div>
  );
};

export default PipelineListView; 