// 🔍 VERIFICAÇÃO RÁPIDA DE SCROLL CONTAINERS
// Execute no DevTools Console para check rápido

console.log('🔍 VERIFICAÇÃO RÁPIDA - SCROLL CONTAINERS');
console.log('='.repeat(50));

// Função para verificar elementos com overflow auto/scroll
function quickScrollCheck() {
  const scrollElements = [];
  
  // Verificar todos os elementos
  document.querySelectorAll('*').forEach(el => {
    const styles = window.getComputedStyle(el);
    if (styles.overflowX === 'auto' || styles.overflowX === 'scroll' || 
        styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
      scrollElements.push({
        tag: el.tagName,
        classes: el.className,
        id: el.id,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        isDnD: el.hasAttribute('data-rbd-droppable-id') || el.hasAttribute('data-rbd-drag-handle-context-id')
      });
    }
  });
  
  console.log(`📋 Total de elementos com scroll: ${scrollElements.length}`);
  
  scrollElements.forEach((el, i) => {
    console.log(`${i+1}. ${el.tag} ${el.classes || el.id || ''}`);
    console.log(`   Overflow: X=${el.overflowX}, Y=${el.overflowY}`);
    if (el.isDnD) console.log(`   🎯 ELEMENTO DnD!`);
  });
  
  // Verificar nested especificamente
  let nestedFound = 0;
  scrollElements.forEach(parent => {
    scrollElements.forEach(child => {
      if (parent !== child) {
        const parentEl = document.querySelector(parent.tag + (parent.classes ? '.' + parent.classes.split(' ')[0] : ''));
        const childEl = document.querySelector(child.tag + (child.classes ? '.' + child.classes.split(' ')[0] : ''));
        if (parentEl && childEl && parentEl.contains(childEl)) {
          nestedFound++;
          console.log(`🚨 NESTED: ${parent.tag} contém ${child.tag}`);
        }
      }
    });
  });
  
  console.log(`\n${nestedFound > 0 ? '❌' : '✅'} Nested containers: ${nestedFound}`);
  return { total: scrollElements.length, nested: nestedFound, elements: scrollElements };
}

const result = quickScrollCheck();
console.log('\n📊 RESUMO:');
console.log(`Total scroll containers: ${result.total}`);
console.log(`Nested detectados: ${result.nested}`);
console.log(result.nested > 0 ? '❌ PROBLEMA ENCONTRADO' : '✅ NENHUM PROBLEMA');