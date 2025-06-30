// Sistema de Limpeza de Console - Produção Enterprise
interface ConsoleCleanerConfig {
  suppressWarnings: boolean;
  environment: 'development' | 'production';
}

class ConsoleCleaner {
  private config: ConsoleCleanerConfig;
  private originalWarn: typeof console.warn;
  
  // Padrões de warnings para suprimir
  private suppressPatterns = [
    /ReactDOM.render is deprecated/,
    /componentWillReceiveProps has been renamed/,
    /The above dynamic import cannot be analyzed/,
    /Using the user object as returned from supabase.auth.getSession/,
    /React Router Future Flag Warning/,
    /defaultProps will be removed/,
    /Download the React DevTools/,
  ];

  constructor() {
    this.config = {
      suppressWarnings: true,
      environment: import.meta.env.PROD ? 'production' : 'development'
    };

    this.originalWarn = console.warn;
    this.initializeCleaning();
  }

  private initializeCleaning() {
    if (import.meta.env.VITE_LOG_LEVEL === 'none' || 
        import.meta.env.VITE_LOG_LEVEL === 'warn') {
      this.overrideConsole();
    }
  }

  private overrideConsole() {
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      if (this.shouldSuppress(message)) {
        return; // Suprimir warning conhecido
      }
      
      this.originalWarn(...args); // Mostrar warning legítimo
    };
  }

  private shouldSuppress(message: string): boolean {
    return this.suppressPatterns.some(pattern => pattern.test(message));
  }

  restore() {
    console.warn = this.originalWarn;
  }
}

export const consoleCleaner = new ConsoleCleaner();
export default consoleCleaner; 