import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useNetworkHealth } from '../utils/networkHealthCheck';

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { status, isLoading } = useNetworkHealth();

  if (isLoading || !status) {
    return null;
  }

  // Só mostrar se houver problemas
  if (status.overall === 'healthy') {
    return showDetails ? (
      <Badge variant="secondary" className={`gap-2 ${className}`}>
        <CheckCircle className="h-3 w-3 text-green-500" />
        Sistema Online
      </Badge>
    ) : null;
  }

  const getStatusIcon = () => {
    switch (status.overall) {
      case 'healthy':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status.overall) {
      case 'degraded':
        return 'Sistema em modo degradado - algumas funcionalidades podem estar limitadas';
      case 'offline':
        return 'Sistema offline - funcionando em modo local';
      default:
        return 'Status desconhecido';
    }
  };

  const getStatusVariant = () => {
    switch (status.overall) {
      case 'degraded':
        return 'default' as const;
      case 'offline':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert variant={getStatusVariant()} className={className}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <AlertDescription className="text-sm">
            {getStatusMessage()}
          </AlertDescription>
          
          {showDetails && (
            <div className="flex gap-2 mt-2">
              <Badge 
                variant={status.backend.isHealthy ? "secondary" : "destructive"} 
                className="text-xs"
              >
                API: {status.backend.isHealthy ? 'Online' : 'Offline'}
                {status.backend.latency > 0 && ` (${status.backend.latency}ms)`}
              </Badge>
              
              <Badge 
                variant={status.supabase.isHealthy ? "secondary" : "destructive"} 
                className="text-xs"
              >
                Database: {status.supabase.isHealthy ? 'Online' : 'Offline'}
                {status.supabase.latency > 0 && ` (${status.supabase.latency}ms)`}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

// Hook para usar em outros componentes
export function useNetworkStatus() {
  const { status } = useNetworkHealth();
  
  return {
    isOnline: status?.overall === 'healthy',
    isDegraded: status?.overall === 'degraded',
    isOffline: status?.overall === 'offline',
    backendHealthy: status?.backend.isHealthy || false,
    supabaseHealthy: status?.supabase.isHealthy || false,
    status
  };
}

export default NetworkStatusIndicator; 