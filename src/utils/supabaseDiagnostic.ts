// Utilitário para diagnóstico de problemas do Supabase
import { supabase } from '../lib/supabase';

interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
}

export class SupabaseDiagnostic {
  // Testar conexão básica
  static async testConnection(): Promise<DiagnosticResult> {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        return {
          success: false,
          message: 'Erro de conexão com Supabase',
          details: error
        };
      }
      
      return {
        success: true,
        message: 'Conexão com Supabase funcionando',
        details: data
      };
    } catch (err) {
      return {
        success: false,
        message: 'Erro crítico de conexão',
        details: err
      };
    }
  }

  // Testar autenticação
  static async testAuth(): Promise<DiagnosticResult> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return {
          success: false,
          message: 'Erro de autenticação',
          details: error
        };
      }
      
      return {
        success: true,
        message: user ? 'Usuário autenticado' : 'Usuário não autenticado',
        details: { user: user?.email || 'Anônimo' }
      };
    } catch (err) {
      return {
        success: false,
        message: 'Erro crítico de autenticação',
        details: err
      };
    }
  }

  // ❌ REMOVIDO: setupNetworkErrorLogging (causava loops de fetch)
  // static setupNetworkErrorLogging() { ... }

  // Executar diagnóstico completo (apenas manual)
  static async runFullDiagnostic(): Promise<DiagnosticResult[]> {
    const results = await Promise.all([
      this.testConnection(),
      this.testAuth()
    ]);
    
    return results;
  }
}

// ❌ REMOVIDO: Execução automática que causava loops
// if (import.meta.env.DEV) { ... }

export default SupabaseDiagnostic; 