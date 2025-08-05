import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

/**
 * Hook para validar se um email já existe na base de leads_master
 * Utilizado para prevenção de duplicatas e validação inteligente
 */
export const useLeadByEmail = (email: string, debounceMs: number = 500) => {
  const { user } = useAuth();

  // Função para validar formato de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return useQuery({
    queryKey: ['lead-by-email', email, user?.tenant_id],
    queryFn: async () => {
      if (!email || !isValidEmail(email) || !user?.tenant_id) {
        return null;
      }

      console.log('🔍 [useLeadByEmail] Verificando email:', email);

      const { data, error } = await supabase
        .from('leads_master')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          company,
          created_at
        `)
        .eq('email', email.toLowerCase().trim())
        .eq('tenant_id', user.tenant_id)
        .maybeSingle(); // maybeSingle permite retornar null se não encontrar

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [useLeadByEmail] Erro ao buscar lead:', error);
        throw error;
      }

      if (data) {
        console.log('✅ [useLeadByEmail] Lead existente encontrado:', {
          id: data.id.substring(0, 8),
          name: `${data.first_name} ${data.last_name}`,
          email: data.email
        });
      } else {
        console.log('🆕 [useLeadByEmail] Email disponível para novo lead');
      }

      return data;
    },
    enabled: !!(email && isValidEmail(email) && user?.tenant_id && email.length > 5),
    staleTime: 30000, // Cache por 30 segundos
    gcTime: 60000, // Manter em cache por 1 minuto
    retry: 1, // Tentar apenas 1 vez em caso de erro
    refetchOnWindowFocus: false,
    // Implementar debounce manual via queryKey
    meta: {
      debounceMs
    }
  });
};

/**
 * Hook com debounce integrado para validação durante digitação
 */
export const useDebouncedLeadByEmail = (email: string, debounceMs: number = 500) => {
  const [debouncedEmail, setDebouncedEmail] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(email);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [email, debounceMs]);

  return useLeadByEmail(debouncedEmail, 0); // Sem debounce adicional pois já foi aplicado
};

// Função auxiliar para validação de email (export para uso em outros componentes)
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};