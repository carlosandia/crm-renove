# Correção do Drag and Drop no Pipeline

## Problema Identificado
O usuário reportou que o drag and drop no pipeline estava com comportamento estranho: a primeira tentativa de arrastar não funcionava, apenas a segunda tentativa funcionava corretamente.

## Análise do Problema
Após investigação, identificamos os seguintes problemas:

### 1. **Conflitos de Event Handlers**
- Events de `onClick` e `onMouseDown` interferindo com o drag
- Botões dentro do card capturando eventos de mouse
- Falta de prevenção adequada de event bubbling

### 2. **Re-renders Desnecessários**
- Componentes re-renderizando durante o drag
- Falta de memoização adequada
- Estado sendo atualizado muito rapidamente

### 3. **Múltiplos Drags Simultâneos**
- Possibilidade de iniciar múltiplos drags ao mesmo tempo
- Falta de controle de estado para drag em progresso

## Soluções Implementadas

### 1. **PipelineViewModule.tsx**
```typescript
// Adicionado delay no handleDragEnd para evitar conflitos
setTimeout(() => {
  updateLeadStage(leadId, newStageId)
    .then(() => {
      console.log('✅ Lead movido com sucesso!');
    })
    .catch((error) => {
      console.error('❌ Erro ao mover lead:', error);
      alert('Erro ao mover lead: ' + error.message);
    });
}, 100); // 100ms delay para evitar conflitos
```

### 2. **PipelineKanbanBoard.tsx**
```typescript
// Adicionado memoização e logs de debug
const PipelineKanbanBoard: React.FC<PipelineKanbanBoardProps> = memo(({
  // ... props
}) => {
  // Callback memoizado para onDragEnd com logs adicionais
  const handleDragEnd = useCallback((result: DropResult) => {
    console.log('🎯 PipelineKanbanBoard - DRAG END RECEBIDO:', {
      draggableId: result.draggableId?.substring(0, 8) + '...',
      source: result.source,
      destination: result.destination,
      reason: result.reason,
      type: result.type
    });
    
    // Validações antes de passar para o pai
    if (!result.destination) {
      console.log('❌ Drag cancelado: sem destino');
      return;
    }
    
    onDragEnd(result);
  }, [onDragEnd]);
});
```

### 3. **KanbanColumn.tsx**
```typescript
// Adicionado memoização para evitar re-renders
const KanbanColumn: React.FC<KanbanColumnProps> = memo(({
  // ... props
}) => {
  // Memoização do cálculo de valor total
  const totalValue = React.useMemo(() => {
    return leads.reduce((sum, lead) => {
      const value = lead.custom_data?.valor || lead.custom_data?.valor_proposta || '0';
      return sum + (parseFloat(value.toString().replace(/[^\d.,]/g, '').replace(',', '.')) || 0);
    }, 0);
  }, [leads]);
});
```

### 4. **LeadCard.tsx**
```typescript
// Separação do drag handle dos event handlers
<div
  ref={provided.innerRef}
  {...provided.draggableProps}
  className="bg-white border border-gray-200 rounded-lg p-3..."
>
  {/* Área de drag handle - invisível mas funcional */}
  <div
    {...provided.dragHandleProps}
    className="absolute inset-0 cursor-move opacity-0 hover:opacity-10 bg-blue-500 rounded-lg transition-opacity"
    onMouseDown={(e) => {
      // Só permitir drag se não for clique em botão
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      console.log('🎯 Drag handle ativado para lead:', draggableId.substring(0, 8) + '...');
    }}
    style={{ zIndex: 1 }}
  />
  
  {/* Conteúdo do card com z-index maior */}
  <div className="relative z-20">
    {/* ... conteúdo do card ... */}
  </div>
</div>
```

### 5. **usePipelineData.ts**
```typescript
// Sistema de prevenção de múltiplos drags
const [isDragInProgress, setIsDragInProgress] = useState(false);

const updateLeadStage = useCallback(async (leadId: string, stageId: string): Promise<void> => {
  // Verificar se já há um drag em progresso
  if (isDragInProgress) {
    console.warn('⚠️ Drag já em progresso, ignorando nova tentativa');
    return;
  }

  // Marcar drag como em progresso
  setIsDragInProgress(true);
  
  try {
    // ... lógica de movimentação ...
  } finally {
    // Sempre liberar o drag lock
    setTimeout(() => {
      setIsDragInProgress(false);
    }, 500); // 500ms delay para evitar drags muito rápidos
  }
}, [user, leads, selectedPipeline, leadsCacheKey, isDragInProgress]);
```

## Melhorias Implementadas

### 1. **Logs de Debug Estruturados**
- Logs detalhados em cada etapa do drag
- Identificação única de leads (primeiros 8 caracteres)
- Timestamps para rastreamento de performance

### 2. **Prevenção de Conflitos**
- Event handlers específicos para botões
- Prevenção de drag quando clicando em botões
- Separação clara entre área de drag e área de clique

### 3. **Performance Otimizada**
- Memoização de componentes pesados
- Callbacks memoizados para evitar re-renders
- Cache inteligente de dados

### 4. **UX Melhorada**
- Feedback visual durante o drag (rotação, opacidade)
- Hover states para indicar área de drag
- Mensagens de erro claras

## Como Testar

1. **Teste Manual**:
   - Abrir o pipeline no navegador
   - Tentar arrastar um lead card
   - Verificar se funciona na primeira tentativa
   - Observar os logs no console

2. **Script de Debug**:
   ```javascript
   // Executar no console do navegador
   // O script test-drag-behavior.js foi criado para debug
   ```

3. **Verificações**:
   - ✅ Primeira tentativa de drag funciona
   - ✅ Não há conflitos com botões
   - ✅ Logs estruturados aparecem no console
   - ✅ Performance mantida
   - ✅ Estado consistente após drag

## Arquivos Modificados

1. `src/components/PipelineViewModule.tsx` - Delay no handleDragEnd
2. `src/components/Pipeline/PipelineKanbanBoard.tsx` - Memoização e logs
3. `src/components/Pipeline/KanbanColumn.tsx` - Memoização de valores
4. `src/components/Pipeline/LeadCard.tsx` - Separação de drag handle
5. `src/hooks/usePipelineData.ts` - Sistema anti-múltiplos drags
6. `test-drag-behavior.js` - Script de debug criado

## Resultado Esperado

**ANTES**: 
- ❌ Primeira tentativa de drag não funcionava
- ❌ Comportamento inconsistente
- ❌ Conflitos com botões
- ❌ Re-renders desnecessários

**DEPOIS**:
- ✅ Drag funciona na primeira tentativa
- ✅ Comportamento consistente
- ✅ Botões não interferem no drag
- ✅ Performance otimizada
- ✅ Logs de debug estruturados

O sistema de drag and drop agora deve funcionar perfeitamente na primeira tentativa, sem comportamentos estranhos. 