import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler, NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import { requireRole } from '../middleware/auth';
import { ApiResponse } from '../types/express';
import { randomUUID } from 'crypto';

const router = Router();

/**
 * Validação específica para empresas
 */
const companyValidation = {
  create: {
    body: {
      name: { required: true, type: 'string', min: 2, max: 255 },
      segmento: { required: true, type: 'string', max: 100 },
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
      admin_password: { required: true, type: 'string', min: 8, max: 100 }
    }
  },
  update: {
    body: {
      name: { type: 'string', min: 2, max: 255 },
      segmento: { type: 'string', max: 100 },
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
      segmento: { type: 'string', max: 100 },
      is_active: { type: 'boolean' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      search,
      segmento,
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
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,segmento.ilike.%${search}%`);
    }

    if (segmento) {
      query = query.eq('segmento', segmento);
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
      segmento,
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
      admin_password
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

    // 3. ✅ CORREÇÃO CRÍTICA: Gerar UUID para usar como tenant_id com validação robusta
    const companyId = randomUUID();
    
    // ✅ VALIDAÇÃO ROBUSTA: Verificar se UUID foi gerado corretamente
    if (!companyId || typeof companyId !== 'string' || companyId.length !== 36) {
      console.error('❌ [COMPANY-CREATE] Falha crítica na geração do UUID:', {
        companyId,
        type: typeof companyId,
        length: companyId?.length
      });
      throw new Error('Falha na geração do identificador da empresa. Tente novamente.');
    }
    
    console.log('✅ [COMPANY-CREATE] UUID gerado com sucesso:', {
      companyId: companyId.substring(0, 8),
      length: companyId.length,
      isValid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)
    });
    
    // Preparar dados para inserção com validação adicional
    const companyData = {
      id: companyId,
      name,
      segmento: segmento, // ✅ UNIFICAÇÃO: Frontend e backend agora usam 'segmento' diretamente
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
      tenant_id: companyId, // ✅ Self-referencing desde o início com validação
      is_active: true
    };
    
    // ✅ LOG DETALHADO: Verificar dados antes da inserção
    console.log('📊 [COMPANY-CREATE] Dados preparados para inserção:', {
      id: companyData.id?.substring(0, 8),
      name: companyData.name,
      tenant_id: companyData.tenant_id?.substring(0, 8),
      tenant_id_valid: !!companyData.tenant_id && companyData.tenant_id.length === 36,
      segmento: companyData.segmento
    });
    
    // Criar empresa com tenant_id validado
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();

    if (companyError) {
      console.error('❌ [COMPANY-CREATE] Erro na inserção da empresa:', {
        error: companyError.message,
        code: companyError.code,
        details: companyError.details,
        hint: companyError.hint,
        companyId: companyId?.substring(0, 8),
        tenant_id_sent: companyData.tenant_id?.substring(0, 8)
      });
      throw new Error(`Erro ao criar empresa: ${companyError.message}`);
    }

    // 4. ✅ CORREÇÃO CRÍTICA: Criar admin usando supabase.auth.admin.createUser()
    const adminNames = admin_name.trim().split(' ');
    const firstName = adminNames[0];
    const lastName = adminNames.slice(1).join(' ') || '';

    let newAdmin;
    let authUser;

    try {
      console.log('🔧 [ADMIN-CREATE] Criando admin usando supabase.auth.admin.createUser()...');
      
      // ✅ CORREÇÃO CRÍTICA: Usar API oficial do Supabase Auth
      const { data: authUserData, error: authError } = await supabase.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        user_metadata: {
          tenant_id: newCompany.id,
          role: 'admin',
          first_name: firstName,
          last_name: lastName
        },
        app_metadata: {
          role: 'admin',
          tenant_id: newCompany.id
        },
        email_confirm: true // ✅ Usuário criado como confirmado (ativo)
      });

      if (authError || !authUserData?.user) {
        throw new Error(`Erro ao criar admin em auth.users: ${authError?.message || 'Usuário não retornado'}`);
      }

      authUser = authUserData.user;
      console.log(`✅ [AUTH-USERS] Admin criado em auth.users: ${admin_email} (ID: ${authUser.id})`);

      // ✅ SEGUNDO PASSO: Inserir na tabela public.users com referência correta
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .insert([{
          id: authUser.id, // ✅ Usar ID do auth.users
          email: admin_email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          tenant_id: newCompany.id,
          is_active: true,
          auth_user_id: authUser.id // ✅ Referência para auth.users
        }])
        .select()
        .single();

      if (publicError) {
        // ✅ ROLLBACK: Remover usuário de auth.users se public.users falhar
        await supabase.auth.admin.deleteUser(authUser.id);
        throw new Error(`Erro ao criar admin na public.users: ${publicError.message}`);
      }

      newAdmin = publicUser;
      console.log(`✅ [PUBLIC-USERS] Admin criado em public.users: ${admin_email}`);
      console.log(`🎉 [SUCESSO] Admin completo criado - pode fazer login imediatamente`);

    } catch (error) {
      // ✅ ROLLBACK COMPLETO: Remover empresa E usuário de auth.users se criado
      if (authUser) {
        console.log('🔄 [ROLLBACK] Removendo usuário de auth.users...');
        await supabase.auth.admin.deleteUser(authUser.id);
      }
      
      console.log('🔄 [ROLLBACK] Removendo empresa...');
      await supabase.from('companies').delete().eq('id', newCompany.id);
      
      throw new Error(`Erro ao criar admin: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. ✅ RESPOSTA SIMPLES - SEM EMAIL DE ATIVAÇÃO
    console.log(`✅ Empresa criada: ${name} com admin ${admin_email} (ATIVO) por ${req.user?.email}`);
    
    const response: ApiResponse = {
      success: true,
      data: {
        company: newCompany,
        admin: newAdmin
      },
      message: `Empresa "${name}" criada com sucesso. Admin pode fazer login com email e senha.`,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
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
    const allowedFields = ['name', 'segmento', 'website', 'phone', 'email', 'address', 'city', 'state', 'country'];
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Filtrar apenas campos permitidos e que tenham valor
    for (const field of allowedFields) {
      if (companyData[field] !== undefined && companyData[field] !== null) {
        // ✅ UNIFICAÇÃO: Campo 'segmento' usado diretamente, sem mapeamento
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