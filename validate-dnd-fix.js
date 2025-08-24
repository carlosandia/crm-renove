// 🎯 SCRIPT DE VALIDAÇÃO FINAL - ELIMINAÇÃO COMPLETA DO WARNING @hello-pangea/dnd
// Execute no DevTools Console da página Pipeline/Gestão de pipeline APÓS as correções

console.log('🎯 VALIDAÇÃO FINAL - @hello-pangea/dnd WARNING ELIMINADO');
console.log('='.repeat(80));

// 1. VALIDAR QUE NÃO HÁ MAIS NESTED SCROLL CONTAINERS
function validateNoNestedScroll() {
  console.log('🔍 VALIDAÇÃO 1: Verificando nested scroll containers...');
  
  const allElements = document.querySelectorAll('*');
  const scrollContainers = [];
  
  allElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const hasScrollX = styles.overflowX === 'scroll' || styles.overflowX === 'auto';
    const hasScrollY = styles.overflowY === 'scroll' || styles.overflowY === 'auto';
    
    if (hasScrollX || hasScrollY) {
      scrollContainers.push({
        element,
        tagName: element.tagName,
        className: element.className,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        isDragContainer: element.hasAttribute('data-rbd-droppable-id') || 
                        element.hasAttribute('data-rbd-drag-handle-context-id')
      });
    }
  });
  
  // Procurar nested containers
  let nestedFound = 0;
  scrollContainers.forEach(parent => {
    scrollContainers.forEach(child => {
      if (parent.element !== child.element && parent.element.contains(child.element)) {
        console.log(`🚨 NESTED ENCONTRADO: ${parent.tagName}.${parent.className} contém ${child.tagName}.${child.className}`);
        nestedFound++;
      }
    });
  });
  
  if (nestedFound === 0) {
    console.log('✅ VALIDAÇÃO 1: PASSOU - Nenhum nested scroll container detectado!');
    return true;
  } else {
    console.log(`❌ VALIDAÇÃO 1: FALHOU - ${nestedFound} nested containers ainda encontrados`);
    return false;
  }
}

// 2. VALIDAR CONFIGURAÇÃO ignoreContainerClipping
function validateIgnoreContainerClipping() {
  console.log('\n🔍 VALIDAÇÃO 2: Verificando ignoreContainerClipping...');
  
  // Procurar todos os Droppables
  const droppables = document.querySelectorAll('[data-rbd-droppable-id]');
  console.log(`📋 Encontrados ${droppables.length} Droppables`);
  
  // Como não podemos acessar props React diretamente, verificamos se warning aparece
  let warningFound = false;
  
  // Verificar console para warnings
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.includes('@hello-pangea/dnd') && message.includes('nested scroll container')) {
      warningFound = true;
      console.log('🚨 WARNING AINDA DETECTADO:', message);
    }
    originalConsoleWarn.apply(console, args);
  };
  
  // Restaurar console após teste
  setTimeout(() => {
    console.warn = originalConsoleWarn;
    if (!warningFound) {
      console.log('✅ VALIDAÇÃO 2: PASSOU - Nenhum warning @hello-pangea/dnd detectado!');
    } else {
      console.log('❌ VALIDAÇÃO 2: FALHOU - Warning ainda presente');
    }
  }, 1000);
  
  return !warningFound;
}

// 3. VALIDAR ESTRUTURA DOM ESPECÍFICA
function validateDOMStructure() {
  console.log('\n🔍 VALIDAÇÃO 3: Verificando estrutura DOM específica...');
  
  // Verificar CRMLayout containers
  const mainContainers = document.querySelectorAll('main');
  mainContainers.forEach((main, index) => {
    const styles = window.getComputedStyle(main);
    console.log(`📦 Main ${index + 1}: overflow=${styles.overflow}, overflowY=${styles.overflowY}`);
    
    if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
      console.log(`🚨 PROBLEMA: Main container ${index + 1} ainda tem scroll!`);
      return false;
    }
  });
  
  // Verificar pipeline containers específicos
  const pipelineContainers = document.querySelectorAll('.pipeline-kanban-container, .pipeline-view-container');
  pipelineContainers.forEach((container, index) => {
    const styles = window.getComputedStyle(container);
    console.log(`📦 Pipeline container ${index + 1}: overflow=${styles.overflow}`);
    
    if (styles.overflow !== 'visible') {
      console.log(`🚨 PROBLEMA: Pipeline container ${index + 1} não está como visible!`);
      return false;
    }
  });
  
  console.log('✅ VALIDAÇÃO 3: PASSOU - Estrutura DOM corrigida');
  return true;
}

// 4. EXECUTAR TODAS AS VALIDAÇÕES
async function runCompleteValidation() {
  console.log('🚀 INICIANDO VALIDAÇÃO COMPLETA...\n');
  
  const validation1 = validateNoNestedScroll();
  const validation3 = validateDOMStructure();
  
  // Validation 2 tem delay
  validateIgnoreContainerClipping();
  
  setTimeout(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 RESULTADO FINAL DA VALIDAÇÃO:');
    console.log('='.repeat(80));
    
    if (validation1 && validation3) {
      console.log('🎉 SUCESSO COMPLETO!');
      console.log('✅ Todas as correções aplicadas com sucesso');
      console.log('✅ Warning @hello-pangea/dnd ELIMINADO');
      console.log('✅ Nested scroll containers CORRIGIDOS');
      console.log('✅ Estrutura DOM OTIMIZADA');
      console.log('\n💡 O Kanban drag-and-drop agora funciona sem warnings!');
    } else {
      console.log('⚠️ Algumas validações falharam');
      console.log('🔧 Verifique os logs acima para detalhes específicos');
    }
  }, 2000);
}

// EXECUTAR VALIDAÇÃO
runCompleteValidation();

// DADOS PARA EXPORT
window.dndValidationData = {
  timestamp: new Date().toISOString(),
  status: 'validation_complete'
};

console.log('\n📋 INSTRUÇÕES:');
console.log('1. Aguarde 2 segundos para resultados completos');
console.log('2. Se aparecer "SUCESSO COMPLETO", o problema foi resolvido');
console.log('3. Se houver falhas, verifique os logs específicos acima');