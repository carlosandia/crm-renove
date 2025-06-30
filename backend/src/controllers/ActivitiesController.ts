import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface Activity {
  id?: string;
  company_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'demo';
  subject: string;
  description?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  activity_date?: string;
  due_date?: string;
  duration_minutes?: number;
  related_to_type?: 'contact' | 'deal';
  related_to_id?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to: string;
  created_by?: string;
  email_thread_id?: string;
  call_duration?: number;
  call_outcome?: string;
  meeting_location?: string;
  meeting_url?: string;
  attendees?: string[];
  custom_fields?: Record<string, string | number | boolean | null>;
}

interface ActivityFilters {
  search?: string;
  activity_type?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  contact_id?: string;
  deal_id?: string;
  related_to_type?: string;
  related_to_id?: string;
  activity_date_from?: string;
  activity_date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  limit?: number;
  offset?: number;
}

export class ActivitiesController {
  // GET /api/activities - List activities with advanced filtering
  static async getActivities(req: Request, res: Response) {
    try {
      const {
        search,
        activity_type,
        status,
        priority,
        assigned_to,
        contact_id,
        deal_id,
        related_to_type,
        related_to_id,
        activity_date_from,
        activity_date_to,
        due_date_from,
        due_date_to,
        limit = 50,
        offset = 0
      } = req.query as ActivityFilters;

      let query = supabase
        .from('activities')
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          created_by_user:users!created_by(id, name, email),
          contact:contacts!contact_id(id, first_name, last_name, email),
          deal:deals!deal_id(id, deal_name, amount, deal_status)
        `)
        .order('activity_date', { ascending: false });

      // Apply filters
      if (search) {
        query = query.or(`
          subject.ilike.%${search}%,
          description.ilike.%${search}%
        `);
      }

      if (activity_type) {
        query = query.eq('activity_type', activity_type);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      if (contact_id) {
        query = query.eq('contact_id', contact_id);
      }

      if (deal_id) {
        query = query.eq('deal_id', deal_id);
      }

      if (related_to_type) {
        query = query.eq('related_to_type', related_to_type);
      }

      if (related_to_id) {
        query = query.eq('related_to_id', related_to_id);
      }

      if (activity_date_from) {
        query = query.gte('activity_date', activity_date_from);
      }

      if (activity_date_to) {
        query = query.lte('activity_date', activity_date_to);
      }

      if (due_date_from) {
        query = query.gte('due_date', due_date_from);
      }

      if (due_date_to) {
        query = query.lte('due_date', due_date_to);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: activities, error } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
        return res.status(500).json({ error: 'Failed to fetch activities' });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true });

      res.json({
        activities,
        pagination: {
          total: totalCount || 0,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: (Number(offset) + Number(limit)) < (totalCount || 0)
        }
      });

    } catch (error) {
      console.error('Unexpected error in getActivities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/activities/:id - Get single activity with full details
  static async getActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data: activity, error } = await supabase
        .from('activities')
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          created_by_user:users!created_by(id, name, email),
          contact:contacts!contact_id(
            id, first_name, last_name, email, phone, account_name
          ),
          deal:deals!deal_id(
            id, deal_name, amount, deal_status,
            pipeline:pipelines(id, name),
            stage:pipeline_stages(id, name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Activity not found' });
        }
        console.error('Error fetching activity:', error);
        return res.status(500).json({ error: 'Failed to fetch activity' });
      }

      res.json({ activity });

    } catch (error) {
      console.error('Unexpected error in getActivity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/activities - Create new activity
  static async createActivity(req: Request, res: Response) {
    try {
      const activityData: Activity = req.body;
      const userId = req.user?.id;

      // Validate authentication
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate required fields
      if (!activityData.subject || !activityData.activity_type || !activityData.company_id) {
        return res.status(400).json({ 
          error: 'Subject, activity type, and company ID are required' 
        });
      }

      // Set default values
      const newActivity: Activity = {
        ...activityData,
        created_by: userId,
        assigned_to: activityData.assigned_to || userId,
        status: activityData.status || 'planned',
        priority: activityData.priority || 'normal',
        activity_date: activityData.activity_date || new Date().toISOString(),
        duration_minutes: activityData.duration_minutes || 0
      };

      // Set related fields based on related_to_type
      if (activityData.related_to_type === 'contact' && activityData.related_to_id) {
        newActivity.contact_id = activityData.related_to_id;
      } else if (activityData.related_to_type === 'deal' && activityData.related_to_id) {
        newActivity.deal_id = activityData.related_to_id;
      }

      const { data: activity, error } = await supabase
        .from('activities')
        .insert([newActivity])
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          created_by_user:users!created_by(id, name, email),
          contact:contacts!contact_id(id, first_name, last_name, email),
          deal:deals!deal_id(id, deal_name, amount, deal_status)
        `)
        .single();

      if (error) {
        console.error('Error creating activity:', error);
        return res.status(500).json({ error: 'Failed to create activity' });
      }

      console.log(`Activity created: ${activity.id} by user ${userId}`);
      res.status(201).json({ activity });

    } catch (error) {
      console.error('Unexpected error in createActivity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/activities/:id - Update activity
  static async updateActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<Activity> = req.body;
      const userId = (req as any).user?.id;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.created_by;

      const { data: activity, error } = await supabase
        .from('activities')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          created_by_user:users!created_by(id, name, email),
          contact:contacts!contact_id(id, first_name, last_name, email),
          deal:deals!deal_id(id, deal_name, amount, deal_status)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Activity not found' });
        }
        console.error('Error updating activity:', error);
        return res.status(500).json({ error: 'Failed to update activity' });
      }

