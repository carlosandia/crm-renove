import React, { useCallback, useState } from 'react';
import { NotificationSettings as NotificationSettingsType, EmailNotificationSettings as EmailNotificationSettingsType } from '../../../types/Forms';

export interface NotificationState {
  type: 'success' | 'error';
  message: string;
  show: boolean;
}

export interface NotificationSettingsProps {
  notificationSettings: NotificationSettingsType;
  emailSettings: EmailNotificationSettingsType;
  onNotificationSettingsChange: (settings: NotificationSettingsType) => void;
  onEmailSettingsChange: (settings: EmailNotificationSettingsType) => void;
}

export interface NotificationManagerReturn {
  // Estado da notificação atual
  notification: NotificationState;
  
  // Funções de controle
  showNotification: (type: 'success' | 'error', message?: string) => void;
  hideNotification: () => void;
  
  // Gerenciamento de emails
  addEmailRecipient: (email: string) => void;
  removeEmailRecipient: (email: string) => void;
  validateEmail: (email: string) => boolean;
  
  // Configurações
  updateNotificationSettings: (updates: Partial<NotificationSettingsType>) => void;
  updateEmailSettings: (updates: Partial<EmailNotificationSettingsType>) => void;
}

export const useNotificationManager = (
  notificationSettings: NotificationSettingsType,
  emailSettings: EmailNotificationSettingsType,
  onNotificationSettingsChange: (settings: NotificationSettingsType) => void,
  onEmailSettingsChange: (settings: EmailNotificationSettingsType) => void
): NotificationManagerReturn => {

  const [notification, setNotification] = useState<NotificationState>({
    type: 'success',
    message: '',
    show: false
  });

  const showNotification = useCallback((type: 'success' | 'error', message?: string) => {
    setNotification({
      type,
      message: message || (type === 'success' ? notificationSettings.successMessage : notificationSettings.errorMessage),
      show: true
    });

    if (notificationSettings.autoHide) {
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, notificationSettings.hideDelay);
    }
  }, [notificationSettings]);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const addEmailRecipient = useCallback((email: string) => {
    if (email && validateEmail(email) && !emailSettings.recipients.includes(email)) {
      const updatedSettings = {
        ...emailSettings,
        recipients: [...emailSettings.recipients, email]
      };
      onEmailSettingsChange(updatedSettings);
    }
  }, [emailSettings, onEmailSettingsChange, validateEmail]);

  const removeEmailRecipient = useCallback((email: string) => {
    const updatedSettings = {
      ...emailSettings,
      recipients: emailSettings.recipients.filter(recipient => recipient !== email)
    };
    onEmailSettingsChange(updatedSettings);
  }, [emailSettings, onEmailSettingsChange]);

  const updateNotificationSettings = useCallback((updates: Partial<NotificationSettingsType>) => {
    const updatedSettings = { ...notificationSettings, ...updates };
    onNotificationSettingsChange(updatedSettings);
  }, [notificationSettings, onNotificationSettingsChange]);

  const updateEmailSettings = useCallback((updates: Partial<EmailNotificationSettingsType>) => {
    const updatedSettings = { ...emailSettings, ...updates };
    onEmailSettingsChange(updatedSettings);
  }, [emailSettings, onEmailSettingsChange]);

  return {
    notification,
    showNotification,
    hideNotification,
    addEmailRecipient,
    removeEmailRecipient,
    validateEmail,
    updateNotificationSettings,
    updateEmailSettings
  };
};

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notificationSettings,
  emailSettings,
  onNotificationSettingsChange,
  onEmailSettingsChange
}) => {
  const [newEmail, setNewEmail] = useState('');
  const notificationManager = useNotificationManager(
    notificationSettings,
    emailSettings,
    onNotificationSettingsChange,
    onEmailSettingsChange
  );

  const handleAddEmail = () => {
    if (newEmail.trim()) {
      if (notificationManager.validateEmail(newEmail)) {
        notificationManager.addEmailRecipient(newEmail.trim());
        setNewEmail('');
      } else {
        alert('Por favor, insira um email válido');
      }
    }
  };

  return (
    <div className="notification-settings space-y-6">
      {/* Configurações de Notificação na Tela */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Notificações na Tela
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.showNotifications}
                onChange={(e) => notificationManager.updateNotificationSettings({
                  showNotifications: e.target.checked
                })}
                className="mr-2 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Mostrar notificações após envio
              </span>
            </label>
          </div>

          {notificationSettings.showNotifications && (
            <>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.autoHide}
                    onChange={(e) => notificationManager.updateNotificationSettings({
                      autoHide: e.target.checked
                    })}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Ocultar automaticamente
                  </span>
                </label>
              </div>

              {notificationSettings.autoHide && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tempo para ocultar (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={notificationSettings.hideDelay}
                    onChange={(e) => notificationManager.updateNotificationSettings({
                      hideDelay: parseInt(e.target.value) || 5000
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem de Sucesso
                </label>
                <textarea
                  value={notificationSettings.successMessage}
                  onChange={(e) => notificationManager.updateNotificationSettings({
                    successMessage: e.target.value
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Mensagem exibida quando formulário é enviado com sucesso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem de Erro
                </label>
                <textarea
                  value={notificationSettings.errorMessage}
                  onChange={(e) => notificationManager.updateNotificationSettings({
                    errorMessage: e.target.value
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Mensagem exibida quando há erro no envio"
                />
              </div>

              {/* Cores das notificações */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor de Sucesso
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={notificationSettings.successBackgroundColor}
                      onChange={(e) => notificationManager.updateNotificationSettings({
                        successBackgroundColor: e.target.value
                      })}
                      className="w-12 h-8 border border-gray-300 rounded"
                    />
                    <input
                      type="color"
                      value={notificationSettings.successTextColor}
                      onChange={(e) => notificationManager.updateNotificationSettings({
                        successTextColor: e.target.value
                      })}
                      className="w-12 h-8 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Fundo e Texto
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor de Erro
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={notificationSettings.errorBackgroundColor}
                      onChange={(e) => notificationManager.updateNotificationSettings({
                        errorBackgroundColor: e.target.value
                      })}
                      className="w-12 h-8 border border-gray-300 rounded"
                    />
                    <input
                      type="color"
                      value={notificationSettings.errorTextColor}
                      onChange={(e) => notificationManager.updateNotificationSettings({
                        errorTextColor: e.target.value
                      })}
                      className="w-12 h-8 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Fundo e Texto
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configurações de Email */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Notificações por E-mail
        </h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.enabled}
                onChange={(e) => notificationManager.updateEmailSettings({
                  enabled: e.target.checked
                })}
                className="mr-2 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Enviar notificações por email
              </span>
            </label>
          </div>

          {emailSettings.enabled && (
            <>
              {/* Lista de destinatários */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinatários ({emailSettings.recipients.length})
                </label>
                
                <div className="flex space-x-2 mb-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-1">
                  {emailSettings.recipients.map((email, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{email}</span>
                      <button
                        onClick={() => notificationManager.removeEmailRecipient(email)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assunto do email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto do E-mail
                </label>
                <input
                  type="text"
                  value={emailSettings.subject}
                  onChange={(e) => notificationManager.updateEmailSettings({
                    subject: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Assunto do email de notificação"
                />
              </div>

              {/* Template do email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template do E-mail
                </label>
                <textarea
                  value={emailSettings.template}
                  onChange={(e) => notificationManager.updateEmailSettings({
                    template: e.target.value
                  })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder="Template do email com variáveis como {form_name}, {submission_date}, etc."
                />
                <div className="text-xs text-gray-500 mt-1">
                  Variáveis disponíveis: {'{form_name}'}, {'{submission_date}'}, {'{lead_score}'}, {'{is_mql}'}, {'{lead_data}'}, {'{crm_link}'}, {'{whatsapp_link}'}
                </div>
              </div>

              {/* Opções adicionais */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailSettings.sendOnSubmit}
                    onChange={(e) => notificationManager.updateEmailSettings({
                      sendOnSubmit: e.target.checked
                    })}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Enviar ao receber submissão
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailSettings.sendOnWhatsApp}
                    onChange={(e) => notificationManager.updateEmailSettings({
                      sendOnWhatsApp: e.target.checked
                    })}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Enviar ao clicar no WhatsApp
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailSettings.includeLeadData}
                    onChange={(e) => notificationManager.updateEmailSettings({
                      includeLeadData: e.target.checked
                    })}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Incluir dados completos do lead
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailSettings.includeMQLScore}
                    onChange={(e) => notificationManager.updateEmailSettings({
                      includeMQLScore: e.target.checked
                    })}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Incluir pontuação MQL
                  </span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview da notificação */}
      {notificationManager.notification.show && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className="p-4 rounded-lg shadow-lg max-w-md"
            style={{
              backgroundColor: notificationManager.notification.type === 'success' 
                ? notificationSettings.successBackgroundColor 
                : notificationSettings.errorBackgroundColor,
              color: notificationManager.notification.type === 'success'
                ? notificationSettings.successTextColor
                : notificationSettings.errorTextColor
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {notificationManager.notification.message}
              </span>
              <button
                onClick={notificationManager.hideNotification}
                className="ml-2 text-current opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings; 