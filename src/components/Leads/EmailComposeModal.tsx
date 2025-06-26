import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Mail, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Lead } from '../../types/Pipeline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
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

const EmailComposeModal: React.FC<EmailComposeModalProps> = ({ isOpen, onClose, lead }) => {
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
              <Button onClick={handleSendEmail} disabled={sending || !formData.to || !formData.subject || !formData.message}>
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
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposeModal; 