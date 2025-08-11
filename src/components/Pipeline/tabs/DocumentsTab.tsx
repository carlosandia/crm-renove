// =====================================================================================
// COMPONENT: DocumentsTab
// Descrição: Aba de documentos para o LeadDetailsModal com upload de arquivos
// =====================================================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  AlertCircle, 
  CheckCircle,
  X,
  Image,
  FileSpreadsheet,
  File
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Alert } from '../../ui/alert';
import Uploady, { 
  useItemProgressListener, 
  useItemFinishListener, 
  useItemErrorListener,
  useBatchErrorListener,
  useRequestPreSend,
  useUploady
} from "@rpldy/uploady";
import UploadDropZone from "@rpldy/upload-drop-zone";
import UploadButton, { asUploadButton } from "@rpldy/upload-button";
import { Lead } from '../../../types/Pipeline';
import { useUploadLogger, formatFileSize } from '../../../hooks/useUploadLogger';
import { validateUploadFile, validateFileBatch } from '../../../utils/uploadValidators';

interface DocumentsTabProps {
  lead: Lead;
  pipelineId: string;
}

interface LeadDocument {
  id: string;
  lead_id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  uploaded_by: string;
  tenant_id: string;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// ============================================
// SISTEMA DE DEBUGGING E VALIDAÇÃO ESTRUTURADO
// ============================================

// ============================================
// COMPONENTE INTERNO: UploadHandlers
// Este componente deve ficar DENTRO do contexto Uploady
// ============================================

interface UploadHandlersProps {
  setUploadProgress: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  loadDocuments: () => void;
}

// ✅ MEMOIZAÇÃO do componente UploadHandlers para evitar re-criações
const UploadHandlers = React.memo<UploadHandlersProps>(({ 
  setUploadProgress, 
  setError, 
  setSuccess, 
  setUploading, 
  loadDocuments 
}) => {
  const logger = useUploadLogger('UploadHandlers');

  // ✅ VALIDAÇÃO PRÉ-UPLOAD ROBUSTA com useRequestPreSend - MEMOIZADA
  const handleRequestPreSend = useCallback(({ items, options }) => {
    logger.info('Iniciando validação pré-upload', { 
      itemCount: items.length, 
      destination: options.destination?.url 
    });

    // Extrair arquivos dos items (converter FileLike para File)
    const files = items.map(item => item.file as File);
    
    // Validação do lote de arquivos
    const batchValidation = validateFileBatch(files);
    if (!batchValidation.isValid) {
      logger.error('Lote de arquivos rejeitado', { error: batchValidation.error });
      setError(batchValidation.error || 'Erro na validação do lote de arquivos');
      return false; // Cancela o upload
    }

    // Validar cada arquivo individualmente
    for (const item of items) {
      const file = item.file as File;
      const validation = validateUploadFile(file);
      
      logger.info('Validando arquivo', validation.details);

      if (!validation.isValid) {
        logger.error('Arquivo rejeitado na validação', { 
          fileName: file.name, 
          error: validation.error 
        });
        setError(validation.error || 'Erro na validação do arquivo');
        return false; // Cancela o upload
      }
    }

    logger.success('Validação pré-upload concluída com sucesso');
    setUploading(true);
    
    // Retorna undefined para permitir o upload normal
    return undefined;
  }, [logger, setError, setUploading]);
  
  useRequestPreSend(handleRequestPreSend);

  // ✅ LISTENER DE ERROS DE BATCH - MEMOIZADO
  const handleBatchError = useCallback((batch) => {
    logger.error('Erro no batch de upload', {
      batchId: batch.id,
      itemCount: batch.items?.length || 0,
      error: batch.additionalInfo
    });
    
    setError('Erro no lote de arquivos. Tente novamente.');
    setUploading(false);
    setTimeout(() => setError(null), 5000);
  }, [logger, setError, setUploading]);
  
  useBatchErrorListener(handleBatchError);

  // ✅ LISTENER DE PROGRESSO otimizado - MEMOIZADO
  const handleItemProgress = useCallback((item) => {
    logger.info('Progresso do upload', { 
      id: item.id, 
      completed: item.completed,
      fileName: item.file?.name 
    });
    
    setUploadProgress(prev => ({
      ...prev,
      [item.id]: item.completed
    }));
  }, [logger, setUploadProgress]);
  
  useItemProgressListener(handleItemProgress);

  // ✅ LISTENER DE CONCLUSÃO otimizado - MEMOIZADO
  const handleItemFinish = useCallback((item) => {
    // ✅ CORREÇÃO: Logs detalhados para debugging
    logger.success('Upload finalizado - análise detalhada', { 
      id: item.id, 
      fileName: item.file?.name,
      uploadStatus: item.uploadStatus,
      hasResponse: !!item.uploadResponse,
      responseType: typeof item.uploadResponse,
      responseKeys: item.uploadResponse ? Object.keys(item.uploadResponse) : [],
      fullResponse: item.uploadResponse
    });
    
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[item.id];
      return newProgress;
    });
    
    // ✅ CORREÇÃO: Lógica melhorada para detecção de sucesso
    const isSuccess = 
      item.uploadStatus === 'finished' || // Status finished indica sucesso
      item.uploadResponse?.success === true || // Response explícita de sucesso
      (item.uploadResponse && !item.uploadResponse.error); // Response existe e não tem erro
    
    if (isSuccess) {
      setSuccess('Arquivo enviado com sucesso!');
      logger.success('Upload bem-sucedido - recarregando lista de documentos', {
        detectionReason: item.uploadStatus === 'finished' ? 'status finished' : 
                        item.uploadResponse?.success ? 'response.success true' : 'no error detected'
      });
      loadDocuments(); // ✅ CORREÇÃO: Sempre recarregar lista em caso de sucesso
      setTimeout(() => setSuccess(null), 3000);
    } else {
      logger.warning('Upload finalizado mas sem confirmação de sucesso', {
        uploadStatus: item.uploadStatus,
        hasResponse: !!item.uploadResponse,
        responseSuccess: item.uploadResponse?.success,
        responseError: item.uploadResponse?.error
      });
    }
    
    setUploading(false);
  }, [logger, setUploadProgress, setSuccess, setUploading, loadDocuments]);
  
