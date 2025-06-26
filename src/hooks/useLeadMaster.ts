import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_source?: string;
  lead_temperature?: string;
  status?: string;
  estimated_value?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface UseLeadMasterReturn {
  leadMaster: LeadMaster | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook para buscar um único lead master
export const useLeadMaster = (leadMasterId: string | null): UseLeadMasterReturn => {
  const [leadMaster, setLeadMaster] = useState<LeadMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadMaster = useCallback(async () => {
    if (!leadMasterId) {
      setLeadMaster(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('leads_master')
        .select('*')
        .eq('id', leadMasterId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setLeadMaster(data);
    } catch (err: any) {
      console.warn('⚠️ [useLeadMaster] Erro ao buscar lead:', err.message);
      setError(err.message);
      setLeadMaster(null);
    } finally {
      setLoading(false);
    }
  }, [leadMasterId]);

  const refetch = useCallback(async () => {
    await fetchLeadMaster();
  }, [fetchLeadMaster]);

  // Buscar dados quando leadMasterId muda
  useEffect(() => {
    fetchLeadMaster();
  }, [fetchLeadMaster]);

  // ✅ SINCRONIZAÇÃO REATIVA: Escutar mudanças no lead_master
  useEffect(() => {
    if (!leadMasterId) return;

    const handleLeadDataUpdated = (event: CustomEvent) => {
      const { leadMasterId: updatedLeadId } = event.detail;
      
      // Se o lead atualizado é o que estamos observando, refetch
      if (updatedLeadId === leadMasterId) {
        console.log('🔄 [useLeadMaster] Lead atualizado detectado, fazendo refetch:', leadMasterId);
        refetch();
      }
    };

    window.addEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);

    return () => {
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
    };
  }, [leadMasterId, refetch]);

  return {
    leadMaster,
    loading,
    error,
    refetch
  };
};

// Hook para buscar múltiplos leads master (otimização para pipelines com muitos leads)
export const useMultipleLeadMasters = (leadMasterIds: string[]): {
  leadsData: Record<string, LeadMaster>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} => {
  const [leadsData, setLeadsData] = useState<Record<string, LeadMaster>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMultipleLeads = useCallback(async () => {
    if (!leadMasterIds.length) {
      setLeadsData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('leads_master')
        .select('*')
        .in('id', leadMasterIds);

      if (fetchError) {
        throw fetchError;
      }

      // Converter array para objeto indexado por ID
      const indexedData = (data || []).reduce((acc, lead) => {
        acc[lead.id] = lead;
        return acc;
      }, {} as Record<string, LeadMaster>);

      setLeadsData(indexedData);
    } catch (err: any) {
      console.warn('⚠️ [useMultipleLeadMasters] Erro ao buscar leads:', err.message);
      setError(err.message);
      setLeadsData({});
    } finally {
      setLoading(false);
    }
  }, [leadMasterIds.join(',')]); // Dependency array baseada nos IDs

  const refetch = useCallback(async () => {
    await fetchMultipleLeads();
  }, [fetchMultipleLeads]);

  // Buscar dados quando IDs mudam
  useEffect(() => {
    fetchMultipleLeads();
  }, [fetchMultipleLeads]);

  // ✅ SINCRONIZAÇÃO REATIVA: Escutar mudanças em qualquer lead_master
  useEffect(() => {
    if (!leadMasterIds.length) return;

    const handleLeadDataUpdated = (event: CustomEvent) => {
      const { leadMasterId: updatedLeadId } = event.detail;
      
      // Se o lead atualizado está na nossa lista, refetch
      if (leadMasterIds.includes(updatedLeadId)) {
        console.log('🔄 [useMultipleLeadMasters] Lead atualizado detectado, fazendo refetch:', updatedLeadId);
        refetch();
      }
    };

    window.addEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);

    return () => {
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
    };
  }, [leadMasterIds.join(','), refetch]);

  return {
    leadsData,
    loading,
    error,
    refetch
  };
}; 