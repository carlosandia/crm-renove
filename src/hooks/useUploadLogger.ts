// =====================================================================================
// HOOK: useUploadLogger
// Descrição: Sistema de logging estruturado para uploads com React-Uploady
// Autor: Claude (baseado em documentação oficial)
// =====================================================================================

import { useMemo } from 'react';

export interface UploadLogger {
  info: (message: string, data?: any) => void;
  success: (message: string, data?: any) => void;
  warning: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

/**
 * Hook para criar um logger estruturado para operações de upload
 * @param context Contexto/módulo que está gerando os logs
 * @returns Objeto logger com métodos estruturados
 */
export const useUploadLogger = (context: string): UploadLogger => {
  return useMemo(() => {
    const timestamp = () => new Date().toISOString();
    const isDev = import.meta.env.VITE_ENVIRONMENT === 'development';
    
    return {
      info: (message: string, data?: any) => {
        if (isDev) {
          console.log(`🔵 [${timestamp()}] [${context}] ${message}`, data || '');
        }
      },
      success: (message: string, data?: any) => {
        if (isDev) {
          console.log(`✅ [${timestamp()}] [${context}] ${message}`, data || '');
        }
      },
      warning: (message: string, data?: any) => {
        if (isDev) {
          console.warn(`⚠️ [${timestamp()}] [${context}] ${message}`, data || '');
        }
      },
      error: (message: string, data?: any) => {
        console.error(`❌ [${timestamp()}] [${context}] ${message}`, data || '');
      }
    };
  }, [context]);
};

/**
 * Constantes para tipos de arquivo suportados
 */
export const UPLOAD_CONSTANTS = {
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf', '.csv', '.xlsx', '.xls'] as const,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png', 
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ] as const
} as const;

/**
 * Função utilitária para formatar tamanho de arquivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Função utilitária para validar extensão de arquivo
 */
export const isValidExtension = (fileName: string): boolean => {
  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  return UPLOAD_CONSTANTS.ALLOWED_EXTENSIONS.includes(extension as any);
};

/**
 * Função utilitária para validar tamanho de arquivo
 */
export const isValidFileSize = (fileSize: number): boolean => {
  return fileSize <= UPLOAD_CONSTANTS.MAX_FILE_SIZE;
};