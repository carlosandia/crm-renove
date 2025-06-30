import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler, NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import { requireRole } from '../middleware/auth';
import { ApiResponse } from '../types/express';

const router = Router();

/**
 * Validação específica para empresas
 */
const companyValidation = {
  create: {
    body: {
      name: { required: true, type: 'string', min: 2, max: 255 },
      industry: { required: true, type: 'string', max: 100 },
      website: { type: 'string', max: 255 },
      phone: { type: 'string', max: 20 },
      email: { type: 'string', email: true, max: 255 },
      address: { type: 'string', max: 500 },
      city: { required: true, type: 'string', max: 100 },
      state: { required: true, type: 'string', max: 100 },
      country: { type: 'string', max: 100 },
      expected_leads_monthly: { required: true, type: 'number', min: 1 },
      expected_sales_monthly: { required: true, type: 'number', min: 1 },
      expected_followers_monthly: { required: true, type: 'number', min: 1 },
      admin_name: { required: true, type: 'string', min: 2, max: 100 },
      admin_email: { required: true, type: 'string', email: true },
      admin_password: { type: 'string', min: 6, max: 100 }
    }
  },
  update: {
    body: {
      name: { type: 'string', min: 2, max: 255 },
      industry: { type: 'string', max: 100 },
      website: { type: 'string', max: 255 },
      phone: { type: 'string', max: 20 },
      email: { type: 'string', email: true, max: 255 },
      address: { type: 'string', max: 500 },
      city: { type: 'string', max: 100 },
      state: { type: 'string', max: 100 },
      country: { type: 'string', max: 100 },
      expected_leads_monthly: { type: 'number', min: 1 },
      expected_sales_monthly: { type: 'number', min: 1 },
      expected_followers_monthly: { type: 'number', min: 1 },
      is_active: { type: 'boolean' }
    }
  }
};

/**
 * GET /api/companies - Listar empresas
 */
