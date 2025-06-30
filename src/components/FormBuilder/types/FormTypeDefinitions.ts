import React from 'react';
import { 
  FileText, 
  AlertTriangle, 
  MousePointer, 
  Clock, 
  List, 
  Calendar, 
  Repeat, 
  MessageCircle 
} from 'lucide-react';

export interface FormTypeConfig {
  displayType: 'inline' | 'popup' | 'slide-in' | 'fullscreen';
  trigger?: 'immediate' | 'exit_intent' | 'scroll' | 'time_delay' | 'button_click';
  
  // INTEGRAÇÃO COM SISTEMAS EXISTENTES
  pipelineIntegration: {
    auto_assign_pipeline: string;
    default_stage: string;
    lead_temperature: 'hot' | 'warm' | 'cold';
    auto_assign_member: boolean; // Usar sistema de rodízio
  };
  
  cadenceIntegration: {
    auto_start_cadence: boolean;
    cadence_id: string;
    delay_hours: number;
  };
  
  calendarIntegration: {
    enable_scheduling: boolean;
    calendar_provider: 'google' | 'outlook';
    available_slots: 'business_hours' | 'custom';
    auto_confirm: boolean;
  };
  
  // MULTI-TENANT E PERMISSÕES
  tenant_restrictions?: {
    is_premium: boolean;
    required_plan: 'basic' | 'pro' | 'enterprise';
    requires_integration: string[];
  };
  
  // CONFIGURAÇÕES ESPECÍFICAS POR TIPO
  exitIntent?: {
    sensitivity: number;
    delay: number;
    maxShows: number;
    cookieExpiry: number;
  };
  
  scrollTrigger?: {
    triggerPercentage: number;
    direction: 'up' | 'down';
    onlyOnce: boolean;
  };
  
  timeDelay?: {
    delay: number;
    showOnlyOnce: boolean;
    respectUserActivity: boolean;
  };
  
  multiStep?: {
    showProgress: boolean;
    allowBackNavigation: boolean;
    saveProgress: boolean;
  };
  
  // ANALYTICS E TRACKING
  analytics: {
    track_views: boolean;
    track_interactions: boolean;
    track_conversions: boolean;
    conversion_goals: string[];
  };
  
  // LGPD/GDPR
  privacy: {
    gdpr_compliant: boolean;
    cookie_consent_required: boolean;
    data_retention_days: number;
    privacy_policy_url: string;
  };
}

export interface FormType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  category: 'standard' | 'conversion' | 'advanced' | 'enterprise';
  config: FormTypeConfig;
  preview_image?: string;
  demo_url?: string;
  documentation_url?: string;
}

