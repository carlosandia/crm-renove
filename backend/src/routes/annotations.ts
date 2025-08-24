// =====================================================================================
// ROUTES: Anotações API
// Autor: Claude (Arquiteto Sênior)
// Descrição: Endpoints REST para sistema de anotações com validação Zod
// =====================================================================================

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import AnnotationsService from '../services/annotationsService';
import {
  CreateAnnotationSchema,
  UpdateAnnotationSchema,
  ListAnnotationsQuerySchema
} from '../shared/schemas/annotations';
import multer from 'multer';
import { supabaseAdmin } from '../services/supabase-admin';

const router = Router();

// ✅ CONFIGURAÇÃO MULTER PARA UPLOAD DE ÁUDIO
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 [MULTER-FILTER] Arquivo recebido:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size || 'unknown'
    });
    
    // Validar tipos MIME permitidos
    const allowedMimeTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log('✅ [MULTER-FILTER] Tipo MIME aceito:', file.mimetype);
      cb(null, true);
    } else {
      console.error('❌ [MULTER-FILTER] Tipo MIME rejeitado:', file.mimetype);
      cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
    }
  }
});

// AIDEV-NOTE: Rota de teste para verificar se o registro está funcionando
router.get('/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Rota de anotações funcionando!' });
});

// ===================================
// UPLOAD DE ÁUDIO (ANTES DA AUTENTICAÇÃO GERAL)
// ===================================

/**
 * POST /api/annotations/upload-audio
 * Upload de arquivo de áudio para anotações
 * ✅ CORREÇÃO: Multer processa arquivo ANTES da autenticação interferir
 */
router.post('/upload-audio', upload.single('audio'), authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  console.log('🎵 [POST /api/annotations/upload-audio] Iniciando upload de áudio');
  
  // ✅ LOGS DE DEBUG DETALHADOS
  console.log('🔍 [DEBUG-UPLOAD] Headers recebidos:', {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    authorization: req.headers.authorization ? 'Presente' : 'Ausente'
  });
  
  console.log('🔍 [DEBUG-UPLOAD] Body keys:', Object.keys(req.body));
  console.log('🔍 [DEBUG-UPLOAD] Body content:', req.body);
  console.log('🔍 [DEBUG-UPLOAD] req.file status:', {
    hasFile: !!req.file,
    file: req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'undefined'
  });

  if (!req.file) {
    console.error('❌ [DEBUG-UPLOAD] Multer não encontrou arquivo no campo "audio"');
    return res.status(400).json({
      success: false,
      error: 'Nenhum arquivo de áudio enviado'
    });
  }

  const { leadId, tenantId } = req.body;

  // Validações básicas
  if (!leadId || !tenantId) {
    return res.status(400).json({
      success: false,
      error: 'leadId e tenantId são obrigatórios'
    });
  }

  // Verificar se tenant do usuário bate com o solicitado
  if (req.user!.tenant_id !== tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado: tenant não autorizado'
    });
  }

  try {
    // Gerar nome único do arquivo
    const timestamp = Date.now();
    const fileName = `audio_${leadId}_${timestamp}.webm`;
    const filePath = `annotations/${req.user!.tenant_id}/${req.user!.id}/${fileName}`;

    console.log('🔄 [uploadAudio] Iniciando upload para Supabase Storage:', {
      fileName,
      filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tenantId: req.user!.tenant_id.substring(0, 8),
      userId: req.user!.id.substring(0, 8)
    });

    // Upload para Supabase Storage usando service role
    const { data, error } = await supabaseAdmin.getClient().storage
      .from('lead-audio')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ [uploadAudio] Erro no upload para Supabase:', error);
      return res.status(500).json({
        success: false,
        error: `Erro no upload: ${error.message}`
      });
    }

    // Obter URL pública do arquivo
    const { data: urlData } = supabaseAdmin.getClient().storage
      .from('lead-audio')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerar URL do arquivo'
      });
    }

    // AIDEV-NOTE: Validação rigorosa da URL gerada para prevenir URLs fictícias
    const isValidSupabaseUrl = urlData.publicUrl.startsWith('https://') && 
                              urlData.publicUrl.includes('.supabase.co/storage/') &&
                              !urlData.publicUrl.includes('example.com') &&
                              !urlData.publicUrl.includes('soundjay.com') &&
                              !urlData.publicUrl.includes('localhost');

    if (!isValidSupabaseUrl) {
      console.error('❌ [uploadAudio] URL inválida gerada pelo Supabase:', {
        url: urlData.publicUrl.substring(0, 50),
        isValid: isValidSupabaseUrl
      });
      return res.status(500).json({
        success: false,
        error: 'URL de áudio gerada é inválida'
      });
    }

    console.log('✅ [uploadAudio] Upload realizado com sucesso:', {
      fileName,
      fileSize: req.file.size,
      publicUrl: urlData.publicUrl.substring(0, 50) + '...'
    });

    // Retornar dados do upload
    res.json({
      success: true,
      data: {
        audioUrl: urlData.publicUrl,
        fileName: fileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error: any) {
    console.error('❌ [uploadAudio] Erro interno:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no upload de áudio'
    });
  }
}));

