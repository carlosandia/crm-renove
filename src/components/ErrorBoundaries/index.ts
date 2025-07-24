/**
 * ============================================
 * 🔧 ERROR BOUNDARIES - INDEX
 * ============================================
 * 
 * Exports centralizados para error boundaries especializados.
 */

export { BaseErrorBoundary, DefaultErrorFallback } from './BaseErrorBoundary';
export type { BaseErrorBoundaryProps, ErrorFallbackProps } from './BaseErrorBoundary';

export { PipelineErrorBoundary } from './PipelineErrorBoundary';
export type { PipelineErrorBoundaryProps } from './PipelineErrorBoundary';

// AIDEV-NOTE: Error Monitoring Boundary com integração ao sistema de monitoring
export { 
  default as ErrorMonitoringBoundary,
  withErrorMonitoring,
  useErrorMonitoring 
} from './ErrorMonitoringBoundary';

// Re-export para facilitar imports
export {
  BaseErrorBoundary as ErrorBoundary
} from './BaseErrorBoundary';

export {
  PipelineErrorBoundary as PipelineError
} from './PipelineErrorBoundary';

export {
  default as MonitoringBoundary
} from './ErrorMonitoringBoundary';