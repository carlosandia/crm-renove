// 🚀 SIMULAÇÃO EXATA DO ALGORITMO @hello-pangea/dnd
// Execute no DevTools Console da página Pipeline DURANTE o warning
// Este script simula EXATAMENTE como a biblioteca detecta nested scroll containers

console.log('🚀 SIMULAÇÃO ALGORITMO @hello-pangea/dnd - DETECÇÃO DEFINITIVA');
console.log('='.repeat(80));
console.log('📚 Baseado no código fonte oficial da biblioteca');
console.log('='.repeat(80));

// 1. FUNÇÃO QUE SIMULA A DETECÇÃO EXATA DA BIBLIOTECA
function simulateDndScrollDetection() {
  console.log('\n🔍 FASE 1: SIMULANDO ALGORITMO OFICIAL DE DETECÇÃO...');
  
  // Função baseada no código fonte do @hello-pangea/dnd
  function isScrollContainer(element) {
    const style = window.getComputedStyle(element);
    const overflow = {
      x: style.overflowX,
      y: style.overflowY
    };
    
    return (
      overflow.x === 'auto' || overflow.x === 'scroll' ||
      overflow.y === 'auto' || overflow.y === 'scroll'
    );
  }
  
  // Encontrar todos os Droppables ativos
  const droppables = document.querySelectorAll('[data-rbd-droppable-id]');
  console.log(`📋 Encontrados ${droppables.length} Droppables ativos`);
  
  const problems = [];
  
  droppables.forEach((droppable, index) => {
    const droppableId = droppable.getAttribute('data-rbd-droppable-id');
    console.log(`\n🎯 Analisando Droppable: ${droppableId}`);
    
    // Buscar parents com scroll (algoritmo exato da biblioteca)
    let parent = droppable.parentElement;
    let level = 1;
    const scrollParents = [];
    
    while (parent && parent !== document.body) {
      if (isScrollContainer(parent)) {
        const parentInfo = {
          element: parent,
          tagName: parent.tagName,
          className: parent.className,
          id: parent.id,
          level: level,
          computedStyles: {
            overflowX: window.getComputedStyle(parent).overflowX,
            overflowY: window.getComputedStyle(parent).overflowY,
            overflow: window.getComputedStyle(parent).overflow
          }
        };
        scrollParents.push(parentInfo);
        
        console.log(`   🔍 Parent ${level}: ${parent.tagName}${parent.className ? '.' + parent.className.split(' ')[0] : ''}${parent.id ? '#' + parent.id : ''}`);
        console.log(`      ↳ OverflowX: ${parentInfo.computedStyles.overflowX}`);
        console.log(`      ↳ OverflowY: ${parentInfo.computedStyles.overflowY}`);
      }
      
      parent = parent.parentElement;
      level++;
      
      // Prevenir loop infinito
      if (level > 20) break;
    }
    
    // DETECÇÃO EXATA: Se há mais de 1 scroll parent, é nested scroll
    if (scrollParents.length > 1) {
      console.log(`   🚨 NESTED SCROLL DETECTADO! ${scrollParents.length} scroll parents encontrados`);
      problems.push({
        droppableId,
        droppable,
        scrollParents,
        issue: 'multiple_scroll_parents'
      });
    } else if (scrollParents.length === 1) {
      console.log(`   ✅ Um scroll parent encontrado (normal)`);
    } else {
      console.log(`   ⚠️  Nenhum scroll parent encontrado`);
    }
  });
  
  return problems;
}

// 2. ANÁLISE DE ELEMENTOS CRIADOS DINAMICAMENTE
function analyzeDynamicElements() {
  console.log('\n🔍 FASE 2: ANALISANDO ELEMENTOS CRIADOS DINAMICAMENTE...');
  
  // Observar mudanças no DOM que podem criar scroll containers
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            const style = window.getComputedStyle(element);
            
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' ||
                style.overflowY === 'auto' || style.overflowY === 'scroll') {
              console.log('🚨 NOVO SCROLL CONTAINER CRIADO DINAMICAMENTE:', {
                tagName: element.tagName,
                className: element.className,
                overflowX: style.overflowX,
                overflowY: style.overflowY
              });
            }
          }
        });
      }
      
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target;
        const style = window.getComputedStyle(element);
        
        if (style.overflowX === 'auto' || style.overflowX === 'scroll' ||
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          console.log('🚨 ELEMENTO GANHOU SCROLL VIA STYLE:', {
            tagName: element.tagName,
            className: element.className,
            overflowX: style.overflowX,
            overflowY: style.overflowY
          });
        }
      }
    });
  });
  
  // Observar por 5 segundos
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  setTimeout(() => {
    observer.disconnect();
    console.log('📋 Observação de elementos dinâmicos finalizada');
  }, 5000);
}

