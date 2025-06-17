import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export const useMembers = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar membros
  const loadMembers = useCallback(async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar todos os usuários do tenant
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('tenant_id', user.tenant_id)
        .in('role', ['admin', 'member', 'super_admin'])
        .order('first_name', { ascending: true });

      if (usersError) {
        throw usersError;
      }

      setMembers(usersData || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar membros');
      console.error('Erro ao carregar membros:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  // Filtrar membros disponíveis (não vinculados a uma pipeline específica)
  const getAvailableMembers = useCallback((excludeMembers: string[] = []): User[] => {
    return members.filter(member => !excludeMembers.includes(member.id));
  }, [members]);

  // Carregar membros ao montar o hook
  useEffect(() => {
    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member' || user.role === 'super_admin')) {
      loadMembers();
    }
  }, [user?.tenant_id, user?.role, loadMembers]);

  return {
    members,
    loading,
    error,
    loadMembers,
    getAvailableMembers,
  };
}; 