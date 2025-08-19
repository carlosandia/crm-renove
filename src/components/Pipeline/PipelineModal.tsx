import React, { memo, useCallback, useRef } from 'react';
import { Modal } from '../ui';
import { Pipeline } from '../../types/Pipeline';
import { User } from '../../types/User';
import ModernPipelineCreatorRefactored from './ModernPipelineCreatorRefactored';
import { loggers } from '../../utils/logger';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoreVertical, Copy, Archive, ArchiveRestore } from 'lucide-react';

// ✅ CORREÇÃO CRÍTICA: Componente isolado para DropdownMenu evitar loops infinitos
interface PipelineDropdownActionsProps {
  isEdit: boolean;
  pipeline: Pipeline | null;
  onDuplicatePipeline?: () => Promise<void>;
  onArchivePipeline?: () => Promise<void>;
  onUnarchivePipeline?: () => Promise<void>;
  duplicatingPipelineId?: string | null;
  loading?: boolean;
}

const PipelineDropdownActions: React.FC<PipelineDropdownActionsProps> = memo(({
  isEdit,
  pipeline,
  onDuplicatePipeline,
  onArchivePipeline,
  onUnarchivePipeline,
  duplicatingPipelineId,
  loading
}) => {
  // ✅ GUARD: Não renderizar se não está em modo edição ou sem pipeline
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

  // 🚀 Verificar se está duplicando esta pipeline específica
  const isDuplicating = duplicatingPipelineId === pipeline.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={loading || isDuplicating}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Abrir menu de ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 z-[10002]">
        <DropdownMenuItem
          onClick={onDuplicatePipeline}
          disabled={loading || isDuplicating}
          className="flex items-center gap-2 cursor-pointer"
        >
          {isDuplicating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Duplicando...</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Duplicar Pipeline</span>
            </>
          )}
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
}, (prevProps, nextProps) => {
  // ✅ CORREÇÃO FASE 2: Função de comparação customizada para React.memo evitar warning "Expected static flag was missing"
  return (
    prevProps.isEdit === nextProps.isEdit &&
    prevProps.pipeline?.id === nextProps.pipeline?.id &&
    prevProps.pipeline?.is_archived === nextProps.pipeline?.is_archived &&
    prevProps.onDuplicatePipeline === nextProps.onDuplicatePipeline &&
    prevProps.onArchivePipeline === nextProps.onArchivePipeline &&
    prevProps.onUnarchivePipeline === nextProps.onUnarchivePipeline &&
    prevProps.duplicatingPipelineId === nextProps.duplicatingPipelineId &&
    prevProps.loading === nextProps.loading
  );
});

PipelineDropdownActions.displayName = 'PipelineDropdownActions';

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline?: Pipeline | null;
  members: User[];
  membersLoading?: boolean;
  onSubmit: (data: any, shouldRedirect?: boolean, options?: any) => Promise<Pipeline | void>;
  isEdit?: boolean;
  onDuplicatePipeline?: () => Promise<void>;
  onArchivePipeline?: () => Promise<void>;
  onUnarchivePipeline?: () => Promise<void>;
  loading?: boolean;
  title?: string; // ✅ CORREÇÃO: Adicionar prop title
  onCancel?: () => void; // ✅ CORREÇÃO: Adicionar prop onCancel
  duplicatingPipelineId?: string | null;
}