// 3. ANÁLISE DE CSS COMPUTADO VS SOURCE
function analyzeCSSComputedVsSource() {
  console.log('\n🔍 FASE 3: ANALISANDO DIFERENÇAS CSS COMPUTADO VS SOURCE...');
  
  // Elementos suspeitos de ter overflow aplicado via CSS
  const suspiciousSelectors = [
    '.pipeline-kanban-container',
    '.pipeline-view-container',
    '.kanban-container',
    '.stage-content-enhanced',
    'main',
    '[data-rbd-droppable-id]',
    '.overflow-auto',
    '.overflow-y-auto',
    '.overflow-x-auto'
  ];
  
  suspiciousSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element, index) => {
      const computed = window.getComputedStyle(element);
      const hasScroll = computed.overflowX === 'auto' || computed.overflowX === 'scroll' ||
                       computed.overflowY === 'auto' || computed.overflowY === 'scroll';
      
      if (hasScroll) {
        console.log(`🔍 ${selector} [${index}]:`);
        console.log(`   ↳ Computed OverflowX: ${computed.overflowX}`);
        console.log(`   ↳ Computed OverflowY: ${computed.overflowY}`);
        console.log(`   ↳ Inline Style: ${element.style.overflow || 'none'}`);
        console.log(`   ↳ Classes: ${element.className}`);
        
        // Verificar se é parent de droppable
        const hasDroppableChild = element.querySelector('[data-rbd-droppable-id]');
        if (hasDroppableChild) {
          console.log(`   🚨 CRÍTICO: Este elemento é parent de Droppable!`);
        }
      }
    });
  });
}

// 4. DETECTAR TIMING DO WARNING
function detectWarningTiming() {
  console.log('\n🔍 FASE 4: DETECTANDO TIMING DO WARNING...');
  
  // Interceptar console.warn para capturar o momento exato
  const originalWarn = console.warn;
  let warningCaptured = false;
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('@hello-pangea/dnd') && message.includes('nested scroll container')) {
      warningCaptured = true;
      console.log('🚨 WARNING CAPTURADO NO MOMENTO EXATO!');
      console.log('⏰ Timing:', new Date().toISOString());
      
      // Executar análise imediata
      console.log('\n📸 SNAPSHOT DO DOM NO MOMENTO DO WARNING:');
      const immediateProblems = simulateDndScrollDetection();
      
      if (immediateProblems.length > 0) {
        console.log('\n🎯 PROBLEMAS DETECTADOS NO MOMENTO EXATO:');
        immediateProblems.forEach((problem, index) => {
          console.log(`\n${index + 1}. Droppable: ${problem.droppableId}`);
          problem.scrollParents.forEach((parent, pIndex) => {
            console.log(`   Parent ${pIndex + 1}: ${parent.tagName}${parent.className ? '.' + parent.className.split(' ')[0] : ''}`);
            console.log(`      ↳ OverflowX: ${parent.computedStyles.overflowX}`);
            console.log(`      ↳ OverflowY: ${parent.computedStyles.overflowY}`);
          });
        });
      }
    }
    originalWarn.apply(console, args);
  };
  
  // Restaurar após 10 segundos
  setTimeout(() => {
    console.warn = originalWarn;
    if (!warningCaptured) {
      console.log('⚠️ Warning não foi capturado nos últimos 10 segundos');
    }
  }, 10000);
}

// 5. EXECUTAR ANÁLISE COMPLETA
function runCompleteAnalysis() {
  console.log('🚀 INICIANDO ANÁLISE COMPLETA...\n');
  
  // Análise inicial
  const initialProblems = simulateDndScrollDetection();
  
  // Análise dinâmica
  analyzeDynamicElements();
  
  // Análise CSS
  analyzeCSSComputedVsSource();
  
  // Detecção de timing
  detectWarningTiming();
  
  // Resultado inicial
  setTimeout(() => {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADO DA ANÁLISE INICIAL:');
    console.log('='.repeat(80));
    
    if (initialProblems.length === 0) {
      console.log('🤔 NENHUM PROBLEMA DETECTADO na análise inicial');
      console.log('💡 Possíveis causas:');
      console.log('   • Elementos criados dinamicamente após análise');
      console.log('   • CSS aplicado via JavaScript após renderização');
      console.log('   • Timing específico durante operações de drag');
      console.log('\n📋 Continue observando as próximas fases...');
    } else {
      console.log(`🎯 ${initialProblems.length} PROBLEMA(S) DETECTADO(S):`);
      initialProblems.forEach((problem, index) => {
        console.log(`\n${index + 1}. Droppable: ${problem.droppableId}`);
        console.log(`   🚨 ${problem.scrollParents.length} scroll parents detectados`);
        
        problem.scrollParents.forEach((parent, pIndex) => {
          console.log(`   📦 Parent ${pIndex + 1}: ${parent.tagName}${parent.className ? '.' + parent.className.split(' ')[0] : ''}`);
          console.log(`      ↳ Level: ${parent.level} (distance from droppable)`);
          console.log(`      ↳ OverflowX: ${parent.computedStyles.overflowX}`);
          console.log(`      ↳ OverflowY: ${parent.computedStyles.overflowY}`);
        });
      });
    }
  }, 1000);
}

// EXECUTAR ANÁLISE
runCompleteAnalysis();

// EXPORT DOS DADOS
window.dndAdvancedDebugData = {
  timestamp: new Date().toISOString(),
  status: 'advanced_detection_running',
  simulateDndScrollDetection,
  detectWarningTiming
};

console.log('\n📋 INSTRUÇÕES:');
console.log('1. Aguarde análise completa (10 segundos)');
console.log('2. Tente realizar um drag para trigger o warning');
console.log('3. Observe capturas em tempo real');
console.log('4. Use window.dndAdvancedDebugData para mais análises');