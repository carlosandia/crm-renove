import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface MCPData {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageValue: number;
  totalRevenue: number;
}

export const useMCP = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MCPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMCPData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Dados mock para demonstração
        const mockData: MCPData = {
          totalLeads: 150,
          convertedLeads: 45,
          conversionRate: 30,
          averageValue: 2500,
          totalRevenue: 112500
        };
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setData(mockData);
      } catch (err) {
        setError('Erro ao carregar dados MCP');
        console.error('Erro MCP:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadMCPData();
    }
  }, [user]);

  return { data, loading, error };
}; 