
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

  // Configurações avançadas do Form.io Builder
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
      whatsapp: {
        title: 'Integração WhatsApp',
        weight: 20,
        components: {
          whatsappButton: {
            title: 'Botão WhatsApp',
            key: 'whatsappButton',
            icon: 'fa fa-whatsapp',
            schema: {
              label: 'Entrar em contato via WhatsApp',
              type: 'button',
              key: 'whatsappButton',
              action: 'custom',
              custom: `
                // Redirecionar para WhatsApp e cadastrar lead
                const phoneNumber = '5511999999999'; // Configurável
                const message = 'Olá! Vim através do formulário e gostaria de mais informações.';
                const whatsappUrl = 'https://wa.me/' + phoneNumber + '?text=' + encodeURIComponent(message);
                
                // Cadastrar lead no CRM antes de redirecionar
                const formData = form.submission.data;
                fetch('/api/leads/whatsapp-lead', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    formData,
                    source: 'whatsapp_button',
                    tenantId: '${tenantId}'
                  })
                }).then(() => {
                  window.open(whatsappUrl, '_blank');
                });
              `,
              theme: 'success',
              size: 'md',
              block: false,
              leftIcon: 'fa fa-whatsapp',
              customClass: 'btn-whatsapp'
            }
          }
        }
      },
      scoring: {
        title: 'Sistema MQL',
        weight: 30,
        components: {
          mqlField: {
            title: 'Campo com Pontuação MQL',
            key: 'mqlField',
            icon: 'fa fa-star',
            schema: {
              type: 'textfield',
              key: 'mqlField',
              label: 'Campo MQL',
              mqlScoring: {
                enabled: true,
                rules: []
              }
            }
          }
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
              type: 'textfield',
              label: 'Rótulo do Campo'
            },
            {
              key: 'placeholder',
              type: 'textfield',
              label: 'Placeholder'
            },
            {
              key: 'description',
              type: 'textarea',
              label: 'Descrição'
            }
          ]
        },
        {
          key: 'validation',
          components: [
            {
              key: 'required',
              type: 'checkbox',
              label: 'Campo Obrigatório'
            },
            {
              key: 'minLength',
              type: 'number',
              label: 'Comprimento Mínimo'
            },
            {
              key: 'maxLength',
              type: 'number',
              label: 'Comprimento Máximo'
            }
          ]
        },
        {
          key: 'mqlScoring',
          label: 'Pontuação MQL',
          components: [
            {
              key: 'mqlScoring.enabled',
              type: 'checkbox',
              label: 'Ativar Pontuação MQL'
            },
            {
              key: 'mqlScoring.baseScore',
              type: 'number',
              label: 'Pontos Base (por preencher)',
              defaultValue: 10,
              conditional: {
                show: true,
                when: 'mqlScoring.enabled',
                eq: true
              }
            }
          ]
        }
      ]
    }
  };

  const handleFormChange = (newSchema: any) => {
    setFormSchema(newSchema);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formSchema);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar Superior */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Editor de Formulário Avançado
        </h3>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowMQLEditor(!showMQLEditor)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
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
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Editor Principal */}
        <div className={`${showMQLEditor ? 'w-3/4' : 'w-full'} transition-all duration-300`}>
          <div className="h-full p-4">
            <FormBuilder
              options={builderOptions}
              onChange={handleFormChange}
            />
          </div>
        </div>

        {/* Painel MQL Scoring */}
        {showMQLEditor && (
          <div className="w-1/4 bg-gray-50 border-l border-gray-200 p-4">
            <div className="sticky top-0">
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                Sistema de Pontuação MQL
              </h4>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Threshold de Qualificação
                  </h5>
                  <input
                    type="number"
                    placeholder="70"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pontos mínimos para ser considerado MQL
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Regras Ativas
                  </h5>
                  <div className="text-xs text-gray-500">
                    Configure a pontuação editando os campos no formulário
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Dicas de Pontuação
                  </h5>
                  <ul className="text-xs text-blue-700 space-y-1">
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
