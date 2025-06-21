import { supabase } from '../lib/supabase';

export interface HistoryEntry {
  id?: string;
  lead_id: string;
  action: string;
  description: string;
  user_id?: string;
  user_name?: string;
  old_values?: any;
  new_values?: any;
  created_at?: string;
}

// Função principal para registrar histórico de leads
export const registerLeadHistory = async (entry: HistoryEntry): Promise<string | null> => {
  try {
    console.log('📝 Registrando entrada no histórico...', {
      action: entry.action,
      description: entry.description.substring(0, 50) + '...'
    });

    // Criar timestamp no horário do Brasil se não fornecido
    const brasilTime = entry.created_at || new Date().toLocaleString('en-CA', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(', ', 'T') + '-03:00';

    const historyEntry = {
      lead_id: entry.lead_id,
      action: entry.action,
      description: entry.description,
      user_id: entry.user_id || null,
      old_values: entry.old_values || null,
      new_values: entry.new_values || null,
      created_at: brasilTime
    };

    console.log('⏰ Salvando com timestamp Brasil:', brasilTime);

    const { data, error } = await supabase
      .from('lead_history')
      .insert([historyEntry])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir no histórico:', error);
      throw error;
    }

    const historyId = data?.id;
    console.log('✅ Histórico registrado com sucesso! ID:', historyId);
    
    return historyId;

  } catch (error) {
    console.error('❌ Erro ao registrar histórico:', error);
    return null;
  }
};

// Função para registrar movimentação de stage
export const registerStageMove = async (
  leadId: string,
  oldStageId: string,
  newStageId: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('🚀 Registrando movimentação de stage...', {
      leadId: leadId.substring(0, 8) + '...',
      oldStageId,
      newStageId,
      userId
    });

    // Buscar nomes das stages com logs detalhados
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .in('id', [oldStageId, newStageId]);

    if (stagesError) {
      console.error('❌ Erro ao buscar stages:', stagesError);
      throw stagesError;
    }

    console.log('📋 Stages encontradas:', stages);

    const oldStage = stages?.find(s => s.id === oldStageId);
    const newStage = stages?.find(s => s.id === newStageId);

    console.log('🔄 Movimentação identificada:', {
      oldStage: oldStage ? { id: oldStage.id, name: oldStage.name } : 'NÃO ENCONTRADA',
      newStage: newStage ? { id: newStage.id, name: newStage.name } : 'NÃO ENCONTRADA'
    });

    const description = `Lead movido de "${oldStage?.name || 'Etapa desconhecida'}" para "${newStage?.name || 'Etapa desconhecida'}"`;

    // Criar timestamp no horário do Brasil
    const brasilTime = new Date().toLocaleString('en-CA', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(', ', 'T') + '-03:00';

    console.log('⏰ Timestamp Brasil:', brasilTime);

    await registerLeadHistory({
      lead_id: leadId,
      action: 'stage_moved',
      description,
      user_id: userId,
      old_values: {
        stage_id: oldStageId,
        stage_name: oldStage?.name
      },
      new_values: {
        stage_id: newStageId,
        stage_name: newStage?.name
      },
      created_at: brasilTime
    });

    console.log('✅ Movimentação registrada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao registrar movimentação:', error);
  }
};

// Função para registrar criação de lead
export const registerLeadCreation = async (
  leadId: string,
  stageId: string,
  pipelineId: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('🆕 Registrando criação de lead...');

    // Buscar nome da stage
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('id', stageId)
      .single();

    await registerLeadHistory({
      lead_id: leadId,
      action: 'lead_created',
      description: `Lead criado na etapa "${stage?.name || 'Etapa desconhecida'}"`,
      user_id: userId,
      new_values: {
        stage_id: stageId,
        stage_name: stage?.name,
        pipeline_id: pipelineId
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar criação:', error);
  }
};

// Função para registrar comentário
export const registerComment = async (
  leadId: string,
  message: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('💬 Registrando comentário...');
    
    const preview = message.length > 50 ? message.substring(0, 50) + '...' : message;
    
    await registerLeadHistory({
      lead_id: leadId,
      action: 'comment_added',
      description: `Comentário adicionado: "${preview}"`,
      user_id: userId,
      new_values: {
        message_preview: message.substring(0, 100)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar comentário:', error);
  }
};

// Função para registrar feedback
export const registerFeedback = async (
  leadId: string,
  message: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('📢 Registrando feedback...');
    
    const preview = message.length > 50 ? message.substring(0, 50) + '...' : message;
    
    await registerLeadHistory({
      lead_id: leadId,
      action: 'feedback_added',
      description: `Feedback adicionado: "${preview}"`,
      user_id: userId,
      new_values: {
        message_preview: message.substring(0, 100)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar feedback:', error);
  }
};

// Função para registrar email (quando implementado)
export const registerEmail = async (
  leadId: string,
  subject: string,
  type: 'sent' | 'received' = 'sent',
  userId?: string
): Promise<void> => {
  try {
    console.log('📧 Registrando email...');
    
    const actionType = type === 'sent' ? 'enviado' : 'recebido';
    
    await registerLeadHistory({
      lead_id: leadId,
      action: `email_${type}`,
      description: `Email ${actionType}: "${subject}"`,
      user_id: userId,
      new_values: {
        subject,
        type
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar email:', error);
  }
};

// Função para registrar ação customizada
export const registerCustomAction = async (
  leadId: string,
  actionType: string,
  description: string,
  userId?: string,
  details?: any
): Promise<void> => {
  try {
    console.log('🔧 Registrando ação customizada...');
    
    await registerLeadHistory({
      lead_id: leadId,
      action: actionType,
      description,
      user_id: userId,
      new_values: details || {}
    });

  } catch (error) {
    console.error('❌ Erro ao registrar ação customizada:', error);
  }
};

// Função para obter histórico de um lead
export const getLeadHistory = async (leadId: string): Promise<HistoryEntry[]> => {
  try {
    console.log('📋 Buscando histórico do lead:', leadId);

    const { data, error } = await supabase
      .from('lead_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }

    console.log('✅ Histórico carregado:', data?.length || 0, 'entradas');
    return data || [];

  } catch (error) {
    console.error('❌ Erro geral ao buscar histórico:', error);
    return [];
  }
}; 