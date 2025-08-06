// =====================================================================================
// ROUTES: Lead Documents - Sistema de upload e gerenciamento de documentos
// Autor: Claude (Arquiteto Sênior)
// Descrição: API para upload, download, listagem e exclusão de documentos de leads
// =====================================================================================

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth';
import supabase from '../config/supabase';

const router = express.Router();

// =====================================================================================
// CONFIGURAÇÃO DO MULTER PARA UPLOAD
// =====================================================================================

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 [MULTER] Processando arquivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname
    });
    
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      console.log('❌ [MULTER] Tipo de arquivo rejeitado:', extension);
      return cb(new Error(`Tipo de arquivo não permitido. Use: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
    
    console.log('✅ [MULTER] Arquivo aprovado:', extension);
    cb(null, true);
  }
});

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

const generateFileName = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();
  const uuid = uuidv4();
  return `${uuid}${extension}`;
};

const generateStoragePath = (tenantId: string, leadId: string, fileName: string): string => {
  return `${tenantId}/${leadId}/${fileName}`;
};

const validateUser = (req: any): { userId: string; tenantId: string; role: string } => {
  // ✅ FASE 1: DEBUG LOGS - Diagnóstico detalhado do usuário
  console.log('🔍 [VALIDATE USER] Dados recebidos:', {
    hasUser: !!req.user,
    userType: typeof req.user,
    userKeys: req.user ? Object.keys(req.user) : [],
    rawUser: req.user ? JSON.stringify(req.user, null, 2).substring(0, 300) + '...' : 'undefined'
  });
  
  if (!req.user) {
    console.log('❌ [VALIDATE USER] req.user é undefined/null');
    throw new Error('Usuário não autenticado - req.user não definido');
  }
  
  const missingFields = [];
  if (!req.user.id) missingFields.push('id');
  if (!req.user.tenant_id) missingFields.push('tenant_id');
  if (!req.user.role) missingFields.push('role');
  
  if (missingFields.length > 0) {
    console.log('❌ [VALIDATE USER] Campos obrigatórios ausentes:', {
      missingFields,
      presentFields: Object.keys(req.user),
      values: {
        id: req.user.id,
        tenant_id: req.user.tenant_id,
        role: req.user.role
      }
    });
    throw new Error(`Usuário não autenticado ou dados incompletos. Campos ausentes: ${missingFields.join(', ')}`);
  }
  
  console.log('✅ [VALIDATE USER] Validação bem-sucedida');
  return {
    userId: req.user.id,
    tenantId: req.user.tenant_id,
    role: req.user.role
  };
};

// =====================================================================================
// ROUTES
// =====================================================================================

/**
 * POST /leads/:leadId/documents
 * Upload de documentos para um lead
 */
// ✅ CORREÇÃO CRÍTICA: Middleware de tratamento de erro do multer
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  console.log('❌ [MULTER ERROR] Erro no processamento do arquivo:', {
    error: err.message,
    code: err.code,
    field: err.field,
    timestamp: new Date().toISOString()
  });

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo muito grande. Tamanho máximo: 10MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Campo de arquivo inesperado'
      });
    }
  }

  return res.status(400).json({
    success: false,
    error: err.message || 'Erro no processamento do arquivo'
  });
};

// ✅ ROTA DE TESTE REMOVIDA - Debug concluído com sucesso

router.post('/leads/:leadId/documents', authenticateToken, (req, res, next) => {
  console.log('🚨 [PRE-MULTER] Iniciando processamento de upload:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });

  upload.single('file')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  // ✅ CORREÇÃO CRÍTICA: Logs DEPOIS do multer
  console.log('🚨 [ROUTE ENTRY] Rota de upload atingida após multer!', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    params: req.params,
    hasFile: !!req.file,
    hasUser: !!req.user,
    fileName: req.file?.originalname,
    fileSize: req.file?.size
  });

  try {
    const { leadId } = req.params;
    const file = req.file;
    
    // ✅ FASE 1: DEBUG LOGS - Diagnóstico inicial
    console.log('🔍 [UPLOAD DEBUG] Iniciando upload de documento:', {
      timestamp: new Date().toISOString(),
      leadId: leadId?.substring(0, 8) + '...',
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype,
      hasUser: !!req.user,
      userFields: req.user ? Object.keys(req.user) : 'undefined',
      headers: {
        authorization: !!req.headers.authorization,
        'tenant-id': req.headers['tenant-id']
      }
    });
    
    if (!file) {
      console.log('❌ [UPLOAD DEBUG] Erro: Nenhum arquivo enviado');
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    console.log('🔍 [UPLOAD DEBUG] Validando usuário...');
    const { userId, tenantId, role } = validateUser(req);
    console.log('✅ [UPLOAD DEBUG] Usuário validado:', {
      userId: userId?.substring(0, 8) + '...',
      tenantId: tenantId?.substring(0, 8) + '...',
      role
    });

    // ✅ CORREÇÃO: Usar userSupabase para consistência com RLS
    console.log('🔍 [UPLOAD DEBUG] Verificando se lead existe usando RLS...', {
      leadId: leadId?.substring(0, 8) + '...',
      tenantId: tenantId?.substring(0, 8) + '...',
      userSupabaseConfigured: !!(req as any).userSupabase
    });

    const userSupabase = (req as any).userSupabase;
    if (!userSupabase) {
      console.error('❌ [UPLOAD] Cliente Supabase do usuário não encontrado para verificação de lead');
      return res.status(500).json({
        success: false,
        error: 'Erro interno: Cliente de autenticação não configurado'
      });
    }

    const { data: lead, error: leadError } = await userSupabase
      .from('pipeline_leads')
      .select('id, tenant_id')
      .eq('id', leadId)
      .single();

    console.log('🔍 [UPLOAD DEBUG] Resultado da query de lead:', {
      hasData: !!lead,
      hasError: !!leadError,
      leadData: lead ? {
        id: lead.id?.substring(0, 8) + '...',
        tenant_id: lead.tenant_id?.substring(0, 8) + '...'
      } : null,
      errorDetails: leadError ? {
        code: leadError.code,
        message: leadError.message,
        details: leadError.details,
        hint: leadError.hint
      } : null
    });

    if (leadError || !lead) {
      console.log('❌ [UPLOAD DEBUG] Lead não encontrado ou erro na query:', {
        leadError: leadError ? leadError.message : 'No error',
        hasLead: !!lead,
        queryParams: { leadId, tenantId: tenantId?.substring(0, 8) + '...' }
      });
      return res.status(404).json({
        success: false,
        error: 'Lead não encontrado ou sem permissão'
      });
    }

    console.log('✅ [UPLOAD DEBUG] Lead encontrado e validado com sucesso');

    // ✅ FASE 1: DEBUG LOGS - Preparação do arquivo
    const fileName = generateFileName(file.originalname);
    const storagePath = generateStoragePath(tenantId, leadId, fileName);
    const extension = path.extname(file.originalname).toLowerCase();

    console.log('🔍 [UPLOAD DEBUG] Preparando upload do arquivo:', {
      originalName: file.originalname,
      fileName,
      storagePath,
      extension,
      fileSize: file.size,
      mimeType: file.mimetype,
      bufferSize: file.buffer?.length || 0
    });

    // ✅ FASE 1: DEBUG LOGS - Upload para Supabase Storage
    console.log('🔍 [UPLOAD DEBUG] Iniciando upload para Supabase Storage...', {
      bucket: 'lead-documents',
      storagePath,
      contentType: file.mimetype,
      hasBuffer: !!file.buffer,
      bufferSize: file.buffer?.length || 0,
      supabaseClient: typeof supabase,
      storageMethod: typeof supabase.storage
    });

    // ✅ CORREÇÃO CRÍTICA: Adicionar timeout e logs detalhados
    console.log('🔍 [UPLOAD DEBUG] Chamando supabase.storage.from().upload()...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lead-documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
    
    console.log('🔍 [UPLOAD DEBUG] Upload para Storage finalizado:', {
      hasData: !!uploadData,
      hasError: !!uploadError,
      timestamp: new Date().toISOString()
    });

    console.log('🔍 [UPLOAD DEBUG] Resultado do upload Supabase Storage:', {
      hasData: !!uploadData,
      hasError: !!uploadError,
      uploadData: uploadData ? {
        path: uploadData.path,
        id: uploadData.id,
        fullPath: uploadData.fullPath
      } : null,
      uploadError: uploadError ? {
        name: uploadError.name,
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      } : null
    });

    if (uploadError) {
      console.error('❌ [UPLOAD DEBUG] Erro no upload para Supabase Storage:', {
        errorName: uploadError.name,
        errorMessage: uploadError.message,
        statusCode: uploadError.statusCode,
        errorDetails: uploadError
      });
      return res.status(500).json({
        success: false,
        error: 'Erro ao fazer upload do arquivo'
      });
    }

    console.log('✅ [UPLOAD DEBUG] Upload para Storage concluído com sucesso');

    // ✅ FASE 1: DEBUG LOGS - Preparação dos metadados para banco
    const documentMetadata = {
      lead_id: leadId,
      file_name: fileName,
      original_name: file.originalname,
      file_type: file.mimetype,
      file_extension: extension,
      file_size: file.size,
      storage_path: storagePath,
      storage_bucket: 'lead-documents',
      uploaded_by: userId,
      tenant_id: tenantId,
      is_active: true,
      metadata: {
        uploaded_at: new Date().toISOString(),
        user_agent: req.headers['user-agent'] || 'unknown'
      }
    };

    console.log('🔍 [UPLOAD DEBUG] Salvando metadados no banco:', {
      lead_id: leadId?.substring(0, 8) + '...',
      file_name: fileName,
      original_name: file.originalname,
      file_size: file.size,
      uploaded_by: userId?.substring(0, 8) + '...',
      tenant_id: tenantId?.substring(0, 8) + '...',
      table: 'lead_documents'
    });

    // ✅ userSupabase já foi validado anteriormente
    // Removido duplicação de validação

    const { data: document, error: dbError } = await userSupabase
      .from('lead_documents')
      .insert(documentMetadata)
      .select()
      .single();

    console.log('🔍 [UPLOAD DEBUG] Resultado da inserção no banco:', {
      hasData: !!document,
      hasError: !!dbError,
      documentId: document?.id,
      dbError: dbError ? {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      } : null
    });

    if (dbError) {
      console.error('❌ [UPLOAD DEBUG] Erro ao salvar metadados no banco:', {
        errorCode: dbError.code,
        errorMessage: dbError.message,
        errorDetails: dbError.details,
        errorHint: dbError.hint,
        fullError: dbError
      });
      
      // ✅ FASE 1: DEBUG LOGS - Limpeza do storage em caso de erro
      console.log('🔍 [UPLOAD DEBUG] Tentando limpar arquivo do storage...');
      const { error: removeError } = await supabase.storage
        .from('lead-documents')
        .remove([storagePath]);
        
      if (removeError) {
        console.error('❌ [UPLOAD DEBUG] Erro ao limpar storage:', removeError);
      } else {
        console.log('✅ [UPLOAD DEBUG] Arquivo removido do storage com sucesso');
      }
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar informações do documento'
      });
    }

    console.log('✅ [UPLOAD DEBUG] Metadados salvos no banco com sucesso');

    // ✅ FASE 1: DEBUG LOGS - Resposta final
    const responseData = {
      success: true,
      message: 'Documento enviado com sucesso',
      document
    };

    console.log('🔍 [UPLOAD DEBUG] Enviando resposta de sucesso:', {
      status: 201,
      documentId: document?.id,
      hasDocument: !!document,
      responseSize: JSON.stringify(responseData).length
    });

    res.status(201).json(responseData);

    console.log('✅ [UPLOAD DEBUG] Upload completo finalizado com sucesso!');

  } catch (error: any) {
    console.error('❌ [UPLOAD DEBUG] ERRO CRÍTICO no upload de documento:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500) + '...',
      fullError: error
    });
    
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /leads/:leadId/documents
 * Listar documentos de um lead
 */
router.get('/leads/:leadId/documents', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { userId, tenantId, role } = validateUser(req);

    // Verificar se o lead existe e pertence ao tenant
    const { data: lead, error: leadError } = await supabase
      .from('pipeline_leads')
      .select('id, tenant_id')
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead não encontrado ou sem permissão'
      });
    }

    // ✅ CORREÇÃO: Usar cliente RLS do usuário para query
    const userSupabase = (req as any).userSupabase;
    if (!userSupabase) {
      console.error('❌ [GET] Cliente Supabase do usuário não encontrado');
      return res.status(500).json({
        success: false,
        error: 'Erro interno: Cliente de autenticação não configurado'
      });
    }

    // Buscar documentos do lead usando RLS
    const { data: documents, error: documentsError } = await userSupabase
      .from('lead_documents')
      .select('*')
      .eq('lead_id', leadId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('Erro ao buscar documentos:', documentsError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao carregar documentos'
      });
    }

    res.json({
      success: true,
      documents: documents || []
    });

  } catch (error: any) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /leads/:leadId/documents/:documentId/download
 * Download de um documento específico
 */
router.get('/leads/:leadId/documents/:documentId/download', authenticateToken, async (req, res) => {
  try {
    const { leadId, documentId } = req.params;
    const { userId, tenantId, role } = validateUser(req);

    // ✅ CORREÇÃO: Usar cliente RLS do usuário
    const userSupabase = (req as any).userSupabase;
    if (!userSupabase) {
      console.error('❌ [DOWNLOAD] Cliente Supabase do usuário não encontrado');
      return res.status(500).json({
        success: false,
        error: 'Erro interno: Cliente de autenticação não configurado'
      });
    }

    // Buscar o documento usando RLS
    const { data: document, error: docError } = await userSupabase
      .from('lead_documents')
      .select('*')
      .eq('id', documentId)
      .eq('lead_id', leadId)
      .eq('is_active', true)
      .single();

    if (docError || !document) {
      return res.status(404).json({
        success: false,
        error: 'Documento não encontrado'
      });
    }

    // Download do Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('lead-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error('Erro no download:', downloadError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao baixar documento'
      });
    }

    // Configurar headers para download
    res.set({
      'Content-Type': document.file_type,
      'Content-Disposition': `attachment; filename="${document.original_name}"`,
      'Content-Length': document.file_size.toString()
    });

    // Converter Blob para Buffer e enviar
    const buffer = await fileData.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error: any) {
    console.error('Erro no download de documento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /leads/:leadId/documents/:documentId
 * Excluir um documento
 */
router.delete('/leads/:leadId/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const { leadId, documentId } = req.params;
    const { userId, tenantId, role } = validateUser(req);

    // ✅ CORREÇÃO: Usar cliente RLS do usuário
    const userSupabase = (req as any).userSupabase;
    if (!userSupabase) {
      console.error('❌ [DELETE] Cliente Supabase do usuário não encontrado');
      return res.status(500).json({
        success: false,
        error: 'Erro interno: Cliente de autenticação não configurado'
      });
    }

    // Buscar o documento usando RLS
    const { data: document, error: docError } = await userSupabase
      .from('lead_documents')
      .select('*')
      .eq('id', documentId)
      .eq('lead_id', leadId)
      .eq('is_active', true)
      .single();

    if (docError || !document) {
      return res.status(404).json({
        success: false,
        error: 'Documento não encontrado'
      });
    }

    // Verificar permissões (apenas quem uploadou, admin ou super_admin podem excluir)
    if (document.uploaded_by !== userId && role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Sem permissão para excluir este documento'
      });
    }

    // Marcar como inativo (soft delete) usando RLS
    const { error: updateError } = await userSupabase
      .from('lead_documents')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Erro ao marcar documento como inativo:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao excluir documento'
      });
    }

    // Opcionalmente, remover do storage (comentado para manter histórico)
    /*
    const { error: storageError } = await supabase.storage
      .from('lead-documents')
      .remove([document.storage_path]);
    
    if (storageError) {
      console.error('Erro ao remover arquivo do storage:', storageError);
    }
    */

    res.json({
      success: true,
      message: 'Documento excluído com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

export default router;