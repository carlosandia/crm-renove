import React, { useState, useCallback, useEffect } from 'react';
import { 
  Mail,
  MessageCircle,
  Phone,
  FileText,
  Calendar,
  Users,
  Settings,
  Check,
  X,
  AlertCircle,
  Clock,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface ChannelTemplate {
  id?: string;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  template_name: string;
  template_content: string;
  variables: string[];
  is_active: boolean;
  created_at?: string;
}

export interface ChannelSettings {
  id?: string;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  is_enabled: boolean;
  working_hours: {
    start: string;
    end: string;
    days: number[];
  };
  rate_limit: {
    max_per_hour: number;
    max_per_day: number;
  };
  retry_config: {
    max_retries: number;
    retry_delay: number;
  };
  integration_config: Record<string, any>;
}

export interface ChannelConfigProps {
  templates: ChannelTemplate[];
  settings: ChannelSettings[];
  onTemplatesChange: (templates: ChannelTemplate[]) => void;
  onSettingsChange: (settings: ChannelSettings[]) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

// ============================================
// CONFIGURAÇÕES DE CANAIS
// ============================================

export const CHANNEL_DEFINITIONS = {
  email: {
    name: 'E-mail',
    icon: Mail,
    color: 'blue',
    description: 'Envio de emails personalizados',
    variables: ['{{nome}}', '{{empresa}}', '{{email}}', '{{telefone}}', '{{data_hoje}}'],
    settings: {
      max_per_hour: 50,
      max_per_day: 200,
      working_hours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] }
    }
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'green',
    description: 'Mensagens via WhatsApp Business',
    variables: ['{{nome}}', '{{empresa}}', '{{telefone}}', '{{data_hoje}}'],
    settings: {
      max_per_hour: 30,
      max_per_day: 100,
      working_hours: { start: '08:00', end: '20:00', days: [1, 2, 3, 4, 5, 6] }
    }
  },
  ligacao: {
    name: 'Ligação',
    icon: Phone,
    color: 'purple',
    description: 'Agendamento de ligações',
    variables: ['{{nome}}', '{{empresa}}', '{{telefone}}', '{{horario_preferido}}'],
    settings: {
      max_per_hour: 10,
      max_per_day: 40,
      working_hours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }
    }
  },
  sms: {
    name: 'SMS',
    icon: MessageCircle,
    color: 'yellow',
    description: 'Mensagens de texto',
    variables: ['{{nome}}', '{{empresa}}', '{{telefone}}'],
    settings: {
      max_per_hour: 20,
      max_per_day: 80,
      working_hours: { start: '08:00', end: '21:00', days: [1, 2, 3, 4, 5, 6] }
    }
  },
  tarefa: {
    name: 'Tarefa',
    icon: FileText,
    color: 'red',
    description: 'Criação de tarefas internas',
    variables: ['{{nome}}', '{{empresa}}', '{{vendedor}}', '{{prazo}}'],
    settings: {
      max_per_hour: 100,
      max_per_day: 500,
      working_hours: { start: '00:00', end: '23:59', days: [1, 2, 3, 4, 5, 6, 7] }
    }
  },
  visita: {
    name: 'Visita',
    icon: Users,
    color: 'indigo',
    description: 'Agendamento de visitas presenciais',
    variables: ['{{nome}}', '{{empresa}}', '{{endereco}}', '{{data_visita}}'],
    settings: {
      max_per_hour: 5,
      max_per_day: 20,
      working_hours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }
    }
  }
};

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' }
];

// ============================================
// HOOK PERSONALIZADO
// ============================================

