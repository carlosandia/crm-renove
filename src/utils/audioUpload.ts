// =====================================================================================
// UTILIDADE: Upload de Áudio via API Backend
// Autor: Claude (Arquiteto Sênior)
// Descrição: Funções para upload e gerenciamento de arquivos de áudio via backend
// =====================================================================================

import { AudioApiService, validateAudioFile, formatFileSize } from '../services/audioApiService';
import { ANNOTATION_LIMITS } from '../shared/schemas/annotations';

interface AudioUploadOptions {
  leadId: string;
  tenantId: string;
}

interface AudioUploadResult {
  success: boolean;
  audioUrl?: string;
  fileName?: string;
  duration?: number;
  error?: string;
}

// ✅ NOTA: validateAudioFile agora é importado do AudioApiService
// (mantido para compatibilidade com código existente)
export { validateAudioFile };

// AIDEV-NOTE: Função robusta para calcular duração de áudio usando Web Audio API + fallback HTML5
export const getAudioDuration = (blob: Blob): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    console.log('⏱️ [getAudioDuration] Iniciando cálculo robusto de duração:', {
      blobSize: blob.size,
      blobType: blob.type,
      strategy: 'Web Audio API → HTML5 Audio fallback'
    });

    const url = URL.createObjectURL(blob);

    // MÉTODO 1: Web Audio API (mais preciso para arquivos WebM)
    try {
      console.log('🔧 [getAudioDuration] Tentando Web Audio API...');
      
      // Verificar se Web Audio API está disponível
      if (window.AudioContext || (window as any).webkitAudioContext) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Converter blob para ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        
        // Decodificar áudio
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;
        
        // Fechar contexto para liberar recursos
        await audioContext.close();
        URL.revokeObjectURL(url);
        
        // Validar resultado
        if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
          throw new Error('Duração inválida do Web Audio API');
        }
        
        console.log('✅ [getAudioDuration] Sucesso com Web Audio API:', {
          duration,
          durationInSeconds: duration,
          durationInMinutes: (duration / 60).toFixed(2),
          method: 'Web Audio API'
        });
        
        resolve(duration);
        return;
      }
    } catch (webAudioError) {
      console.warn('⚠️ [getAudioDuration] Web Audio API falhou, tentando fallback:', webAudioError);
    }

    // MÉTODO 2: HTML5 Audio (fallback para compatibilidade)
    try {
      console.log('🔧 [getAudioDuration] Tentando HTML5 Audio fallback...');
      
      const audio = new Audio();
      let timeoutId: NodeJS.Timeout;
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (timeoutId) clearTimeout(timeoutId);
      };
      
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        cleanup();
        
        // Validar se duração é um número válido
        if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
          console.warn('⚠️ [getAudioDuration] HTML5 Audio retornou duração inválida:', duration);
          reject(new Error('Duração inválida calculada pelo HTML5 Audio'));
          return;
        }
        
        console.log('✅ [getAudioDuration] Sucesso com HTML5 Audio fallback:', {
          duration,
          durationInSeconds: duration,
          durationInMinutes: (duration / 60).toFixed(2),
          method: 'HTML5 Audio'
        });
        
        resolve(duration);
      };
      
      audio.onerror = (event) => {
        console.error('❌ [getAudioDuration] HTML5 Audio falhou:', event);
        cleanup();
        reject(new Error('Erro ao calcular duração do áudio via HTML5'));
      };
      
      // Timeout de segurança (5 segundos)
      timeoutId = setTimeout(() => {
        console.error('❌ [getAudioDuration] Timeout no cálculo de duração');
        cleanup();
        reject(new Error('Timeout ao calcular duração do áudio'));
      }, 5000);
      
      audio.src = url;
    } catch (html5Error) {
      URL.revokeObjectURL(url);
      console.error('❌ [getAudioDuration] Todos os métodos falharam:', html5Error);
      reject(new Error('Não foi possível calcular a duração do áudio'));
    }
  });
};

