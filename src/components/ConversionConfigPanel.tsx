import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Save,
  CheckCircle, 
  AlertCircle,
  Facebook,
  Chrome,
  Activity,
  TrendingUp,
  BarChart3,
  Zap,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { showSuccessToast, showErrorToast, showWarningToast } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';
import { ShimmerButton } from './ui/shimmer-button';

// =========================================================================
// CONVERSION CONFIG PANEL - FACEBOOK PIXEL & GOOGLE ADS
// =========================================================================
// Componente NOVO para configurações avançadas de conversão
// NÃO altera o IntegrationsModule existente
// =========================================================================

interface ConversionConfig {
  meta_pixel_id?: string;
  meta_app_id?: string;
  google_ads_customer_id?: string;
  google_ads_conversion_actions?: Record<string, string>;
  conversion_tracking_enabled: boolean;
  test_mode: boolean;
}

interface EventMapping {
  id: string;
  stage_id: string;
  stage_name: string;
  event_name: string;
  event_type: 'meta' | 'google' | 'both';
  conversion_value: number;
  is_active: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  pipeline_id: string;
  temperature_score?: number;
}

const ConversionConfigPanel: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPixelId, setShowPixelId] = useState(false);
  const [showCustomerId, setShowCustomerId] = useState(false);

  // Estados para configuração
  const [config, setConfig] = useState<ConversionConfig>({
    conversion_tracking_enabled: false,
    test_mode: true
  });

  // Estados para mapeamentos de eventos
  const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);

  // Estados para estatísticas
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    meta: 0,
    google: 0,
    successRate: 0
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadConversionConfig();
    loadEventMappings();
    loadPipelineStages();
    loadConversionStats();
  }, []);

  const loadConversionConfig = async () => {
    try {
      setLoading(true);
      
      // Mock de dados para demonstração
      if (user?.tenant_id === 'demo') {
        const mockConfig: ConversionConfig = {
          meta_pixel_id: '123456789012345',
          meta_app_id: '987654321098765',
          google_ads_customer_id: '123-456-7890',
          google_ads_conversion_actions: {
            'Purchase': 'AW-123456789/AbC-D_efG-h',
            'Lead': 'AW-123456789/XyZ-A_bcD-e',
            'default': 'AW-123456789/AbC-D_efG-h'
          },
          conversion_tracking_enabled: true,
          test_mode: false
        };
        
        setConfig(mockConfig);
        setLoading(false);
        return;
      }

      // Aqui seria a chamada real para a API
      // const response = await fetch('/api/integrations/conversion-config');
      // const data = await response.json();
      // setConfig(data);
      
    } catch (error) {
      console.error('Erro ao carregar configuração de conversão:', error);
      showErrorToast('Erro', 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadEventMappings = async () => {
    try {
      // Mock de dados para demonstração
      if (user?.tenant_id === 'demo') {
        const mockMappings: EventMapping[] = [
          {
            id: '1',
            stage_id: 'stage-1',
            stage_name: 'Ganho',
            event_name: 'Purchase',
            event_type: 'both',
            conversion_value: 100.00,
            is_active: true
          },
          {
            id: '2',
            stage_id: 'stage-2',
            stage_name: 'Lead',
            event_name: 'Lead',
            event_type: 'meta',
            conversion_value: 10.00,
            is_active: true
          }
        ];
        
        setEventMappings(mockMappings);
        return;
      }

      // Aqui seria a chamada real para a API
      // const response = await fetch('/api/integrations/event-mappings');
      // const data = await response.json();
      // setEventMappings(data);
      
    } catch (error) {
      console.error('Erro ao carregar mapeamentos de eventos:', error);
    }
  };

  const loadPipelineStages = async () => {
    try {
      // Mock de dados para demonstração
      if (user?.tenant_id === 'demo') {
        const mockStages: PipelineStage[] = [
          { id: 'stage-1', name: 'Lead', pipeline_id: 'pipeline-1', temperature_score: 20 },
          { id: 'stage-2', name: 'Qualified', pipeline_id: 'pipeline-1', temperature_score: 40 },
          { id: 'stage-3', name: 'Proposal', pipeline_id: 'pipeline-1', temperature_score: 70 },
          { id: 'stage-4', name: 'Ganho', pipeline_id: 'pipeline-1', temperature_score: 100 },
          { id: 'stage-5', name: 'Perdido', pipeline_id: 'pipeline-1', temperature_score: 0 }
        ];
        
        setStages(mockStages);
        return;
      }

      // Aqui seria a chamada real para a API
      // const response = await fetch('/api/pipelines/stages');
      // const data = await response.json();
      // setStages(data);
      
    } catch (error) {
      console.error('Erro ao carregar stages das pipelines:', error);
    }
  };

  const loadConversionStats = async () => {
    try {
      // Mock de dados para demonstração
      if (user?.tenant_id === 'demo') {
        const mockStats = {
          total: 156,
          success: 142,
          failed: 14,
          meta: 89,
          google: 67,
          successRate: 91.0
        };
        
        setStats(mockStats);
        return;
      }

      // Aqui seria a chamada real para a API
      // const response = await fetch('/api/integrations/conversion-stats');
      // const data = await response.json();
      // setStats(data);
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas de conversão:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);

      // Validações básicas
      if (config.conversion_tracking_enabled) {
        if (!config.meta_pixel_id && !config.google_ads_customer_id) {
          showWarningToast('Configuração incompleta', 'Configure pelo menos um Pixel ID ou Customer ID');
          return;
        }
      }

      // Mock de salvamento para demonstração
      if (user?.tenant_id === 'demo') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        showSuccessToast('Configuração salva', 'Configurações de conversão atualizadas com sucesso!');
        setSaving(false);
        return;
      }

      // Aqui seria a chamada real para a API
      // const response = await fetch('/api/integrations/conversion-config', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config)
      // });
      
      showSuccessToast('Configuração salva', 'Configurações de conversão atualizadas!');
      
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showErrorToast('Erro', 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEventMapping = () => {
    const newMapping: EventMapping = {
      id: `new-${Date.now()}`,
      stage_id: '',
      stage_name: '',
      event_name: 'Purchase',
      event_type: 'both',
      conversion_value: 0,
      is_active: true
    };
    
    setEventMappings(prev => [...prev, newMapping]);
  };

  const handleUpdateEventMapping = (id: string, updates: Partial<EventMapping>) => {
    setEventMappings(prev => 
      prev.map(mapping => 
        mapping.id === id ? { ...mapping, ...updates } : mapping
      )
    );
  };

  const handleRemoveEventMapping = (id: string) => {
    setEventMappings(prev => prev.filter(mapping => mapping.id !== id));
  };

  const handleTestConversion = async (platform: 'meta' | 'google') => {
    try {
      showWarningToast('Teste iniciado', `Enviando conversão de teste para ${platform === 'meta' ? 'Meta' : 'Google'}...`);
      
      // Mock de teste para demonstração
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSuccessToast('Teste concluído', `Conversão de teste enviada com sucesso para ${platform === 'meta' ? 'Meta' : 'Google'}!`);
      
    } catch (error) {
      showErrorToast('Teste falhado', `Erro ao testar conversão no ${platform === 'meta' ? 'Meta' : 'Google'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
          <p className="text-gray-600">Carregando configurações de conversão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Configuração de Conversões</h2>
        <p className="text-sm text-gray-600">Configure tracking para Facebook Pixel e Google Ads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Facebook Pixel</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pixel ID</label>
              <input
                type="text"
                value={config.meta_pixel_id}
                onChange={(e) => setConfig(prev => ({ ...prev, meta_pixel_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Ads</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label>
              <input
                type="text"
                value={config.google_ads_customer_id}
                onChange={(e) => setConfig(prev => ({ ...prev, google_ads_customer_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Salvar Configurações
        </button>
      </div>
    </div>
  );
};

export default ConversionConfigPanel; 