import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';

// ================================================================================
// COMPONENTES REFATORADOS - TAREFA 1
// ================================================================================
import { FieldManager, useFieldManager } from './managers/FieldManager';
// FormValidator removido - não relacionado ao CRM
import { NotificationSettings, useNotificationManager } from './notifications/NotificationSettings';
import { ScoringManager, useScoringManager } from './scoring/ScoringManager';
import { PipelineIntegration, usePipelineIntegration } from './pipeline/PipelineIntegration';

// ================================================================================
// TIPOS E HOOKS EXISTENTES
// ================================================================================
import { 
  FormField, ScoringRule, Pipeline, FieldMapping,
  NotificationSettings as NotificationSettingsType,
  EmailNotificationSettings as EmailNotificationSettingsType,
  ModernFormBuilderProps, PreviewMode, ActivePanel 
} from '../../types/Forms';
import { useAuth } from '../../hooks/useAuth';
import { useArrayState } from '../../hooks/useArrayState';
import { useAsyncState } from '../../hooks/useAsyncState';

// ================================================================================
// COMPONENTES LAZY E ÍCONES
// ================================================================================
const FormPreview = lazy(() => import('./rendering/FormPreview'));
import { 
  Type, Mail, Phone, FileText, Hash, Calendar, Clock, List, RadioIcon, 
  CheckSquare, Star, Upload, Sliders, Shield, DollarSign, Building, 
  MapPin, Flag, Globe, Send, MessageSquare,
  Eye, Smartphone, Tablet, Monitor, Save, ArrowLeft, Settings,
  Share, Target, Palette, Bell, Link, Copy
} from 'lucide-react';