const PipelineModal: React.FC<PipelineModalProps> = memo(({
  isOpen,
  onClose,
  pipeline,
  members,
  membersLoading = false,
  onSubmit,
  isEdit = false,
  onDuplicatePipeline,
  onArchivePipeline,
  onUnarchivePipeline,
  loading = false,
  duplicatingPipelineId = null
}) => {
  const title = isEdit ? 'Editar Pipeline' : 'Nova Pipeline';
  
  // ✅ THROTTLING: Refs para controlar logs duplicados
  const lastLogTime = useRef<number>(0);
  const lastSyncLogTime = useRef<number>(0);
  
  // ✅ OTIMIZAÇÃO: Log com throttling para evitar spam (apenas uma vez por 5 segundos)
  const now = Date.now();
  if (process.env.NODE_ENV === 'development' && (now - lastLogTime.current >= 5000)) {
    lastLogTime.current = now;
    console.log('🔍 [PipelineModal] Props received:', {
      pipeline_id: pipeline?.id,
      pipeline_name: pipeline?.name,
      isEdit,
      isOpen
    });
  }
  
  // ✅ NOVA: Estado local da pipeline para permitir atualizações instantâneas
  const [localPipeline, setLocalPipeline] = React.useState(pipeline);
  const [pipelineCreatorRef, setPipelineCreatorRef] = React.useState<any>(null);
  // ✅ NOVO: Estado para o footer
  const [footerElement, setFooterElement] = React.useState<React.ReactNode>(null);
  
  // ✅ NOVA: Sincronizar pipeline local quando prop muda
  React.useEffect(() => {
    // ✅ CORREÇÃO: Remover log duplicado - sincronização é processo interno
    setLocalPipeline(pipeline);
  }, [pipeline]);
  
  // ✅ NOVA: Callback para atualizar pipeline local
  const handlePipelineUpdated = useCallback((updatedPipeline: Pipeline) => {
    setLocalPipeline(updatedPipeline);
    // ✅ CORREÇÃO: Remover log - atualização é processo interno esperado
  }, []);

  // ✅ NOVO: Callback para capturar o footer
  const handleFooterRender = useCallback((footer: React.ReactNode) => {
    setFooterElement(footer);
  }, []);
  
  // ✅ CORREÇÃO: Handler de fechamento com cleanup
  const handleClose = useCallback(() => {
    // ✅ CORREÇÃO: Cleanup de estados locais antes de fechar
    setLocalPipeline(null);
    setFooterElement(null);
    
    // Chamar o fechamento original
    onClose();
  }, [onClose]);
  
  // ✅ CORREÇÃO CRÍTICA: renderTitle simplificado
  const renderTitle = useCallback(() => {
    // 🚀 Verificar se a pipeline foi recém-criada (indicativo de duplicação) - usar localPipeline
    const isRecentlyCreated = localPipeline?.created_at && 
      new Date(localPipeline.created_at).getTime() > Date.now() - (2 * 60 * 1000); // Últimos 2 minutos
    
    const isDuplicated = localPipeline?.name?.includes('Cópia') || localPipeline?.name?.includes('(2)');

    return (
      <div className="flex items-center gap-2">
        <PipelineDropdownActions
          isEdit={isEdit}
          pipeline={localPipeline}
          onDuplicatePipeline={onDuplicatePipeline}
          onArchivePipeline={onArchivePipeline}
          onUnarchivePipeline={onUnarchivePipeline}
          duplicatingPipelineId={duplicatingPipelineId}
          loading={loading}
        />
        
        <span>
          {title}
          {isEdit && localPipeline?.name && (
            <span className="font-normal text-gray-700">: {localPipeline.name}</span>
          )}
        </span>
        {localPipeline?.is_archived && (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
            🗃️ Arquivada
          </span>
        )}
        {isEdit && isRecentlyCreated && isDuplicated && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 animate-pulse">
            ✨ Recém-duplicada
          </span>
        )}
      </div>
    );
  }, [title, isEdit, localPipeline?.name, localPipeline?.created_at, localPipeline?.is_archived, onDuplicatePipeline, onArchivePipeline, onUnarchivePipeline, duplicatingPipelineId, loading]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={renderTitle()}
      className="max-w-6xl"
      showCloseButton={true}
      footer={footerElement}
    >
      <ModernPipelineCreatorRefactored
        members={members}
        membersLoading={membersLoading}
        pipeline={localPipeline}
        onSubmit={onSubmit}
        onCancel={handleClose}
        title={title}
        submitText={isEdit ? 'Salvar Pipeline' : 'Criar Pipeline'}
        onDuplicatePipeline={onDuplicatePipeline}
        onArchivePipeline={onArchivePipeline}
        onPipelineUpdated={handlePipelineUpdated}
        onFooterRender={handleFooterRender}
      />
    </Modal>
  );
}, (prevProps, nextProps) => {
  // ✅ CORREÇÃO: Comparação simplificada focando apenas no essencial
  // Evita mudanças desnecessárias de isEdit que causam o duplo clique
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.isEdit === nextProps.isEdit &&
    prevProps.pipeline?.id === nextProps.pipeline?.id &&
    prevProps.pipeline?.name === nextProps.pipeline?.name &&
    prevProps.members.length === nextProps.members.length &&
    prevProps.loading === nextProps.loading
  );
});

PipelineModal.displayName = 'PipelineModal';

export default PipelineModal;