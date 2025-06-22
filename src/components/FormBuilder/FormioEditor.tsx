
import React, { useEffect, useRef, useState } from 'react';
import { FormBuilder } from '@formio/react';
import { Save, Eye, Settings, Zap, AlertCircle } from 'lucide-react';
import FormBuilderWrapper from './FormBuilderWrapper';

// Declaração de tipos para Form.io
declare global {
  interface Window {
    Formio?: any;
  }
}

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
  const [builderReady, setBuilderReady] = useState(false);

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

  useEffect(() => {
    // Verificar se o Form.io está carregado
    const checkFormioReady = () => {
      if (typeof window !== 'undefined' && window.Formio) {
        setBuilderReady(true);
      } else {
        setTimeout(checkFormioReady, 100);
      }
    };
    checkFormioReady();
  }, []);

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

  return (
    <FormBuilderWrapper>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Toolbar Superior Premium */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Form.io Builder
              </h3>
              <p className="text-sm text-gray-600">
                Construa formulários profissionais com drag & drop
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!builderReady && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
                <AlertCircle size={16} />
                <span className="text-sm">Carregando Form.io...</span>
              </div>
            )}
            
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
          {/* Editor Principal Maximizado */}
          <div className={`${showMQLEditor ? 'w-3/4' : 'w-full'} transition-all duration-300 p-6`}>
            <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {builderReady ? (
                <FormBuilder
                  form={formSchema}
                  options={builderOptions}
                  onChange={handleFormChange}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando Form.io Builder...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Painel MQL Scoring Premium */}
          {showMQLEditor && (
            <div className="w-1/4 bg-white border-l border-gray-200 p-6 shadow-sm">
              <div className="sticky top-0">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Zap className="text-white" size={18} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Sistema MQL
                  </h4>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">
                      Threshold de Qualificação
                    </h5>
                    <input
                      type="number"
                      placeholder="70"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Pontos mínimos para ser considerado MQL
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
                    <h5 className="text-sm font-semibold text-blue-800 mb-3">
                      Regras Ativas
                    </h5>
                    <div className="text-xs text-blue-700">
                      Configure a pontuação editando os campos no formulário
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
                    <h5 className="text-sm font-semibold text-green-800 mb-3">
                      Dicas de Pontuação
                    </h5>
                    <ul className="text-xs text-green-700 space-y-2">
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
    </FormBuilderWrapper>
  );
};

export default FormioEditor;
