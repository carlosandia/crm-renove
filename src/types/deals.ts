export interface Deal {
  id: string;
  deal_name: string;
  company_name?: string;
  contact_id?: string;
  contact_name?: string;
  pipeline_id: string;
  stage_id: string;
  amount?: number;
  currency?: string;
  close_date?: string;
  probability?: number;
  status?: 'open' | 'won' | 'lost';
  owner_id?: string;
  owner_name?: string;
  description?: string;
  next_step?: string;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  company_id: string;
  
  // Additional fields for enterprise features
  source?: string;
  campaign_id?: string;
  lost_reason?: string;
  won_reason?: string;
  forecast_category?: 'pipeline' | 'best_case' | 'commit' | 'closed';
  expected_revenue?: number;
  weighted_amount?: number;
}

export interface DealStats {
  totalValue: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  conversionRate: number;
  averageDealSize: number;
  monthlyGrowth: number;
  averageSalesCycle: number;
  winRate: number;
}

export interface DealFilters {
  search?: string;
  pipeline_id?: string;
  stage_id?: string;
  owner_id?: string;
  contact_id?: string;
  status?: 'open' | 'won' | 'lost';
  amount_min?: number;
  amount_max?: number;
  close_date_from?: string;
  close_date_to?: string;
  probability_min?: number;
  probability_max?: number;
  created_date_from?: string;
  created_date_to?: string;
  source?: string;
  forecast_category?: 'pipeline' | 'best_case' | 'commit' | 'closed';
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_id: string;
  stages?: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  probability: number;
  color: string;
  is_closed_won?: boolean;
  is_closed_lost?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  due_date?: string;
  completed_date?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DealCreateRequest {
  deal_name: string;
  company_name?: string;
  contact_id?: string;
  pipeline_id: string;
  stage_id: string;
  amount?: number;
  close_date?: string;
  probability?: number;
  owner_id?: string;
  description?: string;
  next_step?: string;
  source?: string;
  campaign_id?: string;
}

export interface DealUpdateRequest extends Partial<DealCreateRequest> {
  status?: 'open' | 'won' | 'lost';
  lost_reason?: string;
  won_reason?: string;
  forecast_category?: 'pipeline' | 'best_case' | 'commit' | 'closed';
}

export interface DealResponse {
  data: Deal[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DealStatsResponse {
  data: DealStats;
}

export interface PipelineResponse {
  data: Pipeline[];
  total: number;
}

export interface DealForecast {
  pipeline_id: string;
  pipeline_name: string;
  total_amount: number;
  weighted_amount: number;
  deal_count: number;
  stages: {
    stage_id: string;
    stage_name: string;
    amount: number;
    deal_count: number;
    probability: number;
  }[];
}

export interface DealForecastResponse {
  data: DealForecast[];
  period: {
    start_date: string;
    end_date: string;
  };
} 