export const useChannelConfig = ({ 
  templates, 
  settings, 
  onTemplatesChange, 
  onSettingsChange, 
  onError, 
  onSuccess 
}: ChannelConfigProps) => {
  
  // Estados de modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChannelTemplate | null>(null);
  const [editingSettings, setEditingSettings] = useState<ChannelSettings | null>(null);

  // Estados de formulário
  const [templateForm, setTemplateForm] = useState<ChannelTemplate>({
    channel: 'email',
    action_type: 'mensagem',
    template_name: '',
    template_content: '',
    variables: [],
    is_active: true
  });

  const [settingsForm, setSettingsForm] = useState<ChannelSettings>({
    channel: 'email',
    is_enabled: true,
    working_hours: {
      start: '09:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5]
    },
    rate_limit: {
      max_per_hour: 50,
      max_per_day: 200
    },
    retry_config: {
      max_retries: 3,
      retry_delay: 300
    },
    integration_config: {}
  });

  // ============================================
  // FUNÇÕES DE TEMPLATE
  // ============================================

  const openTemplateModal = useCallback((template?: ChannelTemplate) => {
    if (template) {
      setTemplateForm(template);
      setEditingTemplate(template);
    } else {
      setTemplateForm({
        channel: 'email',
        action_type: 'mensagem',
        template_name: '',
        template_content: '',
        variables: [],
        is_active: true
      });
      setEditingTemplate(null);
    }
    setShowTemplateModal(true);
  }, []);

  const closeTemplateModal = useCallback(() => {
    setShowTemplateModal(false);
    setEditingTemplate(null);
  }, []);

  const saveTemplate = useCallback(() => {
    if (!templateForm.template_name.trim() || !templateForm.template_content.trim()) {
      onError?.('Nome e conteúdo do template são obrigatórios');
      return;
    }

    const updatedTemplates = [...templates];
    
    if (editingTemplate) {
      const index = templates.findIndex(t => t.id === editingTemplate.id);
      if (index !== -1) {
        updatedTemplates[index] = templateForm;
      }
    } else {
      updatedTemplates.push({
        ...templateForm,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      });
    }

    onTemplatesChange(updatedTemplates);
    onSuccess?.(`Template ${editingTemplate ? 'atualizado' : 'criado'} com sucesso`);
    closeTemplateModal();
  }, [templateForm, templates, editingTemplate, onTemplatesChange, onSuccess, onError, closeTemplateModal]);

  const deleteTemplate = useCallback((templateId: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      onTemplatesChange(updatedTemplates);
      onSuccess?.('Template excluído com sucesso');
    }
  }, [templates, onTemplatesChange, onSuccess]);

  // ============================================
  // FUNÇÕES DE CONFIGURAÇÕES
  // ============================================

  const openSettingsModal = useCallback((channelType: string) => {
    const existingSettings = settings.find(s => s.channel === channelType);
    const defaultSettings = CHANNEL_DEFINITIONS[channelType as keyof typeof CHANNEL_DEFINITIONS]?.settings;
    
    if (existingSettings) {
      setSettingsForm(existingSettings);
      setEditingSettings(existingSettings);
    } else {
      setSettingsForm({
        channel: channelType as any,
        is_enabled: true,
        working_hours: defaultSettings?.working_hours || {
          start: '09:00',
          end: '18:00',
          days: [1, 2, 3, 4, 5]
        },
        rate_limit: {
          max_per_hour: defaultSettings?.max_per_hour || 50,
          max_per_day: defaultSettings?.max_per_day || 200
        },
        retry_config: {
          max_retries: 3,
          retry_delay: 300
        },
        integration_config: {}
      });
      setEditingSettings(null);
    }
    setShowSettingsModal(true);
  }, [settings]);

  const closeSettingsModal = useCallback(() => {
    setShowSettingsModal(false);
    setEditingSettings(null);
  }, []);

  const saveSettings = useCallback(() => {
    const updatedSettings = [...settings];
    
    if (editingSettings) {
      const index = settings.findIndex(s => s.id === editingSettings.id);
      if (index !== -1) {
        updatedSettings[index] = settingsForm;
      }
    } else {
      updatedSettings.push({
        ...settingsForm,
        id: Date.now().toString()
      });
    }

    onSettingsChange(updatedSettings);
    onSuccess?.('Configurações salvas com sucesso');
    closeSettingsModal();
  }, [settingsForm, settings, editingSettings, onSettingsChange, onSuccess, closeSettingsModal]);

  // ============================================
  // FUNÇÕES UTILITÁRIAS
  // ============================================

  const getChannelStats = useCallback(() => {
    const channelStats = Object.keys(CHANNEL_DEFINITIONS).map(channel => {
      const channelTemplates = templates.filter(t => t.channel === channel);
      const channelSettings = settings.find(s => s.channel === channel);
      
      return {
        channel,
        definition: CHANNEL_DEFINITIONS[channel as keyof typeof CHANNEL_DEFINITIONS],
        templatesCount: channelTemplates.length,
        activeTemplates: channelTemplates.filter(t => t.is_active).length,
        isEnabled: channelSettings?.is_enabled ?? false,
        hasSettings: !!channelSettings
      };
    });

    return channelStats;
  }, [templates, settings]);

  const validateTemplate = useCallback((template: ChannelTemplate): string[] => {
    const errors: string[] = [];
    
    if (!template.template_name.trim()) {
      errors.push('Nome do template é obrigatório');
    }
    
    if (!template.template_content.trim()) {
      errors.push('Conteúdo do template é obrigatório');
    }
    
    if (template.template_content.length > 1000) {
      errors.push('Conteúdo do template deve ter no máximo 1000 caracteres');
    }
    
    return errors;
  }, []);

  const insertVariable = useCallback((variable: string) => {
    const channelDef = CHANNEL_DEFINITIONS[templateForm.channel as keyof typeof CHANNEL_DEFINITIONS];
    if (channelDef?.variables.includes(variable)) {
      setTemplateForm(prev => ({
        ...prev,
        template_content: prev.template_content + variable
      }));
    }
  }, [templateForm.channel]);

  return {
    // Estados
    showTemplateModal,
    showSettingsModal,
    editingTemplate,
    editingSettings,
    templateForm,
    settingsForm,
    
    // Setters
    setTemplateForm,
    setSettingsForm,
    
    // Funções de Template
    openTemplateModal,
    closeTemplateModal,
    saveTemplate,
    deleteTemplate,
    
    // Funções de Settings
    openSettingsModal,
    closeSettingsModal,
    saveSettings,
    
    // Utilitárias
    getChannelStats,
    validateTemplate,
    insertVariable
  };
};

