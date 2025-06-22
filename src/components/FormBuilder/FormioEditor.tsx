
import React, { useEffect, useRef, useState } from 'react';
import { FormBuilder } from '@formio/react';
import { Save, Eye, Settings, Zap } from 'lucide-react';

interface FormioEditorProps {
  form: any;
  onSave: (formioSchema: any) => void;
  onPreview: () => void;
  tenantId: string;
}

const FormioEditor: React.FC<FormioEditorProps> = ({ form, onSave, onPreview, tenantId }) => {
  const [formSchema, setFormSchema] = useState(form?.formio_schema || {
    type: 'form',
    display: 'form',
    components: []
  });
  const [saving, setSaving] = useState(false);
  const [showMQLEditor, setShowMQLEditor] = useState(false);

  // Configurações otimizadas do Form.io Builder
  const builderOptions = {
    builder: {
      basic: {
        title: 'Campos Básicos',
        default: true,
        weight: 0,
        components: {
          textfield: true,
          textarea: true,
          number: true,
          password: true,
          checkbox: true,
          selectboxes: true,
          select: true,
          radio: true,
          email: true,
          url: true,
          phoneNumber: true,
          tags: true,
          address: true
        }
      },
      advanced: {
        title: 'Campos Avançados',
        weight: 10,
        components: {
          datetime: true,
          day: true,
          time: true,
          currency: true,
          survey: true,
          signature: true,
          file: true,
          container: true,
          datamap: true,
          datagrid: true,
          editgrid: true,
          tree: true
        }
      },
      layout: {
        title: 'Layout',
        weight: 20,
        components: {
          htmlelement: true,
          content: true,
          columns: true,
          fieldset: true,
          panel: true,
          table: true,
          tabs: true,
          well: true
        }
      },
      data: {
        title: 'Data',
        weight: 30,
        components: {
          hidden: true,
          container: true,
          datamap: true,
          datagrid: true,
          editgrid: true
        }
      }
    },
    editForm: {
      textfield: [
        {
          key: 'display',
          components: [
            {
              key: 'label',
              ignore: false
            },
            {
              key: 'placeholder',
              ignore: false
            },
            {
              key: 'description',
              ignore: false
            },
            {
              key: 'tooltip',
              ignore: false
            }
          ]
        },
        {
          key: 'validation',
          components: [
            {
              key: 'required',
              ignore: false
            },
            {
              key: 'minLength',
              ignore: false
            },
            {
              key: 'maxLength',
              ignore: false
            }
          ]
        }
      ]
    }
  };

  const handleFormChange = (newSchema: any) => {
    console.log('Form schema changed:', newSchema);
    setFormSchema(newSchema);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving form schema:', formSchema);
      await onSave(formSchema);
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };

  // Aplicar estilos customizados quando o componente monta
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .formio-builder-wrapper {
        height: 100%;
        background: #f8fafc;
      }
      
      .formio-builder {
        height: 100% !important;
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      }
      
      .formio-builder .formbuilder {
        height: 100% !important;
        display: flex;
        background: white;
      }
      
      .formio-builder .formcomponents {
        background: #f8fafc !important;
        border-right: 1px solid #e2e8f0 !important;
        width: 280px !important;
        min-width: 280px !important;
        max-width: 280px !important;
        padding: 16px !important;
        overflow-y: auto;
      }
      
      .formio-builder .formcomponents .form-builder-group {
        margin-bottom: 20px !important;
      }
      
      .formio-builder .formcomponents .form-builder-group-header {
        background: #3b82f6 !important;
        color: white !important;
        padding: 8px 12px !important;
        border-radius: 8px 8px 0 0 !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        text-transform: none !important;
        border: none !important;
      }
      
      .formio-builder .formcomponents .formcomponent {
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 6px !important;
        padding: 12px !important;
        margin: 4px 0 !important;
        cursor: grab !important;
        transition: all 0.2s ease !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        color: #374151 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      
      .formio-builder .formcomponents .formcomponent:hover {
        border-color: #3b82f6 !important;
        background: #eff6ff !important;
        transform: translateX(2px) !important;
        box-shadow: 0 2px 4px rgb(0 0 0 / 0.1) !important;
      }
      
      .formio-builder .formcomponents .formcomponent:active {
        cursor: grabbing !important;
        transform: rotate(2deg) !important;
      }
      
      .formio-builder .formarea {
        flex: 1 !important;
        background: white !important;
        padding: 24px !important;
        position: relative !important;
      }
      
      .formio-builder .drag-container {
        min-height: 500px !important;
        background: #fafbfc !important;
        border: 2px dashed #cbd5e1 !important;
        border-radius: 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #64748b !important;
        font-size: 16px !important;
        font-weight: 500 !important;
        position: relative !important;
        transition: all 0.3s ease !important;
      }
      
      .formio-builder .drag-container.drag-over {
        border-color: #3b82f6 !important;
        background: #eff6ff !important;
        color: #1d4ed8 !important;
        transform: scale(1.02) !important;
      }
      
      .formio-builder .drag-container::before {
        content: "🎯" !important;
        font-size: 32px !important;
        margin-bottom: 12px !important;
        display: block !important;
      }
      
      .formio-builder .formio-component {
        margin: 16px 0 !important;
        padding: 16px !important;
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        position: relative !important;
        transition: all 0.2s ease !important;
      }
      
      .formio-builder .formio-component:hover {
        border-color: #3b82f6 !important;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
      }
      
      .formio-builder .formio-component .form-group label {
        font-weight: 600 !important;
        color: #374151 !important;
        margin-bottom: 6px !important;
        font-size: 14px !important;
      }
      
      .formio-builder .formio-component input,
      .formio-builder .formio-component textarea,
      .formio-builder .formio-component select {
        width: 100% !important;
        padding: 10px 12px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        transition: all 0.2s ease !important;
        background: white !important;
      }
      
      .formio-builder .formio-component input:focus,
      .formio-builder .formio-component textarea:focus,
      .formio-builder .formio-component select:focus {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1) !important;
      }
      
      .formio-builder .component-settings {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        display: flex !important;
        gap: 4px !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease !important;
      }
      
      .formio-builder .formio-component:hover .component-settings {
        opacity: 1 !important;
      }
      
      .formio-builder .component-settings button {
        background: #f3f4f6 !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 6px !important;
        cursor: pointer !important;
        transition: background 0.2s ease !important;
      }
      
      .formio-builder .component-settings button:hover {
        background: #e5e7eb !important;
      }
      
      .formio-builder .btn {
        padding: 8px 16px !important;
        border-radius: 6px !important;
        font-weight: 500 !important;
        font-size: 14px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        border: none !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      
      .formio-builder .btn-primary {
        background: #3b82f6 !important;
        color: white !important;
      }
      
      .formio-builder .btn-primary:hover {
        background: #2563eb !important;
        transform: translateY(-1px) !important;
      }
      
      .formio-builder .btn-success {
        background: #10b981 !important;
        color: white !important;
      }
      
      .formio-builder .btn-success:hover {
        background: #059669 !important;
      }
      
      /* Scrollbar customization */
      .formio-builder .formcomponents::-webkit-scrollbar {
        width: 6px;
      }
      
      .formio-builder .formcomponents::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }
      
      .formio-builder .formcomponents::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      .formio-builder .formcomponents::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      /* Responsive adjustments */
      @media (max-width: 1024px) {
        .formio-builder .formcomponents {
          width: 240px !important;
          min-width: 240px !important;
          max-width: 240px !important;
        }
      }
      
      @media (max-width: 768px) {
        .formio-builder .formbuilder {
          flex-direction: column !important;
        }
        
        .formio-builder .formcomponents {
          width: 100% !important;
          min-width: auto !important;
          max-width: none !important;
          height: 200px !important;
          border-right: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar Superior */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Settings className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Editor de Formulário Avançado
            </h3>
            <p className="text-sm text-gray-500">
              Arraste e solte componentes para criar seu formulário
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowMQLEditor(!showMQLEditor)}
            className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              showMQLEditor 
                ? 'bg-purple-600 text-white' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            <Zap size={16} />
            <span>MQL Scoring</span>
          </button>
          
          <button
            onClick={onPreview}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Editor Principal */}
        <div className={`${showMQLEditor ? 'w-3/4' : 'w-full'} transition-all duration-300 p-4`}>
          <div className="h-full formio-builder-wrapper">
            <FormBuilder
              form={formSchema}
              options={builderOptions}
              onChange={handleFormChange}
            />
          </div>
        </div>

        {/* Painel MQL Scoring */}
        {showMQLEditor && (
          <div className="w-1/4 bg-white border-l border-gray-200 p-4 shadow-sm">
            <div className="sticky top-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="text-white" size={16} />
                </div>
                <h4 className="text-md font-semibold text-gray-900">
                  Sistema de Pontuação MQL
                </h4>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Threshold de Qualificação
                  </h5>
                  <input
                    type="number"
                    placeholder="70"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pontos mínimos para ser considerado MQL
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Regras Ativas
                  </h5>
                  <div className="text-xs text-blue-700">
                    Configure a pontuação editando os campos no formulário
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <h5 className="text-sm font-medium text-green-800 mb-2">
                    Dicas de Pontuação
                  </h5>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Campos básicos: 5-15 pontos</li>
                    <li>• Cargo/Empresa: 20-30 pontos</li>
                    <li>• Orçamento: 25-40 pontos</li>
                    <li>• Urgência: 15-25 pontos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormioEditor;
