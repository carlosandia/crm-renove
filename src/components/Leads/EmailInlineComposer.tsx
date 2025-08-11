import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
// ✅ Magic UI components para animações
import { BorderBeam } from '../magicui/border-beam';
import { PulsatingButton } from '../magicui/pulsating-button';
import { Mail, Send, Loader2, AlertCircle, CheckCircle, MessageCircle, FileText, Users, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Lead } from '../../types/Pipeline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EmailInlineComposerProps {
  lead: Lead;
  onEmailSent?: (success: boolean, message: string) => void; // Callback para notificar resultado
}

interface EmailIntegration {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string; // ✅ CORREÇÃO: usar nome correto da coluna
  smtp_password_encrypted: string; // ✅ CORREÇÃO: usar nome correto da coluna
  display_name: string; // ✅ CORREÇÃO: usar nome correto da coluna
  email_address: string; // ✅ CORREÇÃO: usar nome correto da coluna
  is_active: boolean;
}

// ✅ TEMPLATES PADRÃO DO MERCADO (baseado em Pipedrive, HubSpot)
const EMAIL_TEMPLATES = {
  'follow-up': {
    name: 'Follow-up',
    icon: MessageCircle,
    subject: 'Seguimento - {{nome_lead}}',
    message: `Olá {{nome_lead}},

Espero que esteja tudo bem!

Gostaria de dar seguimento à nossa conversa sobre como podemos ajudar {{empresa}} a alcançar seus objetivos.

Você tem alguns minutos para conversarmos ainda esta semana?

Fico à disposição para qualquer esclarecimento.

Atenciosamente,
{{nome_usuario}}`
  },
  'proposal': {
    name: 'Proposta Comercial',
    icon: FileText,
    subject: 'Proposta Comercial - {{empresa}}',
    message: `Prezado(a) {{nome_lead}},

Conforme nossa conversa, segue em anexo nossa proposta comercial personalizada para {{empresa}}.

Nossa solução foi desenvolvida especificamente para atender às necessidades que identificamos:
• Otimização de processos
• Aumento de produtividade
• Redução de custos operacionais

Estou à disposição para esclarecer qualquer dúvida e para agendarmos uma apresentação detalhada.

Aguardo seu retorno.

Atenciosamente,
{{nome_usuario}}`
  },
  'thank-you': {
    name: 'Agradecimento',
    icon: Users,
    subject: 'Obrigado pelo seu tempo - {{nome_lead}}',
    message: `{{nome_lead}},

Obrigado pelo tempo dedicado à nossa reunião hoje.

Foi um prazer conhecer mais sobre {{empresa}} e como podemos contribuir para o crescimento da empresa.

Conforme conversamos, vou preparar uma proposta personalizada e envio até {{data_prometida}}.

Qualquer dúvida, estarei à disposição.

Atenciosamente,
{{nome_usuario}}`
  }
};

