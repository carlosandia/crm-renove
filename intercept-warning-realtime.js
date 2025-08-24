// 🎯 INTERCEPTADOR DE WARNING EM TEMPO REAL
// Execute ANTES de fazer qualquer drag na página Pipeline
// Este script captura o estado exato do DOM quando o warning acontece

console.log('🎯 INTERCEPTADOR DE WARNING @hello-pangea/dnd - TEMPO REAL');
console.log('='.repeat(80));
console.log('⚠️ Execute ANTES de fazer drag - aguardando warning...');
console.log('='.repeat(80));

// 1. INTERCEPTAR CONSOLE.WARN EM TEMPO REAL
const originalConsoleWarn = console.warn;
let warningIntercepted = false;

console.warn = function(...args) {
  const message = args.join(' ');
  
  if (message.includes('@hello-pangea/dnd') && message.includes('nested scroll container')) {
    warningIntercepted = true;
    
    console.log('\n🚨 WARNING INTERCEPTADO NO MOMENTO EXATO!');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Stack trace disponível no DevTools');
    
    // ANÁLISE IMEDIATA DO DOM
    analyzeExactMoment();
  }
  
  // Chamar console.warn original
  originalConsoleWarn.apply(console, args);
};

// 2. ANÁLISE NO MOMENTO EXATO DO WARNING
function analyzeExactMoment() {
  console.log('\n📸 SNAPSHOT DO DOM NO MOMENTO DO WARNING:');
  console.log('='.repeat(60));
  
  // Encontrar todos os Droppables ATIVOS no momento
  const activeDroppables = document.querySelectorAll('[data-rbd-droppable-id]');
  console.log(`🎯 Droppables ativos: ${activeDroppables.length}`);
  
  activeDroppables.forEach((droppable, index) => {
    const droppableId = droppable.getAttribute('data-rbd-droppable-id');
    console.log(`\n🔍 DROPPABLE ${index + 1}: ${droppableId}`);
    
    // Analisar hierarquia de parents COM scroll
    let currentParent = droppable.parentElement;
    let level = 1;
    const scrollParentsFound = [];
    
    while (currentParent && currentParent !== document.body && level <= 15) {
      const computedStyle = window.getComputedStyle(currentParent);
      const hasScroll = {
        x: computedStyle.overflowX === 'auto' || computedStyle.overflowX === 'scroll',
        y: computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll'
      };
      
      if (hasScroll.x || hasScroll.y) {
        const parentInfo = {
          level,
          tagName: currentParent.tagName,
          className: currentParent.className || '',
          id: currentParent.id || '',
          overflowX: computedStyle.overflowX,
          overflowY: computedStyle.overflowY,
          clientHeight: currentParent.clientHeight,
          scrollHeight: currentParent.scrollHeight,
          isActuallyScrollable: currentParent.scrollHeight > currentParent.clientHeight ||
                               currentParent.scrollWidth > currentParent.clientWidth
        };
        
        scrollParentsFound.push(parentInfo);
        
        console.log(`   📦 PARENT ${level}: ${parentInfo.tagName}${parentInfo.className ? '.' + parentInfo.className.split(' ')[0] : ''}${parentInfo.id ? '#' + parentInfo.id : ''}`);
        console.log(`      ↳ OverflowX: ${parentInfo.overflowX}`);
        console.log(`      ↳ OverflowY: ${parentInfo.overflowY}`);
        console.log(`      ↳ Scrollable content: ${parentInfo.isActuallyScrollable ? 'YES' : 'NO'}`);
        console.log(`      ↳ Height: ${parentInfo.clientHeight}/${parentInfo.scrollHeight}`);
      }
      
      currentParent = currentParent.parentElement;
      level++;
    }
    
    // VEREDICTO PARA ESTE DROPPABLE
    if (scrollParentsFound.length > 1) {
      console.log(`   🚨 NESTED SCROLL CONFIRMADO: ${scrollParentsFound.length} scroll parents`);
      
      // Identificar o problema específico
      console.log('\n   🔧 CORREÇÃO ESPECÍFICA NECESSÁRIA:');
      scrollParentsFound.forEach((parent, pIndex) => {
        if (pIndex === 0) {
          console.log(`      1. MAIS PRÓXIMO: ${parent.tagName}${parent.className ? '.' + parent.className.split(' ')[0] : ''} - MANTER scroll`);
        } else {
          console.log(`      ${pIndex + 1}. REMOVER SCROLL: ${parent.tagName}${parent.className ? '.' + parent.className.split(' ')[0] : ''} → overflow: visible`);
        }
      });
    } else if (scrollParentsFound.length === 1) {
      console.log(`   ✅ OK: Apenas 1 scroll parent (correto)`);
    } else {
      console.log(`   ⚠️ Nenhum scroll parent encontrado`);
    }
  });
  
  // 3. GERAR CORREÇÕES ESPECÍFICAS
  generateSpecificFixes();
}

