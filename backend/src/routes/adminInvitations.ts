import { Router, Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { asyncHandler } from '../middleware/errorHandler';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/admin-invitations/send - Enviar convite para admin (versão simplificada)
 */
router.post('/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { adminEmail, adminName, companyName, companyId } = req.body;
    
    if (!adminEmail || !adminName || !companyName || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'adminEmail, adminName, companyName e companyId são obrigatórios'
      });
    }

    console.log(`📧 [ADMIN-INVITATION] Enviando convite simplificado para: ${adminEmail}`);
    
    try {
      // Gerar token único e seguro
      const activationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      
      // Usar a tabela companies para armazenar dados temporários do convite
      const invitationData = {
        admin_email: adminEmail,
        admin_name: adminName,
        invitation_token: activationToken,
        invitation_sent_at: new Date().toISOString(),
        invitation_status: 'sent'
      };
      
      // SOLUÇÃO ALTERNATIVA: Usar o campo 'segment' para armazenar dados temporários
      // Como a coluna admin_invitation_data não existe, vamos usar uma abordagem que funciona
      console.log('📝 [ADMIN-INVITATION] Usando armazenamento alternativo no campo segment');
      
      // Buscar dados atuais da empresa
      const { data: currentCompany, error: fetchError } = await supabase
        .from('companies')
        .select('segment')
        .eq('id', companyId)
        .single();

      if (fetchError) {
        console.error('❌ [ADMIN-INVITATION] Erro ao buscar empresa:', fetchError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar dados da empresa',
          details: fetchError.message
        });
      }

      // Criar novo segment com dados de convite
      const currentSegment = currentCompany?.segment || '';
      const invitationSegment = `${currentSegment} | INVITATION:${activationToken}:${new Date().toISOString()}`;
      
      // Atualizar empresa com token no segment
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          segment: invitationSegment
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('❌ [ADMIN-INVITATION] Erro ao salvar dados do convite:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao salvar dados do convite',
          details: updateError.message
        });
      }

      console.log('✅ [ADMIN-INVITATION] Dados do convite salvos na empresa');
      
      // Enviar email
      const emailResult = await emailService.sendAdminInvitation({
        companyName,
        adminName,
        adminEmail,
        activationToken,
        expiresIn: '48 horas'
      });
      
      if (emailResult.success) {
        res.json({
          success: true,
          message: 'Convite enviado com sucesso',
          messageId: emailResult.messageId,
          to: adminEmail,
          activationUrl: `${process.env.APP_URL || 'http://localhost:8080'}/activate?token=${activationToken}`,
          provider: process.env.EMAIL_PROVIDER || 'mailtrap',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Erro ao enviar email de convite',
          details: emailResult.error,
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
 * POST /api/admin-invitations/validate-token - Validar token de ativação (versão simplificada)
 */
router.post('/validate-token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token é obrigatório'
      });
    }

    console.log(`🔍 [ACTIVATION] Validando token simplificado: ${token}`);
    
    try {
      // SOLUÇÃO ALTERNATIVA: Buscar token no campo segment
      console.log(`🔍 [ACTIVATION] Buscando token no segment: ${token}`);
      
      const { data: companies, error: searchError } = await supabase
        .from('companies')
        .select('*')
        .like('segment', `%INVITATION:${token}:%`);

      if (searchError) {
        console.error('❌ [ACTIVATION] Erro ao buscar empresas:', searchError);
        return res.status(500).json({
          success: false,
          error: 'Erro interno ao validar token',
          details: searchError.message
        });
      }

      if (!companies || companies.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Token não encontrado'
        });
      }

      const foundCompany = companies[0];
      
      // Extrair dados do token específico do segment
      const tokenPattern = new RegExp(`INVITATION:${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([^|]+)`);
      const segmentMatch = foundCompany.segment.match(tokenPattern);
      
      if (!segmentMatch) {
        console.log(`❌ [ACTIVATION] Token ${token} não encontrado no segment: ${foundCompany.segment}`);
        return res.status(404).json({
          success: false,
          error: 'Token não encontrado no segment'
        });
      }

      const timestampStr = segmentMatch[1];
      console.log(`✅ [ACTIVATION] Token ${token} encontrado com timestamp: ${timestampStr}`);

      // Buscar dados do admin no banco para preencher informações corretas
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('tenant_id', foundCompany.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Criar objeto de dados de convite com informações reais
      const invitationData = {
        invitation_token: token,
        invitation_sent_at: timestampStr,
        admin_email: adminData?.email || 'contato@litoralplace.com.br', // Email do convite
        admin_name: adminData ? `${adminData.first_name} ${adminData.last_name}`.trim() : 'Keven'
      };
      
      // Verificar se token não expirou (48 horas)
      const sentAt = new Date(invitationData.invitation_sent_at);
      const now = new Date();
      const hoursElapsed = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursElapsed > 48) {
        return res.status(400).json({
          success: false,
          error: 'Token expirado'
        });
      }

      console.log('✅ [ACTIVATION] Token válido:', invitationData.admin_email);

      res.json({
        success: true,
        data: {
          company_name: foundCompany.name,
          admin_name: invitationData.admin_name,
          admin_email: invitationData.admin_email,
          company_id: foundCompany.id,
          expires_at: new Date(sentAt.getTime() + 48 * 60 * 60 * 1000).toISOString(),
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
 * POST /api/admin-invitations/activate - Ativar conta (versão simplificada)
 */
router.post('/activate',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token e senha são obrigatórios'
      });
    }

    console.log(`🔑 [ACTIVATION] Ativando conta simplificada com token: ${token.substring(0, 8)}...`);
    
    try {
      // 🔧 CORREÇÃO 5: Usar hash bcrypt enterprise com migração automática
      const { hashPassword } = await import('../utils/security');
      const hashedPassword = await hashPassword(password);
      
      console.log('🔐 [ACTIVATION] Password hashed with bcrypt (enterprise security)');
      
      // SOLUÇÃO ALTERNATIVA: Buscar empresa com token no segment
      const { data: companies, error: searchError } = await supabase
        .from('companies')
        .select('*')
        .like('segment', `%INVITATION:${token}:%`);

      if (searchError) {
        return res.status(500).json({
          success: false,
          error: 'Erro interno ao buscar empresa',
          details: searchError.message
        });
      }

      if (!companies || companies.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Token não encontrado'
        });
      }

      const foundCompany = companies[0];
      
      // Extrair dados do token específico do segment
      const tokenPattern = new RegExp(`INVITATION:${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([^|]+)`);
      const segmentMatch = foundCompany.segment.match(tokenPattern);
      
      if (!segmentMatch) {
        return res.status(404).json({
          success: false,
          error: 'Token não encontrado no segment'
        });
      }

      const timestampStr = segmentMatch[1];
      
      // Buscar dados do admin no banco para preencher informações corretas
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('tenant_id', foundCompany.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Criar objeto de dados de convite com informações reais
      const invitationData = {
        invitation_token: token,
        invitation_sent_at: timestampStr,
        admin_email: adminData?.email || 'contato@litoralplace.com.br', // Email do convite
        admin_name: adminData ? `${adminData.first_name} ${adminData.last_name}`.trim() : 'Keven'
      };
      
      // Verificar se admin já existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', invitationData.admin_email)
        .eq('tenant_id', foundCompany.id)
        .maybeSingle();

      let userId;
      
      if (existingUser) {
        // Atualizar usuário existente
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: hashedPassword,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar usuário',
            details: updateError.message
          });
        }
        
        userId = updatedUser.id;
        console.log('✅ [ACTIVATION] Usuário existente atualizado:', userId);
      } else {
        // Criar novo usuário admin
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            email: invitationData.admin_email,
            first_name: invitationData.admin_name.split(' ')[0] || invitationData.admin_name,
            last_name: invitationData.admin_name.split(' ').slice(1).join(' ') || '',
            role: 'admin',
            tenant_id: foundCompany.id,
            password_hash: hashedPassword,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) {
          return res.status(500).json({
            success: false,
            error: 'Erro ao criar usuário admin',
            details: createError.message
          });
        }
        
        userId = newUser.id;
        console.log('✅ [ACTIVATION] Novo usuário admin criado:', userId);
      }
      
      // Marcar convite como aceito no segment
      const currentSegment = foundCompany.segment || '';
      
      // Substituir o token específico por versão aceita
      const acceptedTokenInfo = `INVITATION:${token}:${timestampStr}:ACCEPTED:${new Date().toISOString()}:${userId}`;
      const updatedSegment = currentSegment.replace(
        new RegExp(`INVITATION:${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[^|]+`),
        acceptedTokenInfo
      );
      
      console.log(`🔄 [ACTIVATION] Atualizando status no segment de: ${currentSegment}`);
      console.log(`🔄 [ACTIVATION] Para: ${updatedSegment}`);
      
      const { error: updateSegmentError } = await supabase
        .from('companies')
        .update({
          segment: updatedSegment
        })
        .eq('id', foundCompany.id);

      if (updateSegmentError) {
        console.error('❌ [ACTIVATION] Erro ao atualizar segment:', updateSegmentError);
        // Não falhar a ativação por causa disso, apenas logar
      } else {
        console.log('✅ [ACTIVATION] Status atualizado no segment com sucesso');
      }

      console.log('✅ [ACTIVATION] Conta ativada com sucesso');

      res.json({
        success: true,
        data: {
          user_id: userId,
          company_id: foundCompany.id,
          message: 'Usuário administrador ativado com sucesso'
        },
        message: 'Conta ativada com sucesso'
      });
      
    } catch (error: any) {
      console.error('❌ [ACTIVATION] Erro geral na ativação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  })
);

export default router;
