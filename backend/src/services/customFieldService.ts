import { supabase } from '../config/supabase';

export interface CustomField {
  id: string;
  pipeline_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[]; // Para campos select
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomFieldData {
  pipeline_id: string;
  field_name: string;
  field_label: string;
  field_type: CustomField['field_type'];
  field_options?: string[];
  is_required?: boolean;
  placeholder?: string;
}

export class CustomFieldService {
  // Criar tabelas se não existirem
  static async ensureTables(): Promise<void> {
    try {
      // Criar tabela pipeline_custom_fields usando query direta
      const { error: error1 } = await supabase
        .from('pipeline_custom_fields')
        .select('id')
        .limit(1);

      if (error1 && error1.code === 'PGRST116') {
        // Tabela não existe, criar usando SQL direto
        const { error: createError1 } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
              field_name VARCHAR(100) NOT NULL,
              field_label VARCHAR(200) NOT NULL,
              field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'number', 'date')),
              field_options JSONB,
              is_required BOOLEAN DEFAULT false,
              field_order INTEGER DEFAULT 0,
              placeholder TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(pipeline_id, field_name)
            );
          `
        });
        
        if (createError1) {
          console.warn('Erro ao criar tabela pipeline_custom_fields:', createError1);
        }
      }

      // Criar tabela pipeline_leads
      const { error: error2 } = await supabase
        .from('pipeline_leads')
        .select('id')
        .limit(1);

      if (error2 && error2.code === 'PGRST116') {
        const { error: createError2 } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS pipeline_leads (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
              stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
              lead_data JSONB NOT NULL DEFAULT '{}',
              created_by UUID NOT NULL REFERENCES users(id),
              assigned_to UUID REFERENCES users(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
        
        if (createError2) {
          console.warn('Erro ao criar tabela pipeline_leads:', createError2);
        }
      }

      console.log('✅ Tabelas de campos customizados verificadas/criadas');
    } catch (error) {
      console.warn('⚠️ Erro ao verificar/criar tabelas:', error);
    }
  }

  static async getCustomFieldsByPipeline(pipelineId: string): Promise<CustomField[]> {
    await this.ensureTables();

    // Primeiro, tentar criar as tabelas usando SQL direto se não existirem
    try {
      // Criar tabela pipeline_custom_fields
      const { error: createError1 } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL,
            field_name VARCHAR(100) NOT NULL,
            field_label VARCHAR(200) NOT NULL,
            field_type VARCHAR(50) NOT NULL,
            field_options JSONB,
            is_required BOOLEAN DEFAULT false,
            field_order INTEGER DEFAULT 0,
            placeholder TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });

      // Criar tabela pipeline_leads
      const { error: createError2 } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS pipeline_leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pipeline_id UUID NOT NULL,
            stage_id UUID NOT NULL,
            lead_data JSONB NOT NULL DEFAULT '{}',
            created_by UUID NOT NULL,
            assigned_to UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });

      if (!createError1 && !createError2) {
        console.log('✅ Tabelas criadas com sucesso');
      }
    } catch (createError) {
      console.warn('Tabelas podem já existir:', createError);
    }

    const { data: fields, error } = await supabase
      .from('pipeline_custom_fields')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('field_order');

    if (error) {
      throw new Error(`Erro ao buscar campos customizados: ${error.message}`);
    }

    return (fields || []).map(field => ({
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : undefined
    }));
  }

  static async createCustomField(data: CreateCustomFieldData): Promise<CustomField> {
    await this.ensureTables();

    // Buscar próximo order
    const { data: lastField } = await supabase
      .from('pipeline_custom_fields')
      .select('field_order')
      .eq('pipeline_id', data.pipeline_id)
      .order('field_order', { ascending: false })
      .limit(1)
      .single();

    const field_order = (lastField?.field_order || 0) + 1;

    const { data: field, error } = await supabase
      .from('pipeline_custom_fields')
      .insert({
        ...data,
        field_order,
        field_options: data.field_options ? JSON.stringify(data.field_options) : null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar campo customizado: ${error.message}`);
    }

    return {
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : undefined
    };
  }

  static async updateCustomField(id: string, data: Partial<CreateCustomFieldData>): Promise<CustomField> {
    const updateData = {
      ...data,
      field_options: data.field_options ? JSON.stringify(data.field_options) : undefined
    };

    const { data: field, error } = await supabase
      .from('pipeline_custom_fields')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar campo customizado: ${error.message}`);
    }

    return {
      ...field,
      field_options: field.field_options ? JSON.parse(field.field_options) : undefined
    };
  }

  static async deleteCustomField(id: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_custom_fields')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir campo customizado: ${error.message}`);
    }
  }

  static async reorderFields(pipelineId: string, fieldOrders: { id: string; field_order: number }[]): Promise<void> {
    const updates = fieldOrders.map(({ id, field_order }) =>
      supabase
        .from('pipeline_custom_fields')
        .update({ field_order })
        .eq('id', id)
        .eq('pipeline_id', pipelineId)
    );

    await Promise.all(updates);
  }
} 