// =====================================================================================
// COMPONENT: RealtimeChannelMonitor (DEBUG)
// Autor: Claude (Arquiteto Sênior)  
// Data: 2025-01-25
// Descrição: Monitor de debug para canais Realtime singleton
// AIDEV-NOTE: Componente opcional para debugging de memory leaks
// =====================================================================================

import React, { useState, useEffect } from 'react';
import { realtimeChannelManager } from '../../services/RealtimeChannelManager';

interface RealtimeChannelMonitorProps {
  enabled?: boolean;
  updateInterval?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const RealtimeChannelMonitor: React.FC<RealtimeChannelMonitorProps> = ({
  enabled = true,
  updateInterval = 3000,
  position = 'bottom-right'
}) => {
  const [status, setStatus] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    if (!enabled) return;

    const updateStatus = () => {
      const newStatus = realtimeChannelManager.getStatus();
      setStatus(newStatus);
      setLastUpdate(new Date().toLocaleTimeString());
    };

    // Update inicial
    updateStatus();

    // Update periódico
    const interval = setInterval(updateStatus, updateInterval);

    return () => clearInterval(interval);
  }, [enabled, updateInterval]);

  if (!enabled || !status) return null;

  const getPositionStyles = () => {
    const base = {
      position: 'fixed' as const,
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px',
      borderRadius: '6px',
      maxWidth: isExpanded ? '400px' : '200px',
      transition: 'all 0.3s ease'
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: '10px', left: '10px' };
      case 'top-right':
        return { ...base, top: '10px', right: '10px' };
      case 'bottom-left':
        return { ...base, bottom: '10px', left: '10px' };
      case 'bottom-right':
      default:
        return { ...base, bottom: '10px', right: '10px' };
    }
  };

  const getStatusColor = (channelStatus: string) => {
    switch (channelStatus) {
      case 'connected': return '#4ade80'; // green
      case 'connecting': return '#fbbf24'; // yellow
      case 'error': return '#ef4444'; // red
      case 'disconnected': return '#94a3b8'; // gray
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div style={getPositionStyles()}>
      <div 
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: status.totalChannels > 0 ? '#4ade80' : '#ef4444',
            display: 'inline-block'
          }}></span>
          <strong>RT Channels: {status.totalChannels}</strong>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {!isExpanded && (
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
            Last: {lastUpdate}
          </div>
        )}
      </div>

      {isExpanded && (
        <div style={{ marginTop: '8px', borderTop: '1px solid #374151', paddingTop: '8px' }}>
          <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '6px' }}>
            Last Update: {lastUpdate}
          </div>
          
          {status.channels.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Nenhum canal ativo
            </div>
          ) : (
            status.channels.map((channel: any, index: number) => (
              <div key={channel.name} style={{ 
                marginBottom: '6px', 
                padding: '4px', 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '3px',
                fontSize: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: getStatusColor(channel.status),
                    display: 'inline-block'
                  }}></span>
                  <strong style={{ fontSize: '10px' }}>
                    {channel.name.split(':')[1]?.substring(0, 8)}...
                  </strong>
                  <span style={{ opacity: 0.7 }}>
                    ({channel.status})
                  </span>
                </div>
                
                <div style={{ marginLeft: '10px', opacity: 0.8 }}>
                  <div>RefCount: {channel.refCount}</div>
                  <div>Listeners: {channel.listeners}</div>
                  <div>Errors: {channel.errorCount}</div>
                  <div>Uptime: {Math.round(channel.uptime / 1000)}s</div>
                  <div style={{ fontSize: '9px', opacity: 0.6 }}>
                    LastUsed: {new Date(channel.lastUsed).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}

          <div style={{ 
            marginTop: '8px', 
            paddingTop: '6px', 
            borderTop: '1px solid #374151',
            fontSize: '9px',
            opacity: 0.7
          }}>
            💡 Clique para expandir/contrair
          </div>
        </div>
      )}
    </div>
  );
};

// Hook para usar o monitor em desenvolvimento
export const useRealtimeChannelMonitor = (enabled: boolean = process.env.NODE_ENV === 'development') => {
  const [showMonitor, setShowMonitor] = useState(enabled);

  // Hotkey para toggle (Ctrl+Shift+R)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        setShowMonitor(prev => !prev);
        console.log('🔍 [DEBUG] Realtime Channel Monitor toggled:', !showMonitor);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enabled, showMonitor]);

  return { showMonitor, setShowMonitor };
};

export default RealtimeChannelMonitor;