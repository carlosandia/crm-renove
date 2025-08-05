// =====================================================================================
// HOOKS: Sistema de Anotações
// Autor: Claude (Arquiteto Sênior)
// Descrição: Hooks React Query para sistema de anotações com auto-save e cache otimizado
// =====================================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../lib/api';
import type {
  CreateAnnotation,
  UpdateAnnotation,
  ListAnnotationsQuery,
  AnnotationWithRelations,
  AnnotationMetrics,
  AnnotationDraft
} from '../shared/schemas/annotations';

// AIDEV-NOTE: Query Keys para cache management
export const annotationKeys = {
  all: ['annotations'] as const,
  lists: () => [...annotationKeys.all, 'list'] as const,
  list: (leadId: string, type: 'pipeline_lead' | 'lead_master', filters?: Partial<ListAnnotationsQuery>) => 
    [...annotationKeys.lists(), { leadId, type, filters }] as const,
  details: () => [...annotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...annotationKeys.details(), id] as const,
  metrics: () => [...annotationKeys.all, 'metrics'] as const,
  search: (query: string) => [...annotationKeys.all, 'search', query] as const,
  drafts: () => [...annotationKeys.all, 'drafts'] as const,
  draft: (leadId: string) => [...annotationKeys.drafts(), leadId] as const
};

// ===================================
// HOOKS PARA BUSCA E LISTAGEM
// ===================================

/**
 * Hook para buscar anotações de um lead específico
 */
export function useAnnotations(
  leadId: string,
  leadType: 'pipeline_lead' | 'lead_master' = 'pipeline_lead',
  filters?: Partial<ListAnnotationsQuery>
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: annotationKeys.list(leadId, leadType, filters),
    queryFn: async () => {
      const response = await api.get(`/annotations/lead/${leadId}`, {
        params: {
          type: leadType,
          ...filters
        }
      });
      return response.data;
    },
    enabled: !!user && !!leadId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2
  });
}

/**
 * Hook para buscar uma anotação específica por ID
 */
export function useAnnotation(annotationId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: annotationKeys.detail(annotationId),
    queryFn: async () => {
      const response = await api.get(`/annotations/${annotationId}`);
      return response.data;
    },
    enabled: !!user && !!annotationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: 2
  });
}

/**
 * Hook para busca avançada em anotações
 */
export function useAnnotationsSearch(
  searchQuery: string,
  leadId?: string,
  leadType: 'pipeline_lead' | 'lead_master' = 'pipeline_lead'
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: annotationKeys.search(`${searchQuery}-${leadId || 'all'}-${leadType}`),
    queryFn: async () => {
      const response = await api.get('/annotations/search', {
        params: {
          q: searchQuery,
          lead_id: leadId,
          type: leadType,
          limit: 20
        }
      });
      return response.data;
    },
    enabled: !!user && !!searchQuery && searchQuery.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}

/**
 * Hook para métricas de anotações (apenas admins)
 */
export function useAnnotationMetrics(filters?: {
  pipeline_id?: string;
  owner_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return useQuery({
    queryKey: [...annotationKeys.metrics(), filters],
    queryFn: async () => {
      const response = await api.get('/annotations/reports/metrics', {
        params: filters
      });
      return response.data;
    },
    enabled: !!user && isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: 2
  });
}

// ===================================
// HOOKS PARA MUTATIONS (CRUD)
// ===================================

/**
 * Hook para criar nova anotação
 */
export function useCreateAnnotation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAnnotation) => {
      console.log('🚀 [useCreateAnnotation] Enviando requisição:', {
        pipeline_lead_id: data.pipeline_lead_id?.substring(0, 8),
        lead_master_id: data.lead_master_id?.substring(0, 8),
        content_length: data.content?.length ?? 0, // Null-safe access
        content_type: data.content_type || 'text',
        has_audio: !!data.audio_file_url,
        userTenantId: user?.tenant_id?.substring(0, 8),
        userId: user?.id?.substring(0, 8)
      });
      
      try {
        const response = await api.post('/annotations', data);
        console.log('✅ [useCreateAnnotation] Sucesso:', {
          annotationId: response.data?.data?.id?.substring(0, 8),
          status: response.status
        });
        return response.data;
      } catch (error: any) {
        console.error('❌ [useCreateAnnotation] Erro detalhado:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          errorData: error.response?.data,
          errorMessage: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            baseURL: error.config?.baseURL
          }
        });
        throw error;
      }
    },
    onSuccess: (newAnnotation: AnnotationWithRelations) => {
      // AIDEV-NOTE: Invalidar e atualizar cache otimizado
      const leadId = newAnnotation.pipeline_lead_id || newAnnotation.lead_master_id;
      const leadType = newAnnotation.pipeline_lead_id ? 'pipeline_lead' : 'lead_master';

      if (leadId) {
        // Invalidar lista de anotações do lead
        queryClient.invalidateQueries({
          queryKey: annotationKeys.list(leadId, leadType)
        });

        // Atualizar cache com optimistic update
        queryClient.setQueryData(
          annotationKeys.detail(newAnnotation.id),
          newAnnotation
        );
      }

      // Invalidar métricas se usuário for admin
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        queryClient.invalidateQueries({
          queryKey: annotationKeys.metrics()
        });
      }

      // Limpar rascunho se existir
      if (leadId) {
        queryClient.removeQueries({
          queryKey: annotationKeys.draft(leadId)
        });
      }
    },
    retry: 2
  });
}

