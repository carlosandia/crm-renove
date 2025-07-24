/**
 * ============================================
 * 🔧 GLOBAL TYPE DECLARATIONS
 * ============================================
 * 
 * Declarações de tipos globais para bibliotecas externas
 * e propriedades window que não possuem tipos TypeScript.
 */

// ============================================
// GOOGLE ANALYTICS & GTAG
// ============================================

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    
    dataLayer?: Array<Record<string, any>>;
    
    // ✅ LOG THROTTLING CONTROLS
    __apiTokenLogged?: boolean;
    __metricsLogThrottled?: boolean;
    __filtersLogThrottled?: boolean;
  }
}

// ============================================
// SENTRY GLOBAL
// ============================================

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: any, context?: any) => void;
      captureMessage: (message: string, level?: 'error' | 'warning' | 'info') => void;
      configureScope: (callback: (scope: any) => void) => void;
      setUser: (user: Record<string, any>) => void;
      setTag: (key: string, value: string) => void;
      setContext: (key: string, context: Record<string, any>) => void;
    };
  }
}

// ============================================
// PERFORMANCE API EXTENSIONS
// ============================================

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// ============================================
// REACT DEVTOOLS GLOBAL
// ============================================

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      isDisabled: boolean;
      supportsFiber: boolean;
      renderers: Map<number, any>;
      onCommitFiberRoot: (id: number, root: any) => void;
      onCommitFiberUnmount: (id: number, fiber: any) => void;
    };
  }
}

// Export para garantir que seja tratado como módulo
export {};