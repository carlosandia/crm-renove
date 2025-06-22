
import React, { useState } from 'react';
import { X, Settings, Code, Save, Eye } from 'lucide-react';
import FormioEditor from './FormioEditor';
import FormioPreview from './FormioPreview';
import MQLScoringManager from './MQLScoringManager';

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: any;
  onSave: (formData: any) => void;
  tenantId: string;
}

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  onClose,
  form,
  onSave,
  tenantId
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'scoring'>('editor');
  const [formSchema, setFormSchema] = useState(form?.formio_schema || {
    type: 'form',
    display: 'form',
    components: []
  });

  if (!isOpen) return null;

  const handleSave = async (updatedSchema: any) => {
    setFormSchema(updatedSchema);
    await onSave({
      ...form,
      formio_schema: updatedSchema
    });
  };

  const handlePreview = () => {
    setActiveTab('preview');
  };

  const handleScoringUpdate = (scoringConfig: any) => {
    onSave({
      ...form,
      qualification_rules: scoringConfig
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Modal Container - Aumentado significativamente */}
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[95vh] max-w-[1800px] max-h-[1000px] flex flex-col">
        {/* Header Melhorado */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {form?.name || 'Novo Formulário'}
              </h2>
              <p className="text-blue-100 text-sm">
                Editor Avançado de Formulários
              </p>
            </div>
          </div>

          {/* Tabs de Navegação */}
          <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              <Code size={16} className="inline mr-2" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              <Eye size={16} className="inline mr-2" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('scoring')}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'scoring'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              <Settings size={16} className="inline mr-2" />
              MQL
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area - Otimizada para o FormBuilder */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <FormioEditor
              form={form}
              onSave={handleSave}
              onPreview={handlePreview}
              tenantId={tenantId}
            />
          )}

          {activeTab === 'preview' && (
            <div className="h-full p-6 bg-gray-50">
              <FormioPreview
                formSchema={formSchema}
                form={form}
                onClose={() => setActiveTab('editor')}
              />
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="h-full p-6 bg-gray-50 overflow-auto">
              <MQLScoringManager
                form={form}
                onSave={handleScoringUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilderModal;
