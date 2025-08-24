import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../lib/api';
import { logger } from '../utils/logger';

interface QualificationRule {
  id: string;
  pipeline_id: string;
  field_name: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_empty';
  value: string;
  qualification_level: 'MQL' | 'SQL' | 'Hot' | 'Warm' | 'Cold';
  is_active: boolean;
  tenant_id: string;
}

interface QualificationEvaluation {
  qualification_level: 'Lead' | 'MQL' | 'SQL' | 'Hot' | 'Warm' | 'Cold';
  score: number;
  matched_rules: string[];
  reasoning: string;
}

export const useQualificationEvaluation = (pipelineId: string, leadData: any) => {
  const { user } = useAuth();

  // ✅ PERFORMANCE: Controle de execuções simultâneas e throttling
  const executionCountRef = useRef(0);
  const lastExecutionRef = useRef<number>(0);
  // ✅ CORREÇÃO: Usar logger padrão ao invés de createContext inexistente
  const qualificationLogger = useMemo(() => logger, []);

  // ✅ CORREÇÃO CRÍTICA: Usar user.tenant_id do AuthProvider (já convertido)
  const tenantId = user?.tenant_id || (user as any)?.user_metadata?.tenant_id;

  // ✅ CORREÇÃO CONTEXT7: Log condicional apenas quando necessário (desenvolvimento + primeira execução)
  const shouldLog = useMemo(() => {
    return process.env.NODE_ENV === 'development' && !!leadData?.id;
  }, [leadData?.id]);

  // ✅ CORREÇÃO CONTEXT7: Memoizar dados estáveis para evitar re-computação desnecessária
  const stableLeadData = useMemo(() => {
    if (!leadData) return null;
    
    // Usar hash simples em vez de JSON.stringify para performance
    const customDataHash = leadData.custom_data ? 
      Object.keys(leadData.custom_data).sort().join('|') + '|' + 
      Object.values(leadData.custom_data).join('|') : '';
    
    return {
      id: leadData.id,
      custom_data: leadData.custom_data,
      updated_at: leadData.updated_at || leadData.moved_at,
      _hash: customDataHash // Para detectar mudanças sem JSON.stringify
    };
  }, [leadData?.id, leadData?.updated_at, leadData?.moved_at, leadData?.custom_data]);

  // ✅ OTIMIZAÇÃO AVANÇADA: Query key dividida - regras compartilhadas por pipeline
  const rulesQueryKey = useMemo(() => [
    'qualification-rules',
    tenantId,
    pipelineId
  ].filter(Boolean), [tenantId, pipelineId]);
  
  const evaluationQueryKey = useMemo(() => [
    'qualification-evaluation',
    tenantId,
    pipelineId,
    stableLeadData?.id,
    stableLeadData?._hash
  ].filter(Boolean), [tenantId, pipelineId, stableLeadData?.id, stableLeadData?._hash]);

  // ✅ CORREÇÃO CONTEXT7: useCallback para queryFn estável com dependências otimizadas
  const queryFn = useCallback(async (): Promise<QualificationEvaluation> => {
    // ✅ PERFORMANCE: Incrementar contador e verificar throttling
    executionCountRef.current += 1;
    const now = Date.now();
    
    // ✅ THROTTLING: Evitar execuções muito próximas (< 200ms)
    if (now - lastExecutionRef.current < 200) {
      qualificationLogger.warn(`Throttling qualification - última execução há ${now - lastExecutionRef.current}ms (exec #${executionCountRef.current})`);
      // Retornar resultado padrão sem executar avaliação
      return {
        qualification_level: 'Lead',
        score: 0,
        matched_rules: [],
        reasoning: 'Execução throttled para evitar spam'
      };
    }
    lastExecutionRef.current = now;
    
    // ✅ ETAPA 4: Log apenas para primeira execução e erros críticos
    if (shouldLog && executionCountRef.current === 1) {
      qualificationLogger.debug('Primeira avaliação da sessão:', {
        pipelineId: pipelineId.substring(0, 8)
      });
    }
      
    if (!tenantId || !pipelineId || !stableLeadData) {
        const reasoning = !tenantId ? 'Usuário sem tenant_id' : 
                         !pipelineId ? 'Pipeline ID não informado' :
                         !stableLeadData ? 'Dados do lead não informados' :
                         'Dados insuficientes para avaliação';
        
        if (shouldLog) {
          qualificationLogger.warn('Parâmetros insuficientes:', reasoning);
        }
        return {
          qualification_level: 'Lead',
          score: 0,
          matched_rules: [],
          reasoning
        };
      }

      try {
        // ✅ CORREÇÃO: Verificação simples de sessão sem logs excessivos
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (shouldLog) {
            qualificationLogger.error('Sessão não ativa:', sessionError?.message);
          }
          return {
            qualification_level: 'Lead',
            score: 0,
            matched_rules: [],
            reasoning: 'Erro de autenticação - sessão inválida'
          };
        }

        if (shouldLog) {
          qualificationLogger.info('Sessão válida, buscando regras via API...');
        }

        // ✅ CORREÇÃO: Usar API backend em vez de query direta (RLS bloqueava frontend)
        const response = await api.get(`/pipelines/${pipelineId}/qualification-rules`);
        
        // ✅ ETAPA 4: Log consolidado apenas se há regras e é primeira vez
        if (shouldLog && response.data.success && !sessionStorage.getItem(`rules-summary-${pipelineId}`)) {
          const rulesCount = response.data.data?.qualification_rules ? 
            (response.data.data.qualification_rules.mql?.length || 0) + 
            (response.data.data.qualification_rules.sql?.length || 0) : 0;
          
          if (rulesCount > 0) {
            qualificationLogger.info(`Pipeline configurado: ${rulesCount} regras`);
            sessionStorage.setItem(`rules-summary-${pipelineId}`, 'true');
          }
        }
        
        if (!response.data.success) {
          if (shouldLog) {
            qualificationLogger.error('Erro ao buscar regras via API:', response.data.error);
          }
          return {
            qualification_level: 'Lead',
            score: 0,
            matched_rules: [],
            reasoning: 'Erro ao carregar regras de qualificação via API'
          };
        }

        // Extrair regras do formato retornado pela API
        const qualificationRules = response.data.data?.qualification_rules;
        
        // ✅ CORREÇÃO CRÍTICA: Mapear campos do backend para formato esperado pelo hook
        const rules = [
          ...(qualificationRules?.mql || []).map((rule: any) => ({
            id: rule.id,
            field_name: rule.field, // ✅ Backend: 'field' → Hook: 'field_name'
            condition: rule.operator, // ✅ Backend: 'operator' → Hook: 'condition'  
            value: rule.value,
            qualification_level: 'MQL',
            is_active: true // ✅ Assumir ativo se não especificado
          })),
          ...(qualificationRules?.sql || []).map((rule: any) => ({
            id: rule.id,
            field_name: rule.field, // ✅ Backend: 'field' → Hook: 'field_name'
            condition: rule.operator, // ✅ Backend: 'operator' → Hook: 'condition'
            value: rule.value,
            qualification_level: 'SQL',
            is_active: true // ✅ Assumir ativo se não especificado
          }))
        ];

        // ✅ ETAPA 4: Log de processamento removido (redundante com o log anterior)

        if (!rules || rules.length === 0) {
          if (shouldLog) {
            qualificationLogger.warn('Nenhuma regra encontrada');
          }
          return {
            qualification_level: 'Lead',
            score: 0,
            matched_rules: [],
            reasoning: 'Nenhuma regra de qualificação configurada'
          };
        }

        // ✅ ETAPA 4: Log de avaliação individual removido (verboso)

        const matchedRules: string[] = [];
        let highestLevel: QualificationEvaluation['qualification_level'] = 'Lead';
        let totalScore = 0;

        const levelPriority = {
          'Lead': 0,
          'MQL': 1,
          'SQL': 2,
          'Warm': 3,
          'Hot': 4,
          'Cold': 0 // Cold é tratado como baixa qualificação
        };

        for (const rule of rules as QualificationRule[]) {
          // Acessar campos customizados corretamente
          const fieldValue = stableLeadData.custom_data?.[rule.field_name] || (stableLeadData as any)[rule.field_name];
          let ruleMatched = false;

          // ✅ ETAPA 4: Debug detalhado apenas com flag específica
          if (process.env.VITE_DEBUG_QUALIFICATION === 'verbose') {
            qualificationLogger.debug(`${rule.field_name} ${rule.condition} ${rule.value} = ${fieldValue}`);
          }

          // Avaliar condição da regra
          switch (rule.condition) {
            case 'equals':
              ruleMatched = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase();
              break;
            case 'contains':
              ruleMatched = String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
              break;
            case 'greater_than':
              const numFieldValue = Number(fieldValue);
              const numRuleValue = Number(rule.value);
              ruleMatched = numFieldValue > numRuleValue;
              
              // ✅ ETAPA 4: Debug numérico apenas com flag verbose
              if (process.env.VITE_DEBUG_QUALIFICATION === 'verbose') {
                qualificationLogger.debug(`${rule.field_name}: ${numFieldValue} > ${numRuleValue} = ${ruleMatched}`);
              }
              break;
            case 'less_than':
              ruleMatched = Number(fieldValue) < Number(rule.value);
              break;
            case 'not_empty':
              ruleMatched = fieldValue != null && String(fieldValue).trim() !== '';
              break;
          }

          if (ruleMatched) {
            matchedRules.push(rule.id);
            totalScore += 10; // Cada regra matched adiciona 10 pontos

            // Determinar o nível mais alto de qualificação
            if (levelPriority[rule.qualification_level] > levelPriority[highestLevel]) {
              highestLevel = rule.qualification_level;
            }
            // ✅ ETAPA 4: Log de match removido (verboso durante avaliação)
          }
        }

        const result = {
          qualification_level: highestLevel,
          score: totalScore,
          matched_rules: matchedRules,
          reasoning: matchedRules.length > 0 
            ? `${matchedRules.length} regra(s) de qualificação atendida(s)`
            : 'Nenhuma regra de qualificação atendida'
        };

        // ✅ ETAPA 4: Log final apenas para mudanças de nível significativas
        if (shouldLog && (result.qualification_level === 'MQL' || result.qualification_level === 'SQL' || result.score > 20)) {
          qualificationLogger.info(`Qualificação: ${result.qualification_level} (${result.score}pts)`);
        }

        return result;

      } catch (error) {
        // ✅ OTIMIZAÇÃO: Log apenas erros reais em desenvolvimento
        if (shouldLog) {
          qualificationLogger.error('Erro:', error instanceof Error ? error.message : 'Unknown error');
        }
        return {
          qualification_level: 'Lead',
          score: 0,
          matched_rules: [],
          reasoning: 'Erro na avaliação de qualificação'
        };
      }
    }, [tenantId, pipelineId, stableLeadData?.id, stableLeadData?._hash, shouldLog, qualificationLogger]); // ✅ CORREÇÃO CONTEXT7: Dependências estáveis otimizadas

  // ✅ CORREÇÃO CONTEXT7: useQuery com configurações otimizadas para performance máxima
  return useQuery({
    queryKey: evaluationQueryKey,
    queryFn,
    enabled: !!user && !!tenantId && !!pipelineId && !!stableLeadData?.id,
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZAÇÃO: Cache de 10 minutos (regras mudam raramente)
    gcTime: 30 * 60 * 1000, // Garbage collection após 30 minutos (cache mais persistente)
    refetchOnWindowFocus: false, // ✅ PERFORMANCE: Não recarregar ao focar janela
    refetchOnMount: false, // ✅ PERFORMANCE: Confiar no cache para reduzir chamadas
    refetchInterval: false, // ✅ PERFORMANCE: Não fazer polling automático
    refetchOnReconnect: false, // ✅ PERFORMANCE: Não refetch ao reconectar
    retry: (failureCount, error) => {
      // ✅ OTIMIZAÇÃO: Retry inteligente baseado no tipo de erro
      if (error instanceof Error && error.message.includes('auth')) {
        return false; // Não retry em erros de autenticação
      }
      return failureCount < 2; // Máximo 2 tentativas
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // ✅ Backoff exponencial
    // ✅ PERFORMANCE ADICIONAL: Marcar como background query para priorizar UI
    meta: {
      priority: 'background'
    }
  });
};

export type { QualificationEvaluation, QualificationRule };