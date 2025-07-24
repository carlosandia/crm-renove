// ================================================================================
// EXPORTAÇÕES PRINCIPAIS
// ================================================================================
export { 
  ConnectedDistributionManager,
  ConnectedDistributionManager as default,
  DistributionManagerRender,
  DistributionManagerOffline,
  useLocalDistributionManager
} from './DistributionManager';

export {
  DistributionMetrics
} from './DistributionMetrics';

export {
  DistributionTester
} from './DistributionTester';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================
export type { 
  DistributionRule,
  DistributionStats,
  SaveDistributionRuleRequest,
  AssignmentHistory
} from '../../../services/distributionApi';

export type { 
  UseDistributionManagerReturn,
  UseDistributionRuleReturn,
  UseDistributionStatsReturn
} from '../../../hooks/useDistributionApi';

// Para compatibilidade, manter alguns tipos antigos
export type { 
  UseLocalDistributionManagerReturn as DistributionManagerReturn,
  UseLocalDistributionManagerProps as DistributionManagerProps
} from './DistributionManager';

// ================================================================================
// HOOKS PARA USO EXTERNO
// ================================================================================
export {
  useDistributionRule,
  useDistributionStats,
  useSaveDistributionRule,
  useTestDistribution,
  useResetDistribution,
  useDistributionManager as useDistributionApiManager
} from '../../../hooks/useDistributionApi';

export {
  DistributionApiService,
  distributionQueryKeys
} from '../../../services/distributionApi'; 