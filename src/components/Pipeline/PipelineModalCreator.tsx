import React from 'react';
import { User } from '../../types/User';
import { Pipeline } from '../../types/Pipeline';
import PipelineFormWithStagesAndFields from './PipelineFormWithStagesAndFields';
import { X } from 'lucide-react';

interface PipelineModalCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: any) => void;
  title: string;
  submitText: string;
}

const PipelineModalCreator: React.FC<PipelineModalCreatorProps> = ({
  isOpen,
  onClose,
  members,
  pipeline,
  onSubmit,
  title,
  submitText,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-modern">
      <div className="modal-content">
        <div className="modal-header-minimal">
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors ml-auto"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        <div className="modal-body scrollbar-thin">
          <PipelineFormWithStagesAndFields
            members={members}
            pipeline={pipeline}
            onSubmit={onSubmit}
            onCancel={onClose}
            title={title}
            submitText={submitText}
          />
        </div>
      </div>
    </div>
  );
};

export default PipelineModalCreator; 