# Correção do Mapeamento de Índices - ImprovedStageManager

## 🎯 Problema Original

O `ImprovedStageManager.tsx` tinha um problema crítico de mapeamento de índices entre arrays filtrados e arrays completos, resultando em:

1. **Bug de Delete**: Clicar para deletar "teste33" mostrava modal para "teste44" 
2. **Bug de Move**: Funções de movimento (up/down) não refletiam mudanças visuais no UI
3. **Inconsistência de Arrays**: Diferentes operações usavam arrays diferentes (`stages` vs `stagesToRender`)

## 🔧 Solução Implementada: Sistema Dual de Mapeamento

### Conceito Central

Criamos um **sistema dual de mapeamento de índices** onde:
- **`customIndex`**: Posição no array filtrado de etapas customizadas (para DELETE)
- **`stageIndex`**: Posição no array completo de todas as etapas (para MOVE)

### Implementação Técnica

```typescript
.map((stage: StageData, customIndex: number) => {
  // ✅ CORREÇÃO CRÍTICA: Calcular stageIndex real para MOVE operations
  const stageIndex = stagesToRender.findIndex((s: StageData) => {
    // Para etapas com ID, comparar por ID (mais confiável)
    if (stage.id && s.id) {
      return s.id === stage.id;
    }
    // Para etapas sem ID, comparar por nome + propriedades
    return s.name === stage.name && 
           s.is_system_stage === stage.is_system_stage &&
           s.order_index === stage.order_index;
  });
  
  return (
    <StageItem
      key={`custom-${stage.id || stage.name}-${customIndex}`}
      stage={stage}
      index={customIndex}  // Para handleDeleteStage (usa array filtrado)
      onEdit={handleEditStage}
      onDelete={handleDeleteStage}
      onMoveUp={(index) => moveStageUp(stageIndex)}  // Para moveStageUp (usa array completo)
      onMoveDown={(index) => moveStageDown(stageIndex)}  // Para moveStageDown (usa array completo)
      canMoveUp={customIndex > 0}
      canMoveDown={customIndex < customStages.length - 1}
      isMoving={isMoving === (stage.id || stage.name)}
      isHighlighted={lastActionStage === (stage.id || stage.name)}
      isReordering={isReordering && isMoving !== (stage.id || stage.name)}
    />
  );
})
```

## 🔍 Correções Específicas

### 1. handleDeleteStage
```typescript
const handleDeleteStage = (index: number) => {
  // ✅ CORREÇÃO CRÍTICA: O index recebido é baseado no array de etapas CUSTOMIZADAS
  const customStages = stages.filter(stage => !stage.is_system_stage);
  
  // ✅ CORREÇÃO FUNDAMENTAL: O index recebido é baseado no array de etapas customizadas
  const targetStage = customStages[index]; // ← Era: allStages[index]
  
  if (!targetStage) {
    console.error('❌ [handleDeleteStage] Etapa não encontrada no índice:', index);
    return;
  }
  // ...resto da lógica
};
```

### 2. moveStageUp/moveStageDown
```typescript
const moveStageUp = async (index: number, event?: React.MouseEvent) => {
  // ✅ CORREÇÃO: Usar allStages para movimento visual
  const currentStages = [...allStages]; // ← Usa array completo para movimento correto
  
  if (index <= 0 || currentStages[index]?.is_system_stage) return;
  if (currentStages[index - 1]?.is_system_stage) return;
  
  // Trocar posições no array completo
  [currentStages[index], currentStages[index - 1]] = 
  [currentStages[index - 1], currentStages[index]];
  
  // Aplicar organização e propagação
  const organizedStages = organizeStages(currentStages);
  setStages(organizedStages);
  onStagesChange?.(organizedStages);
};
```

## 🎨 Benefícios da Solução

### ✅ Correção dos Bugs
1. **Delete preciso**: `customIndex` garante que o modal mostre a etapa correta
2. **Move visual**: `stageIndex` garante que o movimento seja refletido no UI
3. **Consistência**: Arrays corretos para cada operação

### ✅ Robustez Adicional
1. **ID-based matching**: Prioriza comparação por ID quando disponível
2. **Fallback múltiplo**: Nome + propriedades para etapas sem ID
3. **Debug logging**: Logs detalhados para rastreamento de problemas

### ✅ Manutenibilidade
1. **Separação clara**: Cada tipo de operação usa seu índice apropriado
2. **Comentários explicativos**: Documentação inline do propósito de cada índice
3. **Validações**: Verificações de segurança em todas as operações

## 🧪 Teste da Correção

Para validar se a correção funcionou:

1. **Teste Delete**: Clicar em "teste33" deve mostrar modal "teste33"
2. **Teste Move**: Clicar setas up/down deve mover visualmente a etapa
3. **Logs**: Console deve mostrar mapeamento dual correto

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (❌ Buggy) | Depois (✅ Fixed) |
|---------|------------------|------------------|
| Delete Operation | `allStages[index]` | `customStages[index]` |
| Move Operation | Recebia `customIndex` | Recebe `stageIndex` |
| Array Consistency | Inconsistente | Sistema dual |
| Index Mapping | Único e incorreto | Dual e preciso |
| UI Feedback | Não refletia mudanças | Reflete corretamente |

## 🔗 Arquivos Modificados

- `src/components/Pipeline/stages/ImprovedStageManager.tsx` (linhas 1422-1465)
- Implementação dual de mapeamento de índices
- Correção das funções `handleDeleteStage`, `moveStageUp`, `moveStageDown`
- Debug logging para validação

---

**Status**: ✅ Implementado e pronto para teste
**Próximo passo**: Testar movimento de etapas via interface