// 🔍 SCRIPT DE DEBUG AVANÇADO - NESTED SCROLL CONTAINER
// Execute no DevTools Console da página Pipeline/Gestão de pipeline

console.log('🔍 DEBUG DETALHADO - NESTED SCROLL CONTAINER @hello-pangea/dnd');
console.log('='.repeat(80));

// 1. Identificar todos os containers com scroll
function findScrollContainers() {
  const allElements = document.querySelectorAll('*');
  const scrollContainers = [];
  
  allElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const hasScrollX = styles.overflowX !== 'visible' && styles.overflowX !== 'hidden';
    const hasScrollY = styles.overflowY !== 'visible' && styles.overflowY !== 'hidden';
    
    if (hasScrollX || hasScrollY) {
      const rect = element.getBoundingClientRect();
      scrollContainers.push({
        element,
        className: element.className,
        id: element.id,
        tagName: element.tagName,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        width: rect.width,
        height: rect.height,
        hasContent: element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth,
        isKanbanContainer: element.classList.contains('kanban-container') || element.hasAttribute('data-kanban-scroll-container'),
        isDragContainer: element.hasAttribute('data-rbd-droppable-id') || element.hasAttribute('data-rbd-drag-handle-context-id')
      });
    }
  });
  
  return scrollContainers;
}

// 2. Analisar hierarquia
function analyzeScrollHierarchy(containers) {
  console.log('📋 CONTAINERS COM SCROLL DETECTADOS:');
  console.log('='.repeat(50));
  
  containers.forEach((container, index) => {
    console.log(`\n${index + 1}. ${container.tagName} ${container.className || container.id || ''}`);
    console.log(`   overflowX: ${container.overflowX}`);
    console.log(`   overflowY: ${container.overflowY}`);
    console.log(`   size: ${Math.round(container.width)}x${Math.round(container.height)}`);
    console.log(`   hasContent: ${container.hasContent ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   isKanbanContainer: ${container.isKanbanContainer ? '🎯 SIM' : '❌ NÃO'}`);
    console.log(`   isDragContainer: ${container.isDragContainer ? '🎯 SIM' : '❌ NÃO'}`);
  });
}

// 3. Detectar nested containers
function detectNestedScrollContainers(containers) {
  console.log('\n🔍 ANÁLISE DE ANINHAMENTO:');
  console.log('='.repeat(50));
  
  const nestedPairs = [];
  
  containers.forEach(parent => {
    containers.forEach(child => {
      if (parent.element !== child.element && parent.element.contains(child.element)) {
        // Verificar se ambos têm scroll na mesma direção
        const sameDirection = 
          (parent.overflowY !== 'visible' && parent.overflowY !== 'hidden' && 
           child.overflowY !== 'visible' && child.overflowY !== 'hidden') ||
          (parent.overflowX !== 'visible' && parent.overflowX !== 'hidden' && 
           child.overflowX !== 'visible' && child.overflowX !== 'hidden');
           
        if (sameDirection) {
          nestedPairs.push({ parent, child });
        }
      }
    });
  });
  
  if (nestedPairs.length === 0) {
    console.log('✅ NENHUM NESTED SCROLL CONTAINER DETECTADO!');
    return false;
  }
  
  console.log('❌ NESTED SCROLL CONTAINERS DETECTADOS:');
  nestedPairs.forEach((pair, index) => {
    console.log(`\n${index + 1}. PROBLEMA DETECTADO:`);
    console.log(`   📦 PAI: ${pair.parent.tagName} ${pair.parent.className || pair.parent.id || ''}`);
    console.log(`      overflowY: ${pair.parent.overflowY}, overflowX: ${pair.parent.overflowX}`);
    console.log(`   📦 FILHO: ${pair.child.tagName} ${pair.child.className || pair.child.id || ''}`);
    console.log(`      overflowY: ${pair.child.overflowY}, overflowX: ${pair.child.overflowX}`);
    
    // Detectar se é o problema específico do @hello-pangea/dnd
    if (pair.child.isDragContainer || pair.child.isKanbanContainer) {
      console.log(`   🚨 CRITICAL: Este é o nested scroll que causa o warning @hello-pangea/dnd!`);
    }
  });
  
  return nestedPairs.length > 0;
}

// 4. Verificar configuração específica do CRMLayout
function checkCRMLayoutConfig() {
  console.log('\n🔍 VERIFICAÇÃO CRMLAYOUT:');
  console.log('='.repeat(50));
  
  // Procurar elementos específicos
  const fullWidthContainer = document.querySelector('[style*="overflow-visible"]');
  const containerWithAuto = document.querySelector('[class*="overflow-y-auto"]');
  
  if (fullWidthContainer) {
    console.log('✅ Container com overflow-visible encontrado (CRMLayout fullWidth)');
    console.log('   element:', fullWidthContainer.tagName, fullWidthContainer.className);
  } else {
    console.log('❌ Nenhum container com overflow-visible encontrado');
  }
  
  if (containerWithAuto) {
    console.log('⚠️ Container com overflow-y-auto encontrado');
    console.log('   element:', containerWithAuto.tagName, containerWithAuto.className);
  }
}

// 5. Executar análise completa
const scrollContainers = findScrollContainers();
analyzeScrollHierarchy(scrollContainers);
const hasNestedScroll = detectNestedScrollContainers(scrollContainers);
checkCRMLayoutConfig();

console.log('\n='.repeat(80));
console.log('🎯 RESULTADO FINAL:');
console.log('='.repeat(80));

if (hasNestedScroll) {
  console.log('❌ PROBLEMA CONFIRMADO: Nested scroll containers detectados');
  console.log('💡 SOLUÇÃO: Aplicar overflow: visible no container pai ou remover scroll do filho');
} else {
  console.log('✅ NENHUM PROBLEMA DETECTADO: Scroll containers estão configurados corretamente');
  console.log('🤔 Se o warning ainda aparece, pode ser um cache do DevTools ou outro problema');
}

console.log('\n📋 LOGS PARA COPIAR PARA CLAUDE:');
console.log('Copie toda a saída deste script para ajudar no diagnóstico.');