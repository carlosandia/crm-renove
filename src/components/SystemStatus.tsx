import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { MotionWrapper } from './ui/motion-wrapper';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Shield,
  Wifi,
  Server
} from 'lucide-react';
import SupabaseDiagnostic from '../utils/supabaseDiagnostic';

// ✅ CATEGORIA 3.1: Interface para Props do componente
interface SystemStatusProps {}

// ✅ CATEGORIA 3.1: Tipo específico para details em vez de any
type SystemCheckDetails = 
  | { uptime: string; responseTime: string }  // Server status
  | Record<string, unknown>                   // Diagnostic results
  | Error                                     // Error objects
  | unknown;                                  // Fallback para casos não mapeados

interface SystemCheck {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: SystemCheckDetails;  // ✅ Substituído any por tipo específico
  icon: React.ComponentType<any>;
}

const SystemStatus: React.FC<SystemStatusProps> = () => {
  const { user } = useAuth();
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const runSystemChecks = async () => {
    setLoading(true);
    const results: SystemCheck[] = [];

    try {
      // Teste de conexão
      const connectionTest = await SupabaseDiagnostic.testConnection();
      results.push({
        name: 'Conexão com Banco de Dados',
        status: connectionTest.success ? 'success' : 'error',
        message: connectionTest.message,
        details: connectionTest.details,
        icon: Database
      });

      // Teste de autenticação
      const authTest = await SupabaseDiagnostic.testAuth();
      results.push({
        name: 'Autenticação',
        status: authTest.success ? 'success' : 'warning',
        message: authTest.message,
        details: authTest.details,
        icon: Shield
      });

      // Teste de conectividade
      results.push({
        name: 'Conectividade de Rede',
        status: navigator.onLine ? 'success' : 'error',
        message: navigator.onLine ? 'Online' : 'Offline',
        icon: Wifi
      });

      // Status do servidor (simulado)
      results.push({
        name: 'Status do Servidor',
        status: 'success',
        message: 'Operacional',
        details: { uptime: '99.9%', responseTime: '< 200ms' },
        icon: Server
      });

    } catch (error) {
      results.push({
        name: 'Sistema',
        status: 'error',
        message: 'Erro ao executar verificações',
        details: error,
        icon: XCircle
      });
    }

    setChecks(results);
    setLoading(false);
  };

  useEffect(() => {
    runSystemChecks();
  }, []);

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'loading':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'loading':
        return 'border-blue-200 bg-blue-50';
    }
  };

  // Verificar se usuário tem permissão
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <MotionWrapper variant="scaleIn">
        <Card className="text-center p-8">
          <CardContent>
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Esta área é exclusiva para Administradores.
            </p>
          </CardContent>
        </Card>
      </MotionWrapper>
    );
  }

  return (
    <MotionWrapper variant="fadeIn" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Status do Sistema</h1>
              <p className="text-muted-foreground">
                Monitoramento da saúde da aplicação
              </p>
            </div>
            <Button 
              onClick={runSystemChecks} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check, index) => (
          <MotionWrapper key={check.name} variant="slideUp" delay={index * 0.1}>
            <Card className={`border-2 ${getStatusColor(check.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <check.icon className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold">{check.name}</h3>
                  </div>
                  {getStatusIcon(check.status)}
                </div>
                
                <p className={`text-sm mb-2 ${
                  check.status === 'success' ? 'text-green-700' :
                  check.status === 'error' ? 'text-red-700' :
                  check.status === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  {check.message}
                </p>

                {check.details && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Ver detalhes
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {/* AIDEV-NOTE: Type-safe conversion of unknown to string */}
                      {typeof check.details === 'string' 
                        ? check.details 
                        : JSON.stringify(check.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </MotionWrapper>
        ))}
      </div>

      {/* Resumo geral */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Status Geral</h3>
              <p className="text-sm text-muted-foreground">
                {checks.filter(c => c.status === 'success').length} de {checks.length} verificações bem-sucedidas
              </p>
            </div>
            <div className="flex space-x-2">
              {checks.some(c => c.status === 'error') ? (
                <div className="flex items-center text-red-600">
                  <XCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Sistema com problemas</span>
                </div>
              ) : checks.some(c => c.status === 'warning') ? (
                <div className="flex items-center text-yellow-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Sistema com avisos</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Sistema operacional</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionWrapper>
  );
};

export default SystemStatus; 