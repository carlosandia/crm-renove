import { Router, Request, Response } from 'express';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '../middleware/auth';

// Carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const router = Router();

// Interface para dados do lead
interface LeadData {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  notes?: string;
  tenant_id: string;
  created_by: string;
}

// Função para normalizar headers do CSV
const normalizeHeader = (header: string): string => {
  const mappings: { [key: string]: string } = {
    'nome': 'first_name',
    'sobrenome': 'last_name',
    'email': 'email',
    'telefone': 'phone',
    'empresa': 'company',
    'cargo': 'job_title',
    'notas': 'notes',
    'observações': 'notes',
    'observacoes': 'notes'
  };
  
  const normalized = header.toLowerCase().trim();
  return mappings[normalized] || normalized;
};

// Função para validar dados do lead
const validateLeadData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar nome (obrigatório)
  if (!data.first_name || data.first_name.trim() === '') {
    errors.push('Nome é obrigatório');
  } else if (data.first_name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }
  
  // Validar email (obrigatório e formato)
  if (!data.email || data.email.trim() === '') {
    errors.push('Email é obrigatório');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Email inválido');
    }
  }
  
  // Validar telefone (se fornecido)
  if (data.phone && data.phone.trim() !== '') {
    const phoneRegex = /^[\d\s\-\(\)\+]{8,}$/;
    if (!phoneRegex.test(data.phone.trim())) {
      errors.push('Telefone inválido');
    }
  }
  
  // Validar tamanhos máximos
  if (data.first_name && data.first_name.length > 100) {
    errors.push('Nome muito longo (máximo 100 caracteres)');
  }
  
  if (data.last_name && data.last_name.length > 100) {
    errors.push('Sobrenome muito longo (máximo 100 caracteres)');
  }
  
  if (data.company && data.company.length > 200) {
    errors.push('Nome da empresa muito longo (máximo 200 caracteres)');
  }
  
  if (data.email && data.email.length > 255) {
    errors.push('Email muito longo (máximo 255 caracteres)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas CSV e XLSX
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use apenas CSV ou XLSX.'));
    }
  }
});

// Rota de teste
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Leads routes funcionando',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/leads/template - Baixar template CSV para importação
 */
