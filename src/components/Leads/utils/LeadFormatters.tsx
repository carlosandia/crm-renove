import { useCallback } from 'react';

// ============================================
// HOOK DE FORMATADORES
// ============================================

export const useLeadFormatters = () => {
  
  // ============================================
  // FORMATADOR DE DATA
  // ============================================
  
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // ============================================
  // FORMATADOR DE MOEDA
  // ============================================
  
  const formatCurrency = useCallback((value?: number) => {
    if (!value) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  // ============================================
  // FORMATADOR DE CORES DE TEMPERATURA
  // ============================================

  const getTemperatureColor = useCallback((temperature?: string) => {
    switch (temperature?.toLowerCase()) {
      case 'hot':
      case 'quente':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warm':
      case 'morno':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold':
      case 'frio':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  // ============================================
  // FORMATADOR DE CORES DE STATUS
  // ============================================

  const getStatusColor = useCallback((status?: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'novo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'contacted':
      case 'contatado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'qualified':
      case 'qualificado':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'converted':
      case 'convertido':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'lost':
      case 'perdido':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  // ============================================
  // FORMATADOR DE CORES DE STATUS DE OPORTUNIDADE
  // ============================================

  const getOpportunityStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'won':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'lost':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'active':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }, []);

  // ============================================
  // FORMATADOR DE TEXTO DE STATUS DE OPORTUNIDADE
  // ============================================

  const getOpportunityStatusText = useCallback((status: string) => {
    switch (status) {
      case 'won':
        return 'Venda Realizada';
      case 'lost':
        return 'Venda Perdida';
      case 'active':
      default:
        return 'Em Andamento';
    }
  }, []);

  // ============================================
  // FORMATADOR DE NOME COMPLETO
  // ============================================

  const formatFullName = useCallback((firstName?: string, lastName?: string) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    return fullName || 'Nome não informado';
  }, []);

  // ============================================
  // FORMATADOR DE TEMPERATURA EM TEXTO
  // ============================================

  const getTemperatureText = useCallback((temperature?: string) => {
    switch (temperature?.toLowerCase()) {
      case 'hot':
        return 'Quente';
      case 'warm':
        return 'Morno';
      case 'cold':
        return 'Frio';
      default:
        return 'Não definido';
    }
  }, []);

  // ============================================
  // FORMATADOR DE STATUS EM TEXTO
  // ============================================

  const getStatusText = useCallback((status?: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'Novo';
      case 'contacted':
        return 'Contatado';
      case 'qualified':
        return 'Qualificado';
      case 'converted':
        return 'Convertido';
      case 'lost':
        return 'Perdido';
      default:
        return 'Não definido';
    }
  }, []);

  // ============================================
  // FORMATADOR DE TELEFONE
  // ============================================

  const formatPhone = useCallback((phone?: string) => {
    if (!phone) return 'Não informado';
    
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Formata telefone brasileiro
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone; // Retorna original se não conseguir formatar
  }, []);

  // ============================================
  // FORMATADOR DE EMAIL
  // ============================================

  const formatEmail = useCallback((email?: string) => {
    if (!email) return 'Não informado';
    return email.toLowerCase().trim();
  }, []);

  // ============================================
  // FORMATADOR DE PORCENTAGEM
  // ============================================

  const formatPercentage = useCallback((value?: number) => {
    if (!value && value !== 0) return 'Não informado';
    return `${value}%`;
  }, []);

  // ============================================
  // VALIDADOR DE EMAIL
  // ============================================

  const isValidEmail = useCallback((email?: string) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // ============================================
  // FORMATADOR DE URL
  // ============================================

  const formatUrl = useCallback((url?: string) => {
    if (!url) return 'Não informado';
    
    // Adiciona https:// se não tiver protocolo
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    
    return url;
  }, []);

  // ============================================
  // FORMATADOR DE TEXTO TRUNCADO
  // ============================================

  const truncateText = useCallback((text?: string, maxLength: number = 50) => {
    if (!text) return 'Não informado';
    
    if (text.length <= maxLength) return text;
    
    return `${text.substring(0, maxLength)}...`;
  }, []);

  // ============================================
  // RETURN DO HOOK
  // ============================================

  return {
    // Formatadores principais
    formatDate,
    formatCurrency,
    formatFullName,
    formatPhone,
    formatEmail,
    formatPercentage,
    formatUrl,
    truncateText,
    
    // Formatadores de cor
    getTemperatureColor,
    getStatusColor,
    getOpportunityStatusColor,
    
    // Formatadores de texto
    getTemperatureText,
    getStatusText,
    getOpportunityStatusText,
    
    // Validadores
    isValidEmail
  };
};

// ============================================
// COMPONENTE DE EXEMPLO (OPCIONAL)
// ============================================

export const LeadFormattersExample = () => {
  const formatters = useLeadFormatters();
  
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Exemplos de Formatadores</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <strong>Data:</strong> {formatters.formatDate(new Date().toISOString())}
        </div>
        
        <div>
          <strong>Moeda:</strong> {formatters.formatCurrency(1234.56)}
        </div>
        
        <div>
          <strong>Nome:</strong> {formatters.formatFullName('João', 'Silva')}
        </div>
        
        <div>
          <strong>Telefone:</strong> {formatters.formatPhone('11987654321')}
        </div>
        
        <div className="flex items-center gap-2">
          <strong>Temperatura:</strong>
          <span className={`px-2 py-1 rounded text-xs ${formatters.getTemperatureColor('hot')}`}>
            {formatters.getTemperatureText('hot')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <strong>Status:</strong>
          <span className={`px-2 py-1 rounded text-xs ${formatters.getStatusColor('qualified')}`}>
            {formatters.getStatusText('qualified')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default useLeadFormatters;
