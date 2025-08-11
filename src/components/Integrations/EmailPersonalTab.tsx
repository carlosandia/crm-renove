import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Globe, 
  Settings, 
  Lock,
  Loader2,
  TestTube,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { showSuccessToast, showErrorToast, showWarningToast } from '../../lib/toast';
import { ShimmerButton } from '../ui/shimmer-button';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import emailIntegrationApi, { EmailIntegration, EmailTestRequest, EmailIntegrationRequest } from '../../services/emailIntegrationApi';
import { emailValidationService, SmtpConfig, ValidationResult } from '../../services/emailValidationService';
import GmailOAuthService from '../../services/GmailOAuthService';

// Presets de provedores de e-mail
const EMAIL_PROVIDERS = {
  'gmail.com': {
    name: 'Gmail',
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    instructions: 'Use uma senha de aplicativo do Google para autenticação',
    hasOAuth: true,
    oauthInstructions: 'Conecte diretamente com sua conta Google sem precisar configurar SMTP'
  },
  'outlook.com': {
    name: 'Outlook',
    smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
    imap: { host: 'imap-mail.outlook.com', port: 993, secure: true },
    instructions: 'Use sua senha normal do Outlook'
  },
  'hotmail.com': {
    name: 'Hotmail',
    smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
    imap: { host: 'imap-mail.outlook.com', port: 993, secure: true },
    instructions: 'Use sua senha normal do Hotmail'
  },
  'yahoo.com': {
    name: 'Yahoo',
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    instructions: 'Use uma senha de aplicativo do Yahoo'
  },
  'uol.com.br': {
    name: 'UOL',
    smtp: { host: 'smtps.uol.com.br', port: 587, secure: false },
    imap: { host: 'imap.uol.com.br', port: 993, secure: true },
    instructions: 'Use sua senha normal do UOL'
  },
  'terra.com.br': {
    name: 'Terra',
    smtp: { host: 'smtp.terra.com.br', port: 587, secure: false },
    imap: { host: 'imap.terra.com.br', port: 993, secure: true },
    instructions: 'Use sua senha normal do Terra'
  },
  'renovedigital.com.br': {
    name: 'Renove Digital',
    smtp: { host: 'smtpi.uni5.net', port: 587, secure: false },
    imap: { host: 'imapi.uni5.net', port: 993, secure: true },
    instructions: 'Use suas credenciais corporativas da Renove Digital'
  }
};

// Interface local para compatibilidade com o componente
interface LocalEmailIntegration {
  id?: string;
  user_id: string;
  tenant_id: string;
  email: string;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  is_active: boolean;
  last_tested?: string;
  created_at?: string;
  updated_at?: string;
}