/**
 * Hook para atualizar anotação existente
 */
export function useUpdateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annotationId, data }: { annotationId: string; data: UpdateAnnotation }) => {
      const response = await api.put(`/annotations/${annotationId}`, data);
      return response.data;
    },
    onSuccess: (updatedAnnotation: AnnotationWithRelations) => {
      // AIDEV-NOTE: Atualizar cache específico da anotação
      queryClient.setQueryData(
        annotationKeys.detail(updatedAnnotation.id),
        updatedAnnotation
      );

      // Invalidar lista de anotações do lead
      const leadId = updatedAnnotation.pipeline_lead_id || updatedAnnotation.lead_master_id;
      const leadType = updatedAnnotation.pipeline_lead_id ? 'pipeline_lead' : 'lead_master';

      if (leadId) {
        queryClient.invalidateQueries({
          queryKey: annotationKeys.list(leadId, leadType)
        });
      }
    },
    retry: 2
  });
}

/**
 * Hook para excluir anotação
 */
export function useDeleteAnnotation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (annotationId: string) => {
      const response = await api.delete(`/annotations/${annotationId}`);
      return response.data;
    },
    onSuccess: (_, annotationId) => {
      // AIDEV-NOTE: Remover do cache e invalidar listas relacionadas
      queryClient.removeQueries({
        queryKey: annotationKeys.detail(annotationId)
      });

      // Invalidar todas as listas (não sabemos qual lead era)
      queryClient.invalidateQueries({
        queryKey: annotationKeys.lists()
      });

      // Invalidar métricas se usuário for admin
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        queryClient.invalidateQueries({
          queryKey: annotationKeys.metrics()
        });
      }
    },
    retry: 1
  });
}

// ===================================
// HOOKS PARA AUTO-SAVE E DRAFTS
// ===================================

/**
 * Hook para gerenciar rascunhos (auto-save local)
 */
export function useAnnotationDraft(leadId: string) {
  const queryClient = useQueryClient();

  const saveDraft = (content: string, contentPlain: string) => {
    const draft: AnnotationDraft = {
      lead_id: leadId,
      content,
      content_plain: contentPlain,
      last_saved: new Date().toISOString()
    };

    queryClient.setQueryData(annotationKeys.draft(leadId), draft);
    
    // Salvar no localStorage como backup
    localStorage.setItem(`annotation_draft_${leadId}`, JSON.stringify(draft));
  };

  const getDraft = (): AnnotationDraft | null => {
    // Tentar cache primeiro
    const cachedDraft = queryClient.getQueryData(annotationKeys.draft(leadId)) as AnnotationDraft;
    if (cachedDraft) return cachedDraft;

    // Fallback para localStorage
    const storedDraft = localStorage.getItem(`annotation_draft_${leadId}`);
    if (storedDraft) {
      try {
        return JSON.parse(storedDraft);
      } catch {
        return null;
      }
    }

    return null;
  };

  const clearDraft = () => {
    queryClient.removeQueries({
      queryKey: annotationKeys.draft(leadId)
    });
    localStorage.removeItem(`annotation_draft_${leadId}`);
  };

  return {
    saveDraft,
    getDraft,
    clearDraft
  };
}

/**
 * Hook para auto-save com debounce
 */
export function useAutoSaveAnnotation(
  leadId: string,
  onSave?: (content: string, contentPlain: string) => void
) {
  const { saveDraft } = useAnnotationDraft(leadId);

  let autoSaveTimeout: NodeJS.Timeout;

  const debouncedSave = (content: string, contentPlain: string) => {
    clearTimeout(autoSaveTimeout);
    
    autoSaveTimeout = setTimeout(() => {
      saveDraft(content, contentPlain);
      onSave?.(content, contentPlain);
    }, 2000); // 2 segundos de debounce
  };

  const cancelAutoSave = () => {
    clearTimeout(autoSaveTimeout);
  };

  return {
    debouncedSave,
    cancelAutoSave
  };
}

// ===================================
// HOOKS UTILITÁRIOS
// ===================================

/**
 * Hook para invalidar cache de anotações
 */
export function useInvalidateAnnotations() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: annotationKeys.all
      });
    },
    invalidateByLead: (leadId: string, leadType: 'pipeline_lead' | 'lead_master') => {
      queryClient.invalidateQueries({
        queryKey: annotationKeys.list(leadId, leadType)
      });
    },
    invalidateMetrics: () => {
      queryClient.invalidateQueries({
        queryKey: annotationKeys.metrics()
      });
    }
  };
}

/**
 * Hook para prefetch de anotações
 */
export function usePrefetchAnnotations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchAnnotations = (
    leadId: string,
    leadType: 'pipeline_lead' | 'lead_master' = 'pipeline_lead'
  ) => {
    if (!user || !leadId) return;

    queryClient.prefetchQuery({
      queryKey: annotationKeys.list(leadId, leadType),
      queryFn: async () => {
        const response = await api.get(`/annotations/lead/${leadId}`, {
          params: { type: leadType }
        });
        return response.data;
      },
      staleTime: 2 * 60 * 1000 // 2 minutos
    });
  };

  return { prefetchAnnotations };
}