router.get('/template', (req: Request, res: Response) => {
  try {
    // Template CSV com headers em PT-BR e exemplo
    const csvContent = `Nome,Sobrenome,Email,Telefone,Empresa,Cargo,Notas
João,Silva,joao.silva@exemplo.com,(11) 99999-9999,Empresa Exemplo,Gerente de Vendas,Lead qualificado via marketing
Maria,Santos,maria.santos@teste.com,(11) 88888-8888,Teste Ltda,Diretora Comercial,Interesse em soluções corporativas`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="template-importacao-leads.csv"');
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
    res.write('\uFEFF');
    res.end(csvContent);
  } catch (error) {
    console.error('Erro no template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar template',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * POST /api/leads/bulk - Importação em massa com processamento real
 */
router.post('/bulk', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo é obrigatório'
      });
    }

    // ✅ CORREÇÃO: Usar req.user ao invés de headers customizados
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        message: 'Token de acesso requerido'
      });
    }

    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📋 [BULK IMPORT] Dados do usuário autenticado:', {
      tenantId: tenantId || 'MISSING',
      userId: userId || 'MISSING', 
      userRole: userRole || 'MISSING',
      email: req.user.email
    });

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    
    console.log(`📁 Processando arquivo: ${fileName}, tamanho: ${fileBuffer.length} bytes`);
    console.log(`👤 Usuário: ${userId}, Tenant: ${tenantId}, Role: ${userRole}`);

    let parsedData: any[] = [];

    // Processar CSV
    if (fileName.toLowerCase().endsWith('.csv')) {
      const csvText = fileBuffer.toString('utf-8');
      
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader
      });
      
      parsedData = parseResult.data as any[];
      
    } else if (fileName.toLowerCase().endsWith('.xlsx')) {
      // Processar XLSX
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length > 1) {
        const headers = jsonData[0].map(normalizeHeader);
        parsedData = jsonData.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Tipo de arquivo não suportado'
      });
    }

    // Resultados da importação
    const importResult = {
      totalProcessed: parsedData.length,
      imported: 0,
      errors: 0,
      duplicates: 0,
      validationErrors: [] as any[],
      duplicateErrors: [] as any[]
    };

    // Processar cada lead
    for (let i = 0; i < parsedData.length; i++) {
      const rowData = parsedData[i];
      
      // Validar dados
      const validation = validateLeadData(rowData);
      
      if (!validation.isValid) {
        importResult.errors++;
        importResult.validationErrors.push({
          line: i + 2, // +2 porque começamos da linha 2 no CSV
          error: validation.errors.join(', ')
        });
        continue;
      }

      // Verificar duplicata por email
      const { data: existingLead } = await supabase
        .from('leads_master')
        .select('id, email')
        .eq('email', rowData.email.trim())
        .eq('tenant_id', tenantId)
        .single();

      if (existingLead) {
        importResult.duplicates++;
        importResult.duplicateErrors.push({
          email: rowData.email,
          line: i + 2
        });
        continue;
      }

      // Preparar dados para inserção
      const leadData: LeadData = {
        first_name: rowData.first_name?.trim(),
        last_name: rowData.last_name?.trim() || null,
        email: rowData.email?.trim(),
        phone: rowData.phone?.trim() || null,
        company: rowData.company?.trim() || null,
        job_title: rowData.job_title?.trim() || null,
        notes: rowData.notes?.trim() || null,
        tenant_id: tenantId,
        created_by: userId
      };

      // Inserir no Supabase
      const { error: insertError } = await supabase
        .from('leads_master')
        .insert([leadData]);

      if (insertError) {
        console.error('Erro ao inserir lead:', insertError);
        importResult.errors++;
        importResult.validationErrors.push({
          line: i + 2,
          error: `Erro ao salvar: ${insertError.message}`
        });
      } else {
        importResult.imported++;
      }
    }

    console.log(`✅ Importação concluída para tenant ${tenantId}:`);
    console.log(`  📊 Total processados: ${importResult.totalProcessed}`);
    console.log(`  ✅ Importados: ${importResult.imported}`);
    console.log(`  ❌ Erros: ${importResult.errors}`);
    console.log(`  🔄 Duplicatas: ${importResult.duplicates}`);

    res.json({
      success: true,
      message: `Importação concluída: ${importResult.imported} leads importados`,
      data: importResult
    });

  } catch (error) {
    console.error('Erro no bulk import:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no processamento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/leads/export - Exportação real com dados do banco
 */
router.get('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { format = 'csv', search, startDate, endDate } = req.query;
    
    // ✅ CORREÇÃO: Usar req.user ao invés de headers customizados
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        message: 'Token de acesso requerido'
      });
    }

    const tenantId = req.user.tenant_id;

    console.log(`📁 [EXPORT] Exportando leads para tenant: ${tenantId} (usuário: ${req.user.email})`);

    // Construir query para buscar leads reais
    let query = supabase
      .from('leads_master')
      .select(`
        first_name,
        last_name,
        email,
        phone,
        company,
        job_title,
        notes,
        lead_source,
        status,
        created_at
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Aplicar filtros opcionais
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Erro ao buscar leads:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar leads do banco de dados'
      });
    }

    if (!leads || leads.length === 0) {
      console.log('⚠️ Nenhum lead encontrado para exportação');
      return res.status(404).json({
        success: false,
        error: 'Nenhum lead encontrado para exportação'
      });
    }

    console.log(`✅ ${leads.length} leads encontrados para exportação`);

    // Formatar dados para exportação
    const exportData = leads.map(lead => ({
      'Nome': lead.first_name || '',
      'Sobrenome': lead.last_name || '',
      'Email': lead.email || '',
      'Telefone': lead.phone || '',
      'Empresa': lead.company || '',
      'Cargo': lead.job_title || '',
      'Origem': lead.lead_source || '',
      'Status': lead.status || '',
      'Notas': lead.notes || '',
      'Data de Criação': lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : ''
    }));

    const timestamp = new Date().toISOString().slice(0, 10);
    
    if (format === 'xlsx') {
      // Exportar como Excel
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${timestamp}.xlsx"`);
      res.send(buffer);
    } else {
      // Exportar como CSV
      const csv = Papa.unparse(exportData, {
        delimiter: ',',
        header: true
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="leads-export-${timestamp}.csv"`);
      
      // Adicionar BOM para UTF-8
      res.write('\uFEFF');
      res.end(csv);
    }

    console.log(`✅ Exportação concluída: ${leads.length} leads exportados em formato ${format}`);

  } catch (error) {
    console.error('Erro no export:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na exportação',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * POST /api/leads - Criar novo lead/oportunidade individual
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // ✅ CORREÇÃO: Usar req.user ao invés de headers customizados
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        message: 'Token de acesso requerido'
      });
    }

    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📋 [POST /api/leads] Dados do usuário autenticado:', {
      tenantId: tenantId || 'MISSING',
      userId: userId || 'MISSING', 
      userRole: userRole || 'MISSING',
      email: req.user.email
    });

    const {
      pipeline_id,
      stage_id,
      nome_oportunidade,
      valor,
      responsavel,
      nome_lead,
      nome_contato,
      email,
      email_contato,
      telefone,
      telefone_contato,
      lead_source,
      existing_lead_id,
      ...customFieldsData
    } = req.body;

    console.log('📝 [POST /api/leads] Dados recebidos:', {
      pipeline_id,
      stage_id,
      nome_oportunidade,
      nome_lead: nome_lead || nome_contato,
      email: email || email_contato,
      lead_source,
      existing_lead_id
    });

    // 1. Verificar se é lead existente ou novo
    let leadMasterId = null;

    if (lead_source === 'existing_lead' && existing_lead_id) {
      // Verificar se o lead existente pertence ao tenant
      const { data: existingLead, error: leadError } = await supabase
        .from('pipeline_leads')
        .select(`
          id,
          lead_master_id,
          tenant_id,
          leads_master!lead_master_id(
            id,
            first_name,
            last_name,
            email,
            phone,
            company
          )
        `)
        .eq('id', existing_lead_id)
        .eq('tenant_id', tenantId)
        .single();

      if (leadError || !existingLead) {
        console.error('❌ [POST /api/leads] Lead existente não encontrado:', { existing_lead_id, leadError });
        return res.status(404).json({
          success: false,
          error: 'Lead existente não encontrado',
          details: leadError?.message
        });
      }

      // Verificar se já pertence ao tenant (verificação já feita na query)
      console.log('✅ [POST /api/leads] Lead existente encontrado:', {
        id: existingLead.id,
        lead_master_id: existingLead.lead_master_id,
        tenant_id: existingLead.tenant_id
      });

      leadMasterId = existingLead.lead_master_id;
      console.log('✅ [POST /api/leads] Usando lead existente:', leadMasterId);

    } else {
      // 2. Criar novo lead_master se for lead novo
      const leadData: LeadData = {
        first_name: nome_lead || nome_contato || '',
        last_name: '',
        email: email || email_contato || '',
        phone: telefone || telefone_contato || null,
        company: customFieldsData.empresa || null,
        job_title: customFieldsData.cargo || null,
        notes: customFieldsData.notas || null,
        tenant_id: tenantId,
        created_by: userId
      };

      // Validar dados obrigatórios
      const validation = validateLeadData(leadData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: validation.errors
        });
      }

      // Verificar se email já existe
      const { data: duplicateLead } = await supabase
        .from('leads_master')
        .select('id, email')
        .eq('email', leadData.email.trim())
        .eq('tenant_id', tenantId)
        .single();

      if (duplicateLead) {
        return res.status(409).json({
          success: false,
          error: 'Email já existe na base de dados',
          existing_lead_id: duplicateLead.id
        });
      }

      // Inserir novo lead_master
      const { data: newLeadMaster, error: leadMasterError } = await supabase
        .from('leads_master')
        .insert([leadData])
        .select('id')
        .single();

      if (leadMasterError) {
        console.error('❌ [POST /api/leads] Erro ao criar lead_master:', leadMasterError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao criar lead',
          details: leadMasterError.message
        });
      }

      leadMasterId = newLeadMaster.id;
      console.log('✅ [POST /api/leads] Lead_master criado:', leadMasterId);
    }

    // 3. Criar oportunidade na pipeline (pipeline_leads)
    const opportunityData = {
      pipeline_id,
      stage_id,
      lead_master_id: leadMasterId,
      assigned_to: responsavel || userId,
      created_by: userId,
      updated_by: userId, // ✅ CORREÇÃO: Adicionar updated_by 
      tenant_id: tenantId,
      moved_at: new Date().toISOString(),
      lifecycle_stage: 'lead', // ✅ CORREÇÃO: Valor padrão para lifecycle_stage
      status: 'active', // ✅ CORREÇÃO: Status padrão
      // Dados customizados da oportunidade
      custom_data: {
        nome_oportunidade,
        valor: valor ? parseFloat(valor.replace(/[^0-9.,]/g, '').replace(',', '.')) : 0,
        ...customFieldsData
      }
    };

    const { data: newOpportunity, error: opportunityError } = await supabase
      .from('pipeline_leads')
      .insert([opportunityData])
      .select(`
        *,
        leads_master!lead_master_id(
          id,
          first_name,
          last_name,
          email,
          phone,
          company
        ),
        pipeline_stages(
          id,
          name,
          color
        )
      `)
      .single();

    if (opportunityError) {
      console.error('❌ [POST /api/leads] Erro ao criar oportunidade:', opportunityError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar oportunidade',
        details: opportunityError.message
      });
    }

    console.log('✅ [POST /api/leads] Oportunidade criada com sucesso:', newOpportunity.id);

    res.status(201).json({
      success: true,
      message: 'Lead/Oportunidade criada com sucesso',
      data: {
        opportunity: newOpportunity,
        lead_master_id: leadMasterId,
        is_new_lead: lead_source !== 'existing_lead'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [POST /api/leads] Erro geral:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;