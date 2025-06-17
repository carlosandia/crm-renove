
import React from 'react';
import { Palette, Type, Layout } from 'lucide-react';

interface FormStylingEditorProps {
  styling: any;
  onUpdate: (styling: any) => void;
}

const FormStylingEditor: React.FC<FormStylingEditorProps> = ({
  styling,
  onUpdate
}) => {
  const updateStyling = (key: string, value: any) => {
    onUpdate({ ...styling, [key]: value });
  };

  const presetColors = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Laranja', value: '#F59E0B' },
    { name: 'Cinza', value: '#6B7280' },
    { name: 'Preto', value: '#1F2937' }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <Palette className="mr-2" size={20} />
        Estilização do Formulário
      </h3>

      {/* Cores */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Cores</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor Principal (Botões, Links)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={styling.primaryColor || '#3B82F6'}
                onChange={(e) => updateStyling('primaryColor', e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={styling.primaryColor || '#3B82F6'}
                onChange={(e) => updateStyling('primaryColor', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="#3B82F6"
              />
            </div>
            
            {/* Cores pré-definidas */}
            <div className="flex flex-wrap gap-2 mt-3">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => updateStyling('primaryColor', color.value)}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tipografia */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Type className="mr-2" size={16} />
          Tipografia
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Família da Fonte
            </label>
            <select
              value={styling.fontFamily || 'system-ui'}
              onChange={(e) => updateStyling('fontFamily', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="system-ui">Sistema (Padrão)</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tamanho da Fonte
            </label>
            <select
              value={styling.fontSize || '16px'}
              onChange={(e) => updateStyling('fontSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="14px">Pequeno (14px)</option>
              <option value="16px">Médio (16px)</option>
              <option value="18px">Grande (18px)</option>
              <option value="20px">Extra Grande (20px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Layout className="mr-2" size={16} />
          Layout
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Largura do Formulário
            </label>
            <select
              value={styling.width || 'medium'}
              onChange={(e) => updateStyling('width', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="small">Pequeno (400px)</option>
              <option value="medium">Médio (600px)</option>
              <option value="large">Grande (800px)</option>
              <option value="full">Largura Total</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Espaçamento
            </label>
            <select
              value={styling.spacing || 'normal'}
              onChange={(e) => updateStyling('spacing', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="compact">Compacto</option>
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxado</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tema
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="light"
                checked={styling.theme === 'light' || !styling.theme}
                onChange={(e) => updateStyling('theme', e.target.value)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm">Claro</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="dark"
                checked={styling.theme === 'dark'}
                onChange={(e) => updateStyling('theme', e.target.value)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm">Escuro</span>
            </label>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Preview do Estilo</h4>
        
        <div 
          className="p-6 border border-gray-200 rounded-lg"
          style={{
            fontFamily: styling.fontFamily || 'system-ui',
            fontSize: styling.fontSize || '16px',
            backgroundColor: styling.theme === 'dark' ? '#1F2937' : '#FFFFFF',
            color: styling.theme === 'dark' ? '#FFFFFF' : '#000000'
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Campo de Exemplo
              </label>
              <input
                type="text"
                placeholder="Digite algo aqui..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                readOnly
              />
            </div>
            
            <button
              style={{ backgroundColor: styling.primaryColor || '#3B82F6' }}
              className="px-6 py-2 text-white rounded-lg font-medium"
            >
              Botão de Exemplo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormStylingEditor;