  useItemFinishListener(handleItemFinish);

  // ✅ LISTENER DE ERRO DE ITEM otimizado - MEMOIZADO
  const handleItemError = useCallback((item) => {
    logger.error('Erro no upload do item', { 
      id: item.id, 
      fileName: item.file?.name,
      error: item.uploadResponse,
      status: item.uploadStatus
    });
    
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[item.id];
      return newProgress;
    });
    
    // Tratamento de erro mais detalhado
    let errorMsg = 'Erro ao enviar arquivo';
    
    if (item.uploadResponse?.error) {
      errorMsg = item.uploadResponse.error;
    } else if (item.uploadResponse?.message) {
      errorMsg = item.uploadResponse.message;
    } else if (item.uploadStatus === 'error') {
      errorMsg = `Erro ao enviar "${item.file?.name || 'arquivo'}"`;
    }
    
    setError(errorMsg);
    setTimeout(() => setError(null), 5000);
    setUploading(false);
  }, [logger, setUploadProgress, setError, setUploading]);
  
  useItemErrorListener(handleItemError);

  return null; // Este componente não renderiza nada, apenas gerencia os eventos
}, (prevProps, nextProps) => {
  // ✅ CORREÇÃO: Função de comparação customizada para React.memo evitar warning "Expected static flag was missing"
  return (
    prevProps.setUploadProgress === nextProps.setUploadProgress &&
    prevProps.setError === nextProps.setError &&
    prevProps.setSuccess === nextProps.setSuccess &&
    prevProps.setUploading === nextProps.setUploading &&
    prevProps.loadDocuments === nextProps.loadDocuments
  );
});

// ============================================
// COMPONENTE MANUALUPLOADTRIGGER REMOVIDO
// Mantendo apenas um botão de upload (o azul integrado no DropZone)
// ============================================

