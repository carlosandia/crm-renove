import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler, NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import { requireRole, requireAdminOrOwner } from '../middleware/auth';
import { User, ApiResponse } from '../types/express';

const router = Router();

/**
 * GET /api/users - Listar usuários com paginação e filtros
 */
router.get('/', 
  validateRequest({
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
      search: { type: 'string', max: 255 },
      role: { type: 'string', enum: ['super_admin', 'admin', 'member'] },
      tenant_id: { type: 'string', uuid: true },
      is_active: { type: 'boolean' }
    }
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      tenant_id,
      is_active
    } = req.query;

    // 1. Verificar permissões
    if (!req.user) {
      throw new ForbiddenError('Usuário não autenticado');
    }

    // Super admins podem ver todos, admins apenas do próprio tenant, members apenas a si mesmos
    let query = supabase.from('users').select('*', { count: 'exact' });

    if (req.user.role === 'super_admin') {
      // Super admin pode ver todos os usuários
    } else if (req.user.role === 'admin') {
      // Admin só vê usuários do próprio tenant
      query = query.eq('tenant_id', req.user.tenant_id);
    } else {
      // Member só vê a si mesmo
      query = query.eq('id', req.user.id);
    }

    // 2. Aplicar filtros
    if (role) {
      query = query.eq('role', role);
    }

    if (tenant_id && req.user.role === 'super_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // 3. Paginação
    const offset = ((page as number) - 1) * (limit as number);
    query = query
      .range(offset, offset + (limit as number) - 1)
      .order('created_at', { ascending: false });

    // 4. Executar query
    const { data: users, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    // 5. Calcular metadados de paginação
    const totalPages = Math.ceil((count || 0) / (limit as number));

    const response: ApiResponse = {
      success: true,
      data: users || [],
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
 * GET /api/users/:id - Buscar usuário por ID
 */
router.get('/:id',
  validateRequest(schemas.uuidParam),
  requireAdminOrOwner((req) => req.params.id),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const response: ApiResponse = {
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/users - Criar novo usuário (apenas admins)
 */
router.post('/',
  requireRole(['admin', 'super_admin']),
  validateRequest(schemas.createUser),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, first_name, last_name, role = 'member' } = req.body;
    let { tenant_id } = req.body;

    // 1. Verificar permissões para tenant_id
    if (req.user?.role === 'admin' && (!tenant_id || tenant_id !== req.user.tenant_id)) {
      // Admin só pode criar usuários no próprio tenant
      tenant_id = req.user.tenant_id;
    }

    if (!tenant_id) {
      throw new ForbiddenError('tenant_id é obrigatório');
    }

    // 2. Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ConflictError('Email já está em uso');
    }

    // 3. Verificar se admin pode criar o role solicitado
    if (req.user?.role === 'admin' && role === 'super_admin') {
      throw new ForbiddenError('Admins não podem criar super admins');
    }

    // 4. Criar usuário
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        email,
        first_name,
        last_name,
        role,
        tenant_id,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    }

    // 5. Log de auditoria
    console.log(`✅ Usuário criado: ${email} (${role}) por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: newUser,
      message: 'Usuário criado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/users/:id - Atualizar usuário
 */
router.put('/:id',
  validateRequest({
    ...schemas.uuidParam,
    body: {
      first_name: { type: 'string', min: 2, max: 50 },
      last_name: { type: 'string', min: 2, max: 50 },
      role: { type: 'string', enum: ['super_admin', 'admin', 'member'] },
      is_active: { type: 'boolean' },
      tenant_id: { type: 'string', uuid: true }
    }
  }),
  requireAdminOrOwner((req) => req.params.id),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // 1. Verificar se usuário existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // 2. Verificar permissões específicas
    if (req.user?.role === 'admin') {
      // Admin não pode alterar role para super_admin
      if (updates.role === 'super_admin') {
        throw new ForbiddenError('Admins não podem promover usuários a super admin');
      }
      
      // Admin não pode alterar tenant_id
      if (updates.tenant_id && updates.tenant_id !== req.user.tenant_id) {
        throw new ForbiddenError('Admins não podem mover usuários entre tenants');
      }
    }

    // 3. Member só pode alterar próprios dados (nome)
    if (req.user?.role === 'member' && req.user.id === id) {
      const allowedFields = ['first_name', 'last_name'];
      const invalidFields = Object.keys(updates).filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        throw new ForbiddenError(`Members só podem alterar: ${allowedFields.join(', ')}`);
      }
    }

    // 4. Atualizar usuário
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }

    // 5. Log de auditoria
    console.log(`✅ Usuário atualizado: ${existingUser.email} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: updatedUser,
      message: 'Usuário atualizado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/users/:id - Desativar usuário (soft delete)
 */
router.delete('/:id',
  validateRequest(schemas.uuidParam),
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // 1. Verificar se usuário existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // 2. Verificar permissões
    if (req.user?.role === 'admin' && existingUser.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem desativar usuários do próprio tenant');
    }

    // 3. Não permitir desativar a si mesmo
    if (existingUser.id === req.user?.id) {
      throw new ForbiddenError('Não é possível desativar sua própria conta');
    }

    // 4. Não permitir desativar super admins (apenas outros super admins)
    if (existingUser.role === 'super_admin' && req.user?.role !== 'super_admin') {
      throw new ForbiddenError('Apenas super admins podem desativar outros super admins');
    }

    // 5. Desativar usuário (soft delete)
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao desativar usuário: ${error.message}`);
    }

    // 6. Log de auditoria
    console.log(`✅ Usuário desativado: ${existingUser.email} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      message: 'Usuário desativado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * POST /api/users/:id/activate - Reativar usuário
 */
router.post('/:id/activate',
  validateRequest(schemas.uuidParam),
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // 1. Verificar se usuário existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // 2. Verificar permissões
    if (req.user?.role === 'admin' && existingUser.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem reativar usuários do próprio tenant');
    }

    // 3. Reativar usuário
    const { data: reactivatedUser, error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao reativar usuário: ${error.message}`);
    }

    // 4. Log de auditoria
    console.log(`✅ Usuário reativado: ${existingUser.email} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: reactivatedUser,
      message: 'Usuário reativado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * GET /api/users/stats - Estatísticas de usuários (admins apenas)
 */
router.get('/stats/summary',
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req: Request, res: Response) => {
    let baseQuery = supabase.from('users');

    // Admins só veem stats do próprio tenant
    if (req.user?.role === 'admin') {
      baseQuery = baseQuery.eq('tenant_id', req.user.tenant_id);
    }

    // Contar total de usuários
    const { count: totalUsers } = await baseQuery.select('*', { count: 'exact', head: true });

    // Contar usuários ativos
    const { count: activeUsers } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Contar por role
    const { data: roleStats } = await baseQuery
      .select('role')
      .eq('is_active', true);

    const roleCount = roleStats?.reduce((acc: any, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    const response: ApiResponse = {
      success: true,
      data: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        inactive: (totalUsers || 0) - (activeUsers || 0),
        byRole: roleCount
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

export default router; 