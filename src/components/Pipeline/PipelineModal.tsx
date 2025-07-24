import React, { memo } from 'react';
import { Modal } from '../ui';
import { Pipeline } from '../../types/Pipeline';
import { User } from '../../types/User';
import ModernPipelineCreatorRefactored from './ModernPipelineCreatorRefactored';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreVertical, Copy, Archive, ArchiveRestore } from 'lucide-react';

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline?: Pipeline | null;
  members: User[];
  onSubmit: (data: any, shouldRedirect?: boolean, options?: any) => Promise<void>;
  isEdit?: boolean;
  onDuplicatePipeline?: () => Promise<void>;
  onArchivePipeline?: () => Promise<void>;
  onUnarchivePipeline?: () => Promise<void>;
  loading?: boolean;
}

const PipelineModal: React.FC<PipelineModalProps> = memo(({
  isOpen,
  onClose,
  pipeline,
  members,
  onSubmit,
  isEdit = false,
  onDuplicatePipeline,
  onArchivePipeline,
  onUnarchivePipeline,
  loading = false
}) => {
  const title = isEdit ? 'Editar Pipeline' : 'Nova Pipeline';
  
  const renderTitle = () => {
    // 🔍 DEBUG: Verificar estado da pipeline no modal (apenas quando pipeline existe)
    if (pipeline) {
      console.log(`🔍 [DEBUG-MODAL] Estado da pipeline no renderTitle:`, {
        pipelineName: pipeline.name,
        pipelineId: pipeline.id,
        isArchived: pipeline.is_archived,
        archivedAt: pipeline.archived_at,
        pipelineKeys: Object.keys(pipeline),
        shouldShowBadge: !!pipeline.is_archived
      });
    }

    return (
      <div className="flex items-center gap-2">
        <span>{title}</span>
        {pipeline?.is_archived && (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
            🗃️ Arquivada
          </span>
        )}
      </div>
    );
  };
  
  // Só logar quando o modal estiver aberto para evitar spam
  if (isOpen) {
    console.log('🎯 [PipelineModal] Modal aberto:', {
      isEdit,
      hasEditingPipeline: !!pipeline,
      membersCount: members.length,
      title
    });
  }

  // Renderizar dropdown de ações (somente no modo edição)
  const renderDropdownActions = () => {
    if (!isEdit || !pipeline?.id || !onDuplicatePipeline) {
      return null;
    }

    // Verificar se pipeline está arquivada
    const isArchived = pipeline?.is_archived === true;
    const archiveAction = isArchived ? onUnarchivePipeline : onArchivePipeline;
    
    // Só renderizar se temos a ação de arquivo apropriada
    if (!archiveAction) {
      return null;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menu de ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 z-[10002]">
          <DropdownMenuItem
            onClick={onDuplicatePipeline}
            disabled={loading}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            <span>Duplicar Pipeline</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={archiveAction}
            disabled={loading}
            className={`flex items-center gap-2 cursor-pointer ${
              isArchived 
                ? 'text-green-600 focus:text-green-600' 
                : 'text-orange-600 focus:text-orange-600'
            }`}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                <span>Desarquivar Pipeline</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span>Arquivar Pipeline</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={renderTitle()}
      size="full"
      className="max-h-[90vh] overflow-hidden"
      headerAction={renderDropdownActions()}
    >
      <div className="max-h-[calc(90vh-6rem)] overflow-y-auto">
        <ModernPipelineCreatorRefactored
          members={members}
          pipeline={pipeline || undefined}
          onSubmit={onSubmit}
          onCancel={onClose}
          title={title}
          submitText={isEdit ? 'Atualizar Pipeline' : 'Criar Pipeline'}
          onDuplicatePipeline={onDuplicatePipeline}
          onArchivePipeline={onArchivePipeline}
          onUnarchivePipeline={onUnarchivePipeline}
        />
      </div>
    </Modal>
  );
});

PipelineModal.displayName = 'PipelineModal';

export default PipelineModal;