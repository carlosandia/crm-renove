// 🔍 SCRIPT DE DEBUG COMPLETO - BASEADO NA DOCUMENTAÇÃO OFICIAL @hello-pangea/dnd
// Execute no DevTools Console da página Pipeline/Gestão de pipeline
// Documentação: https://github.com/hello-pangea/dnd/blob/main/docs/guides/how-we-detect-scroll-containers.md

console.log('🔍 DEBUG DEFINITIVO - DETECÇÃO COMPLETA DE SCROLL CONTAINERS');
console.log('='.repeat(80));
console.log('📚 Baseado na documentação oficial @hello-pangea/dnd');
console.log('='.repeat(80));

// 1. FUNÇÃO PRINCIPAL: Detectar ALL scroll containers como @hello-pangea/dnd faz
function findAllScrollContainers() {
  const allElements = document.querySelectorAll('*');
  const scrollContainers = [];
  
  allElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    
    // ✅ CRITÉRIO OFICIAL: overflow 'scroll' ou 'auto' em qualquer direção
    const hasScrollX = styles.overflowX === 'scroll' || styles.overflowX === 'auto';
    const hasScrollY = styles.overflowY === 'scroll' || styles.overflowY === 'auto';
    
    if (hasScrollX || hasScrollY) {
      const rect = element.getBoundingClientRect();
      const hasActualContent = element.scrollHeight > element.clientHeight || 
                              element.scrollWidth > element.clientWidth;
      
      // Detectar se é relacionado ao DnD
      const isDragContainer = element.hasAttribute('data-rbd-droppable-id') || 
                             element.hasAttribute('data-rbd-drag-handle-context-id') ||
                             element.hasAttribute('data-rbd-droppable-context-id');
      
      const isKanbanRelated = element.classList.contains('kanban-container') || 
                             element.classList.contains('stage-content') ||
                             element.classList.contains('pipeline-view-container') ||
                             element.classList.contains('pipeline-kanban-container');
      
      scrollContainers.push({
        element,
        className: element.className,
        id: element.id,
        tagName: element.tagName,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        hasActualContent,
        isDragContainer,
        isKanbanRelated,
        // NOVO: Detectar containers problemáticos
        isProblematic: (hasScrollX || hasScrollY) && (isDragContainer || isKanbanRelated),
        // NOVO: Path completo no DOM
        domPath: getDOMPath(element)
      });
    }
  });
  
  return scrollContainers;
}

