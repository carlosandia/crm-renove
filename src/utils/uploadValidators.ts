// =====================================================================================
// UTILS: uploadValidators
// Descrição: Validadores robustos para upload de arquivos
// Autor: Claude (baseado em documentação React-Uploady)
// =====================================================================================

import { UPLOAD_CONSTANTS, formatFileSize } from '../hooks/useUploadLogger';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    extension: string;
  };
}

/**
 * Validador principal de arquivos para upload
 * @param file Arquivo a ser validado
 * @returns Resultado da validação com detalhes
 */
export const validateUploadFile = (file: File): ValidationResult => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  const details = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    extension
  };

  // Validação de extensão
  if (!UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS.includes(extension as any)) {
    return {
      isValid: false,
      error: `Tipo de arquivo "${extension}" não permitido. Use: ${UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS.join(', ')}`,
      details
    };
  }

  // Validação de tamanho
  if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `Arquivo muito grande. Máximo permitido: ${formatFileSize(UPLOAD_CONSTANTS.MAX_FILE_SIZE)}`,
      details
    };
  }

  // Validação de MIME type (mais rigorosa)
  if (file.type && !UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Tipo MIME "${file.type}" não permitido`,
      details
    };
  }

  // Validação de nome de arquivo
  if (!file.name || file.name.trim() === '') {
    return {
      isValid: false,
      error: 'Nome de arquivo inválido',
      details
    };
  }

  // Validação contra caracteres perigosos no nome do arquivo
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    return {
      isValid: false,
      error: 'Nome do arquivo contém caracteres inválidos',
      details
    };
  }

  return {
    isValid: true,
    details
  };
};

/**
 * Validador específico para lote de arquivos
 * @param files Array de arquivos para validação
 * @param maxCount Número máximo de arquivos permitidos
 * @returns Resultado da validação do lote
 */
export const validateFileBatch = (
  files: File[], 
  maxCount: number = 10
): ValidationResult => {
  if (files.length === 0) {
    return {
      isValid: false,
      error: 'Nenhum arquivo selecionado'
    };
  }

  if (files.length > maxCount) {
    return {
      isValid: false,
      error: `Muitos arquivos selecionados. Máximo permitido: ${maxCount}`
    };
  }

  // Validar cada arquivo individualmente
  for (const file of files) {
    const validation = validateUploadFile(file);
    if (!validation.isValid) {
      return validation; // Retorna o primeiro erro encontrado
    }
  }

  // Validar tamanho total do lote
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxBatchSize = UPLOAD_CONSTANTS.MAX_FILE_SIZE * 2; // 20MB total

  if (totalSize > maxBatchSize) {
    return {
      isValid: false,
      error: `Tamanho total dos arquivos excede ${formatFileSize(maxBatchSize)}`
    };
  }

  return { isValid: true };
};

/**
 * Sanitizador de nome de arquivo
 * @param fileName Nome original do arquivo
 * @returns Nome sanitizado seguro para uso
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Substitui caracteres perigosos
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .replace(/_{2,}/g, '_') // Remove underscores duplos
    .substring(0, 255); // Limita tamanho
};

/**
 * Verificador de duplicatas por nome de arquivo
 * @param files Array de arquivos
 * @returns Lista de arquivos duplicados
 */
export const findDuplicateFiles = (files: File[]): string[] => {
  const fileNames = files.map(f => f.name.toLowerCase());
  const duplicates: string[] = [];
  
  fileNames.forEach((name, index) => {
    if (fileNames.indexOf(name) !== index && !duplicates.includes(name)) {
      duplicates.push(name);
    }
  });
  
  return duplicates;
};

/**
 * Estimador de tempo de upload baseado no tamanho do arquivo
 * @param fileSize Tamanho do arquivo em bytes
 * @param connectionSpeedKbps Velocidade da conexão em Kbps (padrão: 1000)
 * @returns Tempo estimado em segundos
 */
export const estimateUploadTime = (
  fileSize: number, 
  connectionSpeedKbps: number = 1000
): number => {
  const fileSizeKb = fileSize / 1024;
  const timeSeconds = fileSizeKb / connectionSpeedKbps;
  return Math.ceil(timeSeconds);
};