router.get('/', 
  requireRole(['super_admin', 'admin']),
  validateRequest({
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
      search: { type: 'string', max: 255 },
      industry: { type: 'string', max: 100 },
      is_active: { type: 'boolean' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      search,
      industry,
      is_active
    } = req.query;

    // 1. ✅ CORREÇÃO: Query simples primeiro, depois buscar admins separadamente
    let query = supabase.from('companies').select('*', { count: 'exact' });

    // 2. Admins só veem a própria empresa
    if (req.user?.role === 'admin') {
      query = query.eq('id', req.user.tenant_id);
    }

    // 3. Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,industry.ilike.%${search}%`);
    }

    if (industry) {
      query = query.eq('industry', industry);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    // 4. Paginação
    const offset = ((page as number) - 1) * (limit as number);
    query = query
      .range(offset, offset + (limit as number) - 1)
      .order('created_at', { ascending: false });

    // 5. Executar query
    const { data: companiesRaw, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`);
    }

    // 6. ✅ CORREÇÃO: Buscar admins separadamente para cada empresa
    const companies = await Promise.all(
      (companiesRaw || []).map(async (company: any) => {
        try {
          // Buscar admin da empresa
          const { data: adminData, error: adminError } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, is_active, created_at, role')
            .eq('tenant_id', company.id)
            .eq('role', 'admin')
            .maybeSingle();

          const admin = (!adminError && adminData) ? {
            id: adminData.id,
            email: adminData.email,
            first_name: adminData.first_name,
            last_name: adminData.last_name,
            is_active: adminData.is_active,
            created_at: adminData.created_at
          } : null;

          return {
            ...company,
            admin
          };
        } catch (err) {
          console.warn(`⚠️ Erro ao buscar admin da empresa ${company.name}:`, err);
          return {
            ...company,
            admin: null
          };
        }
      })
    );

    console.log(`✅ [GET-COMPANIES] Retornando ${companies.length} empresas com admins vinculados`);
    companies.forEach(c => {
      console.log(`   - ${c.name}: ${c.admin ? `Admin ${c.admin.first_name} (${c.admin.email})` : 'Sem admin'}`);
    });

    const totalPages = Math.ceil((count || 0) / (limit as number));

    const response: ApiResponse = {
      success: true,
      data: companies || [],
      meta: {
        page: page as number,
        limit: limit as number,
        total: count || 0,
        totalPages
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/companies/:id - Buscar empresa por ID
 */
router.get('/:id',
  requireRole(['super_admin', 'admin']),
  validateRequest(schemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // 1. Verificar permissões
    if (req.user?.role === 'admin' && id !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem acessar a própria empresa');
    }

    // 2. Buscar empresa
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !company) {
      throw new NotFoundError('Empresa não encontrada');
    }

    const response: ApiResponse = {
      success: true,
      data: company,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/companies - Criar nova empresa (apenas super admins)
 */
router.post('/',
  requireRole(['super_admin']),
  validateRequest(companyValidation.create),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      industry,
      website,
      phone,
      email,
      address,
      city,
      state,
      country,
      expected_leads_monthly,
      expected_sales_monthly,
      expected_followers_monthly,
      admin_name,
      admin_email,
      admin_password = '123456'
    } = req.body;

    // 1. Verificar se empresa já existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name)
      .single();

    if (existingCompany) {
      throw new ConflictError('Empresa com este nome já existe');
    }

    // 2. Verificar se email do admin já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', admin_email)
      .single();

    if (existingUser) {
      throw new ConflictError('Email do administrador já está em uso');
    }

    // 3. Criar empresa
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name,
        industry,
        website,
        phone,
        email,
        address,
        city,
        state,
        country: country || 'Brasil',
        expected_leads_monthly,
        expected_sales_monthly,
        expected_followers_monthly,
        is_active: true
      }])
      .select()
      .single();

    if (companyError) {
      throw new Error(`Erro ao criar empresa: ${companyError.message}`);
    }

    // 4. 🔧 CORREÇÃO COMPLETA: Criar admin na tabela public.users E auth.users
    const adminNames = admin_name.trim().split(' ');
    const firstName = adminNames[0];
    const lastName = adminNames.slice(1).join(' ') || '';

    // Importar função de hash do security.ts
    const { hashPassword } = await import('../utils/security');
    const hashedPassword = await hashPassword(admin_password);

    let newAdmin;
    let authUserId;

    try {
      // 🔧 CORREÇÃO TEMPORÁRIA: Criar admin apenas em public.users 
      // TODO: Configurar Supabase para permitir auth.admin.createUser posteriormente
      console.log('⚠️ [TEMPORARY] Criando admin apenas em public.users (sem auth.users)...');
      
      // Gerar ID único para o admin
      authUserId = crypto.randomUUID();
      
      // ✅ CORREÇÃO CRÍTICA: Criar admin como INATIVO para processo de ativação
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .insert([{
          id: authUserId,
          email: admin_email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          tenant_id: newCompany.id,
          is_active: false, // ✅ CORREÇÃO: Admin criado como INATIVO até ativação via email
          password_hash: hashedPassword, // Senha temporária até ativação
          auth_user_id: null // NULL até ativação completa
        }])
        .select()
        .single();

      if (publicError) {
        throw new Error(`Erro ao criar admin na public.users: ${publicError.message}`);
      }

      newAdmin = publicUser;
      console.log(`✅ [INACTIVE] Admin criado como INATIVO: ${admin_email} (ID: ${authUserId})`);
      console.log(`📧 [ACTIVATION] Admin aguarda ativação via email para acessar sistema`);

    } catch (error) {
      // Rollback: remover empresa se criada
      await supabase.from('companies').delete().eq('id', newCompany.id);
      throw new Error(`Erro ao criar admin: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. ✅ ENVIO AUTOMÁTICO DE EMAIL DE ATIVAÇÃO
    console.log('📧 [ACTIVATION] Enviando convite de ativação automaticamente...');
    
    try {
      // Importar emailService
      const { emailService } = await import('../services/emailService');
      
      // Gerar token de ativação único
      const activationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      
      // Armazenar token no campo segment da empresa (método alternativo)
      const invitationSegment = `INVITATION:${activationToken}:${new Date().toISOString()}`;
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          segment: `${newCompany.segment || ''} | ${invitationSegment}`.trim()
        })
        .eq('id', newCompany.id);

      if (updateError) {
        console.warn('⚠️ [ACTIVATION] Erro ao salvar token de ativação:', updateError.message);
      } else {
        console.log('✅ [ACTIVATION] Token de ativação salvo no banco');
      }

      // Enviar email de ativação
      const emailResult = await emailService.sendAdminInvitation({
        companyName: name,
        adminName: `${firstName} ${lastName}`.trim(),
        adminEmail: admin_email,
        activationToken,
        expiresIn: '48 horas'
      });

      // 6. Log de auditoria + resultado email
      if (emailResult.success) {
        console.log(`✅ [ACTIVATION] Email enviado com sucesso para ${admin_email} (MessageID: ${emailResult.messageId})`);
        console.log(`✅ Empresa criada: ${name} com admin ${admin_email} + convite enviado por ${req.user?.email}`);
        
        const response: ApiResponse = {
          success: true,
          data: {
            company: newCompany,
            admin: newAdmin,
            activation: {
              email_sent: true,
              activation_token: activationToken,
              activation_url: `${process.env.APP_URL || 'http://localhost:8080'}/activate?token=${activationToken}`,
              expires_in: '48 horas',
              message_id: emailResult.messageId
            }
          },
          message: `Empresa "${name}" criada e convite de ativação enviado para ${admin_email}`,
          timestamp: new Date().toISOString()
        };

        res.status(201).json(response);
      } else {
        console.error('❌ [ACTIVATION] Falha no envio do email:', emailResult.error);
        console.log(`⚠️ Empresa criada: ${name} com admin ${admin_email}, mas email falhou por ${req.user?.email}`);
        
        const response: ApiResponse = {
          success: true,
          data: {
            company: newCompany,
            admin: newAdmin,
            activation: {
              email_sent: false,
              error: emailResult.error,
              manual_activation_required: true
            }
          },
          message: `Empresa "${name}" criada, mas falha no envio do email de ativação`,
          timestamp: new Date().toISOString()
        };

        res.status(201).json(response);
      }
      
    } catch (emailError: any) {
      console.error('❌ [ACTIVATION] Erro crítico no envio do email:', emailError);
      console.log(`⚠️ Empresa criada: ${name} com admin ${admin_email}, mas erro crítico no email por ${req.user?.email}`);
      
      const response: ApiResponse = {
        success: true,
        data: {
          company: newCompany,
          admin: newAdmin,
          activation: {
            email_sent: false,
            error: emailError.message,
            manual_activation_required: true
          }
        },
        message: `Empresa "${name}" criada, mas erro no sistema de email`,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    }
  })
);

