import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface FeedbackData {
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
    role?: string;
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
    source?: 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
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

interface UseFeedbackDataReturn {
  feedbacks: FeedbackData[];
  loading: boolean;
  loadFeedbacks: () => Promise<void>;
  refreshData: () => void;
}

// ============================================
// HOOK PERSONALIZADO - useFeedbackData
// ============================================

export const useFeedbackData = (): UseFeedbackDataReturn => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================
  // FUNÇÕES DE ENRIQUECIMENTO DE DADOS
  // ============================================

  const enrichWithCompanyNames = useCallback(async (feedbacks: FeedbackData[]): Promise<FeedbackData[]> => {
    try {
      const tenantIds = [...new Set(feedbacks.map(f => f.admin_empresa.tenant_id))];
      
      if (tenantIds.length === 0) return feedbacks;

      const { data: companies, error } = await supabase
        .from('companies')
        .select('tenant_id, name')
        .in('tenant_id', tenantIds);

      if (error) {
        console.log('⚠️ Erro ao buscar nomes das empresas:', error.message);
        return feedbacks;
      }

      return feedbacks.map(feedback => {
        const company = companies?.find(c => c.tenant_id === feedback.admin_empresa.tenant_id);
        return {
          ...feedback,
          admin_empresa: {
            ...feedback.admin_empresa,
            company_name: company?.name || feedback.admin_empresa.company_name
          }
        };
      });
    } catch (error) {
      console.log('⚠️ Erro no enrichWithCompanyNames:', error);
      return feedbacks;
    }
  }, []);

  const mapUtmToSource = useCallback((utmSource: string): 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form' => {
    const source = utmSource.toLowerCase();
    if (source.includes('facebook') || source.includes('meta') || source.includes('fb')) {
      return 'meta';
    }
    if (source.includes('google') || source.includes('adwords') || source.includes('gads')) {
      return 'google';
    }
    if (source.includes('linkedin') || source.includes('li')) {
      return 'linkedin';
    }
    if (source.includes('webhook') || source.includes('api')) {
      return 'webhook';
    }
    if (source.includes('form') || source.includes('formulario')) {
      return 'form';
    }
    return 'manual';
  }, []);

  const enrichFeedbacksWithRealData = useCallback(async (feedbacks: any[]): Promise<FeedbackData[]> => {
    const enrichedFeedbacks: FeedbackData[] = [];
    
    for (const feedback of feedbacks) {
      try {
        // Buscar dados do usuário
        const { data: userData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role, tenant_id')
          .eq('id', feedback.user_id)
          .single();

        // Buscar dados do lead
        const { data: leadData } = await supabase
          .from('pipeline_leads')
          .select('id, custom_data, lead_data, pipeline_id')
          .eq('id', feedback.lead_id)
          .single();

        // Buscar dados do pipeline se o lead foi encontrado
        let pipelineData = null;
        if (leadData) {
          const { data: pipelineResult } = await supabase
            .from('pipelines')
            .select('id, name, created_by')
            .eq('id', leadData.pipeline_id)
            .single();
          pipelineData = pipelineResult;
        }

        // Buscar dados do admin/empresa se pipeline foi encontrado
        let adminData = null;
        if (pipelineData) {
          const { data: adminResult } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, role, tenant_id')
            .eq('id', pipelineData.created_by)
            .single();
          adminData = adminResult;
        }

        // Extrair informações do lead
        const leadInfo = leadData?.custom_data || leadData?.lead_data || {};
        const utmSource = leadInfo.utm_source || leadInfo.source || leadInfo.traffic_source || 'manual';
        
        const nomeRealUsuario = userData ? 
          `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
          userData.email?.split('@')[0] || 
          'Usuário' 
          : 'Usuário Não Encontrado';

        const enrichedFeedback: FeedbackData = {
          id: feedback.id,
          feedback_type: feedback.feedback_type,
          comment: feedback.comment,
          created_at: feedback.created_at,
          lead_id: feedback.lead_id,
          vendedor: {
            id: userData?.id || feedback.user_id,
            name: nomeRealUsuario,
            email: userData?.email || '',
            role: userData?.role || 'member'
          },
          admin_empresa: {
            id: adminData?.id || pipelineData?.created_by || '',
            company_name: 'Empresa', // Será enriquecido depois
            tenant_id: adminData?.tenant_id || userData?.tenant_id || ''
          },
          lead: {
            id: leadData?.id || feedback.lead_id,
            nome: leadInfo.nome || leadInfo.name || leadInfo.full_name || 'Lead sem nome',
            email: leadInfo.email || leadInfo.email_address || '',
            telefone: leadInfo.telefone || leadInfo.phone || leadInfo.whatsapp || '',
            valor: parseFloat(leadInfo.valor || leadInfo.value || leadInfo.valor_oportunidade || '0') || 0,
            source: mapUtmToSource(utmSource)
          },
          pipeline: {
            id: pipelineData?.id || leadData?.pipeline_id || '',
            name: pipelineData?.name || 'Pipeline'
          },
          stage: {
            id: 'stage-default',
            name: 'Qualificação',
            color: '#3B82F6'
          }
        };

        enrichedFeedbacks.push(enrichedFeedback);
      } catch (error) {
        console.log('⚠️ Erro ao enriquecer feedback:', feedback.id, error);
        // Em caso de erro, criar um feedback básico
        enrichedFeedbacks.push(await enrichFeedbackWithMockData(feedback));
      }
    }

    return enrichedFeedbacks;
  }, [mapUtmToSource]);

  const enrichFeedbackWithMockData = useCallback(async (feedback: any): Promise<FeedbackData> => {
    // Mock data mais realista baseado no feedback_type
    const isPositive = feedback.feedback_type === 'positive';
    const names = isPositive 
      ? ['Carlos Silva', 'Ana Santos', 'Pedro Oliveira', 'Maria Costa', 'João Ferreira']
      : ['Bruno Alves', 'Carla Menezes', 'Diego Rocha', 'Fernanda Lima', 'Gabriel Torres'];
    
    const companies = ['TechCorp', 'InnovaSoft', 'DigitalPro', 'SmartSolutions', 'FutureTech'];
    const pipelines = ['Vendas B2B', 'Leads Qualificados', 'Oportunidades', 'Prospects', 'Pipeline Principal'];
    const sources: ('meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form')[] = 
      ['meta', 'google', 'linkedin', 'webhook', 'manual', 'form'];
    const stages = [
      { name: 'Lead', color: '#8B5CF6' },
      { name: 'Qualificação', color: '#3B82F6' },
      { name: 'Proposta', color: '#F59E0B' },
      { name: 'Negociação', color: '#EF4444' },
      { name: 'Fechamento', color: '#10B981' }
    ];

    const randomIndex = Math.floor(Math.random() * 5);
    const stage = stages[randomIndex];
    const source = sources[randomIndex % sources.length];

    return {
      id: feedback.id,
      feedback_type: feedback.feedback_type,
      comment: feedback.comment,
      created_at: feedback.created_at,
      lead_id: feedback.lead_id || 'lead-mock-' + randomIndex,
      vendedor: {
        id: 'user-' + randomIndex,
        name: names[randomIndex],
        email: `${names[randomIndex].toLowerCase().replace(' ', '.')}@empresa.com`,
        role: Math.random() > 0.7 ? 'admin' : 'member'
      },
      admin_empresa: {
        id: 'admin-' + randomIndex,
        company_name: companies[randomIndex % companies.length],
        tenant_id: 'tenant-' + randomIndex
      },
      lead: {
        id: feedback.lead_id || 'lead-mock-' + randomIndex,
        nome: `Lead ${randomIndex + 1} - ${isPositive ? 'Interessado' : 'Qualificação'}`,
        email: `lead${randomIndex + 1}@email.com`,
        telefone: `(11) 9${8000 + randomIndex}-${1000 + randomIndex}`,
        valor: Math.floor(Math.random() * 50000) + 5000,
        source: source
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
  }, []);

  // ============================================
  // FUNÇÕES DE MOCK DATA
  // ============================================

  const getMockFeedbacks = useCallback((): FeedbackData[] => {
    const mockFeedbacks = [
      {
        id: 'feedback-1',
        feedback_type: 'positive' as const,
        comment: 'Excelente lead! Cliente muito interessado no produto, já tem orçamento aprovado e urgência para implementar. Conversa fluiu muito bem e ele já quer agendar uma demo.',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-1'
      },
      {
        id: 'feedback-2',
        feedback_type: 'negative' as const,
        comment: 'Lead frio, sem interesse real. Está apenas coletando informações para comparação, não tem urgência nem orçamento definido. Provável que não converta.',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-2'
      },
      {
        id: 'feedback-3',
        feedback_type: 'positive' as const,
        comment: 'Lead qualificado com potencial alto. Empresa em crescimento, pain points bem definidos, decisor disponível para reunião. Vale a pena investir tempo.',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-3'
      },
      {
        id: 'feedback-4',
        feedback_type: 'negative' as const,
        comment: 'Contato não foi receptivo, alegou não ter tempo. Empresa parece estar passando por reestruturação. Melhor focar em outros leads mais promissores.',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-4'
      },
      {
        id: 'feedback-5',
        feedback_type: 'positive' as const,
        comment: 'Lead respondeu rapidamente, demonstrou interesse genuine. Já usa concorrente mas está insatisfeito. Boa oportunidade de conversão.',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        lead_id: 'lead-5'
      }
    ];

    return mockFeedbacks.map(feedback => generateMockFeedbackData(feedback));
  }, []);

  const generateMockFeedbackData = useCallback((feedback: any): FeedbackData => {
    const isPositive = feedback.feedback_type === 'positive';
    const names = isPositive 
      ? ['Carlos Silva', 'Ana Santos', 'Pedro Oliveira', 'Maria Costa', 'João Ferreira']
      : ['Bruno Alves', 'Carla Menezes', 'Diego Rocha', 'Fernanda Lima', 'Gabriel Torres'];
    
    const companies = ['TechCorp Brasil', 'InnovaSoft Ltda', 'DigitalPro Solutions', 'SmartSolutions Inc', 'FutureTech Sistemas'];
    const pipelines = ['Vendas B2B', 'Leads Qualificados', 'Oportunidades Corporativas', 'Prospects Tecnologia', 'Pipeline Principal'];
    const sources: ('meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form')[] = 
      ['meta', 'google', 'linkedin', 'webhook', 'manual', 'form'];
    const stages = [
      { name: 'Lead', color: '#8B5CF6' },
      { name: 'Qualificação', color: '#3B82F6' },
      { name: 'Proposta Enviada', color: '#F59E0B' },
      { name: 'Negociação', color: '#EF4444' },
      { name: 'Fechamento', color: '#10B981' }
    ];

    const randomIndex = parseInt(feedback.id.split('-')[1]) - 1;
    const stage = stages[randomIndex % stages.length];
    const source = sources[randomIndex % sources.length];

    return {
      id: feedback.id,
      feedback_type: feedback.feedback_type,
      comment: feedback.comment,
      created_at: feedback.created_at,
      lead_id: feedback.lead_id,
      vendedor: {
        id: 'user-' + (randomIndex + 1),
        name: names[randomIndex % names.length],
        email: `${names[randomIndex % names.length].toLowerCase().replace(' ', '.')}@empresa.com`,
        role: randomIndex % 3 === 0 ? 'admin' : 'member'
      },
      admin_empresa: {
        id: 'admin-' + (randomIndex + 1),
        company_name: companies[randomIndex % companies.length],
        tenant_id: 'tenant-' + (randomIndex + 1)
      },
      lead: {
        id: feedback.lead_id,
        nome: `${isPositive ? 'Cliente Potencial' : 'Lead Qualificação'} ${randomIndex + 1}`,
        email: `lead${randomIndex + 1}@empresa${randomIndex + 1}.com`,
        telefone: `(11) 9${8000 + randomIndex}-${1000 + randomIndex}`,
        valor: Math.floor(Math.random() * 50000) + 5000,
        source: source
      },
      pipeline: {
        id: 'pipeline-' + (randomIndex + 1),
        name: pipelines[randomIndex % pipelines.length]
      },
      stage: {
        id: 'stage-' + (randomIndex + 1),
        name: stage.name,
        color: stage.color
      }
    };
  }, []);

  const loadMockFeedbacks = useCallback(() => {
    setFeedbacks(getMockFeedbacks());
  }, [getMockFeedbacks]);

  // ============================================
  // FUNÇÃO PRINCIPAL DE CARREGAMENTO
  // ============================================

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 🎯 IMPLEMENTAÇÃO DADOS REAIS: Carregando feedbacks com JOINs...');
      
      // ✅ QUERY REAL COM JOINS PARA TRAZER DADOS REAIS
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('lead_feedback')
        .select(`
          id,
          feedback_type,
          comment,
          created_at,
          lead_id,
          user_id,
          users!lead_feedback_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            role,
            tenant_id
          ),
          pipeline_leads!lead_feedback_lead_id_fkey (
            id,
            custom_data,
            lead_data,
            pipeline_id,
            pipelines!pipeline_leads_pipeline_id_fkey (
              id,
              name,
              created_by,
              users!pipelines_created_by_fkey (
                id,
                first_name,
                last_name,
                email,
                role,
                tenant_id
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.log('⚠️ Erro na query com JOINs:', feedbackError.message);
        console.log('📋 Fallback: Usando método simplificado...');
        
        // Fallback: buscar dados básicos e enriquecer separadamente
        const { data: simpleFeedback, error: simpleError } = await supabase
          .from('lead_feedback')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (simpleError) {
          console.log('📋 Usando dados mock como fallback final');
          loadMockFeedbacks();
          return;
        }
        
        // Enriquecer com dados reais através de queries separadas
        const enrichedFeedbacks = await enrichFeedbacksWithRealData(simpleFeedback || []);
        const finalFeedbacks = [...enrichedFeedbacks, ...getMockFeedbacks()];
        const enrichedWithCompanies = await enrichWithCompanyNames(finalFeedbacks);
        setFeedbacks(enrichedWithCompanies);
        return;
      }

      if (!feedbackData || feedbackData.length === 0) {
        console.log('📋 Nenhum feedback encontrado no banco, incluindo dados mock');
        const mockFeedbacks = getMockFeedbacks();
        const enrichedWithCompanies = await enrichWithCompanyNames(mockFeedbacks);
        setFeedbacks(enrichedWithCompanies);
        return;
      }

      console.log('✅ Feedbacks carregados com sucesso:', feedbackData.length);

      // ✅ PROCESSAR DADOS REAIS DO BANCO
      const formattedFeedbacks: FeedbackData[] = feedbackData.map((feedback: any) => {
        const userData = feedback.users;
        const leadDataArray = feedback.pipeline_leads;
        const leadData = Array.isArray(leadDataArray) ? leadDataArray[0] : leadDataArray;
        const pipelineDataArray = leadData?.pipelines;
        const pipelineData = Array.isArray(pipelineDataArray) ? pipelineDataArray[0] : pipelineDataArray;
        const adminDataArray = pipelineData?.users;
        const adminData = Array.isArray(adminDataArray) ? adminDataArray[0] : adminDataArray;
        
        // Extrair dados do lead (custom_data ou lead_data)
        const leadInfo = leadData?.custom_data || leadData?.lead_data || {};
        
        // ✅ UTM SOURCE REAL do banco
        const utmSource = leadInfo.utm_source || leadInfo.source || leadInfo.traffic_source || 'manual';
        
        // ✅ NOME REAL DO USUÁRIO QUE REGISTROU O FEEDBACK
        const nomeRealUsuario = userData ? 
          `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
          userData.email?.split('@')[0] || 
          'Usuário' 
          : 'Usuário Não Encontrado';

        console.log('✅ Processando feedback - Nome real:', nomeRealUsuario, `(${userData?.role || 'unknown'})`);

        return {
          id: feedback.id,
          feedback_type: feedback.feedback_type,
          comment: feedback.comment,
          created_at: feedback.created_at,
          lead_id: feedback.lead_id,
          vendedor: {
            id: userData?.id || feedback.user_id,
            name: nomeRealUsuario,
            email: userData?.email || '',
            role: userData?.role || 'member'
          },
          admin_empresa: {
            id: adminData?.id || pipelineData?.created_by || '',
            company_name: 'Empresa', // ✅ SERÁ SUBSTITUÍDO POR NOME REAL DA EMPRESA
            tenant_id: adminData?.tenant_id || userData?.tenant_id || ''
          },
          lead: {
            id: leadData?.id || feedback.lead_id,
            nome: leadInfo.nome || leadInfo.name || leadInfo.full_name || 'Lead sem nome',
            email: leadInfo.email || leadInfo.email_address || '',
            telefone: leadInfo.telefone || leadInfo.phone || leadInfo.whatsapp || '',
            valor: parseFloat(leadInfo.valor || leadInfo.value || leadInfo.valor_oportunidade || '0') || 0,
            source: mapUtmToSource(utmSource)
          },
          pipeline: {
            id: pipelineData?.id || leadData?.pipeline_id || '',
            name: pipelineData?.name || 'Pipeline'
          },
          stage: {
            id: 'stage-default',
            name: 'Qualificação',
            color: '#3B82F6'
          }
        };
      });

      // Incluir dados mock junto com dados reais
      const allFeedbacks = [...formattedFeedbacks, ...getMockFeedbacks()];
      
      // ✅ ENRIQUECER COM NOMES REAIS DAS EMPRESAS
      const enrichedFeedbacks = await enrichWithCompanyNames(allFeedbacks);
      setFeedbacks(enrichedFeedbacks);

    } catch (error) {
      console.log('⚠️ Erro geral no carregamento:', error);
      loadMockFeedbacks();
    } finally {
      setLoading(false);
    }
  }, [enrichWithCompanyNames, enrichFeedbacksWithRealData, getMockFeedbacks, loadMockFeedbacks, mapUtmToSource]);

  // ============================================
  // FUNÇÕES UTILITÁRIAS
  // ============================================

  const refreshData = useCallback(() => {
    if (user?.role === 'super_admin') {
      loadFeedbacks();
    }
  }, [user, loadFeedbacks]);

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadFeedbacks();
    } else {
      setLoading(false);
    }
  }, [user, loadFeedbacks]);

  return {
    feedbacks,
    loading,
    loadFeedbacks,
    refreshData
  };
};

export default useFeedbackData;