// ================================================================================
// DEFINIÇÕES DE CONSTANTES
// ================================================================================
const FIELD_TYPES = [
  { type: 'text', label: 'Texto', icon: Type, description: 'Campo de texto simples', color: 'bg-blue-100 text-blue-600' },
  { type: 'email', label: 'E-mail', icon: Mail, description: 'Campo de e-mail', color: 'bg-green-100 text-green-600' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Campo de telefone', color: 'bg-purple-100 text-purple-600' },
  { type: 'textarea', label: 'Texto Longo', icon: FileText, description: 'Área de texto', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'number', label: 'Número', icon: Hash, description: 'Campo numérico', color: 'bg-indigo-100 text-indigo-600' },
  { type: 'date', label: 'Data', icon: Calendar, description: 'Seletor de data', color: 'bg-red-100 text-red-600' },
  { type: 'time', label: 'Hora', icon: Clock, description: 'Seletor de hora', color: 'bg-orange-100 text-orange-600' },
  { type: 'url', label: 'URL', icon: Globe, description: 'Campo de URL/Link', color: 'bg-cyan-100 text-cyan-600' },
  { type: 'currency', label: 'Moeda', icon: DollarSign, description: 'Campo monetário', color: 'bg-emerald-100 text-emerald-600' },
  { type: 'city', label: 'Cidade', icon: Building, description: 'Campo de cidade', color: 'bg-blue-100 text-blue-600' },
  { type: 'select', label: 'Lista Suspensa', icon: List, description: 'Menu dropdown', color: 'bg-pink-100 text-pink-600' },
  { type: 'radio', label: 'Múltipla Escolha', icon: RadioIcon, description: 'Botões de rádio', color: 'bg-violet-100 text-violet-600' },
  { type: 'checkbox', label: 'Caixas de Seleção', icon: CheckSquare, description: 'Múltiplas opções', color: 'bg-teal-100 text-teal-600' },
  { type: 'range', label: 'Slider', icon: Sliders, description: 'Controle deslizante', color: 'bg-amber-100 text-amber-600' },
  { type: 'rating', label: 'Avaliação', icon: Star, description: 'Sistema de estrelas', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'file', label: 'Upload de Arquivo', icon: Upload, description: 'Envio de arquivos', color: 'bg-gray-100 text-gray-600' },
  { type: 'submit', label: 'Botão Enviar', icon: Send, description: 'Botão de envio', color: 'bg-blue-100 text-blue-600' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Botão WhatsApp', color: 'bg-green-100 text-green-600' },
];

// ================================================================================
// COMPONENTE PRINCIPAL REFATORADO
// ================================================================================
const ModernFormBuilderRefactored: React.FC<ModernFormBuilderProps> = ({
  form,
  onSave,
  onCancel,
  tenantId
}) => {
  const { user } = useAuth();
  
  // ================================================================================
  // ESTADOS PRINCIPAIS
  // ================================================================================
  const [formData, setFormData] = useState({
    name: form?.name || '',
    description: form?.description || '',
    slug: form?.slug || '',
    is_active: form?.is_active ?? true,
  });

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [activePanel, setActivePanel] = useState<ActivePanel>('properties');

  // Estados para arrays usando useArrayState
  const fieldsState = useArrayState<FormField>([]);
  const scoringRulesState = useArrayState<ScoringRule>([]);
  const pipelinesState = useArrayState<Pipeline>([]);
  const fieldMappingsState = useArrayState<FieldMapping>([]);

  // Estados para async operations
  const saveState = useAsyncState();

  // Estados para configurações
  const [scoringThreshold, setScoringThreshold] = useState(70);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsType>({
    successMessage: 'Formulário enviado com sucesso!',
    errorMessage: 'Erro ao enviar formulário.',
    showNotifications: true,
    autoHide: true,
    hideDelay: 5000,
    successBackgroundColor: '#10b981',
    successTextColor: '#ffffff',
    errorBackgroundColor: '#ef4444',
    errorTextColor: '#ffffff'
  });

  const [emailSettings, setEmailSettings] = useState<EmailNotificationSettingsType>({
    enabled: false,
    recipients: [],
    subject: 'Novo lead do formulário: {form_name}',
    template: 'Novo lead captado...',
    sendOnSubmit: true,
    sendOnWhatsApp: false,
    includeLeadData: true,
    includeMQLScore: true
  });

  // ================================================================================
  // HOOKS DOS COMPONENTES REFATORADOS
  // ================================================================================
  const fieldManager = useFieldManager(fieldsState.items, fieldsState.replaceAll);
  
  // FormValidator removido temporariamente - validação simplificada
  const formValidator = {
    isFormValid: fieldsState.items.length > 0,
    validateForm: () => ({ isValid: true, errors: [] })
  };

  const notificationManager = useNotificationManager(
    notificationSettings,
    emailSettings,
    setNotificationSettings,
    setEmailSettings
  );

  const scoringManager = useScoringManager(
    scoringRulesState.items,
    scoringThreshold,
    fieldsState.items,
    scoringRulesState.replaceAll,
    setScoringThreshold
  );

  const pipelineIntegration = usePipelineIntegration(
    pipelinesState.items,
    selectedPipeline,
    fieldMappingsState.items,
    fieldsState.items,
    setSelectedPipeline,
    fieldMappingsState.replaceAll
  );

  // ================================================================================
  // HANDLERS PRINCIPAIS
  // ================================================================================
  const handleSave = useCallback(async () => {
    await saveState.execute(async () => {
      // Validar formulário
      const validation = formValidator.validateForm();
      if (!validation.isValid) {
        console.error(`Formulário inválido: ${validation.errors.join(', ')}`);
        return;
      }

      // Validar mapeamentos de pipeline se habilitado
      if (selectedPipeline) {
        const pipelineValidation = pipelineIntegration.validateMappings();
        if (!pipelineValidation.isValid) {
          console.error(`Mapeamento inválido: ${pipelineValidation.errors.join(', ')}`);
          return;
        }
      }

      // Preparar dados para salvar
      const formToSave = {
        ...formData,
        fields: fieldsState.items,
        scoring_rules: scoringRulesState.items,
        scoring_threshold: scoringThreshold,
        notification_settings: notificationSettings,
        email_settings: emailSettings,
        pipeline_connection: selectedPipeline ? {
          pipeline_id: selectedPipeline.id,
          field_mappings: fieldMappingsState.items
        } : null,
        tenant_id: tenantId
      };

      console.log('Salvando formulário:', formToSave);
      
      // Chamar callback de save
      await onSave(formToSave);
      
      console.log('Formulário salvo com sucesso!');
    });
  }, [
    formData, fieldsState.items, scoringRulesState.items, scoringThreshold,
    notificationSettings, emailSettings, selectedPipeline, fieldMappingsState.items,
    tenantId, onSave, formValidator, pipelineIntegration, notificationManager, saveState
  ]);

  const handleAddField = useCallback((fieldType: string) => {
    const newField = fieldManager.createDefaultField(fieldType);
    fieldManager.addField(newField);
    setSelectedField(newField);
  }, [fieldManager]);

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(fieldsState.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualizar order_index
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index
    }));

    fieldsState.replaceAll(updatedItems);
  }, [fieldsState]);

  const getPreviewWidth = useCallback(() => {
    switch (previewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-2xl';
      default: return 'max-w-4xl';
    }
  }, [previewMode]);

  // ================================================================================
  // RENDER DOS PAINÉIS
  // ================================================================================
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'properties':
        return (
          <FieldManager
            fields={fieldsState.items}
            selectedField={selectedField}
            onFieldsChange={fieldsState.replaceAll}
            onSelectedFieldChange={setSelectedField}
          />
        );

      case 'scoring':
        return (
          <ScoringManager
            scoringRules={scoringRulesState.items}
            scoringThreshold={scoringThreshold}
            fields={fieldsState.items}
            onScoringRulesChange={scoringRulesState.replaceAll}
            onScoringThresholdChange={setScoringThreshold}
          />
        );

      case 'notifications':
        return (
          <NotificationSettings
            notificationSettings={notificationSettings}
            emailSettings={emailSettings}
            onNotificationSettingsChange={setNotificationSettings}
            onEmailSettingsChange={setEmailSettings}
          />
        );

      case 'pipeline':
        return (
          <PipelineIntegration
            availablePipelines={pipelinesState.items}
            selectedPipeline={selectedPipeline}
            fieldMappings={fieldMappingsState.items}
            formFields={fieldsState.items}
            onPipelineSelect={setSelectedPipeline}
            onFieldMappingsChange={fieldMappingsState.replaceAll}
          />
        );

      default:
        return (
          <div className="p-6 text-center text-gray-500">
            Selecione um painel para configurar
          </div>
        );
    }
  };

  // ================================================================================
  // RENDER PRINCIPAL
  // ================================================================================
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Esquerda - Tipos de Campo */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tipos de Campo</h2>
          <p className="text-sm text-gray-500">Arraste para adicionar ao formulário</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {FIELD_TYPES.map((fieldType) => {
            const IconComponent = fieldType.icon;
            return (
              <div
                key={fieldType.type}
                className={`p-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all ${fieldType.color}`}
                onClick={() => handleAddField(fieldType.type)}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-5 h-5" />
                  <div>
                    <div className="font-medium text-sm">{fieldType.label}</div>
                    <div className="text-xs opacity-75">{fieldType.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Área Central - Preview do Formulário */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onCancel}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              
              <div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold bg-transparent border-none outline-none"
                  placeholder="Nome do formulário"
                />
                <div className="text-sm text-gray-500">
                  {fieldsState.items.length} campo(s) • Score máximo: {scoringManager.calculateMaxScore()}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Preview Mode Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('tablet')}
                  className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saveState.loading || !formValidator.isFormValid}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Save className="w-4 h-4" />
                <span>{saveState.loading ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className={`mx-auto ${getPreviewWidth()}`}>
            <div>
              <Suspense fallback={<div>Carregando preview...</div>}>
                <FormPreview
                  fields={fieldsState.items}
                  previewMode={previewMode}
                  onFieldSelect={setSelectedField}
                  selectedField={selectedField}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Direita - Configurações */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            {[
              { id: 'properties', label: 'Campos', icon: Settings },
              { id: 'scoring', label: 'Score', icon: Target },
              { id: 'notifications', label: 'Notificações', icon: Bell },
              { id: 'pipeline', label: 'Pipeline', icon: Link },
              { id: 'style', label: 'Estilo', icon: Palette },
              { id: 'share', label: 'Compartilhar', icon: Share },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id as ActivePanel)}
                  className={`flex items-center space-x-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                    activePanel === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {renderActivePanel()}
        </div>

        {/* Validação Footer - Removido temporariamente */}
        <div className="border-t border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            {fieldsState.items.length} campo(s) configurado(s)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernFormBuilderRefactored; 