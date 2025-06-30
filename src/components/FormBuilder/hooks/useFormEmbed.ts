import { useState, useCallback } from 'react';

interface EmbedConfig {
  formId: string;
  formType: string;
  domain: string;
  security: {
    domainRestriction: boolean;
    allowedDomains: string[];
    httpsOnly: boolean;
  };
  customization: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    borderRadius: string;
    animation: boolean;
  };
  behavior: {
    autoLoad: boolean;
    lazyLoad: boolean;
    closeOnSuccess: boolean;
    showPoweredBy: boolean;
  };
  tracking: {
    analytics: boolean;
    gtag: string;
    fbPixel: string;
  };
  version: string;
}

interface EmbedStats {
  views: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
}

export function useFormEmbed(formId: string) {
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EmbedStats | null>(null);

  const generateEmbedCode = useCallback((config: EmbedConfig) => {
    const configJson = JSON.stringify(config, null, 2);
    
    return `<!-- Form CRM Embed Code -->
<div id="crm-form-${formId}" data-form-id="${formId}"></div>
<script>
  window.crmFormConfig = ${configJson};
  (function() {
    var script = document.createElement('script');
    script.src = '${config.domain}/form-embed.js?v=${config.version}';
    script.async = true;
    script.onload = function() {
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.init('${formId}', window.crmFormConfig);
      }
    };
    document.head.appendChild(script);
  })();
</script>`;
  }, [formId]);

  const generateReactCode = useCallback((config: EmbedConfig) => {
    return `import { useEffect } from 'react';

export function CRMFormEmbed() {
  useEffect(() => {
    const config = ${JSON.stringify(config, null, 4)};
    
    const script = document.createElement('script');
    script.src = '${config.domain}/form-embed.js?v=${config.version}';
    script.async = true;
    script.onload = () => {
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.init('${formId}', config);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (window.CRMFormEmbed) {
        window.CRMFormEmbed.destroy('${formId}');
      }
    };
  }, []);

  return <div id="crm-form-${formId}" data-form-id="${formId}" />;
}`;
  }, [formId]);

  const saveEmbedConfig = useCallback(async (config: EmbedConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simular salvamento da configuração
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEmbedConfig(config);
      return true;
    } catch (err) {
      setError('Erro ao salvar configuração de embed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadEmbedConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simular carregamento da configuração
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockConfig: EmbedConfig = {
        formId,
        formType: 'standard',
        domain: window.location.origin,
        security: {
          domainRestriction: false,
          allowedDomains: [],
          httpsOnly: true,
        },
        customization: {
          theme: 'auto',
          primaryColor: '#3b82f6',
          borderRadius: '8px',
          animation: true,
        },
        behavior: {
          autoLoad: true,
          lazyLoad: false,
          closeOnSuccess: true,
          showPoweredBy: true,
        },
        tracking: {
          analytics: false,
          gtag: '',
          fbPixel: '',
        },
        version: '1.0.0',
      };

      setEmbedConfig(mockConfig);
      return mockConfig;
    } catch (err) {
      setError('Erro ao carregar configuração de embed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formId]);

  const getEmbedStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simular carregamento das estatísticas
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockStats: EmbedStats = {
        views: 2847,
        conversions: 423,
        conversionRate: 14.9,
        bounceRate: 32.4,
      };

      setStats(mockStats);
      return mockStats;
    } catch (err) {
      setError('Erro ao carregar estatísticas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateDomain = useCallback((domain: string): boolean => {
    try {
      new URL(domain);
      return true;
    } catch {
      return false;
    }
  }, []);

  const validateConfig = useCallback((config: Partial<EmbedConfig>): string[] => {
    const errors: string[] = [];

    if (!config.formType) {
      errors.push('Tipo de formulário é obrigatório');
    }

    if (!config.domain || !validateDomain(config.domain)) {
      errors.push('Domínio inválido');
    }

    if (config.customization?.primaryColor && !/^#[0-9A-F]{6}$/i.test(config.customization.primaryColor)) {
      errors.push('Cor primária deve estar no formato hexadecimal');
    }

    if (config.security?.domainRestriction && (!config.security.allowedDomains || config.security.allowedDomains.length === 0)) {
      errors.push('Pelo menos um domínio deve ser permitido quando a restrição está ativa');
    }

    return errors;
  }, [validateDomain]);

  const testEmbedCode = useCallback(async (config: EmbedConfig): Promise<boolean> => {
    try {
      // Simular teste do código de embed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular verificação de conectividade
      const response = await fetch(`${config.domain}/api/forms/${formId}/ping`, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      return true;
    } catch (err) {
      return false;
    }
  }, [formId]);

  const resetConfig = useCallback(() => {
    setEmbedConfig(null);
    setStats(null);
    setError(null);
  }, []);

  return {
    // Estado
    embedConfig,
    isLoading,
    error,
    stats,

    // Ações
    generateEmbedCode,
    generateReactCode,
    saveEmbedConfig,
    loadEmbedConfig,
    getEmbedStats,
    validateConfig,
    testEmbedCode,
    resetConfig,

    // Utilitários
    validateDomain,
  };
} 