// 2. FUNÇÃO: Obter caminho completo no DOM
function getDOMPath(element) {
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className) {
      const classes = current.className.split(' ').filter(c => c).slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

// 3. FUNÇÃO: Detectar nested scroll (ALGORITMO OFICIAL)
function detectNestedScrollContainers(containers) {
  console.log('\n🔍 ANÁLISE DE NESTED SCROLL CONTAINERS:');
  console.log('='.repeat(60));
  
  const nestedPairs = [];
  
  containers.forEach(parent => {
    containers.forEach(child => {
      if (parent.element !== child.element && parent.element.contains(child.element)) {
        
        // ✅ CRITÉRIO OFICIAL: Mesmo tipo de scroll em hierarquia aninhada
        const hasNestedVerticalScroll = 
          (parent.overflowY === 'scroll' || parent.overflowY === 'auto') && 
          (child.overflowY === 'scroll' || child.overflowY === 'auto');
          
        const hasNestedHorizontalScroll = 
          (parent.overflowX === 'scroll' || parent.overflowX === 'auto') && 
          (child.overflowX === 'scroll' || child.overflowX === 'auto');
        
        if (hasNestedVerticalScroll || hasNestedHorizontalScroll) {
          nestedPairs.push({ 
            parent, 
            child, 
            scrollType: hasNestedVerticalScroll ? 'vertical' : 'horizontal',
            isCritical: parent.isDragContainer || child.isDragContainer || 
                       parent.isKanbanRelated || child.isKanbanRelated
          });
        }
      }
    });
  });
  
  if (nestedPairs.length === 0) {
    console.log('✅ NENHUM NESTED SCROLL CONTAINER DETECTADO!');
    return { hasNested: false, pairs: [] };
  }
  
  console.log(`❌ ${nestedPairs.length} NESTED SCROLL CONTAINER(S) DETECTADO(S):`);
  
  nestedPairs.forEach((pair, index) => {
    console.log(`\n${index + 1}. 🚨 NESTED SCROLL DETECTADO:`);
    console.log(`   📦 PAI: ${pair.parent.tagName} ${pair.parent.className || pair.parent.id || ''}`);
    console.log(`      ↳ Path: ${pair.parent.domPath}`);
    console.log(`      ↳ Overflow: X=${pair.parent.overflowX}, Y=${pair.parent.overflowY}`);
    console.log(`   📦 FILHO: ${pair.child.tagName} ${pair.child.className || pair.child.id || ''}`);
    console.log(`      ↳ Path: ${pair.child.domPath}`);
    console.log(`      ↳ Overflow: X=${pair.child.overflowX}, Y=${pair.child.overflowY}`);
    console.log(`   🎯 Tipo de Scroll: ${pair.scrollType}`);
    
    if (pair.isCritical) {
      console.log(`   🚨 CRÍTICO: Este nested scroll causa o warning @hello-pangea/dnd!`);
      console.log(`   💡 SOLUÇÃO: Aplicar overflow: visible no PAI ou remover scroll do FILHO`);
    }
  });
  
  return { hasNested: true, pairs: nestedPairs };
}

// 4. FUNÇÃO: Verificar especificamente elementos DnD
function analyzeDragDropElements() {
  console.log('\n🎯 ANÁLISE ESPECÍFICA ELEMENTOS DRAG & DROP:');
  console.log('='.repeat(60));
  
  // DragDropContext
  const dragDropContext = document.querySelector('[data-rbd-drag-handle-context-id]');
  if (dragDropContext) {
    console.log('✅ DragDropContext encontrado');
    analyzeElementScroll(dragDropContext, 'DragDropContext');
  }
  
  // Droppables
  const droppables = document.querySelectorAll('[data-rbd-droppable-id]');
  console.log(`📋 ${droppables.length} Droppable(s) encontrado(s):`);
  droppables.forEach((droppable, index) => {
    console.log(`\n   ${index + 1}. Droppable ID: ${droppable.getAttribute('data-rbd-droppable-id')}`);
    analyzeElementScroll(droppable, `Droppable-${index + 1}`);
  });
  
  // Draggables
  const draggables = document.querySelectorAll('[data-rbd-drag-handle-draggable-id]');
  console.log(`\n🎯 ${draggables.length} Draggable(s) encontrado(s):`);
  draggables.forEach((draggable, index) => {
    const draggableId = draggable.getAttribute('data-rbd-drag-handle-draggable-id');
    console.log(`\n   ${index + 1}. Draggable ID: ${draggableId}`);
    analyzeElementScroll(draggable, `Draggable-${index + 1}`);
  });
}

// 5. FUNÇÃO: Analisar scroll de um elemento específico
function analyzeElementScroll(element, label) {
  const styles = window.getComputedStyle(element);
  const hasScrollX = styles.overflowX === 'scroll' || styles.overflowX === 'auto';
  const hasScrollY = styles.overflowY === 'scroll' || styles.overflowY === 'auto';
  
  console.log(`      ↳ ${label}: ${element.tagName} ${element.className || ''}`);
  console.log(`      ↳ Overflow: X=${styles.overflowX}, Y=${styles.overflowY}`);
  
  if (hasScrollX || hasScrollY) {
    console.log(`      ↳ 🚨 TEM SCROLL! Pode causar nested scroll.`);
  } else {
    console.log(`      ↳ ✅ Sem scroll próprio.`);
  }
  
  // Verificar parents com scroll
  let parent = element.parentElement;
  let level = 1;
  while (parent && level <= 5) {
    const parentStyles = window.getComputedStyle(parent);
    const parentHasScroll = parentStyles.overflowX === 'scroll' || parentStyles.overflowX === 'auto' ||
                           parentStyles.overflowY === 'scroll' || parentStyles.overflowY === 'auto';
    
    if (parentHasScroll) {
      console.log(`      ↳ Parent ${level}: ${parent.tagName} ${parent.className || ''} - HAS SCROLL!`);
      console.log(`         ↳ Overflow: X=${parentStyles.overflowX}, Y=${parentStyles.overflowY}`);
    }
    
    parent = parent.parentElement;
    level++;
  }
}

// 6. FUNÇÃO: Verificar configurações específicas do projeto
function checkProjectSpecificElements() {
  console.log('\n🔧 VERIFICAÇÃO ESPECÍFICA DO PROJETO:');
  console.log('='.repeat(60));
  
  // CRMLayout fullWidth containers
  const fullWidthContainers = document.querySelectorAll('[style*="overflow"]');
  console.log(`📦 ${fullWidthContainers.length} elementos com overflow inline encontrados:`);
  fullWidthContainers.forEach((container, index) => {
    const style = container.getAttribute('style');
    console.log(`   ${index + 1}. ${container.tagName} ${container.className || ''}`);
    console.log(`      ↳ Style: ${style}`);
  });
  
  // Classes CSS específicas do projeto
  const projectContainers = [
    '.pipeline-view-container',
    '.pipeline-kanban-container', 
    '.kanban-container',
    '.stage-content-enhanced',
    '.leads-container'
  ];
  
  projectContainers.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`\n📋 ${selector}: ${elements.length} elemento(s)`);
      elements.forEach((el, index) => {
        const styles = window.getComputedStyle(el);
        console.log(`   ${index + 1}. Overflow: X=${styles.overflowX}, Y=${styles.overflowY}`);
      });
    }
  });
  
  // Tailwind classes
  const tailwindScrollClasses = [
    '.overflow-auto',
    '.overflow-x-auto', 
    '.overflow-y-auto',
    '.overflow-scroll',
    '.overflow-x-scroll',
    '.overflow-y-scroll'
  ];
  
  console.log('\n🎨 VERIFICAÇÃO TAILWIND SCROLL CLASSES:');
  tailwindScrollClasses.forEach(className => {
    const elements = document.querySelectorAll(className);
    if (elements.length > 0) {
      console.log(`⚠️  ${className}: ${elements.length} elemento(s) encontrado(s)`);
      elements.forEach((el, index) => {
        console.log(`   ${index + 1}. ${el.tagName} ${el.className}`);
      });
    }
  });
}

