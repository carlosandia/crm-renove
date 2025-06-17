
import React, { useState } from 'react';
import { X, Clock, User, Send, MessageSquare, Edit, Trash2 } from 'lucide-react';

interface LeadActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

const LeadActionsModal: React.FC<LeadActionsModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'email' | 'comments'>('history');
  const [emailContent, setEmailContent] = useState('');
  const [newComment, setNewComment] = useState('');

  if (!isOpen) return null;

  // Mock data para demonstração
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

  const comments = [
    {
      id: '1',
      content: 'Cliente muito interessado no produto, agendar reunião.',
      user: 'Marina Silva',
      timestamp: '2024-06-17 10:15',
      pipeline: 'Pipeline de Vendas'
    }
  ];

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'created': return '✨';
      case 'moved': return '🔄';
      case 'edited': return '✏️';
      case 'email': return '📧';
      case 'call': return '📞';
      default: return '📋';
    }
  };

  const handleSendEmail = () => {
    // Lógica para enviar email
    console.log('Enviando email:', emailContent);
    setEmailContent('');
    // Adicionar ao histórico
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Lógica para adicionar comentário
      console.log('Novo comentário:', newComment);
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'email'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              E-mail
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'comments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Comentários
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history' && (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                    {getHistoryIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">{item.user}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{item.timestamp}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-blue-600">{item.stage}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assunto
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Assunto do e-mail"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Digite sua mensagem..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSendEmail}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar E-mail</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Novo comentário */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar comentário
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Digite seu comentário..."
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddComment}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Comentar</span>
                  </button>
                </div>
              </div>

              {/* Lista de comentários */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{comment.user}</span>
                          <span className="text-xs text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        <p className="text-xs text-gray-500 mt-1">Pipeline: {comment.pipeline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadActionsModal;
