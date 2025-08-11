import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Lead } from '../../types/Pipeline';
import { useAuth } from '../../providers/AuthProvider';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

interface SimpleEmailFormProps {
  lead: Lead;
  onEmailSent?: (success: boolean, message: string) => void;
}

interface EmailFormData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
}

/**
 * ✅ COMPONENTE ULTRA SIMPLES COM MAGIC UI PATTERNS
 * - React Hook Form básico
 * - Campos diretos: Para, CC (colapsável), CCO (colapsável), Assunto, Mensagem
 * - Magic UI collapsible patterns para CC/CCO
 * - Autenticação via api service (automática)
 */
const SimpleEmailForm: React.FC<SimpleEmailFormProps> = ({ lead, onEmailSent }) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | ''>('');
  
  // ✅ Estados para controlar visibilidade CC/CCO (Magic UI pattern)
  const [showCC, setShowCC] = useState(false);
  const [showCCO, setShowCCO] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<EmailFormData>({
    defaultValues: {
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      message: ''
    }
  });

  // ✅ Inicializar campos quando componente carregar
  useEffect(() => {
    if (!lead) return;

    // Preencher email do lead automaticamente
    const leadEmail = lead.custom_data?.email || lead.custom_data?.email_lead || '';
    const leadName = lead.custom_data?.nome_lead || lead.custom_data?.nome_oportunidade || 'Lead';
    
    setValue('to', leadEmail);
    setValue('subject', `Contato comercial - ${leadName}`);
    setValue('message', `Olá ${leadName},\n\nEspero que esteja bem!\n\nEntrando em contato para apresentar nossa solução.\n\nFico à disposição para esclarecimentos.\n\nAtenciosamente,\n${user?.email?.split('@')[0] || 'Equipe de Vendas'}`);
  }, [lead, user, setValue]);

  // ✅ FUNÇÃO DE TESTE DE CONECTIVIDADE SMTP (usando configuração salva)
  const testConnection = async () => {
    try {
      setSending(true);
      setFeedbackMessage('Testando conectividade com configuração salva...');
      setFeedbackType('');

      console.log('🧪 [SimpleEmailForm] Testando conectividade SMTP com configuração existente...');

      // Usar a rota de teste que verifica a configuração salva do usuário
      const response = await api.post('/simple-email/test-connection');

      console.log('✅ [SimpleEmailForm] Teste de conectividade bem-sucedido:', response.data);

      setFeedbackMessage('✅ Conectividade SMTP OK! Sistema pronto para envio de emails.');
      setFeedbackType('success');

    } catch (error: any) {
      console.error('❌ [SimpleEmailForm] Erro no teste de conectividade:', error);
      
      let errorMessage = 'Erro no teste de conectividade SMTP';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        // Adicionar sugestão se disponível
        if (error.response.data.suggestion) {
          errorMessage += `. ${error.response.data.suggestion}`;
        }
      } else if (error.message?.includes('401')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.message?.includes('400')) {
        errorMessage = 'Nenhuma configuração SMTP encontrada. Configure primeiro em Integrações → E-mail pessoal.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setFeedbackMessage(`❌ ${errorMessage}`);
      setFeedbackType('error');
      
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (data: EmailFormData) => {
    try {
      setSending(true);
      setFeedbackMessage('Enviando e-mail...');
      setFeedbackType('');

      console.log('📧 [SimpleEmailForm] Enviando email:', {
        to: data.to,
        subject: data.subject.substring(0, 50) + '...',
        leadId: lead.id.substring(0, 8)
      });

      // ✅ USANDO ROTA ULTRA SIMPLES
      const response = await api.post('/simple-email/send', {
        to: data.to,
        cc: data.cc || undefined,
        bcc: data.bcc || undefined, 
        subject: data.subject,
        message: data.message,
        lead_id: lead.id
      });

      setFeedbackMessage('✅ E-mail enviado com sucesso!');
      setFeedbackType('success');
      
      // Callback para notificar sucesso
      onEmailSent?.(true, 'E-mail enviado com sucesso!');

      console.log('✅ [SimpleEmailForm] Email enviado:', response.data);

    } catch (error: any) {
      console.error('❌ [SimpleEmailForm] Erro ao enviar email:', error);
      
      // ✅ CORREÇÃO: Tratamento de erros melhorado
      let errorMessage = 'Erro ao enviar e-mail';
      
      if (error.message?.includes('HTTP 401') || error.message?.includes('401')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.message?.includes('HTTP 400')) {
        errorMessage = 'Dados inválidos. Verifique os campos.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        // Adicionar sugestão se disponível
        if (error.response.data.suggestion) {
          errorMessage += `. ${error.response.data.suggestion}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setFeedbackMessage(`❌ ${errorMessage}`);
      setFeedbackType('error');
      
      // Callback para notificar erro
      onEmailSent?.(false, errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ✅ Formulário direto - sem complexidade */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Para (obrigatório) */}
        <div>
          <Label htmlFor="to">Para *</Label>
          <Input
            id="to"
            type="email"
            placeholder="email@exemplo.com"
            {...register('to', { 
              required: 'Email é obrigatório',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido'
              }
            })}
          />
          {errors.to && (
            <p className="text-sm text-red-600 mt-1">{errors.to.message}</p>
          )}
        </div>

        {/* ✅ Magic UI Pattern: Botões de ação para mostrar CC/CCO */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCC(!showCC)}
            className={cn(
              "text-sm text-gray-600 hover:text-gray-800 transition-colors",
              showCC && "text-blue-600 hover:text-blue-700"
            )}
          >
            <Plus className={cn("w-3 h-3 mr-1 transition-transform", showCC && "rotate-45")} />
            CC
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCCO(!showCCO)}
            className={cn(
              "text-sm text-gray-600 hover:text-gray-800 transition-colors",
              showCCO && "text-blue-600 hover:text-blue-700"
            )}
          >
            <Plus className={cn("w-3 h-3 mr-1 transition-transform", showCCO && "rotate-45")} />
            CCO
          </Button>
        </div>

        {/* ✅ CC Colapsável (só aparece quando clicado) */}
        {showCC && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2 mb-1">
              <Label htmlFor="cc" className="text-sm">CC</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCC(false)}
                className="p-0 h-auto text-gray-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <Input
              id="cc"
              type="email"
              placeholder="copia@exemplo.com"
              {...register('cc')}
              className="transition-all duration-200"
            />
          </div>
        )}

        {/* ✅ CCO Colapsável (só aparece quando clicado) */}
        {showCCO && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2 mb-1">
              <Label htmlFor="bcc" className="text-sm">CCO</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCCO(false)}
                className="p-0 h-auto text-gray-400 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <Input
              id="bcc"
              type="email"
              placeholder="copia.oculta@exemplo.com"
              {...register('bcc')}
              className="transition-all duration-200"
            />
          </div>
        )}

        {/* Assunto (obrigatório) */}
        <div>
          <Label htmlFor="subject">Assunto *</Label>
          <Input
            id="subject"
            type="text"
            placeholder="Assunto do e-mail"
            {...register('subject', { required: 'Assunto é obrigatório' })}
          />
          {errors.subject && (
            <p className="text-sm text-red-600 mt-1">{errors.subject.message}</p>
          )}
        </div>

        {/* Mensagem (obrigatória) */}
        <div>
          <Label htmlFor="message">Mensagem *</Label>
          <Textarea
            id="message"
            rows={8}
            placeholder="Digite sua mensagem..."
            {...register('message', { required: 'Mensagem é obrigatória' })}
          />
          {errors.message && (
            <p className="text-sm text-red-600 mt-1">{errors.message.message}</p>
          )}
        </div>

        {/* ✅ Feedback de envio */}
        {feedbackMessage && (
          <div className={`flex items-center space-x-2 p-3 rounded-md ${
            feedbackType === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {feedbackType === 'success' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <p className={`text-sm ${
              feedbackType === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {feedbackMessage}
            </p>
          </div>
        )}

        {/* ✅ Botões de ação */}
        <div className="flex space-x-2">
          {/* Botão de teste de conectividade */}
          <Button 
            type="button" 
            variant="outline"
            onClick={testConnection}
            disabled={sending}
            className="flex-1"
          >
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Testar SMTP
            </>
          </Button>
          
          {/* Botão principal de envio */}
          <Button 
            type="submit" 
            className="flex-[2]" 
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar E-mail
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SimpleEmailForm;