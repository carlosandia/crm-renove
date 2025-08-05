const fs = require('fs');

console.log('🔍 Verificando correção do Temporal Dead Zone...');

try {
  const content = fs.readFileSync('src/components/Pipeline/LeadDetailsModal.tsx', 'utf8');
  
  // Encontrar linha do useMemo problemático
  const lines = content.split('\n');
  let useMemoLine = -1;
  let renderEditableFieldLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    // Buscar useMemo que referencia renderEditableField
    if (lines[i].includes('renderEditableField: renderEditableField')) {
      useMemoLine = i + 1;
    }
    if (lines[i].includes('const renderEditableField = useCallback(')) {
      renderEditableFieldLine = i + 1;
    }
  }
  
  console.log(`📍 useMemo que referencia renderEditableField: linha ${useMemoLine}`);
  console.log(`📍 definição de renderEditableField: linha ${renderEditableFieldLine}`);
  
  if (renderEditableFieldLine > 0 && useMemoLine > 0 && renderEditableFieldLine < useMemoLine) {
    console.log('✅ CORREÇÃO APLICADA COM SUCESSO!');
    console.log('✅ renderEditableField definida ANTES do useMemo que a referencia');
    console.log('✅ Temporal Dead Zone resolvido');
  } else if (renderEditableFieldLine === -1) {
    console.log('❌ renderEditableField não encontrada');
  } else if (useMemoLine === -1) {
    console.log('❌ useMemo referenciando renderEditableField não encontrado');
  } else {
    console.log('❌ renderEditableField ainda está após o useMemo (linha', renderEditableFieldLine, 'vs', useMemoLine, ')');
  }
  
} catch (error) {
  console.log('❌ Erro ao verificar:', error.message);
}