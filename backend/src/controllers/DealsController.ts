import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface Deal {
  id?: string;
  company_id: string;
  deal_name: string;
  deal_type?: 'new_business' | 'existing_business' | 'renewal';
  pipeline_id: string;
  stage_id: string;
  amount?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  created_date?: string;
  primary_contact_id?: string;
  account_name?: string;
  deal_stage?: string;
  deal_status?: 'open' | 'won' | 'lost';
  win_loss_reason?: string;
  competitor?: string;
  lead_source?: string;
  campaign_id?: string;
  owner_id: string;
  created_by?: string;
  description?: string;
  next_step?: string;
  custom_fields?: Record<string, any>;
}

interface DealFilters {
  search?: string;
  pipeline_id?: string;
  stage_id?: string;
  owner_id?: string;
  deal_status?: string;
  deal_type?: string;
  lead_source?: string;
  amount_min?: number;
  amount_max?: number;
  expected_close_date_from?: string;
  expected_close_date_to?: string;
  limit?: number;
  offset?: number;
}

export class DealsController {
  // GET /api/deals - List deals with advanced filtering
  static async getDeals(req: Request, res: Response) {
    try {
      const {
        search,
        pipeline_id,
        stage_id,
        owner_id,
        deal_status,
        deal_type,
        lead_source,
        amount_min,
        amount_max,
        expected_close_date_from,
        expected_close_date_to,
        limit = 50,
        offset = 0
      } = req.query as DealFilters;

      let query = supabase
        .from('deals')
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, order_index),
          primary_contact:contacts!primary_contact_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (search) {
        query = query.or(`
          deal_name.ilike.%${search}%,
          account_name.ilike.%${search}%,
          description.ilike.%${search}%
        `);
      }

      if (pipeline_id) {
        query = query.eq('pipeline_id', pipeline_id);
      }

      if (stage_id) {
        query = query.eq('stage_id', stage_id);
      }

      if (owner_id) {
        query = query.eq('owner_id', owner_id);
      }

      if (deal_status) {
        query = query.eq('deal_status', deal_status);
      }

      if (deal_type) {
        query = query.eq('deal_type', deal_type);
      }

      if (lead_source) {
        query = query.eq('lead_source', lead_source);
      }

      if (amount_min) {
        query = query.gte('amount', amount_min);
      }

      if (amount_max) {
        query = query.lte('amount', amount_max);
      }

      if (expected_close_date_from) {
        query = query.gte('expected_close_date', expected_close_date_from);
      }

      if (expected_close_date_to) {
        query = query.lte('expected_close_date', expected_close_date_to);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: deals, error } = await query;

      if (error) {
        console.error('Error fetching deals:', error);
        return res.status(500).json({ error: 'Failed to fetch deals' });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true });