// 3. GERAR CORREÇÕES ESPECÍFICAS BASEADAS NA ANÁLISE
function generateSpecificFixes() {
  console.log('\n🔧 CORREÇÕES ESPECÍFICAS RECOMENDADAS:');
  console.log('='.repeat(60));
  
  // Analisar elementos específicos que comumente causam problemas
  const problematicElements = [
    { selector: 'main', description: 'Main container do CRMLayout' },
    { selector: '.pipeline-kanban-container', description: 'Container principal do Kanban' },
    { selector: '.pipeline-view-container', description: 'View container do Pipeline' },
    { selector: '.stage-content-enhanced', description: 'Conteúdo das colunas' },
    { selector: '[class*="overflow"]', description: 'Elementos com classes overflow' }
  ];
  
  problematicElements.forEach((item, index) => {
    const elements = document.querySelectorAll(item.selector);
    
    elements.forEach((element, elemIndex) => {
      const computed = window.getComputedStyle(element);
      const hasScroll = computed.overflowX === 'auto' || computed.overflowX === 'scroll' ||
                       computed.overflowY === 'auto' || computed.overflowY === 'scroll';
      
      if (hasScroll) {
        const hasDroppableDescendant = element.querySelector('[data-rbd-droppable-id]');
        
        if (hasDroppableDescendant) {
          console.log(`\n${index + 1}.${elemIndex + 1} 🚨 PROBLEMA: ${item.description}`);
          console.log(`   Seletor: ${item.selector}`);
          console.log(`   OverflowX: ${computed.overflowX}`);
          console.log(`   OverflowY: ${computed.overflowY}`);
          console.log(`   Classes: ${element.className}`);
          
          // Sugerir correção específica
          if (element.tagName === 'MAIN') {
            console.log(`   🔧 CORREÇÃO: Modificar CRMLayout.tsx para usar overflow-visible`);
          } else if (element.className.includes('pipeline')) {
            console.log(`   🔧 CORREÇÃO: Modificar CSS em pipeline-kanban.css`);
          } else if (element.className.includes('stage-content')) {
            console.log(`   🔧 CORREÇÃO: Modificar KanbanColumn.tsx, style overflow: 'visible'`);
          } else {
            console.log(`   🔧 CORREÇÃO: Aplicar overflow: visible via CSS ou inline style`);
          }
        }
      }
    });
  });
}

// 4. MONITOR CONTÍNUO
function startContinuousMonitoring() {
  console.log('\n🔄 MONITOR CONTÍNUO ATIVADO');
  console.log('Observando mudanças que possam causar nested scroll...');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target;
        const computed = window.getComputedStyle(element);
        
        if ((computed.overflowX === 'auto' || computed.overflowX === 'scroll' ||
             computed.overflowY === 'auto' || computed.overflowY === 'scroll') &&
            element.querySelector('[data-rbd-droppable-id]')) {
          
          console.log('\n🚨 SCROLL ADICIONADO DINAMICAMENTE:');
          console.log(`   Elemento: ${element.tagName}${element.className ? '.' + element.className.split(' ')[0] : ''}`);
          console.log(`   OverflowX: ${computed.overflowX}`);
          console.log(`   OverflowY: ${computed.overflowY}`);
        }
      }
    });
  });
  
  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  // Parar observação após 30 segundos
  setTimeout(() => {
    observer.disconnect();
    console.log('📋 Monitor contínuo finalizado');
  }, 30000);
}

// INICIALIZAR INTERCEPTADOR
startContinuousMonitoring();

// RESTAURAR CONSOLE APÓS 60 segundos
setTimeout(() => {
  console.warn = originalConsoleWarn;
  
  if (!warningIntercepted) {
    console.log('\n⚠️ WARNING NÃO FOI INTERCEPTADO nos últimos 60 segundos');
    console.log('💡 Tente fazer drag de um card para trigger o warning');
  } else {
    console.log('\n✅ WARNING foi interceptado e analisado com sucesso');
  }
}, 60000);

// DADOS PARA EXPORT
window.warningInterceptorData = {
  timestamp: new Date().toISOString(),
  status: 'interceptor_active',
  warningIntercepted: false
};

console.log('\n📋 INSTRUÇÕES:');
console.log('1. Este script está ATIVO e aguardando o warning');
console.log('2. Faça drag de um card para trigger o warning');
console.log('3. O warning será interceptado e analisado automaticamente');
console.log('4. Correções específicas serão geradas em tempo real');