import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar pipelines
    const { data: pipelines, error: pipelinesError } = await supabaseAdmin
      .from('pipelines')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    if (pipelinesError) {
      throw pipelinesError
    }

    if (!pipelines || pipelines.length === 0) {
      return NextResponse.json({ pipelines: [] })
    }

    // Para cada pipeline, buscar membros e etapas
    const pipelinesWithDetails = await Promise.all(
      pipelines.map(async (pipeline) => {
        // Buscar membros
        const { data: pipelineMembers } = await supabaseAdmin
          .from('pipeline_members')
          .select('*')
          .eq('pipeline_id', pipeline.id)

        // Buscar dados dos usuários membros
        const membersWithUserData = await Promise.all(
          (pipelineMembers || []).map(async (pm) => {
            const { data: userData } = await supabaseAdmin
              .from('users')
              .select('id, first_name, last_name, email')
              .eq('id', pm.member_id)
              .single()

            return {
              ...pm,
              member: userData
            }
          })
        )

        // Buscar etapas
        const { data: stages } = await supabaseAdmin
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index')

        return {
          ...pipeline,
          pipeline_members: membersWithUserData || [],
          pipeline_stages: stages || []
        }
      })
    )

    return NextResponse.json({ pipelines: pipelinesWithDetails })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao buscar pipelines',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      description, 
      tenant_id, 
      created_by, 
      member_ids = [], 
      stages = [], 
      custom_fields = [] 
    } = await request.json()

    if (!name || !tenant_id || !created_by) {
      return NextResponse.json(
        { error: 'Nome, tenant_id e created_by são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('email', created_by)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado', details: userError?.message },
        { status: 400 }
      )
    }

    // Criar pipeline
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .from('pipelines')
      .insert({
        name,
        description,
        tenant_id,
        created_by: user.id
      })
      .select()
      .single()

    if (pipelineError) {
      throw pipelineError
    }

    const pipelineId = pipeline.id

    // Adicionar membros se fornecidos
    if (member_ids.length > 0) {
      const memberInserts = member_ids.map((member_id: string) => ({
        pipeline_id: pipelineId,
        member_id
      }))

      const { error: membersError } = await supabaseAdmin
        .from('pipeline_members')
        .insert(memberInserts)

      if (membersError) {
        console.error('Erro ao adicionar membros:', membersError)
      }
    }

    // Criar etapas se fornecidas
    if (stages.length > 0) {
      const stageInserts = stages.map((stage: any, index: number) => ({
        pipeline_id: pipelineId,
        name: stage.name,
        temperature_score: stage.temperature_score || 50,
        max_days_allowed: stage.max_days_allowed || 7,
        color: stage.color || '#3B82F6',
        order_index: stage.order_index !== undefined ? stage.order_index : index + 1
      }))

      const { error: stagesError } = await supabaseAdmin
        .from('pipeline_stages')
        .insert(stageInserts)

      if (stagesError) {
        throw stagesError
      }
    }

    // Criar campos customizados se fornecidos
    let fieldsCreated = false
    if (custom_fields.length > 0) {
      const fieldInserts = custom_fields.map((field: any) => ({
        pipeline_id: pipelineId,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        is_required: field.is_required || false,
        field_order: field.field_order || 1,
        placeholder: field.placeholder
      }))

      const { error: fieldsError } = await supabaseAdmin
        .from('pipeline_custom_fields')
        .insert(fieldInserts)

      if (fieldsError) {
        console.error('Erro ao criar campos customizados:', fieldsError)
      } else {
        fieldsCreated = true
      }
    }

    return NextResponse.json({ 
      message: 'Pipeline criada com sucesso',
      pipeline,
      stages_created: stages.length,
      fields_created: fieldsCreated,
      fields_attempted: custom_fields.length
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro ao criar pipeline',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 