// AIDEV-NOTE: Middleware obrigatório - autenticação e tenant isolation
router.use(authMiddleware);

/**
 * GET /api/annotations
 * Listar anotações (com filtros opcionais)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  console.log('📋 [GET /api/annotations] Listando anotações');

  // Validar query parameters
  const queryParams = ListAnnotationsQuerySchema.parse(req.query);

  // Buscar anotações via service
  const result = await AnnotationsService.getLeadAnnotations(
    '', // leadId vazio para buscar todas as anotações
    req.user!.tenant_id,
    'pipeline_lead',
    queryParams
  );

  res.json({
    success: true,
    data: result.annotations,
    pagination: result.pagination
  });
}));


// ===================================
// CRUD BÁSICO DE ANOTAÇÕES
// ===================================

/**
 * POST /api/annotations
 * Criar nova anotação
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  console.log('📝 [POST /api/annotations] Criando nova anotação');

  // Validar dados de entrada
  const validatedData = CreateAnnotationSchema.parse(req.body);

  // AIDEV-NOTE: Validação adicional para URLs de áudio para prevenir dados fictícios
  if (validatedData.audio_file_url) {
    const isValidAudioUrl = validatedData.audio_file_url.startsWith('https://') && 
                           validatedData.audio_file_url.includes('.supabase.co/storage/') &&
                           !validatedData.audio_file_url.includes('example.com') &&
                           !validatedData.audio_file_url.includes('soundjay.com') &&
                           !validatedData.audio_file_url.includes('localhost');

    if (!isValidAudioUrl) {
      console.error('❌ [POST /annotations] URL de áudio inválida fornecida:', {
        url: validatedData.audio_file_url.substring(0, 50),
        isValid: isValidAudioUrl
      });
      return res.status(400).json({
        success: false,
        error: 'URL de áudio fornecida é inválida. Use apenas URLs do Supabase Storage.'
      });
    }
  }

  // Criar anotação via service
  const annotation = await AnnotationsService.createAnnotation({
    ...validatedData,
    tenant_id: req.user!.tenant_id,
    owner_id: req.user!.id
  });

  res.status(201).json({
    success: true,
    data: annotation
  });
}));

/**
 * GET /api/annotations/lead/:leadId
 * Buscar anotações de um lead específico
 */
router.get('/lead/:leadId', asyncHandler(async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const leadType = req.query.type as 'pipeline_lead' | 'lead_master' || 'pipeline_lead';

  console.log('🔍 [GET /api/annotations/lead/:leadId] Buscando anotações:', {
    leadId: leadId.substring(0, 8),
    leadType,
    query: req.query
  });

  // Validar query parameters
  const filters = ListAnnotationsQuerySchema.parse(req.query);

  // Buscar anotações via service
  const result = await AnnotationsService.getLeadAnnotations(
    leadId,
    req.user!.tenant_id,
    leadType,
    filters
  );

  res.json({
    success: true,
    data: result.annotations,
    pagination: result.pagination
  });
}));

