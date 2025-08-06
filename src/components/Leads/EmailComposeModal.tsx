import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
// ✅ Magic UI components para animações
import { BorderBeam } from '../magicui/border-beam';
import { PulsatingButton } from '../magicui/pulsating-button';
import { Mail, Send, Loader2, AlertCircle, CheckCircle, MessageCircle, FileText, Users } from 'lucide-react';
import { Lead } from '../../types/Pipeline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  selectedTemplate?: string; // ✅ NOVA: Template pré-selecionado
}

interface EmailIntegration {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
  from_email: string;
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

const EmailComposeModal: React.FC<EmailComposeModalProps> = ({ isOpen, onClose, lead, selectedTemplate }) => {
  const { user } = useAuth();
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
  
  // ✅ NOVO: Estado para template selecionado
  const [currentTemplate, setCurrentTemplate] = useState('');

  // ✅ NOVO: Função para aplicar template com substituição de variáveis
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

  // ✅ NOVO: Aplicar template selecionado quando modal abrir
  useEffect(() => {
    if (isOpen && selectedTemplate && selectedTemplate !== currentTemplate) {
      setTimeout(() => applyTemplate(selectedTemplate), 100); // Pequeno delay para UI suave
    }
  }, [isOpen, selectedTemplate, currentTemplate]);

  // Carregar integração de e-mail do usuário
  useEffect(() => {
    if (isOpen && user?.id) {
      loadEmailIntegration();
    }
  }, [isOpen, user?.id]);

  // Preencher dados do lead quando modal abrir
  useEffect(() => {
    if (isOpen && lead) {
      const leadEmail = lead.custom_data?.email || lead.custom_data?.email_lead || '';
      const leadName = lead.custom_data?.nome_lead || lead.custom_data?.nome_oportunidade || 'Lead';
      
      setFormData({
        to: leadEmail,
        subject: `Proposta comercial - ${leadName}`,
        message: `Olá ${leadName},\n\nEspero que esteja bem!\n\nEntrando em contato para apresentar nossa proposta comercial personalizada para suas necessidades.\n\nFico à disposição para esclarecimentos.\n\nAtenciosamente,\n${user?.email?.split('@')[0] || 'Equipe de Vendas'}`
      });
    }
  }, [isOpen, lead, user]);

  const loadEmailIntegration = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_email_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar integração de e-mail:', error);
        setHasIntegration(false);
        return;
      }

      if (data) {
        setEmailIntegration(data);
        setHasIntegration(true);
      } else {
        setHasIntegration(false);
      }
    } catch (error) {
      console.error('Erro ao verificar integração:', error);
      setHasIntegration(false);
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
      
      // ✅ NOVO: Registrar no histórico de emails
      await supabase.from('email_history').insert({
        subject: formData.subject,
        to_email: formData.to,
        from_email: emailIntegration?.from_email,
        status: 'sent',
        sent_at: new Date().toISOString(),
        lead_id: lead.id,
        pipeline_id: lead.pipeline_id || lead.id, // Usar pipeline_id se disponível
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

      // Fechar modal após 2 segundos
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      setError(error instanceof Error ? error.message : 'Erro ao enviar e-mail');
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar E-mail
          </DialogTitle>
        </DialogHeader>

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
            <Button onClick={onClose} variant="outline">
              Ir para Integrações
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Informações do remetente */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>De:</strong> {emailIntegration?.from_name} &lt;{emailIntegration?.from_email}&gt;
              </p>
            </div>

            {/* ✅ NOVO: Seletor de templates */}
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
              <Label htmlFor="to">Para</Label>
              <Input
                id="to"
                type="email"
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="email@exemplo.com"
                disabled={sending}
              />
            </div>

            {/* Assunto */}
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Assunto do e-mail"
                disabled={sending}
              />
            </div>

            {/* Mensagem */}
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
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
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancelar
              </Button>
              <PulsatingButton 
                onClick={handleSendEmail} 
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposeModal; 