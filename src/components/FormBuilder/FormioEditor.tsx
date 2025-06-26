import React, { useState, useRef } from 'react';
import { Save, Eye, Settings, Zap, Plus, Edit, Trash2, X, FileText, Mail, Phone, MessageSquare, Hash, Calendar, List } from 'lucide-react';

interface FormComponent {
  id: string;
  type: 'textfield' | 'email' | 'phone' | 'textarea' | 'number' | 'select' | 'checkbox' | 'button';
  label: string;
  key: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface FormSchema {
  type: string;
  display: string;
  components: FormComponent[];
  title: string;
}

interface FormioEditorProps {
  form: any;
  onSave: (formioSchema: any) => void;
  onPreview: () => void;
  tenantId: string;
}

const COMPONENT_TYPES = [
  { type: 'textfield', label: 'Texto', icon: FileText },
  { type: 'email', label: 'E-mail', icon: Mail },
  { type: 'phone', label: 'Telefone', icon: Phone },
  { type: 'textarea', label: 'Área de Texto', icon: MessageSquare },
  { type: 'number', label: 'Número', icon: Hash },
  { type: 'select', label: 'Lista', icon: List },
  { type: 'checkbox', label: 'Checkbox', icon: FileText },
  { type: 'button', label: 'Botão', icon: FileText },
];

const FormioEditor: React.FC<FormioEditorProps> = ({ form, onSave, onPreview, tenantId }) => {
  const [formSchema, setFormSchema] = useState<FormSchema>(() => {
    if (form?.formio_schema?.components) {
      return form.formio_schema;
    }
    return {
      type: 'form',
      display: 'form',
      components: [],
      title: form?.name || 'Novo Formulário'
    };
  });

  const [selectedComponent, setSelectedComponent] = useState<FormComponent | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMQLEditor, setShowMQLEditor] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addComponent = (type: string) => {
    const newComponent: FormComponent = {
      id: generateId(),
      type: type as any,
      label: `${COMPONENT_TYPES.find(t => t.type === type)?.label || 'Campo'}`,
      key: `field_${Date.now()}`,
      placeholder: `Digite ${COMPONENT_TYPES.find(t => t.type === type)?.label?.toLowerCase()}...`,
      required: false,
      options: type === 'select' ? ['Opção 1', 'Opção 2'] : undefined,
      validation: {}
    };

    setFormSchema((prev: FormSchema) => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
  };

  const updateComponent = (id: string, updates: Partial<FormComponent>) => {
    setFormSchema((prev: FormSchema) => ({
      ...prev,
      components: prev.components.map((comp: FormComponent) => 
        comp.id === id ? { ...comp, ...updates } : comp
      )
    }));
  };

  const removeComponent = (id: string) => {
    setFormSchema((prev: FormSchema) => ({
      ...prev,
      components: prev.components.filter((comp: FormComponent) => comp.id !== id)
    }));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Salvando schema:', formSchema);
      await onSave(formSchema);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderComponentIcon = (type: string) => {
    const componentType = COMPONENT_TYPES.find(t => t.type === type);
    const IconComponent = componentType?.icon || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Settings className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Construtor de Formulários
            </h3>
            <p className="text-sm text-gray-600">
              Arraste e solte componentes para criar seu formulário
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowMQLEditor(!showMQLEditor)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
              showMQLEditor 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            <Zap size={16} />
            <span>MQL Scoring</span>
          </button>
          
          <button
            onClick={onPreview}
            className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 shadow-sm"
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-200 shadow-lg"
          >
            <Save size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar de Componentes */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Componentes</h4>
          <div className="space-y-2">
            {COMPONENT_TYPES.map((component) => (
              <button
                key={component.type}
                onClick={() => addComponent(component.type)}
                className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-all duration-200 group"
              >
                <component.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                <span className="text-sm text-gray-700 group-hover:text-blue-700">{component.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Principal */}
        <div className="flex-1 flex flex-col p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1">
            <div className="mb-4">
              <h5 className="text-lg font-semibold text-gray-900 mb-2">
                {formSchema.title || 'Formulário'}
              </h5>
              <p className="text-sm text-gray-600">
                {formSchema.components.length} componentes adicionados
              </p>
            </div>

            {/* Lista de Componentes */}
            <div className="space-y-3">
              {formSchema.components.map((component: FormComponent, index: number) => (
                <div
                  key={component.id}
                  className={`border border-gray-200 rounded-lg p-4 transition-all duration-200 ${
                    selectedComponent?.id === component.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedComponent(component)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {renderComponentIcon(component.type)}
                      </div>
                      <div>
                        <h6 className="font-medium text-gray-900">{component.label}</h6>
                        <p className="text-xs text-gray-500">{component.type}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComponent(component);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeComponent(component.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Preview do Campo */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    {component.type === 'textfield' && (
                      <input
                        type="text"
                        placeholder={component.placeholder}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        disabled
                      />
                    )}
                    {component.type === 'email' && (
                      <input
                        type="email"
                        placeholder={component.placeholder}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        disabled
                      />
                    )}
                    {component.type === 'textarea' && (
                      <textarea
                        placeholder={component.placeholder}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        rows={3}
                        disabled
                      />
                    )}
                    {component.type === 'select' && (
                      <select className="w-full p-2 border border-gray-300 rounded-lg text-sm" disabled>
                        <option>Selecione uma opção</option>
                        {component.options?.map((option: string, idx: number) => (
                          <option key={idx}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}

              {formSchema.components.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Nenhum componente adicionado</p>
                  <p className="text-sm">Clique nos componentes da sidebar para começar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel de Propriedades */}
        {selectedComponent && (
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Propriedades</h4>
              <button
                onClick={() => setSelectedComponent(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedComponent.label}
                  onChange={(e) => updateComponent(selectedComponent.id, { label: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={selectedComponent.placeholder || ''}
                  onChange={(e) => updateComponent(selectedComponent.id, { placeholder: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedComponent.required || false}
                    onChange={(e) => updateComponent(selectedComponent.id, { required: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Campo obrigatório</span>
                </label>
              </div>

              {selectedComponent.type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opções
                  </label>
                  <div className="space-y-2">
                    {selectedComponent.options?.map((option: string, index: number) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(selectedComponent.options || [])];
                            newOptions[index] = e.target.value;
                            updateComponent(selectedComponent.id, { options: newOptions });
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => {
                            const newOptions = selectedComponent.options?.filter((_, i) => i !== index);
                            updateComponent(selectedComponent.id, { options: newOptions });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOptions = [...(selectedComponent.options || []), 'Nova opção'];
                        updateComponent(selectedComponent.id, { options: newOptions });
                      }}
                      className="w-full p-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400"
                    >
                      + Adicionar opção
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormioEditor;
