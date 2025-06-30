import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Clock, 
  RefreshCw,
  BarChart3,
  TrendingUp,
  Key,
  Database,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SecurityMetrics {
  last_key_rotation: string;
  failed_webhook_attempts: number;
  rate_limit_hits: number;
  total_requests_today: number;
  security_score: number;
  suspicious_activities: number;
  blocked_ips: string[];
  last_security_scan: string;
}

interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export function useSecurityMetrics() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async () => {
    setIsRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: SecurityMetrics = {
        last_key_rotation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        failed_webhook_attempts: Math.floor(Math.random() * 10),
        rate_limit_hits: Math.floor(Math.random() * 50),
        total_requests_today: Math.floor(Math.random() * 1000) + 500,
        security_score: Math.floor(Math.random() * 30) + 70,
        suspicious_activities: Math.floor(Math.random() * 5),
        blocked_ips: ['192.168.1.100', '10.0.0.50'],
        last_security_scan: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      };

      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'warning',
          message: 'Chaves de API não rotacionadas há 5 dias',
          timestamp: new Date().toISOString(),
          resolved: false
        },
        {
          id: '2',
          type: 'info',
          message: 'Scan de segurança executado com sucesso',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          resolved: true
        }
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, text: 'Excelente', className: 'bg-green-500' };
    if (score >= 60) return { variant: 'default' as const, text: 'Bom', className: 'bg-yellow-500' };
    return { variant: 'destructive' as const, text: 'Atenção', className: 'bg-red-500' };
  };

  return {
    metrics,
    alerts,
    isLoading,
    isRefreshing,
    loadMetrics,
    getSecurityScoreColor,
    getSecurityScoreBadge
  };
}

interface SecurityMetricsRenderProps {
  securityManager: ReturnType<typeof useSecurityMetrics>;
}

export function SecurityMetricsRender({ securityManager }: SecurityMetricsRenderProps) {
  const {
    metrics,
    alerts,
    isLoading,
    isRefreshing,
    loadMetrics,
    getSecurityScoreColor,
    getSecurityScoreBadge
  } = securityManager;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando métricas de segurança...</span>
      </div>
    );
  }

  if (!metrics) return null;

  const scoreBadge = getSecurityScoreBadge(metrics.security_score);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Métricas de Segurança
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de segurança e atividades suspeitas
          </p>
        </div>
        <Button
          onClick={loadMetrics}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <BlurFade delay={0.1} inView>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score de Segurança</p>
                  <p className={`text-2xl font-bold ${getSecurityScoreColor(metrics.security_score)}`}>
                    {metrics.security_score}%
                  </p>
                </div>
                <Badge variant={scoreBadge.variant} className={scoreBadge.className}>
                  {scoreBadge.text}
                </Badge>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requests Hoje</p>
                  <p className="text-2xl font-bold">{metrics.total_requests_today.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rate Limit Hits</p>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.rate_limit_hits}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Webhook Failures</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.failed_webhook_attempts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Status das Chaves
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Última Rotação</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(metrics.last_key_rotation).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-yellow-600">
                  5 dias atrás
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Último Scan</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(metrics.last_security_scan).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600">
                  Recente
                </Badge>
              </div>
            </CardContent>
          </AnimatedCard>

          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Alertas de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.type === 'error' 
                        ? 'bg-red-50 border-red-400' 
                        : alert.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {alert.resolved ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className={`h-4 w-4 ${
                          alert.type === 'error' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </BlurFade>

      {metrics.blocked_ips.length > 0 && (
        <BlurFade delay={0.3} inView>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                IPs Bloqueados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {metrics.blocked_ips.map((ip) => (
                  <Badge key={ip} variant="outline" className="font-mono text-xs">
                    {ip}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}
    </div>
  );
}

export default SecurityMetricsRender; 