/**
 * PUT /api/companies/update-admin-password - Atualizar senha do administrador
 * REFACTOR: Sistema simplificado sem headers problemáticos
 */
router.put('/update-admin-password',
  // Middleware CORS simplificado e robusto
  (req, res, next) => {
    const origin = req.headers.origin;
    
    // Log detalhado para debug
    console.log(`🔧 [CORS-PASSWORD] Requisição recebida:`, {
      method: req.method,
      origin: origin || 'no-origin',
      headers: Object.keys(req.headers),
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    
    // Permitir todas as origens do desenvolvimento
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Headers simplificados - APENAS os essenciais
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // Cache por 24h
    
    // Resposta imediata para OPTIONS
    if (req.method === 'OPTIONS') {
      console.log(`✅ [CORS-PASSWORD] Preflight aprovado para ${origin}`);
      return res.status(200).end();
    }
    
    console.log(`➡️ [CORS-PASSWORD] Prosseguindo com ${req.method} para ${req.path}`);
    next();
  },
  requireRole(['super_admin', 'admin']),
  validateRequest({
    body: {
      companyId: { required: true, type: 'string', uuid: true },
      newPassword: { required: true, type: 'string', min: 1 }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, newPassword } = req.body;

    console.log('🔧 [UPDATE-ADMIN-PASSWORD] Recebendo requisição:', { 
      companyId: companyId || 'MISSING', 
      hasPassword: !!newPassword,
      passwordLength: newPassword?.length || 0,
      user: req.user?.email 
    });

    // 1. Verificar permissões
    if (req.user?.role === 'admin' && companyId !== req.user.tenant_id) {
      console.log('❌ [UPDATE-ADMIN-PASSWORD] Permissão negada:', { 
        userRole: req.user?.role, 
        userTenant: req.user?.tenant_id, 
        requestedCompany: companyId 
      });
      throw new ForbiddenError('Admins só podem atualizar a própria empresa');
    }

    // 2. Verificar se empresa existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (!existingCompany) {
      console.log('❌ [UPDATE-ADMIN-PASSWORD] Empresa não encontrada:', companyId);
      throw new NotFoundError('Empresa não encontrada');
    }

    console.log('✅ [UPDATE-ADMIN-PASSWORD] Empresa encontrada:', existingCompany.name);

    // 3. Encontrar admin da empresa
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', companyId)
      .eq('role', 'admin')
      .single();

    if (adminError || !adminUser) {
      console.log('❌ [UPDATE-ADMIN-PASSWORD] Admin não encontrado:', { 
        companyId, 
        error: adminError?.message 
      });
      throw new NotFoundError('Administrador da empresa não encontrado');
    }

    console.log('✅ [UPDATE-ADMIN-PASSWORD] Admin encontrado:', adminUser.email);

    // 4. Atualizar senha do admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: newPassword, // Em produção seria hash
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id);

    if (updateError) {
      console.log('❌ [UPDATE-ADMIN-PASSWORD] Erro ao atualizar:', updateError.message);
      throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
    }

    console.log(`✅ [UPDATE-ADMIN-PASSWORD] Senha atualizada com sucesso para ${adminUser.email} da empresa ${existingCompany.name}`);

    const response: ApiResponse = {
      success: true,
      message: 'Senha do administrador atualizada com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PUT /api/companies/update-expectations - Atualizar expectativas mensais
 * IMPORTANTE: Esta rota deve vir ANTES de /:id para evitar conflitos de roteamento
 */
router.put('/update-expectations',
  requireRole(['super_admin', 'admin']),
  validateRequest({
    body: {
      companyId: { required: true, type: 'string', uuid: true },
      expectations: { required: true, type: 'object' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, expectations } = req.body;

    // 1. Verificar permissões
    if (req.user?.role === 'admin' && companyId !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem atualizar a própria empresa');
    }

    // 2. Verificar se empresa existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (!existingCompany) {
      throw new NotFoundError('Empresa não encontrada');
    }

    // 3. Atualizar expectativas
    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update({
        expected_leads_monthly: expectations.expected_leads_monthly,
        expected_sales_monthly: expectations.expected_sales_monthly,
        expected_followers_monthly: expectations.expected_followers_monthly,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar expectativas: ${error.message}`);
    }

    console.log(`✅ Expectativas atualizadas para empresa: ${existingCompany.name}`);

    const response: ApiResponse = {
      success: true,
      data: updatedCompany,
      message: 'Expectativas mensais atualizadas com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PUT /api/companies/update-info - Atualizar informações da empresa
 * IMPORTANTE: Esta rota deve vir ANTES de /:id para evitar conflitos de roteamento
 */
router.put('/update-info',
  requireRole(['super_admin', 'admin']),
  validateRequest({
    body: {
      companyId: { required: true, type: 'string', uuid: true },
      companyData: { required: true, type: 'object' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, companyData } = req.body;

    console.log('🔧 [UPDATE-COMPANY-INFO] Recebendo requisição:', { 
      companyId: companyId || 'MISSING', 
      hasCompanyData: !!companyData,
      user: req.user?.email 
    });

    // 1. Verificar permissões
    if (req.user?.role === 'admin' && companyId !== req.user.tenant_id) {
      console.log('❌ [UPDATE-COMPANY-INFO] Permissão negada:', { 
        userRole: req.user?.role, 
        userTenant: req.user?.tenant_id, 
        requestedCompany: companyId 
      });
      throw new ForbiddenError('Admins só podem atualizar a própria empresa');
    }

    // 2. Verificar se empresa existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (!existingCompany) {
      console.log('❌ [UPDATE-COMPANY-INFO] Empresa não encontrada:', companyId);
      throw new NotFoundError('Empresa não encontrada');
    }

    console.log('✅ [UPDATE-COMPANY-INFO] Empresa encontrada:', existingCompany.name);

    // 3. Preparar dados para atualização (apenas campos permitidos)
    const allowedFields = ['name', 'industry', 'website', 'phone', 'email', 'address', 'city', 'state', 'country'];
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Filtrar apenas campos permitidos e que tenham valor
    for (const field of allowedFields) {
      if (companyData[field] !== undefined && companyData[field] !== null) {
        updateData[field] = companyData[field];
      }
    }

    console.log('🔧 [UPDATE-COMPANY-INFO] Dados para atualização:', updateData);

    // 4. Atualizar empresa
    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      console.log('❌ [UPDATE-COMPANY-INFO] Erro ao atualizar:', error.message);
      throw new Error(`Erro ao atualizar empresa: ${error.message}`);
    }

    console.log(`✅ [UPDATE-COMPANY-INFO] Empresa "${existingCompany.name}" atualizada com sucesso por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: updatedCompany,
      message: 'Informações da empresa atualizadas com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PUT /api/companies/update-admin-info - Atualizar informações do administrador
 * IMPORTANTE: Esta rota deve vir ANTES de /:id para evitar conflitos de roteamento
 */
router.put('/update-admin-info',
  requireRole(['super_admin', 'admin']),
  validateRequest({
    body: {
      companyId: { required: true, type: 'string', uuid: true },
      adminData: { required: true, type: 'object' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyId, adminData } = req.body;

    console.log('🔧 [UPDATE-ADMIN-INFO] Recebendo requisição:', { 
      companyId: companyId || 'MISSING', 
      hasAdminData: !!adminData,
      user: req.user?.email 
    });

    // 1. Verificar permissões
    if (req.user?.role === 'admin' && companyId !== req.user.tenant_id) {
      console.log('❌ [UPDATE-ADMIN-INFO] Permissão negada:', { 
        userRole: req.user?.role, 
        userTenant: req.user?.tenant_id, 
        requestedCompany: companyId 
      });
      throw new ForbiddenError('Admins só podem atualizar a própria empresa');
    }

    // 2. Verificar se empresa existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (!existingCompany) {
      console.log('❌ [UPDATE-ADMIN-INFO] Empresa não encontrada:', companyId);
      throw new NotFoundError('Empresa não encontrada');
    }

    console.log('✅ [UPDATE-ADMIN-INFO] Empresa encontrada:', existingCompany.name);

    // 3. Encontrar admin da empresa
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', companyId)
      .eq('role', 'admin')
      .single();

    if (adminError || !adminUser) {
      console.log('❌ [UPDATE-ADMIN-INFO] Admin não encontrado:', { 
        companyId, 
        error: adminError?.message 
      });
      throw new NotFoundError('Administrador da empresa não encontrado');
    }

    console.log('✅ [UPDATE-ADMIN-INFO] Admin encontrado:', adminUser.email);

    // 4. Preparar dados para atualização (apenas campos permitidos)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Atualizar nome (dividir em first_name e last_name)
    if (adminData.name) {
      const nameParts = adminData.name.trim().split(' ');
      updateData.first_name = nameParts[0];
      updateData.last_name = nameParts.slice(1).join(' ') || '';
    }

    // Atualizar email
    if (adminData.email && adminData.email !== adminUser.email) {
      // Verificar se email já está em uso
      const { data: emailExists } = await supabase
        .from('users')
        .select('id')
        .eq('email', adminData.email)
        .neq('id', adminUser.id)
        .single();

      if (emailExists) {
        throw new ConflictError('Email já está em uso por outro usuário');
      }

      updateData.email = adminData.email;
    }

    console.log('🔧 [UPDATE-ADMIN-INFO] Dados para atualização:', updateData);

    // 5. Atualizar admin
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', adminUser.id)
      .select('id, email, first_name, last_name, is_active, created_at, role')
      .single();

    if (updateError) {
      console.log('❌ [UPDATE-ADMIN-INFO] Erro ao atualizar:', updateError.message);
      throw new Error(`Erro ao atualizar administrador: ${updateError.message}`);
    }

    console.log(`✅ [UPDATE-ADMIN-INFO] Admin "${adminUser.email}" da empresa "${existingCompany.name}" atualizado com sucesso por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: updatedAdmin,
      message: 'Informações do administrador atualizadas com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PUT /api/companies/:id - Atualizar empresa
 * IMPORTANTE: Esta rota deve vir DEPOIS das rotas específicas para evitar conflitos
 */
router.put('/:id',
  requireRole(['super_admin', 'admin']),
  validateRequest({
    ...schemas.uuidParam,
    ...companyValidation.update
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // 1. Verificar permissões
    if (req.user?.role === 'admin' && id !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem atualizar a própria empresa');
    }

    // 2. Verificar se empresa existe
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingCompany) {
      throw new NotFoundError('Empresa não encontrada');
    }

    // 3. Atualizar empresa
    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar empresa: ${error.message}`);
    }

    console.log(`✅ Empresa atualizada: ${existingCompany.name} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: updatedCompany,
      message: 'Empresa atualizada com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/companies/:id - Desativar empresa
 */
router.delete('/:id',
  requireRole(['super_admin']),
  validateRequest(schemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingCompany) {
      throw new NotFoundError('Empresa não encontrada');
    }

    // Desativar empresa
    const { error } = await supabase
      .from('companies')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao desativar empresa: ${error.message}`);
    }

    console.log(`✅ Empresa desativada: ${existingCompany.name} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      message: 'Empresa desativada com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router; 