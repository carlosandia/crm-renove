import React, { useState, useEffect } from 'react';
import { X, Clock, User, Send, MessageSquare, Edit, Trash2, FileText, Mail, Phone, Calendar, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast, showWarningToast } from '../../hooks/useToast';

interface LeadActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

interface Annotation {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  created_at: string;
  updated_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

const LeadActionsModal: React.FC<LeadActionsModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'history' | 'email' | 'annotations'>('history');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [newAnnotation, setNewAnnotation] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailTemplates] = useState<EmailTemplate[]>([
    {
      id: '1',
      name: 'Primeiro Contato',
      subject: 'Olá {{nome}}, vamos conversar sobre sua necessidade?',
      content: `Olá {{nome}},

Espero que esteja bem!

Vi que você demonstrou interesse em nossos serviços e gostaria de entender melhor como podemos ajudar {{empresa}} a alcançar seus objetivos.

Que tal agendarmos uma conversa de 15 minutos para entender suas necessidades?

Estou disponível nos seguintes horários:
- {{data1}}
- {{data2}}
- {{data3}}

Aguardo seu retorno!

Atenciosamente,
{{assinatura}}`
    },
    {
      id: '2',
      name: 'Follow-up',
      subject: 'Re: {{nome}} - Seguimento da nossa conversa',
      content: `Olá {{nome}},

Espero que esteja bem!

Gostaria de fazer um follow-up da nossa última conversa sobre {{assunto}}.

Conforme combinado, estou enviando:
- {{item1}}
- {{item2}}
- {{item3}}

Fico à disposição para esclarecer qualquer dúvida.

Atenciosamente,
{{assinatura}}`
    },
    {
      id: '3',
      name: 'Proposta Comercial',
      subject: 'Proposta Comercial - {{empresa}}',
      content: `Olá {{nome}},

Conforme nossa conversa, estou enviando a proposta comercial para {{empresa}}.

A proposta inclui:
- {{servico1}}
- {{servico2}}
- {{servico3}}

Valor do investimento: {{valor}}
Prazo de implementação: {{prazo}}

Estou à disposição para esclarecer qualquer dúvida e ajustar a proposta conforme necessário.

Atenciosamente,
{{assinatura}}`
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadAnnotations();
    }
  }, [isOpen, leadId]);

  const loadAnnotations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lead_annotations')
        .select(`
          id,
          content,
          user_id,
          created_at,
          updated_at,
          users!lead_annotations_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar anotações:', error);
        return;
      }

      const formattedAnnotations: Annotation[] = (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        user_id: item.user_id,
        user_name: item.users ? `${item.users.first_name} ${item.users.last_name}` : 'Usuário',
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      setAnnotations(formattedAnnotations);
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnnotation = async () => {
    if (!newAnnotation.trim()) return;

    try {
      const { data, error } = await supabase
        .from('lead_annotations')
        .insert({
          lead_id: leadId,
          content: newAnnotation.trim(),
          user_id: user?.id
        })
        .select(`
          id,
          content,
          user_id,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Erro ao adicionar anotação:', error);
        showErrorToast('Erro ao adicionar', 'Erro ao adicionar anotação');
        return;
      }

      const newAnnotationObj: Annotation = {
        id: data.id,
        content: data.content,
        user_id: data.user_id,
        user_name: `${user?.first_name} ${user?.last_name}`,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setAnnotations([newAnnotationObj, ...annotations]);
      setNewAnnotation('');
    } catch (error) {
      console.error('Erro ao adicionar anotação:', error);
      showErrorToast('Erro ao adicionar', 'Erro ao adicionar anotação');
    }
  };

  const handleEditAnnotation = async (annotationId: string) => {
    if (!editingContent.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_annotations')
        .update({
          content: editingContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', annotationId);

      if (error) {
        console.error('Erro ao editar anotação:', error);
        showErrorToast('Erro ao editar', 'Erro ao editar anotação');
        return;
      }

      setAnnotations(annotations.map(annotation => 
        annotation.id === annotationId 
          ? { ...annotation, content: editingContent.trim(), updated_at: new Date().toISOString() }
          : annotation
      ));

      setEditingAnnotation(null);
      setEditingContent('');
    } catch (error) {
      console.error('Erro ao editar anotação:', error);
      showErrorToast('Erro ao editar', 'Erro ao editar anotação');
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) return;

    try {
      const { error } = await supabase
        .from('lead_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) {
        console.error('Erro ao excluir anotação:', error);
        showErrorToast('Erro ao excluir', 'Erro ao excluir anotação');
        return;
      }

      setAnnotations(annotations.filter(annotation => annotation.id !== annotationId));
    } catch (error) {
      console.error('Erro ao excluir anotação:', error);
      showErrorToast('Erro ao excluir', 'Erro ao excluir anotação');
    }
  };

  const startEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotation(annotation.id);
    setEditingContent(annotation.content);
  };

  const cancelEditAnnotation = () => {
    setEditingAnnotation(null);
    setEditingContent('');
  };

  const applyEmailTemplate = (template: EmailTemplate) => {
    setEmailSubject(template.subject);
    setEmailContent(template.content);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('email-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = emailContent.substring(0, start) + variable + emailContent.substring(end);
      setEmailContent(newContent);
      
      // Reposicionar cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      showWarningToast('Campos obrigatórios', 'Preencha o assunto e a mensagem do email');
      return;
    }

    try {
      // Salvar o email no histórico
      const { error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: 'email',
          activity_title: `Email: ${emailSubject}`,
          activity_description: emailContent,
          user_id: user?.id,
          completed: true
        });

      if (error) {
        console.error('Erro ao salvar email no histórico:', error);
      }

      // Aqui você integraria com um serviço de email real
      console.log('Enviando email:', { subject: emailSubject, content: emailContent });
      
      showSuccessToast('Email enviado', 'Email enviado com sucesso!');
      setEmailSubject('');
      setEmailContent('');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      showErrorToast('Erro ao enviar', 'Erro ao enviar email');
    }
  };

  // Mock data para demonstração do histórico
  const historyItems = [
    {
      id: '1',
      type: 'created',
      description: 'Lead criado',
      user: 'Marina Silva',
      timestamp: '2024-06-17 09:30',
      stage: 'Novos Leads'
    },
    {
      id: '2',
      type: 'moved',
      description: 'Movido para Qualificados',
      user: 'Marina Silva',
      timestamp: '2024-06-16 14:20',
      stage: 'Qualificados'
    },
    {
      id: '3',
      type: 'edited',
      description: 'Informações atualizadas',
      user: 'Marina Silva',
      timestamp: '2024-06-15 16:45',
      stage: 'Qualificados'
    }
  ];

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'created': return <Plus className="w-4 h-4 text-gray-500" />;
      case 'moved': return <RotateCcw className="w-4 h-4 text-gray-500" />;
      case 'edited': return <Edit className="w-4 h-4 text-gray-500" />;
      case 'email': return <Mail className="w-4 h-4 text-gray-500" />;
      case 'call': return <Phone className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const emailVariables = [
    { label: 'Nome do Lead', value: '{{nome}}' },
    { label: 'Empresa', value: '{{empresa}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Telefone', value: '{{telefone}}' },
    { label: 'Data Atual', value: '{{data_atual}}' },
    { label: 'Assinatura', value: '{{assinatura}}' },
    { label: 'Nome do Vendedor', value: '{{vendedor}}' },
    { label: 'Valor da Proposta', value: '{{valor}}' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Ações do Lead</h2>
            <p className="text-sm text-gray-500">{leadName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'email'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              E-mail
            </button>
            <button
              onClick={() => setActiveTab('annotations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'annotations'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Anotações
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history' && (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                    {getHistoryIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">{item.user}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{item.timestamp}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600">{item.stage}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'email' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Templates e Variáveis */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Templates de Email</h3>
                  <div className="space-y-2">
                    {emailTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyEmailTemplate(template)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate">{template.subject}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Variáveis Disponíveis</h3>
                  <div className="space-y-1">
                    {emailVariables.map((variable, index) => (
                      <button
                        key={index}
                        onClick={() => insertVariable(variable.value)}
                        className="w-full text-left p-2 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title={`Clique para inserir ${variable.value}`}
                      >
                        <span className="font-mono text-gray-600">{variable.value}</span>
                        <span className="ml-2">{variable.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Composer de Email */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assunto *
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Assunto do e-mail"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    id="email-content"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none font-mono text-sm"
                    placeholder="Digite sua mensagem... Use as variáveis disponíveis para personalizar o email."
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Dica: Use as variáveis da esquerda para personalizar automaticamente o email com dados do lead
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSendEmail}
                    disabled={!emailSubject.trim() || !emailContent.trim()}
                    className="flex items-center space-x-2 bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar E-mail</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'annotations' && (
            <div className="space-y-6">
              {/* Nova anotação */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Adicionar Anotação
                </label>
                <textarea
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Digite sua anotação sobre este lead..."
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddAnnotation}
                    disabled={!newAnnotation.trim()}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Adicionar Anotação</span>
                  </button>
                </div>
              </div>

              {/* Lista de anotações */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Carregando anotações...</p>
                  </div>
                ) : annotations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma anotação encontrada</p>
                    <p className="text-gray-400 text-sm">Adicione a primeira anotação sobre este lead</p>
                  </div>
                ) : (
                  annotations.map((annotation) => (
                    <div key={annotation.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">{annotation.user_name}</span>
                              <span className="text-xs text-gray-500">{formatDateTime(annotation.created_at)}</span>
                              {annotation.updated_at !== annotation.created_at && (
                                <span className="text-xs text-gray-400">(editado)</span>
                              )}
                            </div>
                            
                            {editingAnnotation === annotation.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEditAnnotation(annotation.id)}
                                    disabled={!editingContent.trim()}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={cancelEditAnnotation}
                                    className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{annotation.content}</p>
                            )}
                          </div>
                        </div>
                        
                        {editingAnnotation !== annotation.id && annotation.user_id === user?.id && (
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => startEditAnnotation(annotation)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar anotação"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnotation(annotation.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Excluir anotação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadActionsModal;