const EmailInlineComposer: React.FC<EmailInlineComposerProps> = ({ lead, onEmailSent }) => {
  const { user } = useAuth();
  
  // Estados principais
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegration | null>(null);
  const [hasIntegration, setHasIntegration] = useState(false);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: ''
  });

  // Estados de feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para template selecionado
  const [currentTemplate, setCurrentTemplate] = useState('');

  // ✅ Função para aplicar template com substituição de variáveis
  const applyTemplate = (templateId: string) => {
    const template = EMAIL_TEMPLATES[templateId as keyof typeof EMAIL_TEMPLATES];
    if (!template) return;

    const leadName = lead.custom_data?.nome_lead || lead.custom_data?.nome_oportunidade || 'Lead';
    const empresa = lead.custom_data?.empresa || lead.custom_data?.nome_empresa || 'sua empresa';
    const userName = user?.email?.split('@')[0] || 'Equipe de Vendas';
    const dataPrometida = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

    // Substituir variáveis no assunto e mensagem
    const subject = template.subject
      .replace(/{{nome_lead}}/g, leadName)
      .replace(/{{empresa}}/g, empresa)
      .replace(/{{nome_usuario}}/g, userName);

    const message = template.message
      .replace(/{{nome_lead}}/g, leadName)
      .replace(/{{empresa}}/g, empresa)
      .replace(/{{nome_usuario}}/g, userName)
      .replace(/{{data_prometida}}/g, dataPrometida);

    setFormData(prev => ({
      ...prev,
      subject,
      message
    }));
    
    setCurrentTemplate(templateId);
    console.log('✅ Template aplicado:', template.name);
  };

  // ✅ Carregar integração e dados do lead quando componente expandir (com error handling)
  useEffect(() => {
    if (isExpanded && user?.id) {
      // AIDEV-NOTE: Error handling crítico para prevenir modal closure
      const loadDataSafely = async () => {
        try {
          await loadEmailIntegration();
          initializeFormData();
        } catch (error) {
          console.error('📧 [EmailInlineComposer] Erro ao carregar dados:', error);
          setError('Erro ao carregar configurações de e-mail. Tente novamente.');
          setLoading(false);
          // Não propagar erro para evitar fechamento do modal pai
        }
      };
      
      loadDataSafely();
    }
  }, [isExpanded, user?.id]);

  // ✅ Inicializar dados do formulário
  const initializeFormData = () => {
    if (!lead) return;
    
    const leadEmail = lead.custom_data?.email || lead.custom_data?.email_lead || '';
    const leadName = lead.custom_data?.nome_lead || lead.custom_data?.nome_oportunidade || 'Lead';
    
    setFormData({
      to: leadEmail,
      subject: `Proposta comercial - ${leadName}`,
      message: `Olá ${leadName},\n\nEspero que esteja bem!\n\nEntrando em contato para apresentar nossa proposta comercial personalizada para suas necessidades.\n\nFico à disposição para esclarecimentos.\n\nAtenciosamente,\n${user?.email?.split('@')[0] || 'Equipe de Vendas'}`
    });
  };

  const loadEmailIntegration = async () => {
    if (!user?.id) {
      console.warn('📧 [EmailInlineComposer] User ID não disponível');
      return;
    }

    setLoading(true);
    setError(''); // Limpar erros anteriores
    
    try {
      const { data, error } = await supabase
        .from('user_email_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('📧 [EmailInlineComposer] Erro ao carregar integração:', error);
        setError('Erro ao carregar integração de e-mail. Verifique suas configurações.');
        setHasIntegration(false);
        return;
      }

      if (data) {
        console.log('📧 [EmailInlineComposer] Integração carregada com sucesso');
        setEmailIntegration(data);
        setHasIntegration(true);
      } else {
        console.log('📧 [EmailInlineComposer] Nenhuma integração ativa encontrada');
        setHasIntegration(false);
      }
    } catch (error) {
      console.error('📧 [EmailInlineComposer] Exceção ao verificar integração:', error);
      setError('Erro interno ao verificar integração de e-mail.');
      setHasIntegration(false);
      // AIDEV-NOTE: Não re-throw para evitar exceção não tratada
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!formData.to || !formData.subject || !formData.message) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (!emailIntegration) {
      setError('Nenhuma integração de e-mail configurada');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.to,
          subject: formData.subject,
          message: formData.message,
          lead_id: lead.id,
          user_id: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar e-mail');
      }

      setSuccess('E-mail enviado com sucesso!');
      
      // ✅ Registrar no histórico de emails
      try {
        await supabase.from('email_history').insert({
          subject: formData.subject,
          to_email: formData.to,
          from_email: emailIntegration?.email_address,
          status: 'sent',
          sent_at: new Date().toISOString(),
          lead_id: lead.id,
          pipeline_id: lead.pipeline_id || lead.id,
          user_id: user?.id,
          tenant_id: user?.user_metadata?.tenant_id
        });

        // Registrar atividade no lead
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          activity_type: 'email_sent',
          description: `E-mail enviado: ${formData.subject}`,
          user_id: user?.id,
          created_at: new Date().toISOString()
        });
      } catch (historyError) {
        console.warn('Erro ao salvar histórico de e-mail:', historyError);
      }

      // ✅ Notificar componente pai sobre sucesso
      onEmailSent?.(true, 'E-mail enviado com sucesso!');

      // ✅ Resetar formulário e colapsar após sucesso
      setTimeout(() => {
        setIsExpanded(false);
        setSuccess('');
        setCurrentTemplate('');
        setFormData({ to: '', subject: '', message: '' });
      }, 2000);

    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar e-mail';
      setError(errorMessage);
      onEmailSent?.(false, errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setError('');
    setSuccess('');
    setCurrentTemplate('');
    // Manter dados do formulário para continuidade
  };

  // ✅ Estado colapsado - apenas botão
  if (!isExpanded) {
    return (
      <div className="w-full">
        <Button
          onClick={(e) => {
            // AIDEV-NOTE: Prevenir event propagation para evitar modal closure
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
        >
          <Mail className="w-4 h-4" />
          <span className="font-medium">Compor E-mail</span>
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // ✅ Estado expandido - formulário completo
  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header do formulário */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Edit3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Compor E-mail</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            // AIDEV-NOTE: Prevenir event propagation
            e.preventDefault();
            e.stopPropagation();
            handleCancel();
          }}
          disabled={sending}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando configurações...</span>
          </div>
        ) : !hasIntegration ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-medium mb-2">Configuração Necessária</h3>
            <p className="text-gray-600 mb-4">
              Você precisa configurar sua conta de e-mail pessoal antes de enviar e-mails.
            </p>
            <Button 
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Implementar navegação para página de integrações
                console.log('🔗 Redirecionamento para integrações');
              }}
            >
              Ir para Integrações
            </Button>
          </div>
        ) : (
          <>
            {/* Informações do remetente */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>De:</strong> {emailIntegration?.display_name || emailIntegration?.smtp_username} &lt;{emailIntegration?.email_address}&gt;
              </p>
            </div>

            {/* ✅ Seletor de templates */}
            <div className="relative flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg overflow-hidden">
              <BorderBeam 
                size={40} 
                duration={15} 
                colorFrom="rgba(59, 130, 246, 0.2)" 
                colorTo="rgba(147, 51, 234, 0.2)" 
              />
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Template:</span>
              </div>
              <Select value={currentTemplate} onValueChange={applyTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Escolher template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Criar do zero</SelectItem>
                  {Object.entries(EMAIL_TEMPLATES).map(([id, template]) => {
                    const IconComponent = template.icon;
                    return (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Para */}
            <div>
              <Label htmlFor="inline-to">Para</Label>
              <Input
                id="inline-to"
                type="email"
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="email@exemplo.com"
                disabled={sending}
              />
            </div>

            {/* Assunto */}
            <div>
              <Label htmlFor="inline-subject">Assunto</Label>
              <Input
                id="inline-subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Assunto do e-mail"
                disabled={sending}
              />
            </div>

            {/* Mensagem */}
            <div>
              <Label htmlFor="inline-message">Mensagem</Label>
              <Textarea
                id="inline-message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={8}
                disabled={sending}
                className="resize-none"
              />
            </div>

            {/* Feedback */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancel();
                }} 
                disabled={sending}
              >
                Cancelar
              </Button>
              <PulsatingButton 
                onClick={(e) => {
                  // AIDEV-NOTE: Prevenir event propagation crítico para botão de envio
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendEmail();
                }} 
                disabled={sending || !formData.to || !formData.subject || !formData.message}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                pulseColor="rgba(59, 130, 246, 0.5)"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar E-mail
                  </>
                )}
              </PulsatingButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailInlineComposer;