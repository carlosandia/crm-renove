import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler, NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validation';
import { requireRole } from '../middleware/auth';
import { ApiResponse } from '../types/express';

const router = Router();

/**
 * Validação específica para members/vendedores
 */
const memberValidation = {
  create: {
    body: {
      first_name: { required: true, type: 'string', min: 2, max: 100 },
      last_name: { required: true, type: 'string', min: 2, max: 100 },
      email: { required: true, type: 'string', email: true, max: 255 },
      password: { type: 'string', min: 6, max: 100 }
      // tenant_id será obtido do usuário autenticado, não do body
    }
  },
  update: {
    body: {
      first_name: { type: 'string', min: 2, max: 100 },
      last_name: { type: 'string', min: 2, max: 100 },
      email: { type: 'string', email: true, max: 255 },
      is_active: { type: 'boolean' },
      password: { type: 'string', min: 6, max: 100, required: false } // Senha opcional
    }
  }
};

/**
 * POST /api/members - Criar novo member/vendedor (Enterprise Pattern)
 * 🔧 CORREÇÃO: Members não precisam de ativação, apenas cadastro direto
 */
router.post('/',
  requireRole(['admin', 'super_admin']),
  validateRequest(memberValidation.create),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      first_name,
      last_name,
      email,
      password = '123456'
    } = req.body;

    // Usar tenant_id do usuário autenticado
    const tenant_id = req.user?.tenant_id;

    if (!tenant_id) {
      throw new Error('Usuário sem tenant_id definido');
    }

    console.log('🚀 [ENTERPRISE-MEMBER] Criando member via Backend API:', {
      email,
      tenant_id,
      requester: req.user?.email
    });

    // 2. Verificar se empresa existe
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (companyError || !company) {
      throw new NotFoundError('Empresa não encontrada');
    }

    // 3. Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ConflictError('Email já está em uso');
    }

    // 4. 🔧 CORREÇÃO: Criar member APENAS na tabela public.users (sem auth.users)
    // Members não precisam de ativação, apenas cadastro direto
    const { hashPassword } = await import('../utils/security');
    const hashedPassword = await hashPassword(password);

    let newMember;

    try {
      console.log('👤 [ENTERPRISE-MEMBER] Criando member em public.users (cadastro direto)...');
      
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .insert([{
          email: email,
          first_name: first_name,
          last_name: last_name,
          role: 'member',
          tenant_id: tenant_id,
          is_active: true, // Members criados como ativos (sem ativação)
          password_hash: hashedPassword,
          auth_user_id: null // Não vinculado com Supabase Auth
        }])
        .select()
        .single();

      if (publicError) {
        throw new Error(`Erro ao criar member: ${publicError.message}`);
      }

      newMember = publicUser;
      console.log(`✅ [ENTERPRISE-MEMBER] Member criado: ${email}`);

    } catch (error) {
      throw new Error(`Erro ao criar member: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. Log de auditoria
    console.log(`✅ [ENTERPRISE-MEMBER] Member criado: ${email} para empresa ${company.name} por ${req.user?.email}`);

    const response: ApiResponse = {
      success: true,
      data: {
        member: newMember,
        company: company,
        credentials: {
          email: email,
          password: password
        }
      },
      message: `Member "${first_name} ${last_name}" criado com sucesso`,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/members - Listar members por empresa
 */
router.get('/',
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req: Request, res: Response) => {
    // Determinar tenant_id baseado no role
    let tenantId;
    if (req.user?.role === 'super_admin') {
      tenantId = req.query.tenant_id as string;
      if (!tenantId) {
        throw new Error('Super admin deve especificar tenant_id');
      }
    } else {
      tenantId = req.user?.tenant_id;
    }

    const { data: members, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_active, created_at, auth_user_id, last_login')
      .eq('role', 'member')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar members: ${error.message}`);
    }

    const response: ApiResponse = {
      success: true,
      data: members || [],
      message: `${members?.length || 0} members encontrados`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * PUT /api/members/:id - Atualizar member
 */
router.put('/:id',
  requireRole(['admin', 'super_admin']),
  validateRequest(memberValidation.update),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { password, ...updates } = req.body; // Separar password dos outros campos

    // Verificar se member existe
    const { data: existingMember, error: memberError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'member')
      .single();

    if (memberError || !existingMember) {
      throw new NotFoundError('Member não encontrado');
    }

    // Verificar permissões
    if (req.user?.role === 'admin' && existingMember.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem editar members da própria empresa');
    }

    // ✅ CORREÇÃO: Preparar dados de atualização corretamente
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // ✅ CORREÇÃO: Se senha fornecida, hash e adicionar aos dados
    if (password && password.trim()) {
      const { hashPassword } = await import('../utils/security');
      updateData.password_hash = await hashPassword(password.trim());
    }

    // Atualizar member
    const { data: updatedMember, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Erro ao atualizar member: ${updateError.message}`);
    }

    const response: ApiResponse = {
      success: true,
      data: updatedMember,
      message: 'Member atualizado com sucesso',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  })
);

/**
 * DELETE /api/members/:id - Remover member
 */
router.delete('/:id',
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verificar se member existe
    const { data: existingMember, error: memberError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'member')
      .single();

    if (memberError || !existingMember) {
      throw new NotFoundError('Member não encontrado');
    }

    // Verificar permissões
    if (req.user?.role === 'admin' && existingMember.tenant_id !== req.user.tenant_id) {
      throw new ForbiddenError('Admins só podem remover members da própria empresa');
    }

    try {
      // Remover de auth.users se existir auth_user_id
      if (existingMember.auth_user_id) {
        await supabase.auth.admin.deleteUser(existingMember.auth_user_id);
      }

      // Remover de public.users
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Erro ao remover member: ${deleteError.message}`);
      }

      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Member removido com sucesso',
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      throw new Error(`Erro ao remover member: ${error instanceof Error ? error.message : String(error)}`);
    }
  })
);

