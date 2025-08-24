// =====================================================================================
// COMPONENT: Editor Simples de Anotações (Estilo Moskit) - UX MODERNA
// Autor: Claude (Arquiteto Sênior)
// Descrição: Interface minimalista para criar anotações com sistema de áudio avançado
// =====================================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2, X, MicOff, AlertCircle } from 'lucide-react';
import { useCreateAnnotation } from '../../hooks/useAnnotations';
import type { CreateAnnotation } from '../../shared/schemas/annotations';
import { uploadAudioToSupabase, formatAudioDuration, formatFileSize } from '../../utils/audioUpload';
import { useAuth } from '../../providers/AuthProvider';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../../hooks/useToast';
import { ANNOTATION_LIMITS } from '../../shared/schemas/annotations';
import { AudioPlayer } from '../ui/audio-player';

interface SimpleAnnotationEditorProps {
  leadId: string;
  leadType: 'pipeline_lead' | 'lead_master';
  onSave: () => void;
  user: any;
}

export const SimpleAnnotationEditor: React.FC<SimpleAnnotationEditorProps> = ({
  leadId,
  leadType,
  onSave,
  user: propUser
}) => {
  const { user } = useAuth(); // Usar hook de auth para ter acesso completo ao usuário
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioData, setAudioData] = useState<{
    url: string;
    fileName: string;
    duration?: number;
    size: number;
  } | null>(null);
  
  // ✨ ESTADOS PARA UX SIMPLIFICADA
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mutation para criar anotação
  const createMutation = useCreateAnnotation();

  // ✨ EFEITO PARA CONTADOR DE TEMPO SIMPLIFICADO
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      recordingTimerRef.current = setInterval(() => {
        const currentDuration = (Date.now() - recordingStartTime) / 1000;
        setRecordingDuration(currentDuration);
        
        // 🛑 AUTO-STOP AOS 5 MINUTOS (300 segundos)
        if (currentDuration >= ANNOTATION_LIMITS.MAX_AUDIO_DURATION_SECONDS) {
          stopRecordingDueToLimit();
        }
      }, 1000); // Atualizar a cada 1 segundo para economizar performance
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // ⚙️ FUNÇÃO PARA PARAR GRAVAÇÃO POR LIMITE DE TEMPO
  const stopRecordingDueToLimit = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      const mediaRecorder = recognitionRef.current as MediaRecorder;
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      showInfoToast(
        '🎤 Gravação finalizada automaticamente',
        'Limite de 5 minutos atingido'
      );
    }
  }, [isRecording]);

  // ✅ OTIMIZADO: Callback para processamento de áudio com validações simplificadas
  const handleAudioRecordedCallback = React.useCallback(async (audioBlob: Blob) => {
    // Log simplificado apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.log('🎵 [Audio] Upload iniciado via API backend:', {
        size: formatFileSize(audioBlob.size),
        type: audioBlob.type
      });
    }
    
    // ✅ VALIDAÇÕES BÁSICAS
    if (!leadId?.trim()) {
      showErrorToast('Erro de identificação', 'Lead não identificado. Recarregue a página.');
      return;
    }
    
    if (!user?.tenant_id) {
      showErrorToast('Erro de autenticação', 'Dados do usuário não encontrados');
      return;
    }

    try {
      setIsUploadingAudio(true);
      showInfoToast('🎵 Processando áudio', 'Enviando gravação...');
      
      // ✅ UPLOAD VIA API BACKEND: Autenticação automática via interceptors
      const result = await uploadAudioToSupabase(audioBlob, {
        leadId: leadId.trim(),
        tenantId: user.tenant_id
      });

      if (!result.success) {
        showErrorToast('Erro no upload', result.error || 'Erro ao enviar áudio');
        return;
      }

      // Armazenar dados do áudio
      setAudioData({
        url: result.audioUrl!,
        fileName: result.fileName!,
        duration: result.duration,
        size: audioBlob.size
      });

      // AIDEV-NOTE: Não adicionar texto no textarea - áudio será exibido via AudioPlayer
      
      showSuccessToast(
        '🎤 Áudio gravado com sucesso',
        `Duração: ${result.duration ? formatAudioDuration(result.duration) : 'N/A'}`
      );
      
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      showErrorToast('Erro no processamento', 'Erro ao processar gravação de áudio');
    } finally {
      setIsUploadingAudio(false);
    }
  }, [leadId, leadType, user, showErrorToast, showInfoToast, showSuccessToast, setIsUploadingAudio, setAudioData, setContent]);

  // ✅ CORREÇÃO CRÍTICA: Estado para gerenciar permissões e stream
  const [mediaStream, setMediaStream] = React.useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = React.useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [permissionError, setPermissionError] = React.useState<string>('');

  // ✅ FUNÇÃO PARA DETECTAR MIME TYPE SUPORTADO
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`✅ [getSupportedMimeType] Tipo suportado encontrado: ${type}`);
        return type;
      }
    }
    
    console.warn('⚠️ [getSupportedMimeType] Nenhum tipo preferido suportado, usando padrão');
    return 'audio/webm'; // Fallback padrão
  };

  // ✅ FUNÇÃO PARA INICIALIZAR GRAVAÇÃO (chamada apenas quando usuário clica)
  const initializeAudioRecording = React.useCallback(async (existingStream?: MediaStream): Promise<boolean> => {
    try {
      console.log('🎤 [initializeAudioRecording] Solicitando permissão de microfone...');

      // Verificar se MediaRecorder é suportado
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError('Gravação de áudio não suportada neste navegador');
        setPermissionState('error');
        return false;
      }

      // ✅ VERIFICAR SE MEDIARECORDER É SUPORTADO
      if (!window.MediaRecorder) {
        setPermissionError('MediaRecorder não disponível neste navegador. Tente usar Chrome, Firefox ou Edge.');
        setPermissionState('error');
        return false;
      }

      // ✅ CONFIGURAÇÕES DE ÁUDIO MAIS FLEXÍVEIS
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
        // Removido sampleRate fixo para usar padrão do sistema
      };

      let stream = existingStream;
      
      // ✅ SOLICITAR PERMISSÃO APENAS SE NÃO TIVER STREAM VÁLIDO
      if (!stream || !stream.active) {
        console.log('🔄 [initializeAudioRecording] Solicitando novo stream de áudio...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: audioConstraints
        });
      } else {
        console.log('✅ [initializeAudioRecording] Usando stream existente ativo');
      }

      console.log('✅ [initializeAudioRecording] Permissão concedida, configurando MediaRecorder...');
      setPermissionState('granted');
      setPermissionError('');
      setMediaStream(stream);

      // ✅ DETECTAR MELHOR MIME TYPE SUPORTADO
      const mimeType = getSupportedMimeType();
      
      // ✅ VALIDAR SUPORTE ANTES DE CRIAR MEDIARECORDER
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        setPermissionError('Navegador não suporta gravação de áudio com os codecs disponíveis');
        setPermissionState('error');
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      // ✅ VALIDAR STREAM ANTES DE CRIAR MEDIARECORDER
      if (!stream.active) {
        setPermissionError('Stream de áudio não está ativo');
        setPermissionState('error');
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      console.log('🔧 [initializeAudioRecording] Criando MediaRecorder:', {
        mimeType,
        streamActive: stream.active,
        audioTracks: stream.getAudioTracks().length
      });

      // ✅ CRIAR MEDIARECORDER COM VALIDAÇÃO ROBUSTA
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType
        });
      } catch (error: any) {
        console.error('❌ [initializeAudioRecording] Erro ao criar MediaRecorder:', error);
        setPermissionError(`Erro ao configurar gravador: ${error.message}`);
        setPermissionState('error');
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      let audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          if (import.meta.env.DEV) {
            console.log('🎵 [MediaRecorder] Processando áudio:', {
              chunks: audioChunks.length,
              size: formatFileSize(audioBlob.size)
            });
          }
          
          // ✅ PROCESSAR ÁUDIO
          handleAudioRecordedCallback(audioBlob);
          audioChunks = [];
        }
        
        // ✅ RESETAR ESTADOS DE GRAVAÇÃO
        setIsRecording(false);
        setRecordingStartTime(null);
        setRecordingDuration(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ [MediaRecorder] Erro na gravação:', event);
        setIsRecording(false);
        setPermissionError('Erro durante a gravação');
      };

      recognitionRef.current = mediaRecorder;
      return true;

    } catch (error: any) {
      console.error('❌ [initializeAudioRecording] Erro:', error);
      
      // ✅ TRATAMENTO ESPECÍFICO DE ERROS (CORRIGIDO)
      if (error.name === 'NotAllowedError') {
        setPermissionError('Permissão de microfone negada. Clique no ícone de microfone na barra de endereços para permitir.');
        setPermissionState('denied');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('Nenhum microfone encontrado. Verifique se há um microfone conectado.');
        setPermissionState('error');
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Microfone em uso por outro aplicativo. Feche outros apps que possam estar usando o microfone.');
        setPermissionState('error');
      } else if (error.name === 'NotSupportedError') {
        setPermissionError('Gravação de áudio não suportada neste navegador. Tente usar Chrome, Firefox ou Edge.');
        setPermissionState('error');
      } else if (error.name === 'OverconstrainedError') {
        setPermissionError('Configurações de áudio não suportadas pelo microfone. Tentando configuração mais simples...');
        setPermissionState('error');
        
        // ✅ FALLBACK: Tentar com configurações mais básicas
        try {
          console.log('🔄 [Fallback] Tentando configuração básica de áudio...');
          const basicStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true // Configuração mais básica possível
          });
          
          if (basicStream) {
            setMediaStream(basicStream);
            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(basicStream, { mimeType });
            recognitionRef.current = mediaRecorder;
            setPermissionState('granted');
            setPermissionError('');
            console.log('✅ [Fallback] Configuração básica funcionou');
            return true;
          }
        } catch (fallbackError) {
          console.error('❌ [Fallback] Configuração básica também falhou:', fallbackError);
        }
      } else {
        setPermissionError('Erro ao acessar microfone. Tente recarregar a página.');
        setPermissionState('error');
      }
      
      return false;
    }
  }, [handleAudioRecordedCallback]);

  // ✅ CLEANUP DO STREAM APENAS QUANDO COMPONENTE FOR DESMONTADO
  React.useEffect(() => {
    return () => {
      if (mediaStream) {
        console.log('🧹 [cleanup] Parando stream de áudio no desmonte do componente...');
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // ✅ Array vazio = executa cleanup apenas no desmonte

  // Auto-resize do textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // 🔄 Função movida para useCallback acima para corrigir closure bug

  // ✅ CONTROLE DE GRAVAÇÃO DE ÁUDIO (SIMPLIFICADO)
  const toggleRecording = async () => {
    if (isRecording) {
      // ⏸️ PARAR GRAVAÇÃO
      const mediaRecorder = recognitionRef.current as MediaRecorder;
      if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
        console.log('⏸️ [toggleRecording] Parando gravação...');
        mediaRecorder.stop();
        // ✅ NÃO alterar estado aqui - será atualizado no evento onstop
        showInfoToast('⏹️ Gravação finalizada', 'Processando áudio...');
      } else {
        console.warn('⚠️ [toggleRecording] MediaRecorder não está gravando, estado:', mediaRecorder?.state);
        setIsRecording(false); // ✅ Forçar reset do estado apenas se necessário
      }
    } else {
      // ▶️ INICIAR GRAVAÇÃO
      if (!recognitionRef.current || permissionState !== 'granted') {
        console.log('🎤 [toggleRecording] Inicializando gravação pela primeira vez...');
        
        const success = await initializeAudioRecording();
        if (!success) {
          showErrorToast('Erro no microfone', permissionError || 'Não foi possível acessar o microfone');
          return;
        }
        
        // Aguardar um frame para garantir que o MediaRecorder foi configurado
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ✅ VERIFICAR SE MEDIARECORDER ESTÁ PRONTO
      const mediaRecorder = recognitionRef.current as MediaRecorder;
      if (!mediaRecorder) {
        console.error('❌ [toggleRecording] MediaRecorder não encontrado no ref');
        showErrorToast('MediaRecorder não encontrado', 'Tente novamente');
        return;
      }

      // ✅ VERIFICAÇÃO SIMPLIFICADA - apenas verificar se está inativo
      if (mediaRecorder.state !== 'inactive') {
        console.warn('⚠️ [toggleRecording] MediaRecorder não está inativo:', mediaRecorder.state);
        // Tentar parar primeiro se estiver em outro estado
        if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
          mediaRecorder.stop();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // ✅ INICIAR GRAVAÇÃO DIRETAMENTE
      try {
        console.log('🎤 [toggleRecording] Iniciando gravação...');
        mediaRecorder.start();
        // ✅ NÃO alterar estado aqui - será atualizado no evento onstart
        setRecordingStartTime(Date.now());
        setRecordingDuration(0);
        
        showSuccessToast('🎤 Gravação iniciada', 'Fale no microfone para gravar sua anotação');
      } catch (error: any) {
        console.error('❌ [toggleRecording] Erro ao iniciar gravação:', error);
        showErrorToast('Erro na gravação', `Não foi possível iniciar: ${error.message}`);
      }
    }
  };

  // Salvar anotação (CORRIGIDO: permitir anotações apenas de áudio)
  const handleSave = async () => {
    if (!content.trim() && !audioData) {
      showWarningToast('Conteúdo obrigatório', 'Digite uma anotação ou grave um áudio antes de salvar');
      return;
    }

    setIsSaving(true);
    
    try {
      // Log simplificado apenas em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('💾 [SaveAnnotation] Salvando:', {
          leadId: leadId?.substring(0, 8),
          hasText: content.trim().length > 0,
          hasAudio: !!audioData
        });
      }

      // AIDEV-NOTE: Preparar dados com validação corrigida para áudio puro
      const hasText = content.trim().length > 0;
      const hasAudio = !!audioData;
      
      // AIDEV-NOTE: Para áudio puro, enviar null ao invés de string vazia
      const textContent = content.trim();
      
      const annotationData: CreateAnnotation = {
        content: textContent.length > 0 ? textContent : null as any, // null para áudio puro
        content_plain: textContent.length > 0 ? textContent : null as any, // null para áudio puro
        ...(leadType === 'pipeline_lead' 
          ? { pipeline_lead_id: leadId } 
          : { lead_master_id: leadId }
        ),
        // Incluir dados de áudio se houver
        ...(audioData && {
          audio_file_url: audioData.url,
          audio_file_name: audioData.fileName,
          audio_duration: audioData.duration
        }),
        // Definir content_type baseado no conteúdo
        content_type: hasText && hasAudio ? 'mixed' : hasAudio ? 'audio' : 'text'
      };

      // Log detalhado apenas se necessário para debug
      // Removido para reduzir spam no console

      await createMutation.mutateAsync(annotationData);
      
      // Limpar formulário
      setContent('');
      setAudioData(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Callback para atualizar timeline
      onSave();
      
      showSuccessToast(
        '📝 Anotação salva',
        audioData ? 'Anotação com áudio salva com sucesso' : 'Anotação de texto salva com sucesso'
      );
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar anotação:', error);
      
      // Mensagem de erro mais específica baseada no status
      let errorTitle = 'Erro ao salvar';
      let errorMessage = 'Erro ao salvar anotação. Tente novamente.';
      
      if (error.response?.status === 400) {
        errorTitle = 'Dados inválidos';
        errorMessage = error.response?.data?.message || 'Dados da anotação são inválidos. Verifique os campos.';
      } else if (error.response?.status === 403) {
        errorTitle = 'Acesso negado';
        errorMessage = 'Você não tem permissão para salvar anotações neste lead.';
      } else if (error.response?.status === 404) {
        errorTitle = 'Lead não encontrado';
        errorMessage = 'O lead não foi encontrado. Recarregue a página e tente novamente.';
      } else if (error.response?.status === 500) {
        errorTitle = 'Erro interno';
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns instantes.';
      } else if (!error.response) {
        errorTitle = 'Erro de conexão';
        errorMessage = 'Verifique sua conexão com a internet e tente novamente.';
      }
      
      showErrorToast(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // ✨ FUNÇÃO AUXILIAR SIMPLIFICADA
  const formatSimpleTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Obter iniciais do usuário para avatar
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'DA';
  };

  // AIDEV-NOTE: Função para remover áudio gravado
  const removeAudio = useCallback(() => {
    setAudioData(null);
    showInfoToast('🗑️ Áudio removido', 'A gravação foi removida da anotação');
  }, []);


  return (
    <>
      {/* CSS para animação suave de gravação */}
      <style>{`
        @keyframes gentle-glow {
          0%, 100% { 
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.5);
          }
        }
      `}</style>
      
      <div className="bg-white border border-gray-200 rounded-lg">
      {/* Body - Avatar + Textarea */}
      <div className="p-4 flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getUserInitials()}
          </div>
        </div>
        
        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            placeholder={audioData ? 'Adicione um comentário ao áudio (opcional)...' : 'Digite uma anotação ou grave um áudio...'}
            className="w-full resize-none border-0 outline-none text-gray-900 placeholder-gray-400 text-sm"
            style={{ minHeight: '20px', maxHeight: '120px' }}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Footer - Controles Simplificados */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          {/* Contador de tempo quando gravando */}
          <div className="flex-1">
            {isRecording && (
              <span className="text-sm text-gray-600 font-mono">
                ⏱️ {formatSimpleTime(recordingDuration)}
              </span>
            )}
          </div>
          
          {/* Controles à direita */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* AIDEV-NOTE: AudioPlayer integrado na linha dos controles */}
            {audioData && (
              <>
                {/* Player de áudio minimalista */}
                <AudioPlayer
                  audioUrl={audioData.url}
                  fileName={audioData.fileName}
                  duration={audioData.duration}
                  fileSize={audioData.size}
                  compact={true}
                  showDetails={false}
                  className="bg-gray-50 border border-gray-200 shadow-sm max-w-xs"
                />
                
                {/* Botão para remover áudio */}
                <button
                  onClick={removeAudio}
                  className="group p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:scale-105 transition-all duration-150 flex-shrink-0"
                  title="Remover áudio"
                >
                  <X className="w-3 h-3 group-hover:rotate-45 transition-transform duration-150" />
                </button>
              </>
            )}
            
            {/* ✅ Botão Microfone/Parar com indicadores de permissão */}
          <button
            onClick={toggleRecording}
            disabled={isSaving || isUploadingAudio || permissionState === 'error'}
            className={`p-2 rounded-full transition-all duration-200 ${
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : isUploadingAudio
                ? 'bg-blue-100 text-blue-600'
                : permissionState === 'denied'
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                : permissionState === 'error'
                ? 'bg-red-100 text-red-400 cursor-not-allowed'
                : permissionState === 'granted'
                ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:scale-105'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:scale-105'
            }`}
            style={
              isRecording
                ? {
                    boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.3)',
                    animation: 'gentle-glow 2s ease-in-out infinite'
                  }
                : {}
            }
            title={
              isRecording 
                ? 'Parar gravação'
                : isUploadingAudio 
                ? 'Enviando áudio...' 
                : permissionState === 'denied'
                ? 'Permissão negada - clique para tentar novamente'
                : permissionState === 'error'
                ? permissionError
                : permissionState === 'granted'
                ? 'Microfone pronto - clique para gravar'
                : 'Clique para permitir acesso ao microfone'
            }
          >
            {isUploadingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <Square className="w-4 h-4" />
            ) : permissionState === 'denied' ? (
              <MicOff className="w-4 h-4" />
            ) : permissionState === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

            {/* Botão Salvar */}
            <button
              onClick={handleSave}
              disabled={(!content.trim() && !audioData) || isSaving || isUploadingAudio}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
        
        {/* ✅ Mensagem de erro de permissão */}
        {permissionState === 'denied' && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-700 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              {permissionError}
            </p>
          </div>
        )}
        
        {permissionState === 'error' && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              {permissionError}
            </p>
          </div>
        )}
      </div>
      </div>
    </>
  );
};