const DocumentsTab: React.FC<DocumentsTabProps> = ({ lead, pipelineId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ============================================
  // CONFIGURAÇÕES DE UPLOAD
  // ============================================

  const logger = useUploadLogger('DocumentsTab');

  // ✅ CORREÇÃO FASE 3: Usar token diretamente do AuthProvider, sem estado adicional
  const currentToken = user?.token || '';

  // ✅ CONFIGURAÇÃO DE UPLOAD otimizada e segura - token direto do AuthProvider
  const uploadDestination = useMemo(() => {
    const config = {
      url: `${import.meta.env.VITE_API_URL}/leads/${lead.id}/documents`,
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'tenant-id': user?.tenant_id || ''
        // Content-Type será definido automaticamente pelo React-Uploady para multipart/form-data
      }
    };
    
    // Upload destination configurado (log removido para reduzir verbosidade)
    
    return config;
  }, [lead.id, currentToken, user?.tenant_id, logger]);

  // ✅ Configuração de upload simplificada (logs reduzidos para melhor performance)

  // ============================================
  // FUNÇÕES DE CARREGAMENTO E GERENCIAMENTO
  // ============================================

  const loadDocuments = useCallback(async () => {
    if (!lead?.id || !user?.tenant_id) {
      logger.warning('Tentativa de carregar documentos sem lead ID ou tenant ID');
      return;
    }

    try {
      setLoading(true);
      logger.info('Carregando documentos do lead', { leadId: lead.id });
      
      const { data, error } = await supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('tenant_id', (user as any)?.user_metadata?.tenant_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const documentsList = data || [];
        setDocuments(documentsList);
        logger.success('Documentos carregados com sucesso', { count: documentsList.length });
      } else {
        logger.error('Erro ao carregar documentos', { error });
        setError(`Erro ao carregar documentos: ${error?.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      logger.error('Exceção ao carregar documentos', error);
      setError('Erro de conexão ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, [lead?.id, user, logger, setError]);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) {
      logger.info('Exclusão de documento cancelada pelo usuário');
      return;
    }

    try {
      logger.info('Iniciando exclusão de documento', { documentId });
      
      const { error } = await supabase
        .from('lead_documents')
        .update({ is_active: false })
        .eq('id', documentId)
        .eq('tenant_id', (user as any)?.user_metadata?.tenant_id);

      if (!error) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        setSuccess('Documento excluído com sucesso!');
        logger.success('Documento excluído com sucesso', { documentId });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        logger.error('Erro ao excluir documento', { documentId, error });
        setError(`Erro ao excluir documento: ${error.message}`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      logger.error('Exceção ao excluir documento', { documentId, error });
      setError('Erro de conexão ao excluir documento');
      setTimeout(() => setError(null), 3000);
    }
  }, [lead.id, user, logger, setError, setSuccess]);

  const downloadDocument = useCallback(async (document: LeadDocument) => {
    try {
      logger.info('Iniciando download de documento', { 
        documentId: document.id, 
        fileName: document.original_name 
      });
      
      const { data: fileData, error } = await supabase
        .storage
        .from(document.storage_bucket)
        .download(document.storage_path);
      
      if (!error && fileData) {
        const url = window.URL.createObjectURL(fileData);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.original_name;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
        
        logger.success('Download concluído com sucesso', { fileName: document.original_name });
      } else {
        logger.error('Erro ao baixar documento', { 
          documentId: document.id, 
          error
        });
        setError(`Erro ao baixar documento: ${error?.message || 'Erro desconhecido'}`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      logger.error('Exceção ao baixar documento', { documentId: document.id, error });
      setError('Erro de conexão ao baixar documento');
      setTimeout(() => setError(null), 3000);
    }
  }, [lead.id, logger, setError]);

  // ============================================
  // HELPERS DE RENDERIZAÇÃO
  // ============================================

  const getFileIcon = useCallback((extension: string) => {
    switch (extension.toLowerCase()) {
      case '.jpg':
      case '.jpeg':
      case '.png':
        return <Image className="w-8 h-8 text-blue-500" />;
      case '.pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case '.csv':
      case '.xlsx':
      case '.xls':
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // ============================================
  // FUNÇÕES UTILITÁRIAS OTIMIZADAS
  // ============================================

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ============================================
  // RENDER - MEMOIZADO PARA EVITAR RE-RENDERS
  // ============================================
  
  // onFileInput removido - não necessário com asUploadButton HOC
  
  // ✅ COMPONENTE INTERNO: ClickableUploadArea - usa asUploadButton HOC para tornar toda área clicável
  const ClickableUploadArea = React.memo(() => {
    // Criar um componente clicável usando asUploadButton HOC
    const ClickableDiv = asUploadButton(React.forwardRef<HTMLDivElement, any>((props, ref) => {
      // Log removido para reduzir verbosidade - clique detectado automaticamente
      return (
        <div 
          {...props}
          ref={ref}
          className="absolute inset-0 cursor-pointer z-10 [&::before]:hidden [&::after]:hidden [&>*]:hidden"
          title="Clique para selecionar arquivos ou arraste aqui"
          style={{
            // Ocultar qualquer texto gerado automaticamente pelo asUploadButton
            fontSize: 0,
            color: 'transparent',
            textIndent: '-9999px',
            overflow: 'hidden',
            lineHeight: 0
          }}
        />
      );
    }));
    
    return (
      <div className="relative">
        {/* Overlay clicável usando asUploadButton HOC */}
        <ClickableDiv />
        
        {/* DropZone para drag & drop (sem onClick) */}
        <UploadDropZone
          {...dropZoneConfig}
        >
          <div className="flex flex-col items-center space-y-4">
            <Upload className="w-10 h-10 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                Arraste arquivos aqui ou clique para selecionar
              </p>
            </div>
          </div>
        </UploadDropZone>
      </div>
    );
  });
  
  // ✅ FASE 4: Memoizar configurações estáticas do UploadDropZone
  const dropZoneConfig = useMemo(() => ({
    onDragOverClassName: "border-blue-400 bg-blue-50",
    className: "border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer",
    htmlDirProps: { 
      style: { cursor: 'pointer' } 
    }
  }), []);
  
  // ✅ CONFIGURAÇÃO FIXA do Uploady para evitar re-renders
  const uploadyConfig = useMemo(() => ({
    destination: uploadDestination,
    multiple: true,
    autoUpload: true,
    debug: false // Desabilitado para reduzir logs verbosos
  }), [uploadDestination]);

  // ✅ CORREÇÃO CRÍTICA: Usar useCallback para função que retorna JSX, não useMemo
  const renderUploadZone = useCallback(() => (
    <Uploady {...uploadyConfig}>
      {/* ✅ CORREÇÃO CRÍTICA: UploadHandlers agora está DENTRO do contexto Uploady */}
      <UploadHandlers
        setUploadProgress={setUploadProgress}
        setError={setError}
        setSuccess={setSuccess}
        setUploading={setUploading}
        loadDocuments={loadDocuments}
      />
      
      {/* ✅ NOVO: Componente ClickableUploadArea - toda área é clicável usando asUploadButton HOC */}
      <ClickableUploadArea />
      
      {/* Progress indicators otimizados */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([itemId, progress]) => (
            <div key={itemId} className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress)}%` }}
              />
              <span className="text-xs text-gray-500 mt-1 block">
                {Math.round(progress)}% completo
              </span>
            </div>
          ))}
        </div>
      )}
    </Uploady>
  ), [uploadyConfig, setUploadProgress, setError, setSuccess, setUploading, loadDocuments, logger]);
  // ✅ FASE 4: uploadProgress removido + dropZoneConfig adicionado para otimização

  // ✅ FASE 4: Memoizar renderDocumentsList para evitar re-renders
  const renderDocumentsList = useCallback(() => (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum documento enviado ainda</p>
          <p className="text-sm mt-1">Use a área de upload acima para enviar arquivos</p>
        </div>
      ) : (
        documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3 flex-1">
              {getFileIcon(doc.file_extension)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate" title={doc.original_name}>
                  {doc.original_name}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadDocument(doc)}
                className="text-blue-600 hover:text-blue-700"
                title="Baixar documento"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteDocument(doc.id)}
                className="text-red-600 hover:text-red-700"
                title="Excluir documento"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  ), [documents, getFileIcon, formatFileSize, formatDate, downloadDocument, deleteDocument]);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Documentos do Lead
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {success && (
        <Alert className="flex items-center justify-start space-x-3 border-green-200 bg-green-50">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 leading-5">{success}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSuccess(null)}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      <div>
        {renderUploadZone()}
      </div>

      {/* Documents List */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Documentos Existentes</h4>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Carregando documentos...</p>
          </div>
        ) : (
          renderDocumentsList()
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;