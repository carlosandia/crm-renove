import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  User, 
  Building, 
  Eye, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Facebook, 
  Chrome, 
  Linkedin, 
  Globe, 
  FileText, 
  Zap,
  RefreshCw
} from 'lucide-react';

// Importar componentes extraídos
import { FeedbackFilters } from './filters/FeedbackFilters';
import { useFeedbackData, type FeedbackData } from './data/FeedbackLoader';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface FeedbackModuleProps {}

// ============================================
// HOOK PARA UI DO FEEDBACK MODULE
// ============================================

const useFeedbackModuleUI = (filteredFeedbacks: FeedbackData[]) => {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Funções de formatação
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  const toggleCommentExpansion = useCallback((feedbackId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(feedbackId)) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }
    setExpandedComments(newExpanded);
  }, [expandedComments]);

  const truncateComment = useCallback((comment: string, maxLength: number = 120) => {
    if (comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + '...';
  }, []);

  const getSourceIcon = useCallback((source?: string) => {
    switch (source) {
      case 'meta':
        return { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Meta Ads' };
      case 'google':
        return { icon: Chrome, color: 'text-red-600', bg: 'bg-red-100', label: 'Google Ads' };
      case 'linkedin':
        return { icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-100', label: 'LinkedIn Ads' };
      case 'webhook':
        return { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Webhook' };
      case 'form':
        return { icon: FileText, color: 'text-green-600', bg: 'bg-green-100', label: 'Formulário' };
      case 'manual':
        return { icon: User, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Manual' };
      default:
        return { icon: Globe, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Não informado' };
    }
  }, []);

  const handleStageClick = useCallback((feedback: FeedbackData) => {
    // Aqui você pode implementar a navegação para os detalhes da oportunidade
    if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
      logger.debug('FeedbackModule abrir detalhes da oportunidade', `${feedback.lead.id} - ${feedback.stage.name}`);
    }
    // Exemplo: navigate(`/pipeline/${feedback.pipeline.id}/lead/${feedback.lead.id}`);
  }, []);

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredFeedbacks.length;
    const positive = filteredFeedbacks.filter(f => f.feedback_type === 'positive').length;
    const negative = filteredFeedbacks.filter(f => f.feedback_type === 'negative').length;
    const companies = new Set(filteredFeedbacks.map(f => f.admin_empresa.company_name)).size;
    const vendors = new Set(filteredFeedbacks.map(f => f.vendedor.id)).size;

    return {
      total,
      positive,
      negative,
      companies,
      vendors,
      satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 0
    };
  }, [filteredFeedbacks]);

  return {
    selectedFeedback,
    setSelectedFeedback,
    expandedComments,
    formatDate,
    formatCurrency,
    toggleCommentExpansion,
    truncateComment,
    getSourceIcon,
    handleStageClick,
    stats
  };
};

// ============================================
// COMPONENTE PRINCIPAL REFATORADO
// ============================================

export const FeedbackModuleRefactored: React.FC<FeedbackModuleProps> = () => {
  const { user } = useAuth();
  const { feedbacks, loading, refreshData } = useFeedbackData();
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<FeedbackData[]>([]);
  
  const {
    selectedFeedback,
    setSelectedFeedback,
    expandedComments,
    formatDate,
    formatCurrency,
    toggleCommentExpansion,
    truncateComment,
    getSourceIcon,
    handleStageClick,
    stats
  } = useFeedbackModuleUI(filteredFeedbacks);

  // Callback para receber feedbacks filtrados
  const handleFiltersChange = useCallback((filtered: FeedbackData[]) => {
    setFilteredFeedbacks(filtered);
  }, []);

  // Verificar permissões
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas Super Admins podem acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedbacks dos Vendedores</h1>
          <p className="text-gray-600">Análise de feedbacks sobre leads e oportunidades</p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ThumbsUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.positive}</div>
              <div className="text-sm text-gray-500">Feedbacks Positivos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ThumbsDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.negative}</div>
              <div className="text-sm text-gray-500">Feedbacks Negativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.vendors}</div>
              <div className="text-sm text-gray-500">Vendedores Ativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</div>
              <div className="text-sm text-gray-500">Taxa de Satisfação</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sistema de Filtros */}
      <FeedbackFilters 
        feedbacks={feedbacks} 
        onFiltersChange={handleFiltersChange}
      />

      {/* Lista de Feedbacks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Feedbacks ({filteredFeedbacks.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum feedback encontrado</h3>
            <p className="text-gray-500">
              Os feedbacks aparecerão aqui quando os vendedores começarem a avaliar os leads
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFeedbacks.map((feedback) => {
              const isExpanded = expandedComments.has(feedback.id);
              const shouldTruncate = feedback.comment.length > 120;
              
              return (
                <div key={feedback.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 text-sm">
                    
                    {/* 1. ✅ ÍCONE POSITIVO/NEGATIVO */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" title={feedback.feedback_type === 'positive' ? 'Feedback Positivo' : 'Feedback Negativo'}>
                      {feedback.feedback_type === 'positive' ? (
                        <ThumbsUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <ThumbsDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    {/* 2. ✅ UTM SOURCE (Google, Meta, LinkedIn) */}
                    <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
                      {(() => {
                        const sourceInfo = getSourceIcon(feedback.lead.source);
                        const SourceIcon = sourceInfo.icon;
                        return (
                          <div 
                            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${sourceInfo.bg} ${sourceInfo.color}`}
                            title={`UTM Source: ${sourceInfo.label}`}
                          >
                            <SourceIcon className="w-3 h-3" />
                            <span>{sourceInfo.label}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 3. ✅ USUÁRIO REAL QUE REGISTROU O FEEDBACK */}
                    <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
                      <span className="font-medium text-gray-900">{feedback.vendedor.name}</span>
                      {feedback.vendedor.role === 'admin' && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                      {feedback.vendedor.role === 'member' && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                          Member
                        </span>
                      )}
                    </div>

                    {/* 4. ✅ COMENTÁRIO DEIXADO NO FEEDBACK */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 leading-relaxed">
                        {shouldTruncate && !isExpanded 
                          ? truncateComment(feedback.comment)
                          : feedback.comment
                        }
                      </p>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleCommentExpansion(feedback.id)}
                          className="text-xs text-purple-600 hover:text-purple-800 flex items-center space-x-1 mt-1"
                        >
                          {isExpanded ? (
                            <>
                              <span>Ver menos</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Ver mais</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* 5. ✅ NOME DA EMPRESA E DATA/HORA (lado direito) */}
                    <div className="flex items-center space-x-3 text-xs text-gray-500 flex-shrink-0">
                      <span className="font-medium">{feedback.admin_empresa.company_name}</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(feedback.created_at)}</span>
                      </div>
                      <button
                        onClick={() => setSelectedFeedback(feedback)}
                        className="text-purple-600 hover:text-purple-800 p-1 rounded"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedFeedback && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes do Feedback</h2>
                  <p className="text-sm text-gray-600">Informações completas da avaliação</p>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna Esquerda */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Vendedor</label>
                    <div className="mt-1 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-medium">
                        {selectedFeedback.vendedor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">{selectedFeedback.vendedor.name}</p>
                        <p className="text-xs text-gray-500">{selectedFeedback.vendedor.email}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Empresa</label>
                    <p className="text-gray-900 mt-1">{selectedFeedback.admin_empresa.company_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Pipeline</label>
                    <p className="text-gray-900 mt-1">{selectedFeedback.pipeline.name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Etapa Atual</label>
                    <div className="mt-1">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
                        style={{ backgroundColor: selectedFeedback.stage.color }}
                      >
                        {selectedFeedback.stage.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Lead</label>
                    <div className="mt-1">
                      <p className="text-gray-900 font-medium">{selectedFeedback.lead.nome}</p>
                      {selectedFeedback.lead.email && (
                        <p className="text-xs text-gray-500">{selectedFeedback.lead.email}</p>
                      )}
                      {selectedFeedback.lead.telefone && (
                        <p className="text-xs text-gray-500">{selectedFeedback.lead.telefone}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Canal de Origem</label>
                    <div className="mt-1">
                      {(() => {
                        const sourceInfo = getSourceIcon(selectedFeedback.lead.source);
                        const SourceIcon = sourceInfo.icon;
                        return (
                          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${sourceInfo.bg} ${sourceInfo.color}`}>
                            <SourceIcon className="w-4 h-4" />
                            <span className="font-medium">{sourceInfo.label}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {selectedFeedback.lead.valor && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Valor da Oportunidade</label>
                      <p className="text-gray-900 mt-1 font-bold text-green-600">
                        {formatCurrency(selectedFeedback.lead.valor)}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tipo de Feedback</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedFeedback.feedback_type === 'positive' ? (
                        <>
                          <ThumbsUp className="w-5 h-5 text-green-600" />
                          <span className="text-green-600 font-medium">Positivo</span>
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="w-5 h-5 text-red-600" />
                          <span className="text-red-600 font-medium">Negativo</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Data e Hora</label>
                    <p className="text-gray-900 mt-1">{formatDate(selectedFeedback.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Comentário Completo */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700">Comentário Completo</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900 leading-relaxed">{selectedFeedback.comment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FeedbackModuleRefactored;
