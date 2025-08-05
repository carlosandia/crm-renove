import React, { useState, useCallback } from 'react';
import { 
  Settings,
  Globe,
  Shield,
  BarChart3,
  Calendar,
  Mail,
  Building
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { BlurFade } from './ui/blur-fade';
import { useStatePersistence, MODULE_PERSISTENCE_CONFIGS } from '../lib/statePersistence';

// Importar componentes especializados
import { 
  useMetaAdsIntegration, 
  MetaAdsIntegrationRender
} from './Integrations/providers/MetaAdsIntegration';
import { 
  useGoogleAdsIntegration, 
  GoogleAdsIntegrationRender 
} from './Integrations/providers/GoogleAdsIntegration';
import { 
  useWebhookConfiguration, 
  WebhookConfigurationRender 
} from './Integrations/webhook/WebhookConfiguration';
import { 
  useSecurityMetrics, 
  SecurityMetricsRender 
} from './Integrations/security/SecurityMetrics';
import { 
  useConversionsManager, 
  ConversionsManagerRender 
} from './Integrations/conversions/ConversionsManager';

// Componentes existentes reutilizados
import ConversionsPanel from './Conversions/ConversionsPanel';
import ConversionConfigPanel from './ConversionConfigPanel';
import GoogleCalendarSetup from './GoogleCalendarSetup';
import EmailPersonalTab from './Integrations/EmailPersonalTab';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

type TabType = 'config' | 'conversions' | 'conversion-config' | 'security' | 'logs' | 'calendar' | 'email' | 'company';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'config',
    label: 'Configurações',
    icon: Settings,
    description: 'Meta Ads, Google Ads e Webhooks'
  },
  {
    id: 'conversions',
    label: 'Conversões',
    icon: BarChart3,
    description: 'Painel de conversões'
  },
  {
    id: 'conversion-config',
    label: 'Config. Conversões',
    icon: Globe,
    description: 'Configurar metas de conversão'
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: Shield,
    description: 'Métricas e alertas'
  },
  {
    id: 'calendar',
    label: 'Calendário',
    icon: Calendar,
    description: 'Google Calendar'
  },
  {
    id: 'email',
    label: 'E-mail',
    icon: Mail,
    description: 'Configurações de e-mail'
  }
];

const IntegrationsModuleRefactored: React.FC = () => {
  const { user } = useAuth();
  
  // Estado com persistência
  const { state: persistedState, updateState: updatePersistedState } = useStatePersistence(
    MODULE_PERSISTENCE_CONFIGS.INTEGRATIONS_MODULE
  );
  
  const [activeTab, setActiveTab] = useState<TabType>(persistedState.activeTab || 'config');

  // Hooks especializados
  const metaAdsManager = useMetaAdsIntegration();
  const googleAdsManager = useGoogleAdsIntegration();
  const webhookManager = useWebhookConfiguration();
  const securityManager = useSecurityMetrics();
  const conversionsManager = useConversionsManager();
  
  // Hook Google Calendar existente
  const googleCalendarHook = useGoogleCalendar();

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    updatePersistedState({ activeTab: tab });
  }, [updatePersistedState]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'config':
        return (
          <div className="space-y-8">
            <MetaAdsIntegrationRender />
            <GoogleAdsIntegrationRender googleAdsManager={googleAdsManager} />
            <WebhookConfigurationRender webhookManager={webhookManager} />
          </div>
        );

      case 'conversions':
        return <ConversionsPanel />;

      case 'conversion-config':
        return (
          <div className="space-y-8">
            <ConversionConfigPanel />
            <ConversionsManagerRender conversionsManager={conversionsManager} />
          </div>
        );

      case 'security':
        return <SecurityMetricsRender securityManager={securityManager} />;

      case 'calendar':
        return (
          <GoogleCalendarSetup 
            onCredentialsChange={() => {}}
            onConnect={() => {}}
            isConnecting={googleCalendarHook.isConnecting}
            hasIntegration={googleCalendarHook.hasIntegration}
          />
        );

      case 'email':
        return <EmailPersonalTab />;

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Selecione uma aba para começar</p>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <BlurFade delay={0.1} inView>
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">
            Configure e gerencie suas integrações de marketing e vendas
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <div className="border-b">
          <nav className="flex space-x-8 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    transition-colors duration-200
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </BlurFade>

      <BlurFade delay={0.3} inView>
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </BlurFade>
    </div>
  );
};

export default IntegrationsModuleRefactored; 