      res.json({
        deals,
        pagination: {
          total: totalCount || 0,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: (Number(offset) + Number(limit)) < (totalCount || 0)
        }
      });

    } catch (error) {
      console.error('Unexpected error in getDeals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/deals/:id - Get single deal with full details
  static async getDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data: deal, error } = await supabase
        .from('deals')
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, order_index),
          primary_contact:contacts!primary_contact_id(
            id, first_name, last_name, email, phone, account_name
          ),
          activities:activities(
            id, activity_type, subject, status, activity_date, due_date, description
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Deal not found' });
        }
        console.error('Error fetching deal:', error);
        return res.status(500).json({ error: 'Failed to fetch deal' });
      }

      res.json({ deal });

    } catch (error) {
      console.error('Unexpected error in getDeal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/deals - Create new deal
  static async createDeal(req: Request, res: Response) {
    try {
      const dealData: Deal = req.body;
      const userId = (req as any).user?.id;

      // Validate required fields
      if (!dealData.deal_name || !dealData.company_id || !dealData.pipeline_id || !dealData.stage_id) {
        return res.status(400).json({ 
          error: 'Deal name, company ID, pipeline ID, and stage ID are required' 
        });
      }

      // Set default values
      const newDeal: Deal = {
        ...dealData,
        created_by: userId,
        owner_id: dealData.owner_id || userId,
        deal_status: dealData.deal_status || 'open',
        deal_type: dealData.deal_type || 'new_business',
        currency: dealData.currency || 'BRL',
        amount: dealData.amount || 0,
        probability: dealData.probability || 0,
        lead_source: dealData.lead_source || 'manual'
      };

      const { data: deal, error } = await supabase
        .from('deals')
        .insert([newDeal])
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, order_index)
        `)
        .single();

      if (error) {
        console.error('Error creating deal:', error);
        return res.status(500).json({ error: 'Failed to create deal' });
      }

      console.log(`Deal created: ${deal.id} by user ${userId}`);
      res.status(201).json({ deal });

    } catch (error) {
      console.error('Unexpected error in createDeal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/deals/:id - Update deal
  static async updateDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: Partial<Deal> = req.body;
      const userId = (req as any).user?.id;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.created_by;

      const { data: deal, error } = await supabase
        .from('deals')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          created_by_user:users!created_by(id, name, email),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, order_index)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Deal not found' });
        }
        console.error('Error updating deal:', error);
        return res.status(500).json({ error: 'Failed to update deal' });
      }

      console.log(`Deal updated: ${id} by user ${userId}`);
      res.json({ deal });

    } catch (error) {
      console.error('Unexpected error in updateDeal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/deals/:id/stage - Move deal to different stage
  static async moveDealStage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stage_id, probability } = req.body;
      const userId = (req as any).user?.id;

      if (!stage_id) {
        return res.status(400).json({ error: 'Stage ID is required' });
      }

      const updateData: any = {
        stage_id,
        stage_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (probability !== undefined) {
        updateData.probability = probability;
      }

      const { data: deal, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, order_index)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Deal not found' });
        }
        console.error('Error moving deal stage:', error);
        return res.status(500).json({ error: 'Failed to move deal stage' });
      }

      console.log(`Deal ${id} moved to stage ${stage_id} by user ${userId}`);
      res.json({ deal });

    } catch (error) {
      console.error('Unexpected error in moveDealStage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/deals/:id/close - Close deal as won or lost
  static async closeDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { deal_status, win_loss_reason, competitor, actual_close_date } = req.body;
      const userId = (req as any).user?.id;

      if (!deal_status || !['won', 'lost'].includes(deal_status)) {
        return res.status(400).json({ error: 'Deal status must be "won" or "lost"' });
      }

      const updateData = {
        deal_status,
        win_loss_reason,
        competitor,
        actual_close_date: actual_close_date || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      const { data: deal, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          owner:users!owner_id(id, name, email),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, order_index)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Deal not found' });
        }
        console.error('Error closing deal:', error);
        return res.status(500).json({ error: 'Failed to close deal' });
      }

      console.log(`Deal ${id} closed as ${deal_status} by user ${userId}`);
      res.json({ deal });

    } catch (error) {
      console.error('Unexpected error in closeDeal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /api/deals/:id - Delete deal
  static async deleteDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting deal:', error);
        return res.status(500).json({ error: 'Failed to delete deal' });
      }

      console.log(`Deal deleted: ${id} by user ${userId}`);
      res.json({ message: 'Deal deleted successfully' });

    } catch (error) {
      console.error('Unexpected error in deleteDeal:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/deals/stats - Get deal statistics and forecasting
  static async getDealStats(req: Request, res: Response) {
    try {
      const { pipeline_id, owner_id, period = '30' } = req.query;

      let baseQuery = supabase.from('deals').select('*');
      
      if (pipeline_id) {
        baseQuery = baseQuery.eq('pipeline_id', pipeline_id);
      }

      if (owner_id) {
        baseQuery = baseQuery.eq('owner_id', owner_id);
      }

      // Get deals for the specified period
      const periodDays = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const [
        { data: allDeals },
        { data: openDeals },
        { data: wonDeals },
        { data: lostDeals },
        { data: recentDeals }
      ] = await Promise.all([
        baseQuery,
        supabase.from('deals').select('*').eq('deal_status', 'open'),
        supabase.from('deals').select('*').eq('deal_status', 'won'),
        supabase.from('deals').select('*').eq('deal_status', 'lost'),
        supabase.from('deals').select('*').gte('created_at', startDate.toISOString())
      ]);

      const totalValue = allDeals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
      const wonValue = wonDeals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
      const openValue = openDeals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
      const lostValue = lostDeals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;

      const totalCount = allDeals?.length || 0;
      const wonCount = wonDeals?.length || 0;
      const lostCount = lostDeals?.length || 0;

      // Calculate conversion rates
      const winRate = totalCount > 0 ? (wonCount / totalCount * 100).toFixed(2) : '0.00';
      const lossRate = totalCount > 0 ? (lostCount / totalCount * 100).toFixed(2) : '0.00';

      // Calculate average deal size
      const avgDealSize = totalCount > 0 ? (totalValue / totalCount).toFixed(2) : '0.00';
      const avgWonDealSize = wonCount > 0 ? (wonValue / wonCount).toFixed(2) : '0.00';

      // Forecasting - weighted pipeline value
      const forecastValue = openDeals?.reduce((sum, deal) => {
        return sum + ((deal.amount || 0) * (deal.probability || 0) / 100);
      }, 0) || 0;

      res.json({
        summary: {
          totalDeals: totalCount,
          openDeals: openDeals?.length || 0,
          wonDeals: wonCount,
          lostDeals: lostCount,
          recentDeals: recentDeals?.length || 0
        },
        values: {
          totalValue: totalValue.toFixed(2),
          openValue: openValue.toFixed(2),
          wonValue: wonValue.toFixed(2),
          lostValue: lostValue.toFixed(2),
          forecastValue: forecastValue.toFixed(2)
        },
        metrics: {
          winRate: `${winRate}%`,
          lossRate: `${lossRate}%`,
          avgDealSize: avgDealSize,
          avgWonDealSize: avgWonDealSize
        },
        period: `${periodDays} days`
      });

    } catch (error) {
      console.error('Unexpected error in getDealStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/deals/pipeline/:pipeline_id/forecast - Get pipeline forecast
  static async getPipelineForecast(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { period = 'quarter' } = req.query;

      // Get deals in pipeline with stages
      const { data: deals, error } = await supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(id, name, order_index)
        `)
        .eq('pipeline_id', pipeline_id)
        .eq('deal_status', 'open');

      if (error) {
        console.error('Error fetching pipeline forecast:', error);
        return res.status(500).json({ error: 'Failed to fetch pipeline forecast' });
      }

      // Group deals by stage
      const stageGroups: Record<string, any[]> = {};
      deals?.forEach(deal => {
        const stageId = deal.stage_id;
        if (!stageGroups[stageId]) {
          stageGroups[stageId] = [];
        }
        stageGroups[stageId].push(deal);
      });

      // Calculate forecast by stage
      const stageForecasts = Object.entries(stageGroups).map(([stageId, stageDeals]) => {
        const totalValue = stageDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
        const weightedValue = stageDeals.reduce((sum, deal) => {
          return sum + ((deal.amount || 0) * (deal.probability || 0) / 100);
        }, 0);

        return {
          stageId,
          stageName: stageDeals[0]?.stage?.name || 'Unknown',
          stageOrder: stageDeals[0]?.stage?.order_index || 0,
          dealCount: stageDeals.length,
          totalValue: totalValue.toFixed(2),
          weightedValue: weightedValue.toFixed(2),
          avgProbability: stageDeals.reduce((sum, deal) => sum + (deal.probability || 0), 0) / stageDeals.length
        };
      }).sort((a, b) => a.stageOrder - b.stageOrder);

      const totalForecast = stageForecasts.reduce((sum, stage) => sum + parseFloat(stage.weightedValue), 0);
      const totalPipeline = stageForecasts.reduce((sum, stage) => sum + parseFloat(stage.totalValue), 0);

      res.json({
        pipelineId: pipeline_id,
        period,
        summary: {
          totalDeals: deals?.length || 0,
          totalPipelineValue: totalPipeline.toFixed(2),
          totalForecastValue: totalForecast.toFixed(2),
          avgProbability: deals?.length ? 
            (deals.reduce((sum, deal) => sum + (deal.probability || 0), 0) / deals.length).toFixed(2) : '0.00'
        },
        stageForecasts
      });

    } catch (error) {
      console.error('Unexpected error in getPipelineForecast:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