// ============================================
// COMPONENTE WRAPPER
// ============================================

export const ChannelConfig: React.FC<ChannelConfigProps> = (props) => {
  const {
    showTemplateModal,
    showSettingsModal,
    editingTemplate,
    templateForm,
    settingsForm,
    setTemplateForm,
    setSettingsForm,
    openTemplateModal,
    closeTemplateModal,
    saveTemplate,
    deleteTemplate,
    openSettingsModal,
    closeSettingsModal,
    saveSettings,
    getChannelStats,
    insertVariable
  } = useChannelConfig(props);

  const channelStats = getChannelStats();

  return (
    <div className="space-y-6">
      {/* Visão Geral dos Canais */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Configuração de Canais
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channelStats.map(stat => {
            const IconComponent = stat.definition.icon;
            return (
              <div key={stat.channel} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg bg-${stat.definition.color}-100`}>
                      <IconComponent className={`w-4 h-4 text-${stat.definition.color}-600`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{stat.definition.name}</h4>
                      <p className="text-xs text-gray-500">{stat.definition.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {stat.isEnabled ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-900">{stat.templatesCount}</div>
                    <div className="text-xs text-gray-500">Templates</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-900">{stat.activeTemplates}</div>
                    <div className="text-xs text-gray-500">Ativos</div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => openTemplateModal()}
                    className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Templates
                  </button>
                  <button
                    onClick={() => openSettingsModal(stat.channel)}
                    className="flex-1 text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Templates Existentes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Templates Configurados</h3>
          <button
            onClick={() => openTemplateModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Novo Template
          </button>
        </div>
        
        {props.templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Nenhum template configurado ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {props.templates.map(template => {
              const channelDef = CHANNEL_DEFINITIONS[template.channel as keyof typeof CHANNEL_DEFINITIONS];
              const IconComponent = channelDef.icon;
              
              return (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{template.template_name}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openTemplateModal(template)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{channelDef.name} • {template.action_type}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{template.template_content}</p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Template */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Canal *
                    </label>
                    <select
                      value={templateForm.channel}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, channel: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(CHANNEL_DEFINITIONS).map(([key, def]) => (
                        <option key={key} value={key}>{def.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Ação *
                    </label>
                    <select
                      value={templateForm.action_type}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, action_type: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mensagem">Mensagem</option>
                      <option value="email_followup">Follow-up Email</option>
                      <option value="ligacao">Ligação</option>
                      <option value="tarefa">Tarefa</option>
                      <option value="agendamento">Agendamento</option>
                      <option value="proposta">Proposta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Template *
                  </label>
                  <input
                    type="text"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, template_name: e.target.value }))}
                    placeholder="Ex: Email de boas-vindas"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Conteúdo do Template *
                    </label>
                    <div className="flex space-x-1">
                      {CHANNEL_DEFINITIONS[templateForm.channel as keyof typeof CHANNEL_DEFINITIONS]?.variables.map(variable => (
                        <button
                          key={variable}
                          onClick={() => insertVariable(variable)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          {variable}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={templateForm.template_content}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, template_content: e.target.value }))}
                    placeholder="Digite o conteúdo do template..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    rows={6}
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={templateForm.is_active}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Template ativo</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeTemplateModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Configurações de {CHANNEL_DEFINITIONS[settingsForm.channel as keyof typeof CHANNEL_DEFINITIONS]?.name}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settingsForm.is_enabled}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, is_enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Canal habilitado</span>
                  </label>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Horário Comercial</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Início</label>
                      <input
                        type="time"
                        value={settingsForm.working_hours.start}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          working_hours: { ...prev.working_hours, start: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fim</label>
                      <input
                        type="time"
                        value={settingsForm.working_hours.end}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          working_hours: { ...prev.working_hours, end: e.target.value }
                        }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <label key={day.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settingsForm.working_hours.days.includes(day.value)}
                          onChange={(e) => {
                            const days = e.target.checked
                              ? [...settingsForm.working_hours.days, day.value]
                              : settingsForm.working_hours.days.filter(d => d !== day.value);
                            setSettingsForm(prev => ({
                              ...prev,
                              working_hours: { ...prev.working_hours, days }
                            }));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-1"
                        />
                        <span className="text-xs text-gray-700">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Limites de Envio</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Por Hora</label>
                      <input
                        type="number"
                        min="1"
                        value={settingsForm.rate_limit.max_per_hour}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          rate_limit: { ...prev.rate_limit, max_per_hour: parseInt(e.target.value) || 1 }
                        }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Por Dia</label>
                      <input
                        type="number"
                        min="1"
                        value={settingsForm.rate_limit.max_per_day}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          rate_limit: { ...prev.rate_limit, max_per_day: parseInt(e.target.value) || 1 }
                        }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Configurações de Retry</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Tentativas</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settingsForm.retry_config.max_retries}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          retry_config: { ...prev.retry_config, max_retries: parseInt(e.target.value) || 1 }
                        }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Delay (segundos)</label>
                      <input
                        type="number"
                        min="60"
                        value={settingsForm.retry_config.retry_delay}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          retry_config: { ...prev.retry_config, retry_delay: parseInt(e.target.value) || 60 }
                        }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeSettingsModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelConfig;