/**
 * GET /api/annotations/:id
 * Buscar anotação específica por ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log('🔍 [GET /api/annotations/:id] Buscando anotação específica:', {
    id: id.substring(0, 8),
    tenantId: req.user!.tenant_id.substring(0, 8)
  });

  // Buscar anotação única via query básica do service
  const result = await AnnotationsService.getLeadAnnotations(
    '', // leadId vazio para buscar por ID da anotação
    req.user!.tenant_id,
    'pipeline_lead',
    { page: 1, limit: 1 }
  );

  // Como não temos método específico para buscar por ID, usar query direta
  const { data: annotation, error } = await (req as any).userSupabase
    .from('annotations')
    .select(`
      *,
      owner:users!annotations_owner_id_fkey(first_name, last_name),
      pipeline_lead:pipeline_leads!annotations_pipeline_lead_id_fkey(
        id,
        stage:pipeline_stages!pipeline_leads_stage_id_fkey(
          name,
          pipeline:pipelines!pipeline_stages_pipeline_id_fkey(name)
        )
      ),
      lead_master:leads_master!annotations_lead_master_id_fkey(
        id, first_name, last_name, email, company
      )
    `)
    .eq('id', id)
    .eq('tenant_id', req.user!.tenant_id)
    .single();

  if (error || !annotation) {
    return res.status(404).json({
      success: false,
      error: 'Anotação não encontrada'
    });
  }

  // Transformar para formato esperado
  const transformedAnnotation = {
    ...annotation,
    owner_name: annotation.owner 
      ? `${annotation.owner.first_name} ${annotation.owner.last_name}`.trim()
      : 'Usuário não encontrado',
    pipeline_lead: annotation.pipeline_lead ? {
      id: annotation.pipeline_lead.id,
      stage_name: annotation.pipeline_lead.stage?.name,
      pipeline_name: annotation.pipeline_lead.stage?.pipeline?.name
    } : undefined,
    lead_master: annotation.lead_master ? {
      id: annotation.lead_master.id,
      first_name: annotation.lead_master.first_name,
      last_name: annotation.lead_master.last_name,
      email: annotation.lead_master.email,
      company: annotation.lead_master.company
    } : undefined
  };

  res.json({
    success: true,
    data: transformedAnnotation
  });
}));

/**
 * PUT /api/annotations/:id
 * Atualizar anotação existente
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log('✏️ [PUT /api/annotations/:id] Atualizando anotação:', {
    id: id.substring(0, 8),
    tenantId: req.user!.tenant_id.substring(0, 8)
  });

  // Validar dados de entrada
  const validatedData = UpdateAnnotationSchema.parse(req.body);

  // Atualizar anotação via service
  const annotation = await AnnotationsService.updateAnnotation(
    id,
    req.user!.tenant_id,
    validatedData
  );

  if (!annotation) {
    return res.status(404).json({
      success: false,
      error: 'Anotação não encontrada'
    });
  }

  res.json({
    success: true,
    data: annotation
  });
}));

/**
 * DELETE /api/annotations/:id
 * Excluir anotação
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log('🗑️ [DELETE /api/annotations/:id] Excluindo anotação:', {
    id: id.substring(0, 8),
    tenantId: req.user!.tenant_id.substring(0, 8)
  });

  // Excluir anotação via service
  const success = await AnnotationsService.deleteAnnotation(
    id,
    req.user!.tenant_id
  );

  res.json({
    success,
    message: 'Anotação excluída com sucesso'
  });
}));

// ===================================
// ENDPOINTS DE MÉTRICAS E RELATÓRIOS
// ===================================

/**
 * GET /api/annotations/reports/metrics
 * Buscar métricas de anotações para relatórios/dashboard
 */
router.get('/reports/metrics', 
  requireRole(['admin', 'super_admin']), // Apenas admins podem ver métricas
  asyncHandler(async (req: Request, res: Response) => {
    console.log('📊 [GET /api/annotations/reports/metrics] Calculando métricas');

    const filters = {
      pipeline_id: req.query.pipeline_id as string,
      owner_id: req.query.owner_id as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string
    };

    // Buscar métricas via service
    const metrics = await AnnotationsService.getAnnotationMetrics(
      req.user!.tenant_id,
      filters
    );

    res.json({
      success: true,
      data: metrics
    });
  })
);

/**
 * GET /api/annotations/search
 * Busca avançada em anotações (full-text search)
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  const leadId = req.query.lead_id as string;
  const leadType = req.query.type as 'pipeline_lead' | 'lead_master' || 'pipeline_lead';

  console.log('🔍 [GET /api/annotations/search] Busca avançada:', {
    query: query?.substring(0, 20),
    leadId: leadId?.substring(0, 8),
    leadType
  });

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetro de busca "q" é obrigatório'
    });
  }

  // Usar filtros do service para busca
  const filters = ListAnnotationsQuerySchema.parse({
    ...req.query,
    search: query,
    page: req.query.page || 1,
    limit: req.query.limit || 20
  });

  let result;
  if (leadId) {
    // Buscar apenas no lead específico
    result = await AnnotationsService.getLeadAnnotations(
      leadId,
      req.user!.tenant_id,
      leadType,
      filters
    );
  } else {
    // Buscar em todas as anotações do tenant
    result = await AnnotationsService.getLeadAnnotations(
      '', // leadId vazio busca em todas
      req.user!.tenant_id,
      leadType,
      filters
    );
  }

  res.json({
    success: true,
    data: result.annotations,
    pagination: result.pagination,
    query: {
      search: query,
      lead_id: leadId,
      type: leadType
    }
  });
}));

// AIDEV-NOTE: Endpoint para auto-save (drafts temporários) - implementação futura
// router.post('/drafts/:leadId', asyncHandler(async (req: Request, res: Response) => {
//   // TODO: Implementar sistema de auto-save com Redis/localStorage
// }));

export default router;