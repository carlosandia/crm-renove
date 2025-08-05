// =====================================================================================
// EXPORTS: Sistema de Anotações
// Autor: Claude (Arquiteto Sênior)
// Descrição: Exportações centralizadas dos componentes de anotações
// =====================================================================================

export { AnnotationEditor } from './AnnotationEditor';
export { AnnotationTimeline } from './AnnotationTimeline';
export { AnnotationsTab } from './AnnotationsTab';
export { SimpleAnnotationEditor } from './SimpleAnnotationEditor';
export { SimpleAnnotationTimeline } from './SimpleAnnotationTimeline';

// Re-export dos hooks para conveniência
export {
  useAnnotations,
  useAnnotation,
  useAnnotationsSearch,
  useAnnotationMetrics,
  useCreateAnnotation,
  useUpdateAnnotation,
  useDeleteAnnotation,
  useAnnotationDraft,
  useAutoSaveAnnotation,
  useInvalidateAnnotations,
  usePrefetchAnnotations,
  annotationKeys
} from '../../hooks/useAnnotations';

// Re-export dos tipos para conveniência
export type {
  Annotation,
  CreateAnnotation,
  UpdateAnnotation,
  ListAnnotationsQuery,
  AnnotationWithRelations,
  AnnotationMetrics,
  AnnotationDraft
} from '../../shared/schemas/annotations';