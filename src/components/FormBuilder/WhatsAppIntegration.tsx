
import React, { useState } from 'react';
import { MessageCircle, Phone, Settings, Save } from 'lucide-react';

interface WhatsAppIntegrationProps {
  form: any;
  onSave: (settings: any) => void;
}

const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({ form, onSave }) => {
  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: form?.settings?.whatsapp?.enabled || false,
    phone_number: form?.settings?.whatsapp?.phone_number || '',
    welcome_message: form?.settings?.whatsapp?.welcome_message || 'Olá! Vim através do formulário e gostaria de mais informações.',
    redirect_after_submit: form?.settings?.whatsapp?.redirect_after_submit || false,
    button_text: form?.settings?.whatsapp?.button_text || 'Entrar em contato via WhatsApp',
    button_position: form?.settings?.whatsapp?.button_position || 'bottom',
    auto_fill_message: form?.settings?.whatsapp?.auto_fill_message || true
  });

  const handleSave = () => {
    const newSettings = {
      ...form?.settings,
      whatsapp: whatsappSettings
    };
    onSave(newSettings);
  };

  const handleSettingChange = (key: string, value: any) => {
    setWhatsappSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Integração WhatsApp</h2>
            <p className="text-sm text-gray-500">Configure o redirecionamento automático para WhatsApp</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Save size={16} />
          <span>Salvar</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Ativar Integração */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Ativar Integração WhatsApp</h3>
            <p className="text-sm text-gray-500">Permitir redirecionamento para WhatsApp após submissão</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappSettings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {whatsappSettings.enabled && (
          <>
            {/* Número do WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número do WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  value={whatsappSettings.phone_number}
                  onChange={(e) => handleSettingChange('phone_number', e.target.value)}
                  placeholder="5511999999999"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Formato: código do país + DDD + número (ex: 5511999999999)
              </p>
            </div>

            {/* Mensagem de Boas-vindas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem Inicial
              </label>
              <textarea
                value={whatsappSettings.welcome_message}
                onChange={(e) => handleSettingChange('welcome_message', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Mensagem que será enviada automaticamente"
              />
            </div>

            {/* Texto do Botão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto do Botão
              </label>
              <input
                type="text"
                value={whatsappSettings.button_text}
                onChange={(e) => handleSettingChange('button_text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Texto que aparecerá no botão"
              />
            </div>

            {/* Opções Adicionais */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Redirecionar após envio</h4>
                  <p className="text-sm text-gray-500">Abrir WhatsApp automaticamente após submissão</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappSettings.redirect_after_submit}
                    onChange={(e) => handleSettingChange('redirect_after_submit', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Preencher dados automaticamente</h4>
                  <p className="text-sm text-gray-500">Incluir dados do formulário na mensagem</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappSettings.auto_fill_message}
                    onChange={(e) => handleSettingChange('auto_fill_message', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Preview da Mensagem</h4>
              <div className="bg-white p-3 rounded border-l-4 border-green-500">
                <p className="text-sm text-gray-700">
                  {whatsappSettings.welcome_message}
                  {whatsappSettings.auto_fill_message && (
                    <>
                      <br /><br />
                      <em className="text-gray-500">
                        + Dados do formulário serão incluídos automaticamente
                      </em>
                    </>
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppIntegration;
