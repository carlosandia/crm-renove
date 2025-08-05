# 🔧 Controles de Logger - Guia de Uso

## 🚨 Controle de Emergência (Spam de Logs)

Se você estiver enfrentando spam excessivo de logs no console durante desenvolvimento, use estes comandos:

### Comandos Rápidos no Console do Browser

```javascript
// 🔇 Modo silencioso - apenas warnings e errors
window.enableQuietMode?.() || logger.setLevel('warn');

// 🚨 Emergência total - apenas errors críticos  
window.emergencyLogSilence?.() || logger.setLevel('error');

// 🔄 Restaurar configurações padrão
window.resetToDefaults?.() || logger.setLevel('info');

// 📊 Ver status atual do logger
window.showLoggerStatus?.();
```

### Controles via Import

```typescript
import { 
  enableQuietMode, 
  emergencyLogSilence, 
  resetToDefaults, 
  showLoggerStatus 
} from '../utils/logger';

// Em qualquer componente
enableQuietMode(); // Modo silencioso
emergencyLogSilence(); // Apenas errors
resetToDefaults(); // Voltar ao normal
```

## 🎯 Componentes com Throttling Especial

Os seguintes componentes têm throttling especial para reduzir spam:

- **ModernPipelineCreator**: Auto-save com throttling de 5s
- **useStageManager**: Cálculos de stage com throttling de 5s  
- **CadenceManager**: Sincronização com throttling de 5s
- **LeadCard**: Badge calculation com throttling de 10s

## 🔧 Problemas Comuns e Soluções

### Problema: Badge de tarefas gerando warnings
**Solução**: Agora só loga discrepâncias > 1 (tolerância para race conditions)

### Problema: Auto-save excessivo
**Solução**: Implementado deep comparison e throttling inteligente

### Problema: Logs de pipeline repetitivos  
**Solução**: Logs agrupados com flush automático a cada 3s

## 📱 Configuração por Ambiente

```typescript
// Desenvolvimento (padrão)
logger.setLevel('info');

// Produção (automático)
logger.setLevel('warn');
logger.enableDataMasking(true);

// Debug intensivo (quando necessário)
logger.setLevel('debug');
```

## 🛠️ Debug Avançado

```typescript
// Ver métricas do throttling
console.log('Throttle map size:', logger['throttleMap']?.size);
console.log('Grouped logs size:', logger['groupedLogs']?.size);

// Forçar flush dos logs agrupados
logger['flushGroupedLogs']?.();
```

## ⚡ Correções Implementadas

✅ **Throttling inteligente** com blacklist para componentes problemáticos  
✅ **Badge de tarefas** com tolerância para overlapping pending/overdue  
✅ **Auto-save otimizado** com deep comparison para evitar triggers desnecessários  
✅ **Logs agrupados** com flush automático para reduzir spam  
✅ **Controles de emergência** para silenciar logs rapidamente  

## 🎯 Resultado Esperado

- **90% menos logs** durante desenvolvimento normal
- **Zero falsos positivos** no badge de tarefas  
- **Console limpo** para debugging efetivo
- **Performance melhorada** com menos auto-saves

---

*Documentação gerada automaticamente - Última atualização: 2025-01-26*