import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ✅ Componente de Callback OAuth para Gmail
 * Processa o retorno da autenticação OAuth e comunica com a janela pai
 * ✅ SIMPLIFICADO: Funciona sem dependências complexas
 */
const OAuthCallback: React.FC = () => {
  useEffect(() => {
    const handleOAuthCallback = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        console.log('🔍 [OAuth Callback] Parâmetros recebidos:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          state: state?.substring(0, 12) + '...'
        });

        if (error) {
          console.error('❌ [OAuth Callback] Erro OAuth:', error, errorDescription);
          
          // Comunicar erro para janela pai
          if (window.opener) {
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_ERROR',
              error: errorDescription || error || 'Erro na autenticação OAuth'
            }, window.location.origin);
          }
          
          window.close();
          return;
        }

        if (code && state) {
          // ✅ Verificar se é um state de Gmail OAuth
          if (state.startsWith('gmail_')) {
            console.log('✅ [OAuth Callback] Código OAuth Gmail recebido:', {
              code: code.substring(0, 10) + '...',
              state: state.substring(0, 12) + '...'
            });

            // Comunicar sucesso para janela pai
            if (window.opener) {
              window.opener.postMessage({
                type: 'GMAIL_OAUTH_SUCCESS',
                code,
                state
              }, window.location.origin);
            }
            
            // Fechar popup após um pequeno delay
            setTimeout(() => {
              window.close();
            }, 1000);
            
          } else {
            console.log('🔄 [OAuth Callback] Callback não é para Gmail - redirecionando...');
            // Para outros tipos de OAuth (Google Calendar, etc.) - manter comportamento original
            window.location.href = '/auth/google/callback' + window.location.search;
          }
          
        } else {
          console.error('❌ [OAuth Callback] Parâmetros OAuth ausentes');
          
          if (window.opener) {
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_ERROR',
              error: 'Parâmetros de autenticação ausentes'
            }, window.location.origin);
          }
          
          window.close();
        }
      } catch (error: any) {
        console.error('❌ [OAuth Callback] Erro ao processar callback:', error);
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'GMAIL_OAUTH_ERROR',
            error: error?.message || 'Erro interno no callback OAuth'
          }, window.location.origin);
        }
        
        window.close();
      }
    };

    // Processar callback imediatamente
    handleOAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Processando autenticação...
        </h2>
        <p className="text-sm text-gray-600">
          Aguarde enquanto conectamos sua conta Gmail
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;