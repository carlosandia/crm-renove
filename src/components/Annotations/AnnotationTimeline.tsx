// =====================================================================================
// COMPONENT: Timeline de Anotações
// Autor: Claude (Arquiteto Sênior)
// Descrição: Timeline cronológico com cards expandíveis e busca avançada
// =====================================================================================

import React, { useState, useMemo } from 'react';
import { Search, Clock, FileText, User, Edit2, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnnotations, useDeleteAnnotation, useAnnotationsSearch } from '../../hooks/useAnnotations';
import { useAuth } from '../../providers/AuthProvider';
import { AnnotationEditor } from './AnnotationEditor';
import type { AnnotationWithRelations, ListAnnotationsQuery } from '../../shared/schemas/annotations';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '../ui/alert-dialog';

interface AnnotationTimelineProps {
  leadId: string;
  leadType: 'pipeline_lead' | 'lead_master';
  className?: string;
  maxHeight?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  onAnnotationUpdate?: (annotation: AnnotationWithRelations) => void;
}

export const AnnotationTimeline: React.FC<AnnotationTimelineProps> = ({
  leadId,
  leadType,
  className = "",
  maxHeight = "600px",
  showSearch = true,
  showFilters = true,
  onAnnotationUpdate
}) => {
  const { user } = useAuth();
  
  // Estado da interface
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Partial<ListAnnotationsQuery>>({
    page: 1,
    limit: 20
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Estado para dialog de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAnnotationId, setDeletingAnnotationId] = useState<string | null>(null);

  // Queries
  const { data: annotationsData, isLoading, error, refetch } = useAnnotations(leadId, leadType, filters);
  const { data: searchData, isLoading: isSearching } = useAnnotationsSearch(
    searchQuery,
    leadId,
    leadType
  );

  // Mutations
  const deleteMutation = useDeleteAnnotation();

  // Dados processados
  const annotations = useMemo(() => {
    if (searchQuery && searchData?.data) {
      return searchData.data;
    }
    return annotationsData?.data || [];
  }, [annotationsData?.data, searchData?.data, searchQuery]);

  const pagination = annotationsData?.pagination;

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const toggleCard = (annotationId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(annotationId)) {
      newExpanded.delete(annotationId);
    } else {
      newExpanded.add(annotationId);
    }
    setExpandedCards(newExpanded);
  };

  const handleEdit = (annotationId: string) => {
    setEditingId(annotationId);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (annotation: AnnotationWithRelations) => {
    setEditingId(null);
    onAnnotationUpdate?.(annotation);
    refetch();
  };

  const handleDelete = (annotationId: string) => {
    setDeletingAnnotationId(annotationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnnotationId) return;

    try {
      await deleteMutation.mutateAsync(deletingAnnotationId);
      refetch();
      setDeleteDialogOpen(false);
      setDeletingAnnotationId(null);
    } catch (error) {
      console.error('❌ [AnnotationTimeline] Erro ao excluir anotação:', error);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingAnnotationId(null);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      setFilters(prev => ({
        ...prev,
        page: (prev.page || 1) + 1
      }));
    }
  };

  // Componente do card de anotação
  const AnnotationCard: React.FC<{ annotation: AnnotationWithRelations }> = ({ annotation }) => {
    const isExpanded = expandedCards.has(annotation.id);
    const isEditing = editingId === annotation.id;
    const canEdit = user?.id === annotation.owner_id || user?.role === 'admin' || user?.role === 'super_admin';
    
    // Preview do conteúdo (primeiras 150 caracteres)
    const contentPreview = annotation.content_plain.length > 150 
      ? annotation.content_plain.substring(0, 150) + '...'
      : annotation.content_plain;

    const timeAgo = formatTimeAgo(annotation.created_at);
    const isRecent = isRecentAnnotation(annotation.created_at);

    if (isEditing) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <AnnotationEditor
            leadId={leadId}
            leadType={leadType}
            existingAnnotation={annotation}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            autoFocus
          />
        </div>
      );
    }

    return (
      <div className={`bg-white border rounded-lg p-4 mb-4 hover:shadow-md transition-shadow ${isRecent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900">
                  {annotation.owner_name}
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {timeAgo}
                  {isRecent && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      Novo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleCard(annotation.id)}
              className="p-1 hover:bg-gray-100 rounded"
              title={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {canEdit && (
              <>
                {/* Botão Editar */}
                <button
                  onClick={() => handleEdit(annotation.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Editar anotação"
                >
                  <Edit2 className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                </button>
                
                {/* Botão Excluir */}
                <button
                  onClick={() => handleDelete(annotation.id)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Excluir anotação"
                >
                  <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-700">
          {isExpanded ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: annotation.content }}
            />
          ) : (
            <p className="cursor-pointer" onClick={() => toggleCard(annotation.id)}>
              {contentPreview}
              {annotation.content_plain.length > 150 && (
                <span className="text-blue-600 ml-1">ver mais</span>
              )}
            </p>
          )}
        </div>

        {/* Footer */}
        {annotation.updated_at !== annotation.created_at && (
          <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
            Editado em {new Date(annotation.updated_at).toLocaleString('pt-BR')}
          </div>
        )}
      </div>
    );
  };

  // Estados de carregamento e erro
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Erro ao carregar anotações</div>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`annotation-timeline ${className}`}>
      {/* Header com busca e filtros */}
      {(showSearch || showFilters) && (
        <div className="mb-6 space-y-4">
          {/* Busca */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar nas anotações..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          )}

          {/* Filtros */}
          {showFilters && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </button>

              <div className="text-sm text-gray-500">
                {annotations.length} anotações
                {pagination && pagination.total > annotations.length && (
                  <span> de {pagination.total}</span>
                )}
              </div>
            </div>
          )}

          {/* Painel de filtros */}
          {showFilterPanel && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ page: 1, limit: 20 })}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0" style={{ maxHeight, overflowY: 'auto' }}>
        {isLoading && annotations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600">Carregando anotações...</div>
          </div>
        ) : annotations.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">
              {searchQuery ? 'Nenhuma anotação encontrada' : 'Nenhuma anotação ainda'}
            </div>
            <div className="text-sm text-gray-400">
              {searchQuery 
                ? 'Tente outros termos de busca' 
                : 'As anotações aparecerão aqui quando forem criadas'
              }
            </div>
          </div>
        ) : (
          <>
            {annotations.map((annotation, index) => (
              <div key={annotation.id} className="relative">
                {/* Timeline line */}
                {index < annotations.length - 1 && (
                  <div className="absolute left-4 top-16 w-0.5 h-full bg-gray-200 -ml-px"></div>
                )}
                
                <AnnotationCard annotation={annotation} />
              </div>
            ))}

            {/* Load more */}
            {pagination && pagination.page < pagination.pages && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isLoading ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão da Anotação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente esta anotação. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Anotação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Funções utilitárias
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return 'agora mesmo';
  if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d atrás`;
  
  return date.toLocaleDateString('pt-BR');
}

function isRecentAnnotation(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  return diffInHours < 24; // Últimas 24 horas
}