export const FORM_TYPES: FormType[] = [
  // CATEGORIA STANDARD
  {
    id: 'standard',
    name: 'Formulário Padrão',
    description: 'Formulário tradicional para embedding em páginas',
    icon: FileText,
    category: 'standard',
    config: { 
      displayType: 'inline',
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'warm',
        auto_assign_member: true
      },
      cadenceIntegration: {
        auto_start_cadence: false,
        cadence_id: '',
        delay_hours: 24
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['email_capture']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: false,
        data_retention_days: 365,
        privacy_policy_url: ''
      }
    }
  },
  
  // CATEGORIA CONVERSION
  {
    id: 'exit_intent',
    name: 'Exit-Intent Popup',
    description: 'Aparece quando usuário tenta sair da página',
    icon: AlertTriangle,
    category: 'conversion',
    config: { 
      displayType: 'popup',
      trigger: 'exit_intent',
      exitIntent: {
        sensitivity: 5,
        delay: 500,
        maxShows: 3,
        cookieExpiry: 7
      },
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'hot',
        auto_assign_member: true
      },
      cadenceIntegration: {
        auto_start_cadence: true,
        cadence_id: '',
        delay_hours: 2
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['email_capture', 'phone_capture']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: true,
        data_retention_days: 365,
        privacy_policy_url: ''
      }
    }
  },
  
  {
    id: 'scroll_trigger',
    name: 'Scroll-Triggered',
    description: 'Aparece ao rolar X% da página',
    icon: MousePointer,
    category: 'conversion',
    config: {
      displayType: 'popup',
      trigger: 'scroll',
      scrollTrigger: {
        triggerPercentage: 50,
        direction: 'down',
        onlyOnce: true
      },
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'warm',
        auto_assign_member: true
      },
      cadenceIntegration: {
        auto_start_cadence: false,
        cadence_id: '',
        delay_hours: 24
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['email_capture']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: false,
        data_retention_days: 365,
        privacy_policy_url: ''
      }
    }
  },
  
  {
    id: 'time_delayed',
    name: 'Time-Delayed',
    description: 'Aparece após X segundos na página',
    icon: Clock,
    category: 'conversion',
    config: {
      displayType: 'popup',
      trigger: 'time_delay',
      timeDelay: {
        delay: 30,
        showOnlyOnce: true,
        respectUserActivity: true
      },
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'warm',
        auto_assign_member: true
      },
      cadenceIntegration: {
        auto_start_cadence: false,
        cadence_id: '',
        delay_hours: 24
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['email_capture']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: false,
        data_retention_days: 365,
        privacy_policy_url: ''
      }
    }
  },
  
  // CATEGORIA ADVANCED
  {
    id: 'multi_step',
    name: 'Multi-Step Form',
    description: 'Formulário dividido em etapas com progress bar',
    icon: List,
    category: 'advanced',
    config: {
      displayType: 'inline',
      multiStep: {
        showProgress: true,
        allowBackNavigation: true,
        saveProgress: true
      },
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'warm',
        auto_assign_member: true
      },
      cadenceIntegration: {
        auto_start_cadence: false,
        cadence_id: '',
        delay_hours: 24
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['form_completion', 'step_completion']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: false,
        data_retention_days: 365,
        privacy_policy_url: ''
      }
    }
  },
  
  // CATEGORIA ENTERPRISE
  {
    id: 'smart_scheduling',
    name: 'Smart Scheduling',
    description: 'Formulário integrado com agendamento inteligente',
    icon: Calendar,
    category: 'enterprise',
    config: {
      displayType: 'inline',
      calendarIntegration: {
        enable_scheduling: true,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'hot',
        auto_assign_member: false
      },
      cadenceIntegration: {
        auto_start_cadence: false,
        cadence_id: '',
        delay_hours: 24
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['meeting_scheduled', 'contact_info']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: true,
        data_retention_days: 730,
        privacy_policy_url: ''
      }
    }
  },
  
  {
    id: 'cadence_trigger',
    name: 'Cadence Trigger',
    description: 'Inicia cadência automática de follow-up',
    icon: Repeat,
    category: 'enterprise',
    config: {
      displayType: 'inline',
      cadenceIntegration: {
        auto_start_cadence: true,
        cadence_id: '',
        delay_hours: 1
      },
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'warm',
        auto_assign_member: true
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['cadence_enrollment', 'email_capture']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: false,
        data_retention_days: 365,
        privacy_policy_url: ''
      },
      tenant_restrictions: {
        is_premium: true,
        required_plan: 'pro',
        requires_integration: ['cadence_system']
      }
    }
  },
  
  {
    id: 'whatsapp_integration',
    name: 'WhatsApp Integration',
    description: 'Formulário com botão direto para WhatsApp',
    icon: MessageCircle,
    category: 'enterprise',
    config: {
      displayType: 'inline',
      pipelineIntegration: {
        auto_assign_pipeline: 'default',
        default_stage: 'lead',
        lead_temperature: 'hot',
        auto_assign_member: true
      },
      cadenceIntegration: {
        auto_start_cadence: false,
        cadence_id: '',
        delay_hours: 24
      },
      calendarIntegration: {
        enable_scheduling: false,
        calendar_provider: 'google',
        available_slots: 'business_hours',
        auto_confirm: false
      },
      analytics: {
        track_views: true,
        track_interactions: true,
        track_conversions: true,
        conversion_goals: ['whatsapp_click', 'contact_info']
      },
      privacy: {
        gdpr_compliant: true,
        cookie_consent_required: false,
        data_retention_days: 365,
        privacy_policy_url: ''
      },
      tenant_restrictions: {
        is_premium: true,
        required_plan: 'enterprise',
        requires_integration: ['whatsapp_api']
      }
    }
  }
]; 