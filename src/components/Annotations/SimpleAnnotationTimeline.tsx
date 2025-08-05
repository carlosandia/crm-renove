// =====================================================================================
// COMPONENT: Timeline Simples de Anotações
// Autor: Claude (Arquiteto Sênior)
// Descrição: Timeline cronológica clean sem complexidade visual
// =====================================================================================

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import type { AnnotationWithRelations } from '../../shared/schemas/annotations';
import { AudioPlayer } from '../ui/audio-player';
import { useDeleteAnnotation } from '../../hooks/useAnnotations';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '../ui/alert-dialog';

interface SimpleAnnotationTimelineProps {
  annotations: AnnotationWithRelations[];
  isLoading: boolean;
  onRefetch?: () => void;
}

// AIDEV-NOTE: AudioPlayer antigo removido - agora usando componente unificado ../ui/audio-player

export const SimpleAnnotationTimeline: React.FC<SimpleAnnotationTimelineProps> = ({
  annotations,
  isLoading,
  onRefetch
}) => {
  // Estado para dialog de confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAnnotationId, setDeletingAnnotationId] = useState<string | null>(null);
  
  // Mutation para deletar anotação
  const deleteMutation = useDeleteAnnotation();

  // Handlers para exclusão
  const handleDelete = (annotationId: string) => {
    setDeletingAnnotationId(annotationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAnnotationId) return;

    try {
      await deleteMutation.mutateAsync(deletingAnnotationId);
      onRefetch?.();
      setDeleteDialogOpen(false);
      setDeletingAnnotationId(null);
    } catch (error) {
      console.error('❌ [SimpleAnnotationTimeline] Erro ao excluir anotação:', error);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingAnnotationId(null);
  };
  
  // Formatar data/hora de forma amigável
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // Se foi hoje
    if (diffInHours < 24) {
      const timeString = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `Hoje às ${timeString}`;
    }
    
    // Se foi ontem
    if (diffInHours < 48) {
      const timeString = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `Ontem às ${timeString}`;
    }
    
    // Data mais antiga
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: diffInHours > 8760 ? 'numeric' : undefined // Mostrar ano apenas se for mais de 1 ano
    });
  };

  // Obter iniciais do nome do usuário
  const getUserInitials = (annotation: AnnotationWithRelations) => {
    if (annotation.owner_name) {
      const names = annotation.owner_name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    return 'DA';
  };

  // Obter nome do usuário
  const getUserName = (annotation: AnnotationWithRelations) => {
    return annotation.owner_name || 'Usuário';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                <div className="h-4 bg-gray-300 rounded w-32"></div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <p className="text-sm">Nenhuma anotação ainda</p>
        <p className="text-xs text-gray-400 mt-1">Adicione a primeira anotação acima</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation) => (
        <div 
          key={annotation.id} 
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 transition-colors hover:bg-yellow-100"
        >
          {/* Header com data e autor */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {/* Avatar pequeno */}
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {getUserInitials(annotation)}
              </div>
              
              {/* Data e autor */}
              <div className="text-xs text-gray-600">
                <span className="font-medium">
                  {formatDateTime(annotation.created_at)}
                </span>
                <span className="mx-1">•</span>
                <span>{getUserName(annotation)}</span>
              </div>
            </div>
            
            {/* Botão Excluir */}
            <button 
              onClick={() => handleDelete(annotation.id)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
              title="Excluir anotação"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Conteúdo da anotação */}
          <div className="text-sm text-gray-900 leading-relaxed">
            {annotation.content_plain}
          </div>

          {/* AIDEV-NOTE: Player de áudio unificado com controles avançados */}
          {annotation.audio_file_url && (
            <div className="mt-3">
              <AudioPlayer 
                audioUrl={annotation.audio_file_url}
                duration={annotation.audio_duration}
                fileName={annotation.audio_file_name}
                compact={true}
                showDetails={true}
                className="bg-blue-50 border border-blue-200"
              />
            </div>
          )}
          
          {/* Footer com ações (se necessário) */}
          {annotation.updated_at !== annotation.created_at && (
            <div className="mt-2 text-xs text-gray-500">
              Editado {formatDistanceToNow(new Date(annotation.updated_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </div>
          )}
        </div>
      ))}

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