      console.log(`Activity updated: ${id} by user ${userId}`);
      res.json({ activity });

    } catch (error) {
      console.error('Unexpected error in updateActivity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/activities/:id/complete - Mark activity as completed
  static async completeActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { call_outcome, call_duration, notes } = req.body;
      const userId = (req as any).user?.id;

      const updateData: any = {
        status: 'completed',
        updated_at: new Date().toISOString()
      };

      if (call_outcome) {
        updateData.call_outcome = call_outcome;
      }

      if (call_duration) {
        updateData.call_duration = call_duration;
      }

      if (notes) {
        updateData.description = notes;
      }

      const { data: activity, error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          contact:contacts!contact_id(id, first_name, last_name, email),
          deal:deals!deal_id(id, deal_name, amount, deal_status)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Activity not found' });
        }
        console.error('Error completing activity:', error);
        return res.status(500).json({ error: 'Failed to complete activity' });
      }

      console.log(`Activity completed: ${id} by user ${userId}`);
      res.json({ activity });

    } catch (error) {
      console.error('Unexpected error in completeActivity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /api/activities/:id - Delete activity
  static async deleteActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting activity:', error);
        return res.status(500).json({ error: 'Failed to delete activity' });
      }

      console.log(`Activity deleted: ${id} by user ${userId}`);
      res.json({ message: 'Activity deleted successfully' });

    } catch (error) {
      console.error('Unexpected error in deleteActivity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/activities/timeline/:type/:id - Get timeline for contact or deal
  static async getTimeline(req: Request, res: Response) {
    try {
      const { type, id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!['contact', 'deal'].includes(type)) {
        return res.status(400).json({ error: 'Type must be "contact" or "deal"' });
      }

      const limitNum = Number(limit);
      const offsetNum = Number(offset);

      let query = supabase
        .from('activities')
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          created_by_user:users!created_by(id, name, email)
        `)
        .order('activity_date', { ascending: false });

      if (type === 'contact') {
        query = query.eq('contact_id', id);
      } else {
        query = query.eq('deal_id', id);
      }

      query = query.range(offsetNum, offsetNum + limitNum - 1);

      const { data: activities, error } = await query;

      if (error) {
        console.error('Error fetching timeline:', error);
        return res.status(500).json({ error: 'Failed to fetch timeline' });
      }

      res.json({
        timeline: activities,
        type,
        relatedId: id,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: activities?.length === limitNum
        }
      });

    } catch (error) {
      console.error('Unexpected error in getTimeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/activities/stats - Get activity statistics
  static async getActivityStats(req: Request, res: Response) {
    try {
      const { assigned_to, period = '30' } = req.query;

      let baseQuery = supabase.from('activities').select('*');
      
      if (assigned_to) {
        baseQuery = baseQuery.eq('assigned_to', assigned_to);
      }

      // Get activities for the specified period
      const periodDays = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const [
        { data: allActivities },
        { data: completedActivities },
        { data: pendingActivities },
        { data: overdueActivities },
        { data: recentActivities }
      ] = await Promise.all([
        baseQuery,
        supabase.from('activities').select('*').eq('status', 'completed'),
        supabase.from('activities').select('*').eq('status', 'planned'),
        supabase.from('activities').select('*').eq('status', 'planned').lt('due_date', new Date().toISOString()),
        supabase.from('activities').select('*').gte('created_at', startDate.toISOString())
      ]);

      // Group by activity type
      const byType = allActivities?.reduce((acc, activity) => {
        const type = activity.activity_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Group by status
      const byStatus = allActivities?.reduce((acc, activity) => {
        const status = activity.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalCount = allActivities?.length || 0;
      const completedCount = completedActivities?.length || 0;
      const completionRate = totalCount > 0 ? (completedCount / totalCount * 100).toFixed(2) : '0.00';

      res.json({
        summary: {
          totalActivities: totalCount,
          completedActivities: completedCount,
          pendingActivities: pendingActivities?.length || 0,
          overdueActivities: overdueActivities?.length || 0,
          recentActivities: recentActivities?.length || 0
        },
        metrics: {
          completionRate: `${completionRate}%`,
          avgActivitiesPerDay: (totalCount / periodDays).toFixed(2)
        },
        breakdown: {
          byType,
          byStatus
        },
        period: `${periodDays} days`
      });

    } catch (error) {
      console.error('Unexpected error in getActivityStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/activities/upcoming - Get upcoming activities for dashboard
  static async getUpcomingActivities(req: Request, res: Response) {
    try {
      const { assigned_to, days = '7' } = req.query;

      const daysAhead = parseInt(days as string);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      let query = supabase
        .from('activities')
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email),
          contact:contacts!contact_id(id, first_name, last_name, email),
          deal:deals!deal_id(id, deal_name, amount)
        `)
        .eq('status', 'planned')
        .gte('due_date', new Date().toISOString())
        .lte('due_date', endDate.toISOString())
        .order('due_date', { ascending: true });

      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }

      const { data: activities, error } = await query;

      if (error) {
        console.error('Error fetching upcoming activities:', error);
        return res.status(500).json({ error: 'Failed to fetch upcoming activities' });
      }

      // Group by date
      const byDate = activities?.reduce((acc, activity) => {
        const date = activity.due_date?.split('T')[0] || 'no-date';
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(activity);
        return acc;
      }, {} as Record<string, any[]>) || {};

      res.json({
        upcomingActivities: activities,
        groupedByDate: byDate,
        totalCount: activities?.length || 0,
        period: `Next ${daysAhead} days`
      });

    } catch (error) {
      console.error('Unexpected error in getUpcomingActivities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
