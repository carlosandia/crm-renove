import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

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

  return useQuery({
    queryKey: ['qualification-evaluation', pipelineId, leadData?.id],
    queryFn: async (): Promise<QualificationEvaluation> => {
      if (!user?.tenant_id || !pipelineId || !leadData) {
        return {
          qualification_level: 'Lead',
          score: 0,
          matched_rules: [],
          reasoning: 'Dados insuficientes para avaliação'
        };
      }

      try {
        // CORREÇÃO 2: Buscar regras de qualificação da pipeline seguindo padrão ModernPipelineCreatorRefactored
        const { data: rules, error: rulesError } = await supabase
          .from('qualification_rules')
          .select('*')
          .eq('pipeline_id', pipelineId)
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true);

        if (rulesError) {
          console.error('❌ Erro ao buscar regras de qualificação:', rulesError);
          return {
            qualification_level: 'Lead',
            score: 0,
            matched_rules: [],
            reasoning: 'Erro ao carregar regras de qualificação'
          };
        }

        if (!rules || rules.length === 0) {
          return {
            qualification_level: 'Lead',
            score: 0,
            matched_rules: [],
            reasoning: 'Nenhuma regra de qualificação configurada'
          };
        }

        // CORREÇÃO 2: Avaliar regras contra dados do lead
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
          const fieldValue = leadData[rule.field_name];
          let ruleMatched = false;

          // Avaliar condição da regra
          switch (rule.condition) {
            case 'equals':
              ruleMatched = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase();
              break;
            case 'contains':
              ruleMatched = String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
              break;
            case 'greater_than':
              ruleMatched = Number(fieldValue) > Number(rule.value);
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
          }
        }

        return {
          qualification_level: highestLevel,
          score: totalScore,
          matched_rules: matchedRules,
          reasoning: matchedRules.length > 0 
            ? `${matchedRules.length} regra(s) de qualificação atendida(s)`
            : 'Nenhuma regra de qualificação atendida'
        };

      } catch (error) {
        console.error('❌ Erro na avaliação de qualificação:', error);
        return {
          qualification_level: 'Lead',
          score: 0,
          matched_rules: [],
          reasoning: 'Erro na avaliação de qualificação'
        };
      }
    },
    enabled: !!user?.tenant_id && !!pipelineId && !!leadData,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false
  });
};

export type { QualificationEvaluation, QualificationRule };