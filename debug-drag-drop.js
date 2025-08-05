// Script para ativar debugging do drag & drop
console.log('🔧 Ativando debug do drag & drop...');

// Ativar debugging global
window.debugDragDrop = true;

// Adicionar helper para testar etapas
window.testDragDropStages = () => {
  const stages = document.querySelectorAll('[data-stage-id]');
  console.log(`🎯 Encontradas ${stages.length} etapas na página:`);
  
  stages.forEach((stage, index) => {
    const stageId = stage.getAttribute('data-stage-id');
    const stageElement = stage.querySelector('h3');
    const stageName = stageElement ? stageElement.textContent : 'unknown';
    
    console.log(`  ${index + 1}. "${stageName}" (ID: ${stageId})`);
  });
  
  return stages.length;
};

// Executar teste inicial
setTimeout(() => {
  window.testDragDropStages();
}, 2000);

console.log('✅ Debug ativado! Use window.testDragDropStages() para testar');