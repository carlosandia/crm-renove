// =====================================================================================
// SERVIÇO: API de Upload de Áudio
// Autor: Claude (Arquiteto Sênior)
// Descrição: Serviço para upload de áudio via API backend (padrão consistente)
// =====================================================================================

import { api } from './api';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================

export interface AudioUploadRequest {
  leadId: string;
  tenantId: string;
  audioBlob: Blob;
}

export interface AudioUploadResponse {
  success: boolean;
  data?: {
    audioUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  error?: string;
}

// ================================================================================
// SERVIÇO DE API PARA ÁUDIO
// ================================================================================

export class AudioApiService {
  
  /**
   * Upload de arquivo de áudio via API backend
   */
  static async uploadAudio(request: AudioUploadRequest): Promise<AudioUploadResponse> {
    try {
      console.log('🎵 [AudioApiService] Iniciando upload de áudio:', {
        leadId: request.leadId.substring(0, 8),
        tenantId: request.tenantId.substring(0, 8),
        blobSize: request.audioBlob.size,
        blobType: request.audioBlob.type
      });

      // Validações básicas
      if (!request.leadId || !request.tenantId || !request.audioBlob) {
        return {
          success: false,
          error: 'Parâmetros obrigatórios: leadId, tenantId e audioBlob'
        };
      }

      // Validar tamanho do arquivo (10MB máximo)
      const maxSizeBytes = 10 * 1024 * 1024;
      if (request.audioBlob.size > maxSizeBytes) {
        return {
          success: false,
          error: `Arquivo muito grande. Máximo permitido: 10MB`
        };
      }

      // Validar tipo MIME
      const allowedMimeTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'];
      if (!allowedMimeTypes.includes(request.audioBlob.type)) {
        return {
          success: false,
          error: `Formato não suportado. Formatos aceitos: ${allowedMimeTypes.join(', ')}`
        };
      }

      // Criar FormData para upload
      const formData = new FormData();
      formData.append('audio', request.audioBlob, 'audio.webm');
      formData.append('leadId', request.leadId);
      formData.append('tenantId', request.tenantId);

      // ✅ LOGS DE DEBUG DETALHADOS DO FORMDATA
      console.log('🔍 [DEBUG-FRONTEND] FormData criado:', {
        audioBlob: {
          size: request.audioBlob.size,
          type: request.audioBlob.type,
          name: 'audio.webm'
        },
        leadId: request.leadId.substring(0, 8),
        tenantId: request.tenantId.substring(0, 8),
        formDataKeys: Array.from(formData.keys()),
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          valueType: typeof value,
          valueSize: value instanceof Blob ? value.size : 'N/A'
        }))
      });

      console.log('🔄 [AudioApiService] Enviando requisição para API backend...');

      // Enviar para API backend (interceptors cuidam da autenticação)
      // AIDEV-NOTE: Usar timeout padrão do API client - não passar configurações extras
      const response = await api.post<AudioUploadResponse>('/annotations/upload-audio', formData);

      console.log('✅ [AudioApiService] Upload realizado com sucesso:', {
        fileName: response.data.data?.fileName,
        fileSize: response.data.data?.fileSize,
        audioUrl: response.data.data?.audioUrl?.substring(0, 50) + '...'
      });

      return response.data;

    } catch (error: any) {
      console.error('❌ [AudioApiService] Erro no upload:', error);

      // Tratar diferentes tipos de erro
      if (error.response) {
        // Erro do servidor (4xx, 5xx)
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.error || error.response.statusText;
        
        return {
          success: false,
          error: `Erro ${statusCode}: ${errorMessage}`
        };
      } else if (error.request) {
        // Erro de rede
        return {
          success: false,
          error: 'Erro de conexão. Verifique sua internet e tente novamente.'
        };
      } else {
        // Erro interno
        return {
          success: false,
          error: 'Erro interno no upload de áudio'
        };
      }
    }
  }

  /**
   * Deletar arquivo de áudio (implementação futura)
   */
  static async deleteAudio(audioUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implementar endpoint de deleção no backend
      console.log('🗑️ [AudioApiService] Deleção de áudio não implementada ainda:', {
        audioUrl: audioUrl.substring(0, 50) + '...'
      });
      
      return {
        success: false,
        error: 'Funcionalidade de deleção ainda não implementada'
      };
    } catch (error: any) {
      console.error('❌ [AudioApiService] Erro ao deletar áudio:', error);
      return {
        success: false,
        error: 'Erro ao deletar arquivo de áudio'
      };
    }
  }
}

// ================================================================================
// UTILIDADES AUXILIARES
// ================================================================================

/**
 * Função para validar arquivo de áudio antes do upload
 */
export const validateAudioFile = (blob: Blob): { valid: boolean; error?: string } => {
  // Verificar tamanho (10MB máximo)
  const maxSizeBytes = 10 * 1024 * 1024;
  if (blob.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo permitido: 10MB`
    };
  }

  // Verificar tipo MIME
  const allowedMimeTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'];
  if (!allowedMimeTypes.includes(blob.type)) {
    return {
      valid: false,
      error: `Formato não suportado. Formatos aceitos: ${allowedMimeTypes.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Função para formatar tamanho do arquivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};