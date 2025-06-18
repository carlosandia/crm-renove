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

    // 1. Construir query base
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
    const { data: companies, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`);
    }

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

    // 4. Criar admin
    const adminNames = admin_name.trim().split(' ');
    const firstName = adminNames[0];
    const lastName = adminNames.slice(1).join(' ') || '';

    const { data: newAdmin, error: adminError } = await supabase
      .from('users')
      .insert([{
        email: admin_email,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        tenant_id: newCompany.id,
        is_active: true,
        password_hash: admin_password // Salvar senha (em produção seria hash)
      }])
      .select()
      .single();

    if (adminError) {
      // Rollback: remover empresa criada
      await supabase.from('companies').delete().eq('id', newCompany.id);
      throw new Error(`Erro ao criar admin: ${adminError.message}`);
    }

    // 5. Log de auditoria
    console.log(`✅ Empresa criada: ${name} com admin ${admin_email} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        company: newCompany,
        admin: newAdmin,
        credentials: {
          email: admin_email,
          password: admin_password
        }
      },
      message: `Empresa "${name}" e administrador criados com sucesso`,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/companies/:id - Atualizar empresa
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