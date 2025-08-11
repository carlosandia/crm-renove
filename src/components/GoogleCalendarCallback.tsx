import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, AlertCircle, Loader, Mail } from 'lucide-react';
import { GoogleCalendarAuth } from '../services/googleCalendarAuth';
import GmailOAuthService from '../services/GmailOAuthService';
import { showSuccessToast, showErrorToast } from '../lib/toast';

const GoogleCalendarCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autenticação...');
  const [serviceType, setServiceType] = useState<'calendar' | 'gmail'>('calendar');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extrair parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // ✅ NOVO: Detectar tipo de serviço baseado no state ou parâmetros salvos
        const isGmailFlow = state?.includes('gmail') || localStorage.getItem('gmail_oauth_state');
        const currentService = isGmailFlow ? 'gmail' : 'calendar';
        setServiceType(currentService);

        console.log('🔍 [Google Callback] Detectando serviço:', { currentService, state: state?.substring(0, 8) });

        // Verificar se houve erro na autenticação
        if (error) {
          console.error('❌ GOOGLE CALLBACK: Erro na autenticação:', error);
          setStatus('error');
          setMessage(`Erro na autenticação: ${error}`);
          showErrorToast('Autenticação cancelada ou falhou');
          
          // ✅ NOVO: Comunicar erro para popup se for Gmail
          if (currentService === 'gmail' && window.opener) {
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_ERROR',
              error: error || 'Erro na autenticação'
            }, window.location.origin);
            window.close();
            return;
          }
          
          setTimeout(() => {
            navigate('/integrations');
          }, 3000);
          return;
        }

        // Verificar se temos o código de autorização
        if (!code) {
          console.error('❌ GOOGLE CALLBACK: Código de autorização não encontrado');
          setStatus('error');
          setMessage('Código de autorização não encontrado');
          showErrorToast('Falha na autenticação - código não encontrado');
          
          // ✅ NOVO: Comunicar erro para popup se for Gmail
          if (currentService === 'gmail' && window.opener) {
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_ERROR',
              error: 'Código de autorização não encontrado'
            }, window.location.origin);
            window.close();
            return;
          }
          
          setTimeout(() => {
            navigate('/integrations');
          }, 3000);
          return;
        }

        // ✅ NOVO: Processamento específico por serviço
        if (currentService === 'gmail') {
          console.log('🔄 [Gmail Callback] Processando código de autorização...');
          setMessage('Conectando Gmail...');

          // ✅ SIMPLIFICADO: Processar Gmail OAuth via backend (já salva automaticamente)
          const integrationId = await GmailOAuthService.handleOAuthCallback(code, state || undefined);
          
          console.log('✅ [Gmail Callback] Gmail OAuth processado pelo backend:', integrationId);

          setStatus('success');
          setMessage('Gmail conectado com sucesso!');
          
          // ✅ NOVO: Comunicar sucesso para popup se for Gmail
          if (window.opener) {
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_SUCCESS',
              code,
              state
            }, window.location.origin);
            
            setTimeout(() => {
              window.close();
            }, 1500);
            return;
          }
          
          showSuccessToast('Gmail conectado!', 'Você pode agora enviar e-mails diretamente da pipeline');
          
          setTimeout(() => {
            navigate('/integrations');
          }, 2000);
        } else {
          // Lógica original para Google Calendar
          const userId = localStorage.getItem('google_calendar_user_id');
          const tenantId = localStorage.getItem('google_calendar_tenant_id');
          const isConnecting = localStorage.getItem('google_calendar_connecting');

          if (!userId || !tenantId || !isConnecting) {
            console.error('❌ GOOGLE CALLBACK: Dados de sessão não encontrados');
            setStatus('error');
            setMessage('Sessão inválida - tente novamente');
            showErrorToast('Sessão expirada - tente conectar novamente');
            
            setTimeout(() => {
              navigate('/integrations');
            }, 3000);
            return;
          }

          console.log('🔄 GOOGLE CALLBACK: Processando código de autorização...');
          setMessage('Trocando código por tokens...');

          // Trocar código por tokens
          const credentials = await GoogleCalendarAuth.exchangeCodeForTokens(code, state || undefined);

          console.log('🔄 GOOGLE CALLBACK: Salvando integração...');
          setMessage('Salvando integração...');

          // Salvar integração no banco
          const integrationId = await GoogleCalendarAuth.saveIntegration(
            userId,
            tenantId,
            credentials
          );

          console.log('✅ GOOGLE CALLBACK: Integração salva com sucesso:', integrationId);

          // Limpar dados temporários
          localStorage.removeItem('google_calendar_connecting');
          localStorage.removeItem('google_calendar_user_id');
          localStorage.removeItem('google_calendar_tenant_id');

          setStatus('success');
          setMessage('Google Calendar conectado com sucesso!');
          showSuccessToast('Google Calendar conectado!', 'Você pode agora criar eventos diretamente dos leads');

          // Redirecionar para integrações após sucesso
          setTimeout(() => {
            navigate('/integrations?tab=calendar');
          }, 2000);
        }

      } catch (error) {
        console.error('❌ GOOGLE CALLBACK: Erro no processamento:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setStatus('error');
        setMessage(`Falha na integração: ${errorMessage}`);
        
        // ✅ NOVO: Tratamento específico por serviço
        if (serviceType === 'gmail') {
          showErrorToast('Falha ao conectar Gmail', errorMessage);
          
          // Comunicar erro para popup se for Gmail
          if (window.opener) {
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_ERROR',
              error: errorMessage
            }, window.location.origin);
            window.close();
            return;
          }
        } else {
          showErrorToast('Falha ao conectar Google Calendar', errorMessage);
          
          // Limpar dados temporários mesmo em caso de erro
          localStorage.removeItem('google_calendar_connecting');
          localStorage.removeItem('google_calendar_user_id');
          localStorage.removeItem('google_calendar_tenant_id');
        }

        setTimeout(() => {
          navigate('/integrations');
        }, 3000);
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Ícone e Status */}
        <div className="mb-6">
          {status === 'processing' && (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="text-blue-600 animate-spin" size={32} />
            </div>
          )}
          
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
          )}
          
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
          )}
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {status === 'processing' && (serviceType === 'gmail' ? 'Conectando Gmail' : 'Conectando Google Calendar')}
          {status === 'success' && 'Conexão Bem-sucedida!'}
          {status === 'error' && 'Erro na Conexão'}
        </h1>

        {/* Mensagem */}
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Ícone do serviço */}
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          {serviceType === 'gmail' ? (
            <>
              <Mail size={16} />
              <span>Gmail OAuth Integration</span>
            </>
          ) : (
            <>
              <Calendar size={16} />
              <span>Google Calendar Integration</span>
            </>
          )}
        </div>

        {/* Indicador de progresso */}
        {status === 'processing' && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Informação adicional */}
        <div className="mt-6 text-xs text-gray-400">
          {status === 'processing' && 'Aguarde enquanto processamos sua autenticação...'}
          {status === 'success' && 'Redirecionando para a página de integrações...'}
          {status === 'error' && 'Redirecionando em alguns segundos...'}
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarCallback; 