
import React, { useState } from 'react';
import { MessageCircle, Phone, Settings, ExternalLink } from 'lucide-react';

interface WhatsAppIntegrationProps {
  form: any;
  onSave: (config: any) => void;
}

const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ form, onSave }) => {
  const [config, setConfig] = useState({
    enabled: form?.settings?.whatsapp?.enabled || false,
    phone: form?.settings?.whatsapp?.phone || '',
    message: form?.settings?.whatsapp?.message || 'Olá! Vim através do formulário e gostaria de mais informações.',
    buttonText: form?.settings?.whatsapp?.buttonText || 'Falar no WhatsApp',
    autoRegisterLead: form?.settings?.whatsapp?.autoRegisterLead || true,
    pipelineStage: form?.settings?.whatsapp?.pipelineStage || 'new',
    position: form?.settings?.whatsapp?.position || 'bottom'
  });

  const handleSave = () => {
    onSave({
      ...form.settings,
      whatsapp: config
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
          <MessageCircle className="text-white" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Integração WhatsApp</h2>
          <p className="text-sm text-gray-500">Configure o botão WhatsApp para captura direta de leads</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ativar Integração */}
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <MessageCircle className="text-green-600" size={20} />
            <div>
              <h3 className="font-medium text-green-900">Ativar WhatsApp</h3>
              <p className="text-sm text-green-700">Adicionar botão de contato direto via WhatsApp</p>
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
          </label>
        </div>

        {config.enabled && (
          <>
            {/* Configuração do Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                Número do WhatsApp
              </label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                placeholder="5511999999999"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite apenas números (ex: 5511999999999 para +55 11 99999-9999)
              </p>
            </div>

            {/* Mensagem Padrão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem Padrão
              </label>
              <textarea
                value={config.message}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Mensagem que será enviada automaticamente"
              />
              <p className="text-xs text-gray-500 mt-1">
                Esta mensagem será pré-preenchida no WhatsApp do lead
              </p>
            </div>

            {/* Texto do Botão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto do Botão
              </label>
              <input
                type="text"
                value={config.buttonText}
                onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Posição do Botão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posição do Botão
              </label>
              <select
                value={config.position}
                onChange={(e) => setConfig({ ...config, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="top">Topo do formulário</option>
                <option value="bottom">Final do formulário</option>
                <option value="floating">Botão flutuante</option>
              </select>
            </div>

            {/* Configurações de CRM */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Integração com CRM</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-blue-900">Auto-cadastrar Lead</h4>
                    <p className="text-sm text-blue-700">
                      Registrar automaticamente o lead no CRM antes de redirecionar
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.autoRegisterLead}
                      onChange={(e) => setConfig({ ...config, autoRegisterLead: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                {config.autoRegisterLead && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etapa do Pipeline
                    </label>
                    <select
                      value={config.pipelineStage}
                      onChange={(e) => setConfig({ ...config, pipelineStage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">Novos Leads</option>
                      <option value="contacted">Primeiro Contato</option>
                      <option value="qualified">Lead Qualificado</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview do Botão</h3>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="max-w-md mx-auto bg-white p-4 rounded-lg shadow-sm">
                  <button
                    className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                    onClick={() => alert('Preview - Botão WhatsApp clicado!')}
                  >
                    <MessageCircle size={20} />
                    <span>{config.buttonText}</span>
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">⚡ Como Funciona</h4>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Lead preenche os campos do formulário</li>
                <li>Lead clica no botão WhatsApp</li>
                <li>Sistema registra o lead automaticamente no CRM</li>
                <li>Lead é redirecionado para o WhatsApp com mensagem pré-preenchida</li>
                <li>Você recebe a mensagem e pode iniciar o atendimento</li>
              </ol>
            </div>
          </>
        )}

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Settings size={16} />
            <span>Salvar Configuração</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppIntegration;