const EmailPersonalTab: React.FC = () => {
  const { user } = useAuth();
  
  // Estados do formulário - ✅ CORREÇÃO: Campo único smtp_secure
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false // ✅ Campo único padronizado (true=SSL/465, false=TLS/587)
  });
  
  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [isManualConfig, setIsManualConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [existingIntegration, setExistingIntegration] = useState<LocalEmailIntegration | null>(null);
  
  // Estados de UI/UX
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'new'>('new');
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  
  // ✅ NOVO: Estados OAuth Gmail
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [showOAuthOption, setShowOAuthOption] = useState(false);
  const [hasGmailIntegration, setHasGmailIntegration] = useState(false);

  // Detectar provedor automaticamente
  const detectProvider = useCallback((email: string) => {
    if (!email || !email.includes('@')) {
      setDetectedProvider(null);
      setIsManualConfig(false);
      setShowOAuthOption(false);
      return;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && EMAIL_PROVIDERS[domain as keyof typeof EMAIL_PROVIDERS]) {
      const provider = EMAIL_PROVIDERS[domain as keyof typeof EMAIL_PROVIDERS];
      setDetectedProvider(domain);
      setFormData(prev => ({
        ...prev,
        smtp_host: provider.smtp.host,
        smtp_port: provider.smtp.port,
        smtp_secure: provider.smtp.secure
      }));
      setIsManualConfig(false);
      
      // ✅ NOVO: Mostrar opção OAuth para Gmail
      if (domain === 'gmail.com') {
        setShowOAuthOption(true);
      } else {
        setShowOAuthOption(false);
      }
    } else {
      setDetectedProvider(null);
      setIsManualConfig(true);
      setShowOAuthOption(false);
    }
  }, []);

  // Carregar integração existente
  useEffect(() => {
    const loadExistingIntegration = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await emailValidationService.getIntegrations();
        
        if (response.success && response.data && response.data.length > 0) {
          // Pegar a primeira integração ativa
          const activeIntegration = response.data.find(integration => integration.is_active) || response.data[0];
          
          // Mapear dados da API para interface local
          const mappedIntegration = {
            id: activeIntegration.id,
            user_id: activeIntegration.user_id,
            tenant_id: activeIntegration.tenant_id,
            email: activeIntegration.email_address,
            provider: activeIntegration.provider,
            smtp_host: activeIntegration.smtp_host,
            smtp_port: activeIntegration.smtp_port,
            smtp_secure: activeIntegration.smtp_secure, // ✅ CORREÇÃO: Campo padronizado
            is_active: activeIntegration.is_active,
            last_tested: activeIntegration.last_test_at,
            created_at: activeIntegration.created_at,
            updated_at: activeIntegration.updated_at
          };
          
          setExistingIntegration(mappedIntegration);
          
          // Preencher formulário com dados existentes
          setFormData({
            email: activeIntegration.email_address,
            password: '', // Nunca preenchemos senha por segurança
            smtp_host: activeIntegration.smtp_host,
            smtp_port: activeIntegration.smtp_port,
            smtp_secure: activeIntegration.smtp_secure // ✅ CORREÇÃO: Campo padronizado
          });
          
          // Detectar provedor
          detectProvider(activeIntegration.email_address);
        } else {
          setExistingIntegration(null);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar integração de e-mail:', error);
        showErrorToast('Erro', 'Não foi possível carregar configurações de e-mail');
        setExistingIntegration(null);
      } finally {
        setLoading(false);
      }
    };

    loadExistingIntegration();
  }, [user?.id, detectProvider]);

  // ✅ NOVO: Verificar se há integração Gmail OAuth ativa
  useEffect(() => {
    const checkGmailIntegration = async () => {
      try {
        const hasIntegration = await GmailOAuthService.hasGmailIntegration();
        setHasGmailIntegration(hasIntegration);
      } catch (error) {
        console.error('❌ Erro ao verificar integração Gmail:', error);
      }
    };

    if (user?.id) {
      checkGmailIntegration();
    }
  }, [user?.id]);

  // ✅ NOVO: Conectar Gmail via OAuth
  const handleGmailOAuthConnect = async () => {
    try {
      setConnectingGmail(true);
      
      console.log('🔄 [Gmail OAuth] Iniciando conexão...');
      
      // Iniciar fluxo OAuth
      const authUrl = await GmailOAuthService.startOAuthFlow();
      
      if (authUrl === 'demo_mode') {
        showWarningToast('Modo Demo', 'Configuração OAuth não disponível no momento');
        return;
      }
      
      // Abrir popup OAuth
      const popup = window.open(authUrl, 'gmail_oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        showErrorToast('Erro', 'Pop-up bloqueado. Permita pop-ups para este site.');
        return;
      }

      // Aguardar callback OAuth
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.type === 'GMAIL_OAUTH_SUCCESS') {
          const { code, state } = event.data;
          
          try {
            console.log('🔄 [Gmail OAuth] Processando callback...');
            
            // Processar callback OAuth
            const credentials = await GmailOAuthService.handleOAuthCallback(code, state);
            
            // Salvar integração
            const integrationId = await GmailOAuthService.saveGmailIntegration(credentials);
            
            console.log('✅ [Gmail OAuth] Integração salva:', integrationId);
            
            // Atualizar estados
            setHasGmailIntegration(true);
            setShowOAuthOption(false);
            popup.close();
            
            // Mostrar sucesso
            showSuccessToast('Gmail Conectado', `Conta ${(credentials as any)?.email || 'Gmail'} conectada com sucesso via OAuth!`);
            
            // Recarregar integrações
            window.location.reload();
            
          } catch (error: any) {
            console.error('❌ [Gmail OAuth] Erro no callback:', error);
            showErrorToast('Erro OAuth', error?.message || 'Falha ao conectar Gmail');
            popup.close();
          }
        } else if (event.data.type === 'GMAIL_OAUTH_ERROR') {
          console.error('❌ [Gmail OAuth] Erro:', event.data.error);
          showErrorToast('Erro OAuth', event.data.error || 'Falha na autenticação');
          popup.close();
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup quando popup fechar
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkClosed);
          setConnectingGmail(false);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ [Gmail OAuth] Erro ao conectar:', error);
      showErrorToast('Erro', error?.message || 'Falha ao conectar Gmail');
    } finally {
      setConnectingGmail(false);
    }
  };

  // ✅ NOVO: Desconectar Gmail OAuth
  const handleGmailOAuthDisconnect = async () => {
    try {
      const success = await GmailOAuthService.removeGmailIntegration();
      
      if (success) {
        setHasGmailIntegration(false);
        showSuccessToast('Gmail Desconectado', 'Conta Gmail desconectada com sucesso');
        
        // Recarregar integrações
        window.location.reload();
      } else {
        showErrorToast('Erro', 'Não foi possível desconectar Gmail');
      }
    } catch (error: any) {
      console.error('❌ [Gmail OAuth] Erro ao desconectar:', error);
      showErrorToast('Erro', error?.message || 'Falha ao desconectar Gmail');
    }
  };

  // Handler para mudança de e-mail
  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, email }));
    detectProvider(email);
    setTestResult(null);
  };

  // ✅ NOVO SISTEMA: Testar conexão SMTP com validação obrigatória
  const handleTestConnection = async () => {
    if (!formData.email || !formData.password || !formData.smtp_host) {
      showWarningToast('Campos obrigatórios', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      console.log('🧪 [EmailPersonalTab] Iniciando teste com novo sistema de validação...');

      // ✅ USAR NOVO SERVIÇO DE VALIDAÇÃO
      const smtpConfig: SmtpConfig = {
        host: formData.smtp_host,
        port: formData.smtp_port,
        user: formData.email,
        password: formData.password
      };

      const result: ValidationResult = await emailValidationService.validateSmtpConfig(smtpConfig);
      
      if (result.success) {
        setTestResult({ 
          success: true, 
          message: result.message || 'Conexão SMTP estabelecida com sucesso!' 
        });
        showSuccessToast('Teste bem-sucedido', 'Configuração de e-mail validada e pronta para salvar!');
        console.log('✅ [EmailPersonalTab] Validação bem-sucedida:', result.details);
      } else {
        const errorMessage = result.error || 'Falha na validação SMTP';
        const detailsMessage = result.details ? emailValidationService.formatErrorDetails(result.details) : '';
        const fullMessage = `${errorMessage}${detailsMessage}`;
        
        setTestResult({ success: false, message: fullMessage });
        showErrorToast('Teste falhou', errorMessage);
        console.error('❌ [EmailPersonalTab] Validação falhou:', result.details);
      }
    } catch (error: any) {
      console.error('❌ [EmailPersonalTab] Erro no teste de validação:', error);
      const errorMessage = error?.message || 'Erro interno no teste de validação';
      setTestResult({ success: false, message: errorMessage });
      showErrorToast('Erro no teste', errorMessage);
    } finally {
      setTesting(false);
    }
  };

  // ✅ NOVO SISTEMA: Salvar configuração apenas se validada
  const handleSave = async () => {
    if (!testResult?.success) {
      showWarningToast(
        'Teste obrigatório', 
        'É obrigatório testar a conexão SMTP antes de salvar. Clique em "Testar Conexão" primeiro.'
      );
      return;
    }

    try {
      setSaving(true);
      
      console.log('💾 [EmailPersonalTab] Salvando configuração com novo sistema...');

      // ✅ VALIDAÇÃO FRONTEND: Evitar envio de campos vazios
      if (!formData.smtp_host || !formData.smtp_port || !formData.email || !formData.password) {
        const missingFields = [];
        if (!formData.smtp_host) missingFields.push('Servidor SMTP');
        if (!formData.smtp_port) missingFields.push('Porta');
        if (!formData.email) missingFields.push('Email');
        if (!formData.password) missingFields.push('Senha');
        
        showErrorToast(
          'Campos obrigatórios',
          `Preencha os campos: ${missingFields.join(', ')}`
        );
        return;
      }

      // ✅ DEBUG: Verificar valores antes do envio  
      console.log('🔍 [EmailPersonalTab] Debug - formData:', {
        email: formData.email,
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        password: formData.password ? '[SET]' : '[EMPTY]'
      });

      // ✅ CORREÇÃO DEFENSIVA: Garantir que campos nunca sejam null/undefined/empty
      const smtpConfig: SmtpConfig = {
        host: (formData.smtp_host || '').toString().trim(), // Proteção contra null/undefined
        port: formData.smtp_port && !isNaN(Number(formData.smtp_port)) ? parseInt(String(formData.smtp_port)) : 587, // Fallback para 587
        user: (formData.email || '').toString().trim(), // Proteção contra null/undefined
        password: formData.password || '' // Garantir que nunca seja null/undefined
      };

      console.log('🔍 [EmailPersonalTab] Debug - smtpConfig antes do envio:', {
        host: smtpConfig.host || '[EMPTY]',
        port: smtpConfig.port,
        user: smtpConfig.user || '[EMPTY]',
        password: smtpConfig.password ? '[SET]' : '[EMPTY]'
      });

      // ✅ VALIDAÇÃO FINAL ANTI-400: Detectar campos vazios antes do envio
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.password) {
        console.error('❌ [EmailPersonalTab] ERRO CRÍTICO: Campos vazios após conversão!', {
          host_empty: !smtpConfig.host,
          port_invalid: !smtpConfig.port,
          user_empty: !smtpConfig.user,
          password_empty: !smtpConfig.password
        });
        
        showErrorToast(
          'Erro de validação',
          'Campos obrigatórios estão vazios. Preencha todos os campos e tente novamente.'
        );
        return;
      }

      const result: ValidationResult = await emailValidationService.saveEmailConfig(smtpConfig);
      
      if (result.success) {
        // Atualizar estado local com configuração salva
        const savedIntegration = {
          id: result.details?.id || 'new',
          user_id: user?.id || '',
          tenant_id: (user as any)?.user_metadata?.tenant_id || '',
          email: smtpConfig.user,
          provider: detectedProvider || emailValidationService.detectEmailProvider(smtpConfig.user).provider,
          smtp_host: smtpConfig.host,
          smtp_port: smtpConfig.port,
          smtp_secure: smtpConfig.port === 465,
          is_active: true,
          last_tested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setExistingIntegration(savedIntegration);
        showSuccessToast('Configuração salva', result.message || 'Configuração SMTP validada e salva com sucesso!');
        console.log('✅ [EmailPersonalTab] Configuração salva:', result.details);
      } else {
        throw new Error(result.error || 'Falha ao salvar configuração validada');
      }
    } catch (error: any) {
      console.error('❌ [EmailPersonalTab] Erro ao salvar configuração:', error);
      const errorMessage = error?.message || 'Não foi possível salvar a configuração';
      showErrorToast('Erro ao salvar', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // ✅ NOVO SISTEMA: Remover configuração de email
  const handleRemoveConfig = async () => {
    if (!existingIntegration?.is_active) {
      showWarningToast('Nenhuma configuração', 'Não há configuração ativa para remover');
      return;
    }

    try {
      setRemoving(true);
      
      console.log('🗑️ [EmailPersonalTab] Removendo configuração de email...');

      const result: ValidationResult = await emailValidationService.removeEmailConfig();
      
      if (result.success) {
        // Limpar estados locais
        setExistingIntegration(null);
        setFormData({
          email: '',
          password: '',
          smtp_host: '',
          smtp_port: 587,
          smtp_secure: false
        });
        setDetectedProvider(null);
        setIsManualConfig(false);
        setTestResult(null);
        setViewMode('new');
        setShowConfirmRemove(false);
        
        showSuccessToast('Configuração removida', result.message || 'Configuração de email removida com sucesso!');
        console.log('✅ [EmailPersonalTab] Configuração removida:', result.details);
      } else {
        throw new Error(result.error || 'Falha ao remover configuração');
      }
    } catch (error: any) {
      console.error('❌ [EmailPersonalTab] Erro ao remover configuração:', error);
      const errorMessage = error?.message || 'Não foi possível remover a configuração';
      showErrorToast('Erro ao remover', errorMessage);
    } finally {
      setRemoving(false);
    }
  };

  // ✅ Determinar modo de visualização baseado em configuração existente
  useEffect(() => {
    if (existingIntegration?.is_active) {
      setViewMode('view');
    } else {
      setViewMode('new');
    }
  }, [existingIntegration]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuração de E-mail Pessoal</h2>
            <p className="text-sm text-gray-600">
              Configure sua conta de e-mail para envio direto da pipeline
            </p>
          </div>
        </div>

        {/* ✅ NOVA SEÇÃO: Status e gerenciamento de configuração existente */}
        {existingIntegration?.is_active && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-600" size={16} />
                <span className="text-green-800 font-medium">
                  E-mail configurado: {existingIntegration.email}
                </span>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  {existingIntegration.provider}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {viewMode === 'view' && (
                  <>
                    <Button
                      onClick={() => setViewMode('edit')}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Edit3 size={14} />
                      <span>Editar</span>
                    </Button>
                    <Button
                      onClick={() => setShowConfirmRemove(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      <span>Remover</span>
                    </Button>
                  </>
                )}
                {viewMode === 'edit' && (
                  <Button
                    onClick={() => {
                      setViewMode('view');
                      setTestResult(null);
                      // Resetar formulário para dados existentes
                      if (existingIntegration) {
                        setFormData({
                          email: existingIntegration.email,
                          password: '', // Nunca mostrar senha
                          smtp_host: existingIntegration.smtp_host,
                          smtp_port: existingIntegration.smtp_port,
                          smtp_secure: existingIntegration.smtp_secure
                        });
                        detectProvider(existingIntegration.email);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <span>Cancelar</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmação para remoção */}
        {showConfirmRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Remover Configuração</h3>
                  <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja remover a configuração de e-mail para <strong>{existingIntegration?.email}</strong>?
                Você precisará configurar novamente para enviar e-mails.
              </p>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowConfirmRemove(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={removing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRemoveConfig}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center space-x-2"
                  disabled={removing}
                >
                  {removing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>{removing ? 'Removendo...' : 'Remover'}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ✅ NOVA LÓGICA: Mostrar formulário baseado no modo */}
      {(viewMode === 'edit' || viewMode === 'new') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {viewMode === 'edit' ? 'Editar Configuração de E-mail' : 'Nova Configuração de E-mail'}
            </h3>
            {viewMode === 'new' && existingIntegration?.is_active && (
              <Button
                onClick={() => setViewMode('view')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <span>Ver Configuração Atual</span>
              </Button>
            )}
          </div>
          
          <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full"
              />
              {detectedProvider && (
                <p className="text-sm text-green-600">
                  ✓ Provedor detectado: {EMAIL_PROVIDERS[detectedProvider as keyof typeof EMAIL_PROVIDERS]?.name}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Sua senha ou senha de aplicativo"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {detectedProvider && (
                <p className="text-sm text-blue-600">
                  💡 {EMAIL_PROVIDERS[detectedProvider as keyof typeof EMAIL_PROVIDERS]?.instructions}
                </p>
              )}
            </div>
          </div>

          {/* ✅ NOVO: Seção OAuth Gmail */}
          {showOAuthOption && (
            <div className="border-t pt-6">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Globe className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      ⚡ Conecte-se diretamente com Gmail (Recomendado)
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">
                      💡 {EMAIL_PROVIDERS['gmail.com']?.oauthInstructions}
                    </p>
                    
                    {hasGmailIntegration ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="text-green-600" size={16} />
                          <span className="text-green-800 font-medium">Gmail já conectado via OAuth</span>
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            onClick={handleGmailOAuthDisconnect}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            <span>Desconectar Gmail</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-3">
                        <ShimmerButton
                          onClick={handleGmailOAuthConnect}
                          disabled={connectingGmail}
                          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                        >
                          {connectingGmail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Globe className="h-4 w-4" />
                          )}
                          <span>
                            {connectingGmail ? 'Conectando...' : 'Conectar com Google'}
                          </span>
                        </ShimmerButton>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOAuthOption(false)}
                          className="text-gray-600"
                        >
                          Usar configuração SMTP manual
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configurações SMTP (Manual ou Auto-detectado) */}
          {(isManualConfig || (detectedProvider && !showOAuthOption)) && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Configurações SMTP</h3>
                {!isManualConfig && (
                  <span className="text-sm text-green-600 font-medium">Auto-detectado</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Servidor SMTP *</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="smtp.exemplo.com"
                    disabled={!isManualConfig}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Porta *</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                    disabled={!isManualConfig}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Segurança</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="smtp_secure"
                      checked={formData.smtp_secure}
                      onChange={(e) => setFormData(prev => ({ ...prev, smtp_secure: e.target.checked }))}
                      disabled={!isManualConfig}
                      className="rounded"
                    />
                    <label htmlFor="smtp_secure" className="text-sm text-gray-700">
                      SSL/TLS
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NOVO SISTEMA: Status de validação obrigatória */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {testResult.success ? (
                  <CheckCircle className="text-green-600" size={18} />
                ) : (
                  <AlertCircle className="text-red-600" size={18} />
                )}
                <span className={`font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.success ? '✅ Configuração Validada' : '❌ Validação Falhou'}
                </span>
              </div>
              <p className={`text-sm ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message}
              </p>
              {testResult.success && (
                <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
                  🔒 <strong>Configuração pronta para salvar</strong> - A conectividade SMTP foi verificada com sucesso
                </div>
              )}
            </div>
          )}

          {/* ✅ ALERTA: Sistema de validação obrigatória */}
          {!testResult && (
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="flex items-center space-x-2 mb-1">
                <Settings className="text-yellow-600" size={16} />
                <span className="font-medium text-yellow-800">Sistema de Validação Obrigatória</span>
              </div>
              <p className="text-sm text-yellow-700">
                Para garantir que apenas configurações funcionais sejam salvas, é <strong>obrigatório testar</strong> a conectividade SMTP antes de salvar.
              </p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center space-x-4 pt-6 border-t">
            <Button
              onClick={handleTestConnection}
              disabled={testing || !formData.email || !formData.password || !formData.smtp_host}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
            </Button>

            <ShimmerButton
              onClick={handleSave}
              disabled={saving || !testResult?.success}
              className={`flex items-center space-x-2 ${
                !testResult?.success 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 transition-transform'
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult?.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span>
                {saving 
                  ? 'Salvando Configuração Validada...' 
                  : testResult?.success
                    ? 'Salvar Configuração Validada'
                    : 'Teste Primeiro (Obrigatório)'
                }
              </span>
            </ShimmerButton>
          </div>
        </div>
      </Card>
      )}

      {/* ✅ NOVA SEÇÃO: Visualização apenas quando há configuração e modo é 'view' */}
      {viewMode === 'view' && existingIntegration?.is_active && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração Atual</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">E-mail</Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-gray-900">{existingIntegration.email}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Provedor</Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-gray-900">{existingIntegration.provider}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Servidor SMTP</Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-gray-900">{existingIntegration.smtp_host}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Porta</Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-gray-900">
                    {existingIntegration.smtp_port} 
                    <span className="text-sm text-gray-500 ml-2">
                      ({existingIntegration.smtp_secure ? 'SSL/TLS' : 'STARTTLS'})
                    </span>
                  </span>
                </div>
              </div>
            </div>
            
            {existingIntegration.last_tested && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Settings className="text-blue-600" size={16} />
                  <span className="text-blue-800 text-sm">
                    Último teste: {new Date(existingIntegration.last_tested).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={async () => {
                  setTesting(true);
                  try {
                    const result = await emailValidationService.testExistingConnection();
                    if (result.success) {
                      showSuccessToast('Teste bem-sucedido', 'Configuração funcionando perfeitamente!');
                    } else {
                      showErrorToast('Teste falhou', result.error || 'Erro na conectividade');
                    }
                  } catch (error) {
                    showErrorToast('Erro no teste', 'Não foi possível testar a conexão');
                  } finally {
                    setTesting(false);
                  }
                }}
                disabled={testing}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
              </Button>
              
              <Button
                onClick={() => setViewMode('new')}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Configuração</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Instruções de Uso */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Como usar após configurar</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">1.</span>
            <span>Acesse qualquer lead na pipeline</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">2.</span>
            <span>Clique no ícone de e-mail no card do lead</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">3.</span>
            <span>O modal será aberto diretamente na aba "E-mail"</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">4.</span>
            <span>Escreva sua mensagem e envie diretamente da pipeline</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmailPersonalTab; 