// ✅ FUNÇÃO PRINCIPAL: Upload de áudio via API backend
export const uploadAudioToSupabase = async (
  audioBlob: Blob,
  options: AudioUploadOptions
): Promise<AudioUploadResult> => {
  try {
    console.log('🎵 [uploadAudioToSupabase] Iniciando upload via API backend:', {
      leadId: options.leadId.substring(0, 8),
      tenantId: options.tenantId.substring(0, 8),
      blobSize: audioBlob.size,
      blobType: audioBlob.type
    });

    // Validar arquivo antes do upload
    const validation = validateAudioFile(audioBlob);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Calcular duração (opcional, para validação local)
    let duration: number | undefined;
    try {
      console.log('⏱️ [uploadAudioToSupabase] Tentando calcular duração...');
      duration = await getAudioDuration(audioBlob);
      
      console.log('✅ [uploadAudioToSupabase] Duração calculada:', {
        duration,
        limit: ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS,
        isOverLimit: duration > ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS
      });
      
      // Verificar duração máxima
      if (duration > ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS) {
        console.error('❌ [uploadAudioToSupabase] Áudio rejeitado por duração:', {
          calculatedDuration: duration,
          maxAllowed: ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS,
          durationInMinutes: (duration / 60).toFixed(2),
          maxAllowedInMinutes: (ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS / 60).toFixed(0)
        });
        
        return {
          success: false,
          error: `Áudio muito longo (${(duration / 60).toFixed(1)}min). Máximo permitido: ${Math.floor(ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS / 60)} minutos`
        };
      }
    } catch (error) {
      console.warn('⚠️ [uploadAudioToSupabase] Não foi possível calcular duração, continuando sem validação:', error);
      duration = undefined;
    }

    // ✅ UPLOAD VIA API BACKEND: Usar AudioApiService
    const response = await AudioApiService.uploadAudio({
      leadId: options.leadId,
      tenantId: options.tenantId,
      audioBlob: audioBlob
    });

    if (!response.success) {
      console.error('❌ [uploadAudioToSupabase] Falha no upload via API:', response.error);
      return {
        success: false,
        error: response.error
      };
    }

    // ✅ VALIDAÇÃO ROBUSTA: Verificar se URL é válida e acessível
    const audioUrl = response.data?.audioUrl;
    if (!audioUrl) {
      console.error('❌ [uploadAudioToSupabase] URL de áudio não retornada pela API');
      return {
        success: false,
        error: 'URL de áudio não gerada pelo servidor'
      };
    }

    // Validar formato da URL
    const isValidUrl = audioUrl.startsWith('https://') && 
                      audioUrl.includes('supabase.co') &&
                      !audioUrl.includes('example.com') &&
                      !audioUrl.includes('localhost');

    if (!isValidUrl) {
      console.error('❌ [uploadAudioToSupabase] URL de áudio inválida gerada:', {
        audioUrl: audioUrl.substring(0, 50),
        isValidFormat: isValidUrl
      });
      return {
        success: false,
        error: 'URL de áudio gerada é inválida'
      };
    }

    console.log('✅ [uploadAudioToSupabase] Upload concluído com sucesso via API backend:', {
      fileName: response.data?.fileName,
      fileSize: response.data?.fileSize,
      audioUrl: audioUrl?.substring(0, 50) + '...',
      calculatedDuration: duration,
      urlValidation: 'passed'
    });

    // Retornar resultado no formato esperado
    return {
      success: true,
      audioUrl: audioUrl,
      fileName: response.data!.fileName,
      duration: duration // Usar duração calculada localmente se disponível
    };

  } catch (error) {
    console.error('❌ [uploadAudioToSupabase] Erro interno:', error);
    return {
      success: false,
      error: 'Erro interno no upload de áudio'
    };
  }
};

// ✅ FUNÇÃO DE DELEÇÃO: Via API backend (futura implementação)
export const deleteAudioFromSupabase = async (audioUrl: string): Promise<boolean> => {
  try {
    console.log('🗑️ [deleteAudioFromSupabase] Tentativa de deleção via API backend:', {
      audioUrl: audioUrl.substring(0, 50) + '...'
    });

    // ✅ USAR AUDIOAPISERVICE: Quando implementado no backend
    const result = await AudioApiService.deleteAudio(audioUrl);
    
    if (!result.success) {
      console.error('❌ [deleteAudioFromSupabase] Falha na deleção:', result.error);
      return false;
    }

    console.log('✅ [deleteAudioFromSupabase] Arquivo deletado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ [deleteAudioFromSupabase] Erro interno:', error);
    return false;
  }
};

// Função para formatar duração em formato legível
export const formatAudioDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// ✅ NOTA: formatFileSize agora é importado do AudioApiService
// (mantido para compatibilidade com código existente)
export { formatFileSize };