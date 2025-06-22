
import React, { useState } from 'react';
import { X, Settings, Code, Save, Eye } from 'lucide-react';
import FormioEditor from './FormioEditor';
import FormioPreview from './FormioPreview';
import MQLScoringManager from './MQLScoringManager';

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  form: any;
  onSave: (formData: any) => void;
  tenantId: string;
}

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  isOpen,
  onClose,
  onCancel,
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

  const handleClose = () => {
    onClose();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Modal Container - Maximizado para o Editor */}
      <div className="bg-white rounded-xl shadow-2xl w-[98vw] h-[98vh] max-w-[2000px] max-h-[1200px] flex flex-col">
        {/* Header Otimizado */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {form?.name || 'Novo Formulário'}
              </h2>
              <p className="text-blue-100 text-sm">
                Editor Profissional de Formulários Form.io
              </p>
            </div>
          </div>

          {/* Tabs de Navegação Melhoradas */}
          <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-lg p-1 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center space-x-2 ${
                activeTab === 'editor'
                  ? 'bg-white text-blue-700 shadow-md transform scale-105'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              <Code size={16} />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center space-x-2 ${
                activeTab === 'preview'
                  ? 'bg-white text-blue-700 shadow-md transform scale-105'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              <Eye size={16} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('scoring')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center space-x-2 ${
                activeTab === 'scoring'
                  ? 'bg-white text-blue-700 shadow-md transform scale-105'
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
            >
              <Settings size={16} />
              <span>MQL Scoring</span>
            </button>
          </div>

          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area - Maximizada para o Form.io */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {activeTab === 'editor' && (
            <FormioEditor
              form={form}
              onSave={handleSave}
              onPreview={handlePreview}
              tenantId={tenantId}
            />
          )}

          {activeTab === 'preview' && (
            <div className="h-full p-6 overflow-auto">
              <FormioPreview
                formSchema={formSchema}
                form={form}
                onClose={() => setActiveTab('editor')}
              />
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="h-full p-6 overflow-auto">
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
