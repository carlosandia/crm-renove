import React, { useState, useEffect, useCallback } from 'react';
import { History, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';

// ============================================
// INTERFACES
// ============================================

interface Opportunity {
  id: string;
  nome_oportunidade: string;
  valor?: number;
  created_at: string;
  pipeline_name?: string;
  stage_name?: string;
  status: 'active' | 'won' | 'lost';
  created_by_name?: string;
}

interface LeadMaster {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface OpportunitiesHistoryProps {
  leadData: LeadMaster;
  localLeadData?: LeadMaster | null;
  formatDate: (dateString?: string) => string;
  formatCurrency: (value?: number) => string;
  getOpportunityStatusColor: (status: string) => string;
  getOpportunityStatusText: (status: string) => string;
}

// ============================================
// HOOK PERSONALIZADO
// ============================================

export const useOpportunitiesHistory = ({ 
  leadData, 
  localLeadData 
}: Pick<OpportunitiesHistoryProps, 'leadData' | 'localLeadData'>) => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  
  // Usar dados locais atualizados se disponíveis, senão usar lead original
  const currentLeadData = localLeadData || leadData;

  // ============================================
  // FUNÇÃO DE CARREGAMENTO DE OPORTUNIDADES
  // ============================================

  const loadOpportunityHistory = useCallback(async () => {
    if (!currentLeadData?.id || !user?.id) {
      console.log('❌ [OpportunitiesHistory] Dados insuficientes para carregar histórico');
      return;
    }

    setLoadingOpportunities(true);
    console.log('🔍 [OpportunitiesHistory] Carregando histórico de oportunidades para lead:', currentLeadData.id);

    try {
      let leadOpportunities: any[] = [];
      
      // Estratégia 1: Buscar por lead_master_id (abordagem principal)
      console.log('🔍 [OpportunitiesHistory] ESTRATÉGIA 1: Buscar por lead_master_id');
      const { data: masterIdOpportunities, error: masterIdError } = await supabase
        .from('pipeline_leads')
        .select('id, pipeline_id, stage_id, created_at, created_by, custom_data, lead_master_id')
        .eq('lead_master_id', currentLeadData.id)
        .not('custom_data', 'is', null);
      
      if (!masterIdError && masterIdOpportunities && masterIdOpportunities.length > 0) {
        console.log('✅ [OpportunitiesHistory] Encontradas oportunidades por lead_master_id:', masterIdOpportunities.length);
        leadOpportunities = masterIdOpportunities;
      } else {
        console.log('⚠️ [OpportunitiesHistory] Nenhuma oportunidade encontrada por lead_master_id, tentando estratégias de fallback');
        
        // Estratégia 2: Buscar por email (fallback)
        if (currentLeadData.email) {
          console.log('🔍 [OpportunitiesHistory] ESTRATÉGIA 2: Buscar por email:', currentLeadData.email);
          const { data: emailOpportunities, error: emailError } = await supabase
            .from('pipeline_leads')
            .select('id, pipeline_id, stage_id, created_at, created_by, custom_data, lead_master_id')
            .eq('custom_data->email', currentLeadData.email)
            .not('custom_data', 'is', null);
          
          if (!emailError && emailOpportunities && emailOpportunities.length > 0) {
            console.log('✅ [OpportunitiesHistory] Encontradas oportunidades por email:', emailOpportunities.length);
            leadOpportunities = emailOpportunities;
          } else {
            // Estratégia 3: Buscar por nome + email (fallback mais abrangente)
            const leadName = `${currentLeadData.first_name || ''} ${currentLeadData.last_name || ''}`.trim();
            if (leadName && currentLeadData.email) {
              console.log('🔍 [OpportunitiesHistory] ESTRATÉGIA 3: Buscar por nome + email');
              const { data: nameEmailOpportunities, error: nameEmailError } = await supabase
                .from('pipeline_leads')
                .select('id, pipeline_id, stage_id, created_at, created_by, custom_data, lead_master_id')
                .or(`custom_data->>nome_lead.ilike.%${leadName}%,custom_data->>email.eq.${currentLeadData.email}`)
                .not('custom_data', 'is', null);
              
              if (!nameEmailError && nameEmailOpportunities && nameEmailOpportunities.length > 0) {
                console.log('✅ [OpportunitiesHistory] Encontradas oportunidades por nome+email:', nameEmailOpportunities.length);
                leadOpportunities = nameEmailOpportunities;
              } else {
                console.log('ℹ️ [OpportunitiesHistory] Nenhuma oportunidade encontrada em nenhum fallback');
                setOpportunities([]);
                return;
              }
            } else {
              console.log('ℹ️ [OpportunitiesHistory] Dados insuficientes para busca por nome+email');
              setOpportunities([]);
              return;
            }
          }
        } else {
          console.log('ℹ️ [OpportunitiesHistory] Email não disponível para busca de fallback');
          setOpportunities([]);
          return;
        }
      }

      // Buscar nomes das pipelines e estágios
      const pipelineIds = [...new Set(leadOpportunities.map(item => item.pipeline_id).filter(Boolean))];
      const stageIds = [...new Set(leadOpportunities.map(item => item.stage_id).filter(Boolean))];
      
      let pipelineNames: Record<string, string> = {};
      let stageNames: Record<string, string> = {};
      
      if (pipelineIds.length > 0) {
        const { data: pipelines } = await supabase
          .from('pipelines')
          .select('id, name')
          .in('id', pipelineIds);
        
        pipelineNames = (pipelines || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      if (stageIds.length > 0) {
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .in('id', stageIds);
        
        stageNames = (stages || []).reduce((acc, s) => {
          acc[s.id] = s.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Buscar nomes dos criadores separadamente
      const createdByIds = [...new Set(leadOpportunities.map(item => item.created_by).filter(Boolean))];
      let userNames: Record<string, string> = {};
      
      if (createdByIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', createdByIds);
        
        userNames = (users || []).reduce((acc, u) => {
          acc[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuário sem nome';
          return acc;
        }, {} as Record<string, string>);
      }

      const formattedOpportunities: Opportunity[] = leadOpportunities.map((item: any) => {
        // Usar apenas custom_data
        const dataField = item.custom_data || {};
        const createdByName = userNames[item.created_by] || 'Usuário não identificado';
        
        return {
          id: item.id,
          nome_oportunidade: dataField.nome_oportunidade || dataField.titulo_oportunidade || dataField.titulo || dataField.nome_lead || 'Oportunidade sem nome',
          valor: dataField.valor ? parseFloat(dataField.valor) : (dataField.valor_oportunidade ? parseFloat(dataField.valor_oportunidade) : undefined),
          created_at: item.created_at,
          pipeline_name: pipelineNames[item.pipeline_id] || 'Pipeline não identificada',
          stage_name: stageNames[item.stage_id] || 'Estágio não identificado',
          status: 'active',
          created_by_name: createdByName
        };
      });

      console.log('✅ [OpportunitiesHistory] Histórico carregado com sucesso:', formattedOpportunities.length, 'oportunidades');
      console.log('📊 [OpportunitiesHistory] Oportunidades formatadas:', formattedOpportunities);
      setOpportunities(formattedOpportunities);
    } catch (error) {
      console.error('❌ [OpportunitiesHistory] Erro ao carregar histórico de oportunidades:', error);
      setOpportunities([]);
    } finally {
      setLoadingOpportunities(false);
    }
  }, [currentLeadData?.id, currentLeadData?.email, currentLeadData?.first_name, currentLeadData?.last_name, user?.id]);

  return {
    opportunities,
    loadingOpportunities,
    loadOpportunityHistory
  };
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const OpportunitiesHistory: React.FC<OpportunitiesHistoryProps> = ({
  leadData,
  localLeadData,
  formatDate,
  formatCurrency,
  getOpportunityStatusColor,
  getOpportunityStatusText
}) => {
  const { 
    opportunities, 
    loadingOpportunities, 
    loadOpportunityHistory 
  } = useOpportunitiesHistory({ leadData, localLeadData });

  // Carregar histórico quando componente montar ou lead mudar
  useEffect(() => {
    loadOpportunityHistory();
  }, [loadOpportunityHistory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Histórico de Oportunidades
        </CardTitle>
        <p className="text-sm text-gray-600">
          Todas as oportunidades criadas a partir deste lead
        </p>
      </CardHeader>
      <CardContent>
        {loadingOpportunities ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando histórico...</span>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma oportunidade criada a partir deste lead</p>
            <p className="text-sm mt-1">
              Use o botão "Criar Oportunidade" na lista de leads para criar a primeira oportunidade
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="mb-3">
                    <span className="font-medium text-gray-600">Nome da oportunidade:</span>{' '}
                    <span className="font-medium text-gray-900">{opportunity.nome_oportunidade}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Vendedor:</span>{' '}
                      <span className="text-gray-900">{opportunity.created_by_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Data de criação:</span>{' '}
                      <span className="text-gray-900">{formatDate(opportunity.created_at)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Pipeline:</span>{' '}
                      <span className="text-gray-900">{opportunity.pipeline_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Estágio:</span>{' '}
                      <span className="text-gray-900">{opportunity.stage_name}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-600">Valor:</span>{' '}
                      <span className="text-lg font-semibold text-green-600">
                        {opportunity.valor ? formatCurrency(opportunity.valor) : 'Não informado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpportunitiesHistory;
