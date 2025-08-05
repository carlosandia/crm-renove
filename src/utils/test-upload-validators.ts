// =====================================================================================
// TEST: Upload Validators
// Descrição: Teste simples das funções de validação de upload
// =====================================================================================

import { validateUploadFile, validateFileBatch } from './uploadValidators';

// Simular um arquivo válido
const validFile = new File(['conteúdo'], 'teste.pdf', { 
  type: 'application/pdf' 
});

// Simular um arquivo inválido (muito grande)
const invalidFile = new File(['x'.repeat(20 * 1024 * 1024)], 'arquivo-grande.txt', { 
  type: 'text/plain' 
});

// Teste de validação de arquivo único
console.log('🔍 Teste de validação de arquivo único:');
console.log('✅ Arquivo válido:', validateUploadFile(validFile));
console.log('❌ Arquivo inválido:', validateUploadFile(invalidFile));

// Teste de validação de lote
console.log('\n🔍 Teste de validação de lote:');
console.log('✅ Lote válido:', validateFileBatch([validFile]));
console.log('❌ Lote inválido:', validateFileBatch([invalidFile]));

export default {};