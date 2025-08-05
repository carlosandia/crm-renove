// =====================================================================================
// COMPONENT: Audio Player Avançado
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Player de áudio com controles completos para reprodução de gravações
// =====================================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { formatFileSize } from '../../utils/audioUpload';

interface AudioPlayerProps {
  audioUrl: string;
  fileName?: string;
  duration?: number;
  fileSize?: number;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  fileName,
  duration: providedDuration,
  fileSize,
  className = '',
  compact = false,
  showDetails = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(providedDuration || 0);
  const [displayDuration, setDisplayDuration] = useState(providedDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // AIDEV-NOTE: Debug inicial (apenas se necessário)
  // Removido para evitar loops infinitos de renderização

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // AIDEV-NOTE: Sincronizar displayDuration com providedDuration (SEMPRE usar fornecida como fallback)
  useEffect(() => {
    if (providedDuration && providedDuration > 0) {
      setDisplayDuration(providedDuration);
      setDuration(providedDuration);
      // Log removido para evitar spam
    }
  }, [providedDuration]);

  // AIDEV-NOTE: Validação inicial de URL para detectar URLs inválidas
  useEffect(() => {
    if (!audioUrl) return;
    
    // Detectar URLs claramente inválidas
    const isInvalidUrl = audioUrl.includes('example.com') || 
                        audioUrl.includes('localhost') ||
                        audioUrl.startsWith('http://example') ||
                        audioUrl.includes('soundjay.com'); // URL de teste
    
    if (isInvalidUrl) {
      console.warn('⚠️ [AudioPlayer] URL de áudio inválida detectada:', {
        audioUrl: audioUrl.substring(0, 50),
        providedDuration,
        fileName
      });
      
      setError('URL de áudio inválida');
      
      // Mesmo com erro, mostrar duração se fornecida
      if (providedDuration && providedDuration > 0) {
        setDisplayDuration(providedDuration);
        setDuration(providedDuration);
      }
    }
  }, [audioUrl, providedDuration, fileName]);

  // AIDEV-NOTE: Inicializar áudio e configurar event listeners
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    const audio = audioRef.current;
    
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
      // Log removido para reduzir spam
    };

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setIsReady(true);
      const audioDuration = audio.duration;
      
      // AIDEV-NOTE: SEMPRE priorizar duração fornecida sobre metadados do áudio
      if (providedDuration && providedDuration > 0) {
        // Usar duração fornecida como fonte da verdade
        setDisplayDuration(providedDuration);
        setDuration(providedDuration);
      } else if (isFinite(audioDuration) && audioDuration > 0) {
        // Fallback para metadados do áudio apenas se duração fornecida não existe
        setDuration(audioDuration);
        setDisplayDuration(audioDuration);
      }
      // Se nenhuma duração válida, manter valores atuais
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setIsLoading(false);
      
      // Melhor detecção do tipo de erro
      let errorMessage = 'Erro ao carregar áudio';
      const audioError = audio.error;
      
      if (audioError) {
        switch (audioError.code) {
          case audioError.MEDIA_ERR_ABORTED:
            errorMessage = 'Reprodução cancelada';
            break;
          case audioError.MEDIA_ERR_NETWORK:
            errorMessage = 'Erro de rede ao carregar áudio';
            break;
          case audioError.MEDIA_ERR_DECODE:
            errorMessage = 'Erro de formato do áudio';
            break;
          case audioError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'URL de áudio não suportada';
            break;
          default:
            errorMessage = 'Erro desconhecido ao carregar áudio';
        }
      }
      
      setError(errorMessage);
      
      // Log apenas em desenvolvimento e sem detalhes excessivos
      if (import.meta.env.DEV) {
        console.warn('⚠️ [AudioPlayer] Erro ao carregar áudio:', {
          errorCode: audioError?.code,
          errorMessage
        });
      }
      
      // AIDEV-NOTE: SEMPRE mostrar duração fornecida mesmo com erro
      if (providedDuration && providedDuration > 0) {
        setDisplayDuration(providedDuration);
        setDuration(providedDuration);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setIsReady(true);
    };

    // Adicionar event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Configurar volume inicial
    audio.volume = volume;

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, providedDuration, volume]);

  // AIDEV-NOTE: Função para alternar play/pause
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || !isReady) return;

    try {
      const audio = audioRef.current;
      
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ [AudioPlayer] Erro ao reproduzir áudio:', error);
      setError('Erro ao reproduzir áudio');
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [isPlaying, isReady]);

  // AIDEV-NOTE: Função para resetar reprodução
  const resetAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // AIDEV-NOTE: Função para alternar mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // AIDEV-NOTE: Função para controlar progresso via clique
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || !displayDuration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * displayDuration;
    
    // Só permitir seek se o áudio estiver carregado
    if (isReady && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [displayDuration, isReady]);

  // AIDEV-NOTE: Formatar tempo em mm:ss
  const formatTime = (time: number): string => {
    if (!isFinite(time) || isNaN(time) || time <= 0) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // AIDEV-NOTE: Calcular progresso (usar displayDuration para cálculo visual)
  const progressPercentage = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  if (error) {
    return (
      <div className={`flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm text-amber-800 font-medium">
            {fileName || 'Arquivo de áudio'}
          </div>
          <div className="text-xs text-amber-700 mt-1">
            {error} • {displayDuration > 0 ? `Duração: ${formatTime(displayDuration)}` : 'Duração indisponível'}
          </div>
          <div className="text-xs text-amber-600 mt-1">
            ℹ️ Informações básicas disponíveis, reprodução indisponível
          </div>
        </div>
        {/* Botão de informações mesmo com erro */}
        <button 
          className="p-2 rounded-full text-amber-600 hover:bg-amber-100 transition-colors"
          title="Arquivo de áudio com problema de acesso"
          disabled
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 p-2 bg-white rounded-lg max-w-sm border border-gray-200 ${className}`}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        {/* Botão Play/Pause Compacto */}
        <button
          onClick={togglePlayPause}
          disabled={!isReady || isLoading}
          className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors flex-shrink-0"
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </button>

        {/* Progresso Compacto */}
        <div className="flex-1 min-w-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gray-400 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Tempo Compacto */}
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(displayDuration)}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Header com informações do arquivo */}
      {showDetails && (fileName || fileSize) && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {fileName || 'Gravação de áudio'}
              </span>
            </div>
            {fileSize && (
              <span className="text-xs text-gray-500">
                {formatFileSize(fileSize)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controles principais */}
      <div className="flex items-center space-x-4">
        {/* Botão Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={!isReady || isLoading}
          className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* Botão Reset */}
        <button
          onClick={resetAudio}
          disabled={!isReady}
          className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Progresso */}
        <div className="flex-1">
          <div 
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
          >
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Tempo */}
          <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>

        {/* Controle de Volume */}
        <button
          onClick={toggleMute}
          className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title={isMuted ? 'Ativar som' : 'Mutar'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && !isReady && (
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando áudio...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;