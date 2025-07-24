import { Router, Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { asyncHandler } from '../middleware/errorHandler';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Lazy load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

/**
 * GET /api/email-test/health - Verificar saúde do serviço de email
 */
router.get('/health', 
  asyncHandler(async (req: Request, res: Response) => {
    console.log('🔍 [EMAIL-TEST] Verificando saúde do serviço de email...');
    
    const result = await emailService.verifyConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Serviço de email funcionando corretamente',
        provider: process.env.EMAIL_PROVIDER || 'mailtrap',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro na conexão do serviço de email',
        details: result.error,
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * POST /api/email-test/send - Enviar email de teste
 */
router.post('/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email destinatário é obrigatório'
      });
    }

    console.log(`🔍 [EMAIL-TEST] Enviando email de teste para: ${to}`);
    
    const result = await emailService.sendTestEmail(to);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email de teste enviado com sucesso',
        messageId: result.messageId,
        to: to,
        provider: process.env.EMAIL_PROVIDER || 'mailtrap',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar email de teste',
        details: result.error,
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * POST /api/email-test/invitation - Testar email de convite
 */
router.post('/invitation',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminEmail, adminName, companyName } = req.body;
    
    if (!adminEmail || !adminName || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'adminEmail, adminName e companyName são obrigatórios'
      });
    }

    console.log(`🔍 [EMAIL-TEST] Enviando convite de teste para: ${adminEmail}`);
    
    // Gerar token de teste
    const testToken = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await emailService.sendAdminInvitation({
      companyName,
      adminName,
      adminEmail,
      activationToken: testToken,
      expiresIn: '48 horas'
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email de convite enviado com sucesso',
        messageId: result.messageId,
        to: adminEmail,
        testToken: testToken,
        provider: process.env.EMAIL_PROVIDER || 'mailtrap',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar email de convite',
        details: result.error,
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * GET /api/email-test/config - Mostrar configuração atual (sem dados sensíveis)
 */
router.get('/config',
  asyncHandler(async (req: Request, res: Response) => {
    const config = {
      provider: process.env.EMAIL_PROVIDER || 'mailtrap',
      appUrl: process.env.APP_URL || 'http://127.0.0.1:8080',
      companyName: process.env.COMPANY_NAME || 'CRM Marketing',
      mailtrap: {
        host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
        port: process.env.MAILTRAP_PORT || '2525',
        userConfigured: !!process.env.MAILTRAP_USER,
        passwordConfigured: !!process.env.MAILTRAP_PASS
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Configuração do serviço de email',
      config: config
    });
  })
);

/**
 * POST /api/email-test/send-admin-invitation - Enviar convite real para admin com salvamento no banco
 */
router.post('/send-admin-invitation',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminEmail, adminName, companyName, companyId } = req.body;
    
    if (!adminEmail || !adminName || !companyName || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'adminEmail, adminName, companyName e companyId são obrigatórios'
      });
    }

    console.log(`📧 [ADMIN-INVITATION] Enviando convite real para: ${adminEmail} da empresa: ${companyName}`);
    
    try {
      // Gerar token único e seguro
      const activationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 horas para ativar
      
      // Salvar convite no banco de dados
      const { data: invitation, error: dbError } = await getSupabaseClient()
        .from('admin_invitations')
        .insert([{
          company_id: companyId,
          email: adminEmail.toLowerCase().trim(),
          admin_name: adminName.trim(),
          invitation_token: activationToken,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ [ADMIN-INVITATION] Erro ao salvar convite no banco:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao salvar convite no banco de dados',
          details: dbError.message
        });
      }

      console.log('✅ [ADMIN-INVITATION] Convite salvo no banco:', invitation.id);
      
      // Enviar email
      const emailResult = await emailService.sendAdminInvitation({
        companyName,
        adminName,
        adminEmail,
        activationToken,
        expiresIn: '48 horas'
      });
      
      if (emailResult.success) {
        // Atualizar status do convite para 'sent'
        await getSupabaseClient()
          .from('admin_invitations')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_message_id: emailResult.messageId
          })
          .eq('id', invitation.id);

        res.json({
          success: true,
          message: 'Convite enviado com sucesso',
          invitationId: invitation.id,
          messageId: emailResult.messageId,
          to: adminEmail,
          expiresAt: expiresAt.toISOString(),
          activationUrl: `${process.env.APP_URL || 'http://127.0.0.1:8080'}/activate?token=${activationToken}`,
          provider: process.env.EMAIL_PROVIDER || 'mailtrap',
          timestamp: new Date().toISOString()
        });
      } else {
        // Atualizar status do convite para 'failed'
        await getSupabaseClient()
          .from('admin_invitations')
          .update({ 
            status: 'failed',
            error_message: emailResult.error
          })
          .eq('id', invitation.id);

        res.status(500).json({
          success: false,
          error: 'Erro ao enviar email de convite',
          details: emailResult.error,
          invitationId: invitation.id,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error: any) {
      console.error('❌ [ADMIN-INVITATION] Erro geral:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * POST /api/email-test/validate-activation-token - Validar token de ativação
 */
router.post('/validate-activation-token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token é obrigatório'
      });
    }

    console.log(`🔍 [ACTIVATION] Validando token: ${token}`);
    
    try {
      // Usar função PostgreSQL para validar token
      const { data: validationResult, error: validationError } = await getSupabaseClient()
        .rpc('validate_invitation_token', { token_input: token });

      if (validationError) {
        console.error('❌ [ACTIVATION] Erro ao validar token:', validationError);
        return res.status(500).json({
          success: false,
          error: 'Erro interno ao validar token',
          details: validationError.message
        });
      }

      if (!validationResult || validationResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Token não encontrado'
        });
      }

      const result = validationResult[0];
      
      if (!result.is_valid) {
        return res.status(400).json({
          success: false,
          error: result.error_message || 'Token inválido'
        });
      }

      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await getSupabaseClient()
        .from('companies')
        .select('name, industry, city, state')
        .eq('id', result.company_id)
        .single();

      if (companyError) {
        console.warn('⚠️ [ACTIVATION] Não foi possível buscar dados da empresa:', companyError);
      }

      console.log('✅ [ACTIVATION] Token válido:', result.email);

      res.json({
        success: true,
        data: {
          company_name: companyData?.name || 'Empresa CRM',
          admin_name: result.name,
          admin_email: result.email,
          company_id: result.company_id,
          invitation_id: result.invitation_id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h no futuro para demo
          status: 'pending'
        },
        message: 'Token válido'
      });
      
    } catch (error: any) {
      console.error('❌ [ACTIVATION] Erro geral na validação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  })
);

/**
 * POST /api/email-test/activate-account - Ativar conta com nova senha
 */
router.post('/activate-account',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token e senha são obrigatórios'
      });
    }

    console.log(`🔑 [ACTIVATION] Ativando conta com token: ${token.substring(0, 8)}...`);
    
    try {
      // Hash da senha usando função enterprise
      const { hashPassword } = await import('../utils/security');
      const hashedPassword = await hashPassword(password);
      
      // Obter IP do cliente (opcional)
      const clientIp = req.ip || req.connection.remoteAddress || null;
      const userAgent = req.get('User-Agent') || null;

      // 🔧 CORREÇÃO: Logs mais detalhados
      console.log(`🔍 [ACTIVATION] Tentando ativar conta:`, {
        token_preview: token.substring(0, 8) + '...',
        client_ip: clientIp,
        user_agent: userAgent?.substring(0, 50) + '...'
      });

      // Usar função PostgreSQL para aceitar convite
      const { data: activationResult, error: activationError } = await getSupabaseClient()
        .rpc('accept_invitation', {
          token_input: token,
          password_hash_input: hashedPassword,
          activation_ip_input: clientIp,
          user_agent_input: userAgent
        });

      if (activationError) {
        console.error('❌ [ACTIVATION] Erro PostgreSQL ao ativar conta:', {
          error: activationError,
          token_preview: token.substring(0, 8) + '...'
        });
        return res.status(500).json({
          success: false,
          error: 'Erro interno ao ativar conta',
          details: activationError.message
        });
      }

      if (!activationResult || activationResult.length === 0) {
        console.error('❌ [ACTIVATION] Nenhum resultado retornado pela função accept_invitation');
        return res.status(400).json({
          success: false,
          error: 'Falha na ativação da conta - função não retornou dados'
        });
      }

      const result = activationResult[0];
      
      if (!result.success) {
        console.error('❌ [ACTIVATION] Falha reportada pela função accept_invitation:', result.message);
        return res.status(400).json({
          success: false,
          error: result.message || 'Falha na ativação'
        });
      }

      console.log('✅ [ACTIVATION] Conta ativada com sucesso:', {
        user_id: result.user_id,
        company_id: result.company_id,
        message: result.message
      });

      // 🔧 CORREÇÃO: Forçar limpeza de cache se houver
      try {
        await getSupabaseClient().auth.refreshSession();
      } catch (refreshError) {
        console.warn('⚠️ [ACTIVATION] Erro ao refresh session:', refreshError);
      }

      res.json({
        success: true,
        data: {
          user_id: result.user_id,
          company_id: result.company_id,
          message: result.message
        },
        message: 'Conta ativada com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [ACTIVATION] Erro geral na ativação:', {
        error: error,
        stack: error.stack,
        token_preview: token.substring(0, 8) + '...'
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  })
);

export default router; 
/**
 * POST /api/email-test/apply-admin-invitations-migration - Aplicar migração da tabela admin_invitations
 */
router.post('/apply-admin-invitations-migration',
  asyncHandler(async (req: Request, res: Response) => {
    console.log('📤 [MIGRATION] Aplicando migração admin_invitations...');
    
    try {
      // SQL da migração
      const migrationSQL = `
        -- Criar tabela admin_invitations
        CREATE TABLE IF NOT EXISTS admin_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            invitation_token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
                status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled')
            ),
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            accepted_at TIMESTAMP WITH TIME ZONE,
            created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            resend_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_admin_invitations_company_id ON admin_invitations(company_id);
        CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
        CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(invitation_token);
        CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);

        -- Enable RLS e políticas permissivas
        ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "admin_invitations_full_access" ON admin_invitations;
        CREATE POLICY "admin_invitations_full_access" ON admin_invitations
          FOR ALL USING (true) WITH CHECK (true);

        -- Conceder permissões
        GRANT ALL ON admin_invitations TO anon;
        GRANT ALL ON admin_invitations TO authenticated;
        GRANT ALL ON admin_invitations TO service_role;
      `;

      // Executar SQL usando rpc exec_sql
      const { data, error } = await getSupabaseClient().rpc('exec_sql', { 
        sql_query: migrationSQL 
      });

      if (error) {
        console.error('❌ [MIGRATION] Erro ao executar migração:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao aplicar migração',
          details: error.message
        });
      }

      console.log('✅ [MIGRATION] Migração executada com sucesso');

      // Testar se a tabela foi criada
      const { data: testData, error: testError } = await getSupabaseClient()
        .from('admin_invitations')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('❌ [MIGRATION] Tabela não foi criada corretamente:', testError);
        return res.status(500).json({
          success: false,
          error: 'Tabela não foi criada corretamente',
          details: testError.message
        });
      }

      console.log('✅ [MIGRATION] Tabela admin_invitations criada e funcionando!');

      res.json({
        success: true,
        message: 'Migração aplicada com sucesso',
        data: {
          table_created: true,
          indexes_created: true,
          rls_enabled: true,
          permissions_granted: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ [MIGRATION] Erro geral na migração:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno ao aplicar migração',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);
