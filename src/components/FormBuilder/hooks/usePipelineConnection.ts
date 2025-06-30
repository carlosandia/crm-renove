import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  fields: PipelineField[];
  is_active: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  is_default: boolean;
  color: string;
}

interface PipelineField {
  name: string;
  label: string;
  type: string;
  is_required: boolean;
  is_custom: boolean;
  options?: any;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface UsePipelineConnectionReturn {
  // Estados
  availablePipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  availableMembers: Member[];
  
  // Operações
  loadAvailablePipelines: () => Promise<void>;
  loadPipelineDetails: (pipelineId: string) => Promise<Pipeline | null>;
  loadAvailableMembers: () => Promise<void>;
  
  // Estado de carregamento
  isLoadingPipelines: boolean;
  isLoadingMembers: boolean;
}

export const usePipelineConnection = (tenantId: string): UsePipelineConnectionReturn => {
  const [availablePipelines, setAvailablePipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const loadAvailablePipelines = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoadingPipelines(true);
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          updated_at
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao carregar pipelines:', error);
        return;
      }

      const pipelines = data?.map(pipeline => ({
        ...pipeline,
        stages: [],
        fields: []
      })) || [];

      setAvailablePipelines(pipelines);
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
    } finally {
      setIsLoadingPipelines(false);
    }
  }, [tenantId]);

  const loadPipelineDetails = useCallback(async (pipelineId: string): Promise<Pipeline | null> => {
    if (!pipelineId) return null;
    
    try {
      // Buscar dados básicos do pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .single();

      if (pipelineError) {
        console.error('Erro ao carregar pipeline:', pipelineError);
        return null;
      }

      // Buscar stages do pipeline
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('order_index', { ascending: true });

      if (stagesError) {
        console.error('Erro ao carregar stages:', stagesError);
      }

      // Buscar campos customizados do pipeline
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('order_index', { ascending: true });

      if (fieldsError) {
        console.error('Erro ao carregar campos:', fieldsError);
      }

      const pipeline: Pipeline = {
        id: pipelineData.id,
        name: pipelineData.name,
        description: pipelineData.description,
        is_active: pipelineData.is_active,
        stages: stagesData?.map(stage => ({
          id: stage.id,
          name: stage.name,
          order_index: stage.order_index,
          is_default: stage.is_default,
          color: stage.color || '#3b82f6'
        })) || [],
        fields: fieldsData?.map(field => ({
          name: field.field_name,
          label: field.field_label,
          type: field.field_type,
          is_required: field.is_required,
          is_custom: true,
          options: field.field_options
        })) || []
      };

      setSelectedPipeline(pipeline);
      return pipeline;
    } catch (error) {
      console.error('Erro ao carregar detalhes do pipeline:', error);
      return null;
    }
  }, []);

  const loadAvailableMembers = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          is_active
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('role', ['admin', 'member'])
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Erro ao carregar membros:', error);
        return;
      }

      setAvailableMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [tenantId]);

  return {
    availablePipelines,
    selectedPipeline,
    availableMembers,
    loadAvailablePipelines,
    loadPipelineDetails,
    loadAvailableMembers,
    isLoadingPipelines,
    isLoadingMembers
  };
}; 