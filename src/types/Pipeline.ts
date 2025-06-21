export interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card?: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  time_unit?: 'minutes' | 'hours' | 'days';
  color: string;
  is_system_stage?: boolean;
  is_system?: boolean;
}

export interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  moved_at?: string;
  status?: 'active' | 'won' | 'lost';
  assigned_to?: string;
  created_by?: string;
  source?: 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
}

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  user_id: string;
  assigned_at: string;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: PipelineMember[];
  stages?: PipelineStage[];
  custom_fields?: CustomField[];
  pipeline_stages?: PipelineStage[];
  pipeline_custom_fields?: CustomField[];
  pipeline_members?: PipelineMember[];
}
