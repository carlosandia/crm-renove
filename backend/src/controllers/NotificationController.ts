import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface CreateNotificationRequest {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: 'novidades' | 'atualizacoes' | 'comunicados';
  priority?: 'low' | 'medium' | 'high';
  targetRole?: 'super_admin' | 'admin' | 'member';
  targetUsers?: string[];
  richContent?: {
    image_url?: string;
    action_button?: string;
    action_url?: string;
  };
  scheduledFor?: string;
  expiresAt?: string;
}



export class NotificationController {
  /**
   * Criar notificação enterprise (Super Admin only)
   * POST /api/notifications/create
   */
  static async createNotification(req: Request, res: Response) {
    try {
      const {
        title,
        message,
        type = 'info',
        category = 'comunicados',
        priority = 'medium',
        targetRole,
        targetUsers = [],
        richContent = {},
        scheduledFor,
        expiresAt
      }: CreateNotificationRequest = req.body;

      // Validação de entrada
      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: 'Título e mensagem são obrigatórios'
        });
      }

      // Verificar se usuário é super_admin
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Apenas Super Admins podem criar notificações'
        });
      }

      // Chamar função do banco para criar notificação
      const { data, error } = await supabase.rpc('create_enterprise_notification', {
        p_title: title,
        p_message: message,
        p_type: type,
        p_category: category,
        p_priority: priority,
        p_target_role: targetRole,
        p_target_users: JSON.stringify(targetUsers),
        p_rich_content: JSON.stringify(richContent),
        p_scheduled_for: scheduledFor,
        p_expires_at: expiresAt,
        p_created_by: userId,
        p_tenant_id: req.user?.tenant_id
      });

      if (error) {
        console.error('Erro ao criar notificação:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }

      res.json({
        success: true,
        data: {
          notificationId: data,
          message: 'Notificação criada com sucesso'
        }
      });

    } catch (error) {
      console.error('Erro no controller de notificações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar notificações para interface admin
   * GET /api/notifications/admin
   */
  static async getAdminNotifications(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        priority,
        status,
        search
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir query
      let query = supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          type,
          notification_category,
          priority,
          target_role,
          target_users,
          rich_content,
          scheduled_for,
          expires_at,
          status,
          created_at,
          created_by,
          click_tracking
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      // Aplicar filtros
      if (category) {
        query = query.eq('notification_category', category);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
      }

      const { data: notifications, error } = await query;

      if (error) {
        console.error('Erro ao buscar notificações admin:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar notificações'
        });
      }

      // Buscar contagem total
      let countQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true });

      if (category) countQuery = countQuery.eq('notification_category', category);
      if (priority) countQuery = countQuery.eq('priority', priority);
      if (status) countQuery = countQuery.eq('status', status);
      if (search) {
        countQuery = countQuery.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
      }

      const { count } = await countQuery;

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / Number(limit))
          }
        }
      });

    } catch (error) {
      console.error('Erro no controller admin de notificações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Rastrear clique em notificação
   * POST /api/notifications/track-click
   */
  static async trackClick(req: Request, res: Response) {
    try {
      const { notificationId, actionType = 'click' } = req.body;

      if (!notificationId) {
        return res.status(400).json({
          success: false,
          error: 'ID da notificação é obrigatório'
        });
      }

      const { data, error } = await supabase.rpc('track_notification_click', {
        p_notification_id: notificationId,
        p_action_type: actionType
      });

      if (error) {
        console.error('Erro ao rastrear clique:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao rastrear clique'
        });
      }

      res.json({
        success: true,
        data: {
          tracked: data,
          message: 'Clique rastreado com sucesso'
        }
      });

    } catch (error) {
      console.error('Erro no tracking de clique:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Processar notificações agendadas
   * PUT /api/notifications/process-scheduled
   */
  static async processScheduled(req: Request, res: Response) {
    try {
      const { data, error } = await supabase.rpc('process_scheduled_notifications');

      if (error) {
        console.error('Erro ao processar notificações agendadas:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao processar notificações agendadas'
        });
      }

      res.json({
        success: true,
        data: {
          processedCount: data,
          message: `${data} notificações processadas`
        }
      });

    } catch (error) {
      console.error('Erro no processamento de notificações agendadas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obter analytics de notificações
   * GET /api/notifications/analytics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        category,
        priority
      } = req.query;

      let query = supabase
        .from('notification_analytics')
        .select('*')
        .order('date_sent', { ascending: false });

      // Aplicar filtros de data
      if (startDate) {
        query = query.gte('date_sent', startDate);
      }
      if (endDate) {
        query = query.lte('date_sent', endDate);
      }
      if (category) {
        query = query.eq('notification_category', category);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data: analytics, error } = await query;

      if (error) {
        console.error('Erro ao buscar analytics:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar analytics'
        });
      }

      // Calcular métricas agregadas
      const totalSent = analytics.reduce((sum, item) => sum + item.total_sent, 0);
      const totalRead = analytics.reduce((sum, item) => sum + item.total_read, 0);
      const totalClicked = analytics.reduce((sum, item) => sum + item.total_clicked, 0);

      const aggregatedMetrics = {
        totalSent,
        totalRead,
        totalClicked,
        overallReadRate: totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) : 0,
        overallClickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : 0
      };

      res.json({
        success: true,
        data: {
          analytics,
          aggregatedMetrics
        }
      });

    } catch (error) {
      console.error('Erro no controller de analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Marcar notificação como lida
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao marcar como lida:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao marcar notificação como lida'
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Notificação marcada como lida'
        }
      });

    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar notificações do usuário
   * GET /api/notifications/user
   */
  static async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        category
      } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (unreadOnly === 'true') {
        query = query.eq('read', false);
      }

      if (category) {
        query = query.eq('notification_category', category);
      }

      // Filtrar notificações não expiradas
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      const { data: notifications, error } = await query;

      if (error) {
        console.error('Erro ao buscar notificações do usuário:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar notificações'
        });
      }

      // Contar não lidas
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .eq('status', 'sent')
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount: unreadCount || 0,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            hasMore: notifications.length === Number(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar notificações do usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
} 