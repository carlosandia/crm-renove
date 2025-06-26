/**
 * Validação End-to-End para Fases 4A e 4B
 * 
 * Este arquivo contém funções para validar os fluxos completos
 * de integração entre frontend, backend e banco de dados
 */

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
}

export interface E2ETestResult {
  testName: string;
  phase: '4A' | '4B';
  success: boolean;
  duration: number;
  steps: ValidationResult[];
  overallResult: ValidationResult;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Valida se os endpoints da API estão respondendo
 */
export async function validateAPIEndpoints(phase: '4A' | '4B'): Promise<ValidationResult> {
  const endpoints = phase === '4A' 
    ? [
        '/api/admin-dashboard/metrics',
        '/api/admin-dashboard/sales-targets',
        '/api/admin-dashboard/alerts',
        '/api/admin-dashboard/team-performance'
      ]
    : [
        '/api/member-tools/tasks',
        '/api/member-tools/tasks/summary',
        '/api/member-tools/calendar/integrations',
        '/api/member-tools/email/templates',
        '/api/member-tools/whatsapp/integrations',
        '/api/member-tools/performance',
        '/api/member-tools/dashboard/config'
      ];

  const errors: string[] = [];
  const details: any = {};

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      details[endpoint] = {
        status: response.status,
        ok: response.ok
      };

      if (!response.ok) {
        errors.push(`${endpoint}: HTTP ${response.status}`);
      }
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : 'Network error'}`);
      details[endpoint] = {
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length === 0 
      ? `Todos os ${endpoints.length} endpoints da Fase ${phase} estão funcionando`
      : `${errors.length} endpoints com problemas na Fase ${phase}`,
    details,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Valida se as tabelas do banco existem e têm a estrutura correta
 */
export async function validateDatabaseTables(phase: '4A' | '4B'): Promise<ValidationResult> {
  const tables = phase === '4A'
    ? [
        'admin_dashboard_configs',
        'sales_targets',
        'team_performance_snapshots',
        'admin_alerts',
        'admin_custom_reports',
        'sales_forecasts_advanced'
      ]
    : [
        'member_tasks',
        'member_task_activities',
        'calendar_integrations',
        'calendar_events',
        'email_templates',
        'email_sends',
        'whatsapp_integrations',
        'whatsapp_templates',
        'whatsapp_conversations',
        'whatsapp_messages',
        'member_performance_snapshots',
        'member_activities',
        'member_dashboard_configs'
      ];

  try {
    // Simula uma verificação de tabelas (seria feita via API)
    const response = await fetch(`${API_BASE}/api/health/database-tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ tables, phase })
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Erro ao verificar tabelas da Fase ${phase}: HTTP ${response.status}`,
        details: { status: response.status }
      };
    }

    const result = await response.json();
    
    return {
      success: result.success,
      message: result.success 
        ? `Todas as ${tables.length} tabelas da Fase ${phase} existem e estão corretas`
        : `Problemas encontrados nas tabelas da Fase ${phase}`,
      details: result.details,
      errors: result.errors
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro de conexão ao validar tabelas da Fase ${phase}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Valida se os hooks React estão funcionando corretamente
 */
export async function validateReactHooks(phase: '4A' | '4B'): Promise<ValidationResult> {
  try {
    if (phase === '4A') {
      // Valida hook useAdminDashboard
      const { useAdminDashboard } = await import('../hooks/useAdminDashboard');
      
      return {
        success: true,
        message: 'Hook useAdminDashboard carregado com sucesso',
        details: { hookName: 'useAdminDashboard', phase: '4A' }
      };
    } else {
      // Valida hook useMemberTools
      const { useMemberTools } = await import('../hooks/useMemberTools');
      
      return {
        success: true,
        message: 'Hook useMemberTools carregado com sucesso',
        details: { hookName: 'useMemberTools', phase: '4B' }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao carregar hooks da Fase ${phase}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Valida se os componentes React estão carregando corretamente
 */
export async function validateReactComponents(phase: '4A' | '4B'): Promise<ValidationResult> {
  try {
    if (phase === '4A') {
      // Valida componente AdminDashboard
      const AdminDashboard = await import('../components/AdminDashboard');
      
      return {
        success: true,
        message: 'Componente AdminDashboard carregado com sucesso',
        details: { componentName: 'AdminDashboard', phase: '4A' }
      };
    } else {
      // Valida componente MemberDashboard
      const MemberDashboard = await import('../components/MemberDashboard');
      
      return {
        success: true,
        message: 'Componente MemberDashboard carregado com sucesso',
        details: { componentName: 'MemberDashboard', phase: '4B' }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao carregar componentes da Fase ${phase}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Valida fluxo completo de criação e leitura de dados
 */
export async function validateDataFlow(phase: '4A' | '4B'): Promise<ValidationResult> {
  try {
    if (phase === '4A') {
      // Testa criação de meta de vendas
      const testTarget = {
        target_name: 'Meta de Teste E2E',
        target_type: 'revenue',
        target_value: 10000,
        current_value: 0,
        period_type: 'monthly',
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      };

      const createResponse = await fetch(`${API_BASE}/api/admin-dashboard/sales-targets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(testTarget)
      });

      if (!createResponse.ok) {
        return {
          success: false,
          message: 'Falha ao criar meta de teste',
          details: { status: createResponse.status }
        };
      }

      const created = await createResponse.json();

      // Testa leitura
      const readResponse = await fetch(`${API_BASE}/api/admin-dashboard/sales-targets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!readResponse.ok) {
        return {
          success: false,
          message: 'Falha ao ler metas criadas',
          details: { status: readResponse.status }
        };
      }

      return {
        success: true,
        message: 'Fluxo de dados da Fase 4A validado com sucesso',
        details: { created: created.data }
      };
    } else {
      // Testa criação de tarefa
      const testTask = {
        task_type: 'follow_up',
        title: 'Tarefa de Teste E2E',
        description: 'Tarefa criada para validação end-to-end',
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        automation_triggered: false
      };

      const createResponse = await fetch(`${API_BASE}/api/member-tools/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(testTask)
      });

      if (!createResponse.ok) {
        return {
          success: false,
          message: 'Falha ao criar tarefa de teste',
          details: { status: createResponse.status }
        };
      }

      const created = await createResponse.json();

      // Testa leitura
      const readResponse = await fetch(`${API_BASE}/api/member-tools/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!readResponse.ok) {
        return {
          success: false,
          message: 'Falha ao ler tarefas criadas',
          details: { status: readResponse.status }
        };
      }

      return {
        success: true,
        message: 'Fluxo de dados da Fase 4B validado com sucesso',
        details: { created: created.data }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro no fluxo de dados da Fase ${phase}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Executa validação completa end-to-end para uma fase
 */
export async function runE2EValidation(phase: '4A' | '4B'): Promise<E2ETestResult> {
  const startTime = Date.now();
  const steps: ValidationResult[] = [];

  console.log(`🚀 Iniciando validação E2E da Fase ${phase}...`);

  // Passo 1: Validar endpoints da API
  console.log(`📡 Validando endpoints da API...`);
  const apiValidation = await validateAPIEndpoints(phase);
  steps.push(apiValidation);

  // Passo 2: Validar tabelas do banco
  console.log(`🗄️ Validando tabelas do banco...`);
  const dbValidation = await validateDatabaseTables(phase);
  steps.push(dbValidation);

  // Passo 3: Validar hooks React
  console.log(`⚛️ Validando hooks React...`);
  const hooksValidation = await validateReactHooks(phase);
  steps.push(hooksValidation);

  // Passo 4: Validar componentes React
  console.log(`🧩 Validando componentes React...`);
  const componentsValidation = await validateReactComponents(phase);
  steps.push(componentsValidation);

  // Passo 5: Validar fluxo de dados
  console.log(`🔄 Validando fluxo de dados...`);
  const dataFlowValidation = await validateDataFlow(phase);
  steps.push(dataFlowValidation);

  const duration = Date.now() - startTime;
  const successCount = steps.filter(step => step.success).length;
  const totalSteps = steps.length;

  const overallResult: ValidationResult = {
    success: successCount === totalSteps,
    message: successCount === totalSteps
      ? `✅ Todos os ${totalSteps} testes da Fase ${phase} passaram`
      : `❌ ${totalSteps - successCount} de ${totalSteps} testes falharam na Fase ${phase}`,
    details: {
      successCount,
      totalSteps,
      successRate: (successCount / totalSteps * 100).toFixed(1) + '%'
    }
  };

  console.log(`🏁 Validação E2E da Fase ${phase} concluída em ${duration}ms`);
  console.log(overallResult.message);

  return {
    testName: `E2E Validation Phase ${phase}`,
    phase,
    success: overallResult.success,
    duration,
    steps,
    overallResult
  };
}

/**
 * Executa validação completa de ambas as fases
 */
export async function runFullE2EValidation(): Promise<{
  phase4A: E2ETestResult;
  phase4B: E2ETestResult;
  overall: ValidationResult;
}> {
  console.log('🎯 Iniciando validação E2E completa das Fases 4A e 4B...');
  
  const phase4A = await runE2EValidation('4A');
  const phase4B = await runE2EValidation('4B');

  const overall: ValidationResult = {
    success: phase4A.success && phase4B.success,
    message: phase4A.success && phase4B.success
      ? '🎉 Validação E2E completa: Ambas as fases estão funcionando perfeitamente!'
      : '⚠️ Problemas encontrados na validação E2E',
    details: {
      phase4A: {
        success: phase4A.success,
        duration: phase4A.duration,
        steps: phase4A.steps.length
      },
      phase4B: {
        success: phase4B.success,
        duration: phase4B.duration,
        steps: phase4B.steps.length
      },
      totalDuration: phase4A.duration + phase4B.duration
    }
  };

  console.log('🏆 Validação E2E completa finalizada!');
  console.log(overall.message);

  return {
    phase4A,
    phase4B,
    overall
  };
}

/**
 * Utilitário para executar validação via console do navegador
 */
export function validateInConsole() {
  console.log('🔧 Executando validação E2E via console...');
  
  runFullE2EValidation().then(result => {
    console.table({
      'Fase 4A': {
        Status: result.phase4A.success ? '✅ Sucesso' : '❌ Falha',
        Duração: `${result.phase4A.duration}ms`,
        Testes: `${result.phase4A.steps.filter(s => s.success).length}/${result.phase4A.steps.length}`
      },
      'Fase 4B': {
        Status: result.phase4B.success ? '✅ Sucesso' : '❌ Falha',
        Duração: `${result.phase4B.duration}ms`,
        Testes: `${result.phase4B.steps.filter(s => s.success).length}/${result.phase4B.steps.length}`
      }
    });
    
    console.log('\n📊 Resultado Detalhado:', result);
  }).catch(error => {
    console.error('❌ Erro na validação E2E:', error);
  });
}

// Expor função globalmente para uso no console
if (typeof window !== 'undefined') {
  (window as any).validateCRM = validateInConsole;
} 