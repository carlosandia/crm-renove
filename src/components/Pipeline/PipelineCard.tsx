import React, { useState } from 'react';
import { Edit, Trash2, Calendar, GitBranch, TrendingUp, AlertTriangle } from 'lucide-react';
import { Pipeline } from '../../types/Pipeline';

interface PipelineCardProps {
  pipeline: Pipeline;
  onEdit: (pipelineId: string) => void;
  onDelete: (pipelineId: string) => void;
}

const PipelineCard: React.FC<PipelineCardProps> = ({
  pipeline,
  onEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  console.log('🔍 PipelineCard Debug:', {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    pipelineStagesLength: pipeline.pipeline_stages?.length,
    pipelineStages: pipeline.pipeline_stages?.map(s => ({ name: s.name, isSystem: s.is_system_stage })) || []
  });

  const handleDelete = () => {
    console.log('🗑️ Excluindo pipeline:', pipeline.id);
    onDelete(pipeline.id);
    setShowDeleteConfirm(false);
  };

  const handleEditPipeline = () => {
    console.log('✏️ Editando pipeline:', pipeline.id);
    onEdit(pipeline.id);
  };

  // Verificar se é uma pipeline mock (ID numérico simples)
  const isMockPipeline = pipeline.id.length <= 2 && /^\d+$/.test(pipeline.id);

  return (
    <div className={`card-modern border p-6 hover:shadow-lg transition-all duration-200 ${
      isMockPipeline ? 'border-amber-200 bg-amber-50/30' : 'border-border'
    }`}>
      {/* Header do Card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-medium flex-shrink-0 shadow-md">
            {pipeline.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-medium text-foreground">
                {pipeline.name}
              </h3>
              {isMockPipeline && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                  DEMO
                </span>
              )}
            </div>
            {pipeline.description && (
              <p className="text-muted-foreground text-sm">
                {pipeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center space-x-1 ml-4">
          <button 
            onClick={handleEditPipeline}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
            title="Editar pipeline"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
            title="Excluir pipeline"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="modal-modern">
          <div className="card-modern p-6 max-w-md mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirmar Exclusão</h3>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-foreground mb-6">
              Tem certeza que deseja excluir a pipeline <strong>"{pipeline.name}"</strong>? 
              Todos os leads e dados associados serão perdidos.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              >
                Sim, Excluir
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Leads</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {(pipeline as any).leads_count || 0}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Etapas</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {pipeline.pipeline_stages?.length || 0}
          </p>
        </div>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
        <div className="flex items-center space-x-1">
          <Calendar className="w-4 h-4" />
          <span>{new Date(pipeline.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>


      {/* Botão de Ação Principal */}
      <div className="pt-4 border-t border-border">
        <button 
          onClick={handleEditPipeline}
          className="btn-primary w-full"
        >
          <GitBranch className="w-4 h-4" />
          <span>Gerenciar Pipeline</span>
        </button>
      </div>
    </div>
  );
};

export default PipelineCard;