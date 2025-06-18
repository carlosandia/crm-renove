import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, Filter, ThumbsUp, ThumbsDown, Clock, User, Building, Eye, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedbackData {
  id: string;
  feedback_type: 'positive' | 'negative';
  comment: string;
  created_at: string;
  lead_id: string;
  vendedor: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  admin_empresa: {
    id: string;
    company_name: string;
    tenant_id: string;
  };
  lead: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    valor?: number;
  };
  pipeline: {
    id: string;
    name: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
  };
}

const FeedbackModule: React.FC = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Listas para os selects
  const [companies, setCompanies] = useState<string[]>([]);
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadFeedbacks();
    }
  }, [user]);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      // Carregar feedbacks do banco
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('lead_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.log('⚠️ Tabela lead_feedback não encontrada, usando dados simulados');
        loadMockFeedbacks();
        return;
      }

      if (!feedbackData || feedbackData.length === 0) {
        console.log('📋 Nenhum feedback encontrado, usando dados simulados');
        loadMockFeedbacks();
        return;
      }

      // Buscar dados relacionados para cada feedback
      const formattedFeedbacks: FeedbackData[] = [];
      
      for (const feedback of feedbackData) {
        // Simular dados relacionados (em produção, fazer JOINs reais)
        const mockData = generateMockFeedbackData(feedback);
        formattedFeedbacks.push(mockData);
      }

      setFeedbacks(formattedFeedbacks);
      extractFiltersFromData(formattedFeedbacks);

    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error);
      loadMockFeedbacks();
    } finally {
      setLoading(false);
    }
  };

  const loadMockFeedbacks = () => {
    // Dados simulados para demonstração
    const mockFeedbacks: FeedbackData[] = [
      {
        id: '1',
        feedback_type: 'positive',
        comment: 'Lead muito interessado no produto, respondeu rapidamente ao WhatsApp e já solicitou uma proposta comercial. Cliente demonstrou urgência na implementação.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-001',
        vendedor: {
          id: 'vendor-1',
          name: 'Carlos Mendes',
          email: 'carlos@empresaalpha.com',
          avatar: undefined
        },
        admin_empresa: {
          id: 'admin-1',
          company_name: 'Empresa Alpha Tecnologia',
          tenant_id: 'tenant-1'
        },
        lead: {
          id: 'lead-001',
          nome: 'João Silva',
          email: 'joao@clienteabc.com',
          telefone: '(11) 99999-9999',
          valor: 15000
        },
        pipeline: {
          id: 'pipeline-1',
          name: 'Pipeline de Vendas'
        },
        stage: {
          id: 'stage-2',
          name: 'Qualificados',
          color: '#10b981'
        }
      },
      {
        id: '2',
        feedback_type: 'negative',
        comment: 'Lead não respondeu após várias tentativas de contato por email e telefone.',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-002',
        vendedor: {
          id: 'vendor-2',
          name: 'Ana Silva',
          email: 'ana@betacorp.com'
        },
        admin_empresa: {
          id: 'admin-2',
          company_name: 'Beta Corp Solutions',
          tenant_id: 'tenant-2'
        },
        lead: {
          id: 'lead-002',
          nome: 'Maria Santos',
          email: 'maria@empresa.com',
          telefone: '(11) 88888-8888',
          valor: 8500
        },
        pipeline: {
          id: 'pipeline-1',
          name: 'Pipeline de Vendas'
        },
        stage: {
          id: 'stage-1',
          name: 'Novos Leads',
          color: '#3b82f6'
        }
      },
      {
        id: '3',
        feedback_type: 'positive',
        comment: 'Excelente lead! Cliente já tem budget aprovado e timeline definido para implementação no próximo trimestre.',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-003',
        vendedor: {
          id: 'vendor-3',
          name: 'Pedro Costa',
          email: 'pedro@gammaltda.com'
        },
        admin_empresa: {
          id: 'admin-3',
          company_name: 'Gamma Ltda',
          tenant_id: 'tenant-3'
        },
        lead: {
          id: 'lead-003',
          nome: 'Roberto Oliveira',
          email: 'roberto@startup.com',
          telefone: '(11) 77777-7777',
          valor: 25000
        },
        pipeline: {
          id: 'pipeline-2',
          name: 'Pipeline Enterprise'
        },
        stage: {
          id: 'stage-4',
          name: 'Proposta Enviada',
          color: '#f59e0b'
        }
      }
    ];

    setFeedbacks(mockFeedbacks);
    extractFiltersFromData(mockFeedbacks);
  };

  const generateMockFeedbackData = (feedback: any): FeedbackData => {
    const companies = ['Empresa Alpha Tecnologia', 'Beta Corp Solutions', 'Gamma Ltda', 'Delta SA', 'Epsilon Tech'];
    const vendors = ['Carlos Mendes', 'Ana Silva', 'Pedro Costa', 'Maria Oliveira'];
    const leads = ['João Silva', 'Maria Santos', 'Roberto Oliveira', 'Ana Costa'];
    const pipelines = ['Pipeline de Vendas', 'Pipeline Enterprise', 'Pipeline Marketing'];
    const stages = [
      { name: 'Novos Leads', color: '#3b82f6' },
      { name: 'Qualificados', color: '#10b981' },
      { name: 'Proposta Enviada', color: '#f59e0b' },
      { name: 'Negociação', color: '#8b5cf6' }
    ];

    const randomIndex = Math.abs(feedback.id.charCodeAt(0)) % 4;
    const vendor = vendors[randomIndex];
    const stage = stages[randomIndex];

    return {
      id: feedback.id,
      feedback_type: feedback.feedback_type,
      comment: feedback.comment,
      created_at: feedback.created_at,
      lead_id: feedback.lead_id,
      vendedor: {
        id: feedback.user_id,
        name: vendor,
        email: `${vendor.toLowerCase().replace(' ', '.')}@empresa.com`
      },
      admin_empresa: {
        id: 'admin-' + randomIndex,
        company_name: companies[randomIndex],
        tenant_id: 'tenant-' + randomIndex
      },
      lead: {
        id: feedback.lead_id,
        nome: leads[randomIndex],
        email: `${leads[randomIndex].toLowerCase().replace(' ', '.')}@cliente.com`,
        telefone: `(11) ${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000) + 1000}`,
        valor: Math.floor(Math.random() * 50000) + 5000
      },
      pipeline: {
        id: 'pipeline-' + randomIndex,
        name: pipelines[randomIndex % pipelines.length]
      },
      stage: {
        id: 'stage-' + randomIndex,
        name: stage.name,
        color: stage.color
      }
    };
  };

  const extractFiltersFromData = (feedbackData: FeedbackData[]) => {
    const uniqueCompanies = [...new Set(feedbackData.map(f => f.admin_empresa.company_name))];
    const uniqueVendors = [...new Set(feedbackData.map(f => ({ id: f.vendedor.id, name: f.vendedor.name })))];
    
    setCompanies(uniqueCompanies);
    setVendors(uniqueVendors);
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = 
      feedback.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.vendedor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.admin_empresa.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.pipeline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.stage.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' || feedback.feedback_type === filterType;

    const matchesCompany = 
      !companyFilter || feedback.admin_empresa.company_name === companyFilter;

    const matchesVendor = 
      !vendorFilter || feedback.vendedor.id === vendorFilter;

    return matchesSearch && matchesFilter && matchesCompany && matchesVendor;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const toggleCommentExpansion = (feedbackId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(feedbackId)) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }
    setExpandedComments(newExpanded);
  };

  const truncateComment = (comment: string, maxLength: number = 120) => {
    if (comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + '...';
  };

  const handleStageClick = (feedback: FeedbackData) => {
    // Aqui você pode implementar a navegação para os detalhes da oportunidade
    console.log('Abrir detalhes da oportunidade:', feedback.lead.id, feedback.stage.name);
    // Exemplo: navigate(`/pipeline/${feedback.pipeline.id}/lead/${feedback.lead.id}`);
  };

  const stats = {
    total: feedbacks.length,
    positive: feedbacks.filter(f => f.feedback_type === 'positive').length,
    negative: feedbacks.filter(f => f.feedback_type === 'negative').length,
    companies: new Set(feedbacks.map(f => f.admin_empresa.company_name)).size
  };

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
              <div className="text-2xl font-bold text-gray-900">{vendors.length}</div>
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
              <div className="text-2xl font-bold text-gray-900">
                {stats.positive > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">Taxa de Satisfação</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros Expandidos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Busca Geral */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por vendedor, empresa, lead, pipeline..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos os Feedbacks</option>
              <option value="positive">Apenas Positivos</option>
              <option value="negative">Apenas Negativos</option>
            </select>
          </div>

          {/* Filtro por Empresa */}
          <div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todas as Empresas</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Vendedor */}
          <div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todos os Vendedores</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
              {searchTerm || filterType !== 'all' || companyFilter || vendorFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Os feedbacks aparecerão aqui quando os vendedores começarem a avaliar os leads'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredFeedbacks.map((feedback) => {
              const isExpanded = expandedComments.has(feedback.id);
              const shouldTruncate = feedback.comment.length > 120;
              
              return (
                <div key={feedback.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    {/* Avatar do Vendedor */}
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                      {feedback.vendedor.name.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Linha 1: Vendedor e Empresa */}
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {feedback.vendedor.name}
                        </h3>
                        <span className="text-xs text-gray-500">(Vendedor)</span>
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          {feedback.admin_empresa.company_name}
                        </span>
                        <div className="flex items-center space-x-1">
                          {feedback.feedback_type === 'positive' ? (
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </div>

                      {/* Linha 2: Lead e Stage */}
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-sm font-medium text-gray-700">Lead:</span>
                        <span className="text-sm text-gray-900">{feedback.lead.nome}</span>
                        <button
                          onClick={() => handleStageClick(feedback)}
                          className="text-xs px-2 py-1 rounded-full text-white font-medium hover:opacity-80 transition-opacity cursor-pointer"
                          style={{ backgroundColor: feedback.stage.color }}
                          title="Clique para ver detalhes da oportunidade"
                        >
                          {feedback.stage.name}
                        </button>
                        {feedback.lead.valor && (
                          <span className="text-xs text-green-600 font-medium">
                            {formatCurrency(feedback.lead.valor)}
                          </span>
                        )}
                      </div>
                      
                      {/* Linha 3: Comentário */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          {shouldTruncate && !isExpanded 
                            ? truncateComment(feedback.comment)
                            : feedback.comment
                          }
                        </p>
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleCommentExpansion(feedback.id)}
                            className="text-xs text-purple-600 hover:text-purple-800 mt-1 flex items-center space-x-1"
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
                      
                      {/* Linha 4: Informações adicionais */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(feedback.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Building className="w-3 h-3" />
                          <span>Pipeline: {feedback.pipeline.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botão Ver Detalhes */}
                    <button
                      onClick={() => setSelectedFeedback(feedback)}
                      className="p-3 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 hover:shadow-md"
                      title="Ver todos os detalhes"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes Melhorado */}
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

export default FeedbackModule; 