// 7. EXECUTAR ANÁLISE COMPLETA
console.log('🚀 INICIANDO ANÁLISE COMPLETA...\n');

const scrollContainers = findAllScrollContainers();

console.log('📋 TODOS OS SCROLL CONTAINERS DETECTADOS:');
console.log('='.repeat(60));
scrollContainers.forEach((container, index) => {
  console.log(`\n${index + 1}. ${container.tagName} ${container.className || container.id || ''}`);
  console.log(`   ↳ Path: ${container.domPath}`);
  console.log(`   ↳ Overflow: X=${container.overflowX}, Y=${container.overflowY}`);
  console.log(`   ↳ Size: ${container.width}x${container.height}`);
  console.log(`   ↳ Content: ${container.hasActualContent ? '✅ HAS CONTENT' : '❌ NO CONTENT'}`);
  console.log(`   ↳ DnD: ${container.isDragContainer ? '🎯 DRAG CONTAINER' : '❌ NOT DnD'}`);
  console.log(`   ↳ Kanban: ${container.isKanbanRelated ? '🎯 KANBAN RELATED' : '❌ NOT KANBAN'}`);
  console.log(`   ↳ Problematic: ${container.isProblematic ? '🚨 YES' : '✅ NO'}`);
});

const nestedResult = detectNestedScrollContainers(scrollContainers);
analyzeDragDropElements();
checkProjectSpecificElements();

// 8. RESULTADO FINAL E RECOMENDAÇÕES
console.log('\n' + '='.repeat(80));
console.log('🎯 RESULTADO FINAL E RECOMENDAÇÕES:');
console.log('='.repeat(80));

if (nestedResult.hasNested) {
  console.log('❌ PROBLEMA CONFIRMADO: Nested scroll containers detectados');
  console.log('\n💡 SOLUÇÕES RECOMENDADAS:');
  
  nestedResult.pairs.forEach((pair, index) => {
    console.log(`\n${index + 1}. Para resolver o nested scroll entre:`);
    console.log(`   📦 PAI: ${pair.parent.domPath}`);
    console.log(`   📦 FILHO: ${pair.child.domPath}`);
    console.log(`   
   🔧 OPÇÃO A: Aplicar overflow: visible no PAI`);
    console.log(`   🔧 OPÇÃO B: Aplicar overflow: visible no FILHO`);
    console.log(`   🔧 OPÇÃO C: Usar ignoreContainerClipping={true} no Droppable`);
  });
} else {
  console.log('✅ NENHUM NESTED SCROLL DETECTADO!');
  console.log('🤔 Se o warning ainda aparece, pode ser:');
  console.log('   • Cache do DevTools/Browser');
  console.log('   • Elementos criados dinamicamente após o carregamento');
  console.log('   • Hot-reload do Vite interferindo temporariamente');
}

console.log('\n📋 LOGS COMPLETOS PARA ANÁLISE:');
console.log('Copie toda esta saída para Claude Code para análise detalhada.');

// 9. EXPORT DOS DADOS PARA CLAUDE
window.debugScrollData = {
  scrollContainers,
  nestedPairs: nestedResult.pairs,
  hasNestedScroll: nestedResult.hasNested,
  timestamp: new Date().toISOString()
};

console.log('\n✅ Dados exportados para window.debugScrollData');
console.log('Use window.debugScrollData no console para acessar os dados');