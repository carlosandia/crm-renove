import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const useMembers = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:5001/api';

  // Carregar membros
  const loadMembers = useCallback(async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar todos os usuários do tenant (admin e member)
      const response = await fetch(`${API_BASE}/users?tenant_id=${user.tenant_id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar membros');
      }

      const data = await response.json();
      setMembers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao carregar membros:', err);
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
    if (user?.tenant_id && (user.role === 'admin' || user.role === 'member')) {
      loadMembers();
    }
  }, [user?.tenant_id, user?.role]);

  return {
    members,
    loading,
    error,
    loadMembers,
    getAvailableMembers,
  };
}; 