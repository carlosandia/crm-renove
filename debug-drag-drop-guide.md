# 🐛 Sistema de Debug - Drag & Drop

Este documento explica como ativar e usar o sistema de debug para investigar problemas de posicionamento no Drag & Drop.

## 🚀 Ativação Rápida

Abra o console do navegador e execute:

```javascript
// Ativar debug completo
window.enableDragDropDebug()

// Testar movimento de lead - logs aparecerão automaticamente
// Mova um lead entre etapas ou dentro da mesma etapa

// Desativar debug
window.disableDragDropDebug()
```

## 📊 Comandos Disponíveis

### ✅ Controles Básicos
```javascript
// Ativar debug
window.enableDragDropDebug()

// Desativar debug  
window.disableDragDropDebug()

// Ver configuração atual
window.showDragDropConfig()
```

### 🔧 Configuração Avançada
```javascript
// Configurar categorias específicas
window.dragDropDebugConfig = {
  enabled: true,
  logMovements: true,    // Logs de movimentos (↔️ ↕️)
  logPositions: true,    // Logs de updates de posição (📦 🎯)
  logAPI: true,         // Logs de chamadas API (✅ ❌)
  logOptimistic: true   // Logs de updates otimistas (⚡ ↩️)
}

// Aplicar configuração
window.debugDragDrop = true
```

## 📋 Tipos de Logs

### 🎯 Movimentos de Drag & Drop
- **↔️ HORIZONTAL**: Entre etapas diferentes
- **↕️ VERTICAL**: Reordenação na mesma etapa  
- **❌ CANCELLED**: Movimento cancelado

### 📦 Updates de Posição
- **📦 BATCH**: Atualização em lote de posições
- **🎯 SINGLE**: Atualização individual
- **⚡ OPTIMISTIC**: Update otimista (antes da API)

### 🌐 Chamadas de API
- **✅ SUCCESS**: API respondeu com sucesso (200-299)
- **❌ ERROR**: API retornou erro (400+)
- **⚠️ WARNING**: API respondeu mas com status não ideal

### ⏱️ Performance
- **PERFORMANCE**: Tempo de execução das operações
- Tracking automático de todas as operações de drag & drop

## 🔍 Investigando Problemas

### Problema: Leads não ficam na posição correta
```javascript
// 1. Ativar debug
window.enableDragDropDebug()

// 2. Reproduzir o problema movendo um lead

// 3. Procurar por logs específicos:
// ↕️ VERTICAL ou ↔️ HORIZONTAL - confirma detecção do movimento
// 📦 BATCH - confirma cálculo das posições
// ✅ API - confirma que API foi chamada e respondeu
```

### Problema: API não está sendo chamada
```javascript
// 1. Ativar apenas logs de API
window.dragDropDebugConfig = {
  enabled: true,
  logMovements: false,
  logPositions: false, 
  logAPI: true,
  logOptimistic: false
}

// 2. Mover lead e verificar se aparece log de API
// Se não aparecer, problema está no frontend
// Se aparecer com erro, problema está no backend
```

### Problema: Performance lenta
```javascript
// 1. Ativar debug
window.enableDragDropDebug()

// 2. Mover lead e verificar logs ⏱️ PERFORMANCE
// Operações > 1000ms indicam lentidão
// Verificar tempo das chamadas de API
```

## 📊 Interpretando os Logs

### Log de Movimento Vertical
```
↕️ [DRAG MOVEMENT] VERTICAL: {
  leadId: "a1b2c3d4",
  from: { stage: "stage123", index: 2 },
  to: { stage: "stage123", index: 0 },
  reason: "N/A"
}
```

### Log de Update de Posições
```
📦 [POSITION UPDATE] BATCH: {
  count: 5,
  stage: "stage123", 
  context: "Reordenação vertical: 2 → 0",
  sample: [
    { leadId: "a1b2c3d4", position: 1 },
    { leadId: "e5f6g7h8", position: 2 },
    { leadId: "i9j0k1l2", position: 3 }
  ]
}
```

### Log de API
```
✅ [API CALL] PUT /api/pipelines/.../leads/positions: {
  status: 200,
  duration: "245ms",
  payloadSize: 156,
  error: null
}
```

## 🚨 Problemas Comuns

### 1. Logs não aparecem
- Verificar se está em modo desenvolvimento (`import.meta.env.DEV`)
- Executar `window.enableDragDropDebug()` novamente
- Verificar se `window.dragDropDebugConfig.enabled` é `true`

### 2. Muitos logs poluindo console
```javascript
// Desativar categorias desnecessárias
window.dragDropDebugConfig.logMovements = false
window.dragDropDebugConfig.logPositions = false
// Manter apenas logAPI = true para focar em problemas de API
```

### 3. Performance ruim após ativar debug
- Normal - logs têm overhead
- Desativar para uso normal: `window.disableDragDropDebug()`
- Em produção, debug é automaticamente desabilitado

## 🎯 Casos de Uso Específicos

### Debugar Reordenação Vertical
```javascript
// Focar em movimentos verticais e posições
window.dragDropDebugConfig = {
  enabled: true,
  logMovements: true,
  logPositions: true,
  logAPI: true, 
  logOptimistic: false
}

// Mover lead para cima/baixo na mesma etapa
// Verificar se position é calculada corretamente
```

### Debugar API de Posições
```javascript
// Focar apenas em API
window.dragDropDebugConfig = {
  enabled: true,
  logMovements: false,
  logPositions: false,
  logAPI: true,
  logOptimistic: false
}

// Verificar timing e status das chamadas
```

## 📖 Referência Técnica

### Arquivos Envolvidos
- `src/utils/dragDropDebug.ts` - Utilitários de debug
- `src/components/Pipeline/PipelineKanbanBoard.tsx` - Implementação principal
- `src/components/Pipeline/KanbanColumn.tsx` - Colunas do kanban
- `backend/src/controllers/leadController.ts` - API de posições

### Funções Principais
- `logDragMovement()` - Log de movimentos
- `logPositionUpdates()` - Log de atualizações de posição
- `logAPICall()` - Log de chamadas de API
- `PerformanceTracker` - Medição de performance

---

**💡 Dica**: Use `window.showDragDropConfig()` sempre que esquecer os comandos!