/**
 * PUT /api/members/update-last-login - Atualizar último login do usuário
 * 🔧 CORREÇÃO: Implementa lookup robusto e códigos HTTP apropriados
 */
router.put('/update-last-login',
  requireRole(['admin', 'member', 'super_admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const userTenantId = req.user?.tenant_id;
    const userRole = req.user?.role;
    
    if (!userId) {
      throw new Error('ID do usuário não encontrado');
    }

    console.log('🔄 [LAST-LOGIN] Atualizando last_login para usuário:', { 
      userId, 
      email: userEmail, 
      role: userRole,
      tenant_id: userTenantId 
    });

    const currentTime = new Date().toISOString();

    // PASSO 1: Tentar buscar usuário por auth_user_id primeiro
    let existingUser = null;
    const { data: userByAuthId, error: authIdError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle(); // Use maybeSingle para evitar erro se não encontrar

    if (!authIdError && userByAuthId) {
      existingUser = userByAuthId;
      console.log('✅ [LAST-LOGIN] Usuário encontrado por auth_user_id');
    }

    // PASSO 2: Se não encontrou por auth_user_id, tentar por email
    if (!existingUser && userEmail) {
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (!emailError && userByEmail) {
        existingUser = userByEmail;
        console.log('✅ [LAST-LOGIN] Usuário encontrado por email');
      }
    }

    // PASSO 3: Se usuário não existe, implementar fallback para criar registro
    if (!existingUser) {
      console.warn(`⚠️ [LAST-LOGIN] Usuário não encontrado: ${userEmail} (${userId})`);
      
      // FALLBACK: Para usuários autenticados no Supabase Auth mas sem registro em public.users
      // Isso pode acontecer com admins criados diretamente no Supabase Auth
      if (userEmail && userTenantId && userRole) {
        console.log('🔧 [LAST-LOGIN] Tentando criar registro missing em public.users...');
        
        try {
          // Verificar se a empresa existe
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', userTenantId)
            .single();

          if (companyError || !company) {
            console.error('❌ [LAST-LOGIN] Empresa não encontrada para fallback:', userTenantId);
            const response: ApiResponse = {
              success: false,
              data: null,
              message: `Usuário autenticado mas empresa não encontrada: ${userTenantId}`,
              timestamp: currentTime
            };
            return res.status(404).json(response);
          }

          // Criar registro missing em public.users
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              auth_user_id: userId,
              email: userEmail,
              first_name: req.user?.first_name || userEmail.split('@')[0],
              last_name: req.user?.last_name || '',
              role: userRole,
              tenant_id: userTenantId,
              is_active: true,
              last_login: currentTime,
              created_at: currentTime,
              password_hash: null // Usuário já autenticado via Supabase Auth
            }])
            .select()
            .single();

          if (createError) {
            console.error('❌ [LAST-LOGIN] Erro ao criar registro fallback:', createError);
            throw createError;
          }

          console.log('✅ [LAST-LOGIN] Registro criado via fallback:', newUser.email);
          
          const response: ApiResponse = {
            success: true,
            data: newUser,
            message: 'Last login atualizado com sucesso (registro criado via fallback)',
            timestamp: currentTime
          };

          return res.json(response);

        } catch (fallbackError) {
          console.error('❌ [LAST-LOGIN] Erro crítico no fallback:', fallbackError);
          
          const response: ApiResponse = {
            success: false,
            data: null,
            message: `Erro ao criar registro de usuário: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`,
            timestamp: currentTime
          };

          return res.status(500).json(response);
        }
      }
      
      // Se não temos dados suficientes para o fallback, retornar 404
      const response: ApiResponse = {
        success: false,
        data: null,
        message: `Usuário não encontrado na aplicação. Email: ${userEmail}`,
        timestamp: currentTime
      };

      return res.status(404).json(response);
    }

    // PASSO 4: Atualizar last_login do usuário encontrado
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        last_login: currentTime,
        // Aproveitar para sincronizar auth_user_id se necessário
        auth_user_id: existingUser.auth_user_id || userId
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [LAST-LOGIN] Erro ao atualizar usuário existente:', updateError);
      throw new Error(`Erro ao atualizar last_login: ${updateError.message}`);
    }

    console.log('✅ [LAST-LOGIN] Atualizado com sucesso:', {
      userId: existingUser.id,
      email: existingUser.email,
      method: existingUser.auth_user_id === userId ? 'auth_user_id' : 'email'
    });

    const response: ApiResponse = {
      success: true,
      data: updatedUser,
      message: 'Last login atualizado com sucesso',
      timestamp: currentTime
    };

    res.json(response);
  })
);

export default router; 