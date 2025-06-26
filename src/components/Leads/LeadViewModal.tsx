import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, Mail, Phone, Building, Calendar, MapPin, 
  ExternalLink, Target, Tag, Clock, TrendingUp,
  Globe, Search, Eye, X, History, Activity, Info, Edit, Check, X as XIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';

interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  assigned_to?: string;
  estimated_value?: number;
  created_by: string;
  job_title?: string;
  last_contact_date?: string;
  next_action_date?: string;
  lead_score?: number;
  probability?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  ip_address?: string;
  user_agent?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  position?: string;
  source?: string;
}

interface Opportunity {
  id: string;
  nome_oportunidade: string;
  valor?: number;
  created_at: string;
  pipeline_name?: string;
  stage_name?: string;
  status: 'active' | 'won' | 'lost';
  created_by_name?: string;
}

interface LeadViewModalProps {
  leadData: LeadMaster | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: LeadMaster) => void;
}

interface EditingState {
  [key: string]: boolean;
}

interface EditValues {
  [key: string]: string;
}

const LeadViewModal: React.FC<LeadViewModalProps> = ({
  leadData,
  isOpen,
  onClose,
  onLeadUpdated
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  
  // Estados para edição inline
  const [editing, setEditing] = useState<EditingState>({});
  const [editValues, setEditValues] = useState<EditValues>({});
  const [saving, setSaving] = useState<EditingState>({});
  
  // Estado local para dados atualizados (para refletir mudanças na interface)
  const [localLeadData, setLocalLeadData] = useState<LeadMaster | null>(null);

  // ============================================
  // EARLY RETURNS SIMPLIFICADOS
  // ============================================

  if (!isOpen || !leadData) {
    return null;
  }

  // Usar dados locais atualizados se disponíveis, senão usar leadData original
  const currentLeadData = localLeadData || leadData;

  // ============================================
  // MEMOIZED FUNCTIONS
  // ============================================

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getTemperatureColor = useCallback((temperature?: string) => {
    switch (temperature?.toLowerCase()) {
      case 'hot':
      case 'quente':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warm':
      case 'morno':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold':
      case 'frio':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusColor = useCallback((status?: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'novo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'contacted':
      case 'contatado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'qualified':
      case 'qualificado':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'converted':
      case 'convertido':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'lost':
      case 'perdido':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getOpportunityStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'won':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'lost':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'active':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }, []);

  const getOpportunityStatusText = useCallback((status: string) => {
    switch (status) {
      case 'won':
        return 'Venda Realizada';
      case 'lost':
        return 'Venda Perdida';
      case 'active':
      default:
        return 'Em Andamento';
    }
  }, []);

  const formatCurrency = useCallback((value?: number) => {
    if (!value) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  // ============================================
  // SINCRONIZAÇÃO COM PIPELINE_LEADS
  // ============================================

  // ✅ ETAPA 2: MAPEAMENTO PADRONIZADO DE CAMPOS COM lead_master_id
  const FIELD_MAPPING = {
    // Campos básicos de identidade
    'first_name': 'nome_lead', // Será concatenado com last_name
    'last_name': 'nome_lead',  // Será concatenado com first_name
    'email': 'email',
    'phone': 'telefone',
    'company': 'empresa',
    'job_title': 'cargo',
    'position': 'cargo', // Fallback para job_title
    'lead_source': 'origem',
    'source': 'origem', // Fallback para lead_source
    'city': 'cidade',
    'state': 'estado',
    'country': 'pais',
    // Campos adicionais importantes
    'lead_temperature': 'temperatura',
    'status': 'status',
    'estimated_value': 'valor',
    'notes': 'observacoes',
    'utm_source': 'utm_source',
    'utm_medium': 'utm_medium',
    'utm_campaign': 'utm_campaign',
    'utm_term': 'utm_term',
    'utm_content': 'utm_content',
    'referrer': 'referrer',
    'landing_page': 'landing_page',
    'ip_address': 'ip_address',
    'user_agent': 'user_agent'
  };

  // ✅ Função MELHORADA para sincronizar mudanças com pipeline_leads - PASSO 1
  const syncWithPipelineLeads = useCallback(async (leadMasterId: string, updatedData: any) => {
    try {
      console.log('🔄 [LeadViewModal] Iniciando sincronização MELHORADA com pipeline_leads...', leadMasterId);
      console.log('📊 [LeadViewModal] Dados recebidos para sincronização:', updatedData);
      
      // ✅ ETAPA 5: Buscar pipeline_leads usando lead_master_id (nova abordagem)
      console.log('🔍 [LeadViewModal] Buscando pipeline_leads via lead_master_id:', leadMasterId);
      
      // Primeiro tentar buscar diretamente por lead_master_id (pós-migração)
      let { data: pipelineLeads, error: searchError } = await supabase
        .from('pipeline_leads')
        .select('id, custom_data, lead_master_id')
        .eq('lead_master_id', leadMasterId);
      
      // Se não encontrou nada, tentar busca por custom_data (fallback compatibilidade)
      if (!pipelineLeads || pipelineLeads.length === 0) {
        console.log('🔄 [LeadViewModal] Tentando busca por custom_data->lead_master_id...');
        const { data: fallbackLeads, error: fallbackError } = await supabase
          .from('pipeline_leads')
          .select('id, custom_data, lead_master_id')
        .eq('custom_data->>lead_master_id', leadMasterId);
        
        if (!fallbackError && fallbackLeads) {
          pipelineLeads = fallbackLeads;
          searchError = fallbackError;
          console.log('✅ [LeadViewModal] Encontrados pipeline_leads via custom_data:', fallbackLeads.length);
        }
      }
        
      if (searchError) {
        console.warn('⚠️ [LeadViewModal] Erro ao buscar pipeline_leads:', searchError);
        return;
      }
      
      if (!pipelineLeads || pipelineLeads.length === 0) {
        console.log('ℹ️ [LeadViewModal] Nenhum pipeline_lead vinculado encontrado para sincronização');
        return;
      }
      
      console.log(`🔗 [LeadViewModal] Encontrados ${pipelineLeads.length} pipeline_leads para sincronizar`);
      
      // 2. Para cada pipeline_lead encontrado, atualizar os dados
      for (const pipelineLead of pipelineLeads) {
        const currentCustomData = pipelineLead.custom_data || {};
        
        // ✅ MAPEAMENTO INTELIGENTE DE TODOS OS CAMPOS
        const updatedCustomData = { ...currentCustomData };
        
        // Processar cada campo atualizado
        Object.keys(updatedData).forEach(leadMasterField => {
          const value = updatedData[leadMasterField];
          
          // Caso especial: concatenar nome completo
          if (leadMasterField === 'first_name' || leadMasterField === 'last_name') {
            // Buscar dados atuais do lead_master para concatenar corretamente
            const currentFirstName = leadMasterField === 'first_name' ? value : (localLeadData?.first_name || '');
            const currentLastName = leadMasterField === 'last_name' ? value : (localLeadData?.last_name || '');
            
            if (currentFirstName || currentLastName) {
              updatedCustomData.nome_lead = `${currentFirstName} ${currentLastName}`.trim();
              console.log('📝 [LeadViewModal] Nome completo atualizado:', updatedCustomData.nome_lead);
            }
          }
                  // Campos diretos com mapeamento
        else if ((FIELD_MAPPING as any)[leadMasterField]) {
          const pipelineField = (FIELD_MAPPING as any)[leadMasterField];
          updatedCustomData[pipelineField] = value;
          console.log(`📝 [LeadViewModal] Campo mapeado: ${leadMasterField} → ${pipelineField} = ${value}`);
        }
          // Campos sem mapeamento específico (mantém o nome original)
          else {
            updatedCustomData[leadMasterField] = value;
            console.log(`📝 [LeadViewModal] Campo direto: ${leadMasterField} = ${value}`);
          }
        });
        
        // ✅ ETAPA 5: Garantir que lead_master_id esteja no custom_data e na tabela
        updatedCustomData.lead_master_id = leadMasterId;
        
        // 3. Atualizar pipeline_lead com dados mapeados + lead_master_id
        const { error: updateError } = await supabase
          .from('pipeline_leads')
          .update({
            custom_data: updatedCustomData,
            lead_master_id: leadMasterId, // ✅ ETAPA 5: Garantir campo na tabela
            updated_at: new Date().toISOString()
          })
          .eq('id', pipelineLead.id);
          
        if (updateError) {
          console.error('❌ [LeadViewModal] Erro ao atualizar pipeline_lead:', pipelineLead.id, updateError);
        } else {
          console.log('✅ [LeadViewModal] Pipeline_lead sincronizado:', pipelineLead.id);
          console.log('📊 [LeadViewModal] Custom_data atualizado:', updatedCustomData);
        }
      }
      
      console.log('🎉 [LeadViewModal] Sincronização MELHORADA com pipeline_leads concluída');
      
            // ✅ EVENTO GLOBAL MELHORADO - REMOVIDO DUPLICAÇÃO
      
    } catch (error) {
      console.error('❌ [LeadViewModal] Erro na sincronização MELHORADA com pipeline_leads:', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }, [localLeadData]); // ✅ Adicionada dependência localLeadData

  // ============================================
  // FUNCTIONS - INLINE EDITING (CORRIGIDO E MELHORADO)
  // ============================================

  // ✅ PASSO 3: MAPEAMENTO DE CAMPOS EDITÁVEIS - PADRONIZAÇÃO
  const EDITABLE_FIELD_MAPPING = {
    // Campo frontend → Campo real na tabela leads_master
    'nome': { 
      fields: ['first_name', 'last_name'], 
      handler: 'special_name' // Tratamento especial para separar nome e sobrenome
    },
    'email': { fields: ['email'], handler: 'direct' },
    'telefone': { fields: ['phone'], handler: 'direct' },
    'empresa': { fields: ['company'], handler: 'direct' },
    'cargo': { fields: ['job_title'], handler: 'direct' },
    'origem': { fields: ['lead_source'], handler: 'direct' },
    'cidade': { fields: ['city'], handler: 'direct' },
    'estado': { fields: ['state'], handler: 'direct' },
    'pais': { fields: ['country'], handler: 'direct' },
    'temperatura': { fields: ['lead_temperature'], handler: 'direct' },
    'status': { fields: ['status'], handler: 'direct' },
    'valor': { fields: ['estimated_value'], handler: 'number' },
    'observacoes': { fields: ['notes'], handler: 'direct' }
  };

  const saveField = useCallback(async (frontendField: string) => {
    console.log('💾 [LeadViewModal] Iniciando salvamento MELHORADO do campo:', frontendField, 'Valor:', editValues[frontendField]);
    
    if (!leadData?.id) {
      console.error('❌ [LeadViewModal] Lead ID não encontrado');
      toast({
        title: 'Lead não encontrado',
        variant: 'destructive'
      });
      return;
    }

    if (editValues[frontendField] === undefined || editValues[frontendField] === null) {
      console.error('❌ [LeadViewModal] Valor do campo não definido:', frontendField);
      toast({
        title: 'Valor do campo inválido',
        variant: 'destructive'
      });
      return;
    }

    // ✅ PASSO 3: RESOLVER MAPEAMENTO DO CAMPO
    const fieldMapping = EDITABLE_FIELD_MAPPING[frontendField as keyof typeof EDITABLE_FIELD_MAPPING];
    if (!fieldMapping) {
      console.error('❌ [LeadViewModal] Campo não mapeado:', frontendField);
      toast({
        title: 'Campo não reconhecido: ' + frontendField,
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, [frontendField]: true }));
      console.log('📡 [LeadViewModal] Mapeamento encontrado:', fieldMapping);
      
      let updateData: any = {};
      const inputValue = editValues[frontendField];

      // ✅ PASSO 3: PROCESSAR VALOR BASEADO NO HANDLER
      switch (fieldMapping.handler) {
        case 'special_name':
          // Tratamento especial para nome completo
          const parts = inputValue.trim().split(' ');
          if (parts.length === 1) {
            updateData.first_name = parts[0];
            updateData.last_name = '';
          } else {
            updateData.first_name = parts[0];
            updateData.last_name = parts.slice(1).join(' ');
          }
          console.log('📝 [LeadViewModal] Nome processado:', updateData);
          break;
          
        case 'number':
          // Converter string para número
          const numValue = parseFloat(inputValue.replace(/[^\d.,]/g, '').replace(',', '.'));
          (updateData as any)[fieldMapping.fields[0]] = isNaN(numValue) ? null : numValue;
          console.log('🔢 [LeadViewModal] Número processado:', updateData);
          break;
          
        case 'direct':
        default:
          // Atribuição direta
          (updateData as any)[fieldMapping.fields[0]] = inputValue;
          console.log('📝 [LeadViewModal] Valor direto:', updateData);
          break;
      }

      // ✅ SOLUÇÃO 4: SISTEMA DE FALLBACK ROBUSTO PARA SALVAMENTO
      console.log('📡 [LeadViewModal] Iniciando salvamento com fallback robusto...');
      console.log('📊 [LeadViewModal] Dados sendo enviados:', updateData);
      
      let updateResult = null;
      let saveMethod = 'unknown';
      
      try {
        // TENTATIVA 1: Usar função RPC segura
        console.log('🔄 [LeadViewModal] Tentativa 1: Função RPC safe_update_lead');
        const { data: rpcResult, error: rpcError } = await supabase.rpc('safe_update_lead', {
          lead_id: leadData.id,
          lead_data: updateData
        });

        if (rpcError) {
          console.warn('⚠️ [LeadViewModal] RPC falhou, tentando fallback:', rpcError.message);
          throw rpcError;
        }
        
        // Verificar se a função RPC retornou erro
        if (rpcResult && !rpcResult.success) {
          console.warn('⚠️ [LeadViewModal] RPC retornou erro, tentando fallback:', rpcResult.error);
          throw new Error(rpcResult.error || 'Erro na validação dos dados');
        }

        updateResult = rpcResult;
        saveMethod = 'rpc';
        console.log('✅ [LeadViewModal] Salvamento via RPC bem-sucedido!');
        
      } catch (rpcError) {
        console.log('🔄 [LeadViewModal] Tentativa 2: Update direto na tabela leads_master');
        
        try {
          // TENTATIVA 2: Update direto na tabela leads_master
          const { data: directResult, error: directError } = await supabase
        .from('leads_master')
            .update({
              ...updateData,
              updated_at: new Date().toISOString()
            })
            .eq('id', leadData.id)
            .select()
            .single();

          if (directError) {
            console.warn('⚠️ [LeadViewModal] Update direto falhou, tentando pipeline_leads:', directError.message);
            throw directError;
          }

          updateResult = {
            success: true,
            method: 'direct_leads_master',
            updated_data: directResult,
            lead_id: leadData.id
          };
          saveMethod = 'direct_leads_master';
          console.log('✅ [LeadViewModal] Salvamento direto em leads_master bem-sucedido!');
          
        } catch (directError) {
          console.log('🔄 [LeadViewModal] Tentativa 3: Buscar pipeline_leads relacionados');
          
                     try {
             // TENTATIVA 3 CORRIGIDA: Buscar e atualizar pipeline_leads relacionados
             console.log('🔍 [LeadViewModal] Buscando pipeline_leads por lead_master_id:', leadData.id);
             
             // Buscar por lead_master_id primeiro
             let { data: pipelineLeads, error: searchError } = await supabase
               .from('pipeline_leads')
               .select('id, custom_data, lead_master_id')
               .eq('lead_master_id', leadData.id);
 
             // Se não encontrar por lead_master_id, buscar por email como fallback
             if (!pipelineLeads || pipelineLeads.length === 0) {
               console.log('🔄 [LeadViewModal] Não encontrou por lead_master_id, buscando por email:', updateData.email);
               
               const { data: emailLeads, error: emailError } = await supabase
                 .from('pipeline_leads')
                 .select('id, custom_data, lead_master_id')
                 .eq('custom_data->email', updateData.email);
               
               if (emailLeads && emailLeads.length > 0) {
                 console.log('🔗 [LeadViewModal] Encontrou leads por email, vinculando ao lead_master_id');
                 
                 // Vincular esses leads ao lead_master_id
                 const linkPromises = emailLeads.map(pl => 
                   supabase
                     .from('pipeline_leads')
                     .update({ lead_master_id: leadData.id })
                     .eq('id', pl.id)
                 );
                 
                 await Promise.all(linkPromises);
                 pipelineLeads = emailLeads.map(pl => ({ ...pl, lead_master_id: leadData.id }));
                 console.log('✅ [LeadViewModal] Leads vinculados com sucesso');
               }
             }
 
             if (!pipelineLeads || pipelineLeads.length === 0) {
               console.error('❌ [LeadViewModal] Nenhum pipeline_leads encontrado para sincronizar');
               throw new Error('Não foi possível encontrar leads relacionados para atualizar');
             }
 
             console.log('📊 [LeadViewModal] Pipeline_leads encontrados:', pipelineLeads.length);
 
             // Mapear dados para custom_data
             const customDataUpdate = {
               nome_lead: updateData.first_name && updateData.last_name 
                 ? `${updateData.first_name} ${updateData.last_name}`.trim()
                 : updateData.first_name || '',
               email: updateData.email,
               telefone: updateData.phone,
               empresa: updateData.company,
               cargo: updateData.job_title,
               origem: updateData.lead_source,
               cidade: updateData.city,
               estado: updateData.state,
               pais: updateData.country,
               observacoes: updateData.notes
             };
 
             // Atualizar todos os pipeline_leads relacionados
             const updatePromises = pipelineLeads.map(pl => 
               supabase
                 .from('pipeline_leads')
                 .update({
                   custom_data: {
                     ...pl.custom_data,
                     ...customDataUpdate
                   },
                   lead_master_id: leadData.id, // Garantir vinculação
                   updated_at: new Date().toISOString()
                 })
                 .eq('id', pl.id)
             );
 
             await Promise.all(updatePromises);

            updateResult = {
              success: true,
              method: 'pipeline_leads_fallback',
              updated_data: customDataUpdate,
              pipeline_leads_count: pipelineLeads.length,
              lead_id: leadData.id
            };
            saveMethod = 'pipeline_leads_fallback';
            console.log('✅ [LeadViewModal] Salvamento via pipeline_leads fallback bem-sucedido!');
            
          } catch (fallbackError) {
            console.error('❌ [LeadViewModal] Todas as tentativas de salvamento falharam:', fallbackError);
            throw new Error('Erro ao salvar: ' + (fallbackError as Error).message);
          }
        }
      }

      console.log('✅ [LeadViewModal] Campo salvo com sucesso via:', saveMethod);
      console.log('📊 [LeadViewModal] Resultado detalhado:', updateResult);
      
      // ✅ LOGS DETALHADOS DA SINCRONIZAÇÃO
      if (updateResult) {
        console.log(`🔄 [LeadViewModal] Sincronização: ${updateResult.nome_antes} → ${updateResult.nome_depois}`);
        console.log(`📈 [LeadViewModal] Pipeline leads atualizados: ${updateResult.pipeline_leads_count}`);
        console.log(`🎯 [LeadViewModal] Status da sincronização:`, updateResult.sync_info);
      }

      // ✅ Atualizar dados locais com valores corretos
      setLocalLeadData(prev => ({
        ...prev,
        ...updateData
      } as LeadMaster));

      // ✅ PASSO 4: SINCRONIZAÇÃO INTELIGENTE MELHORADA
      console.log('🔄 [LeadViewModal] Iniciando sincronização INTELIGENTE melhorada...');
      
      // Preparar dados para sincronização baseado no método de salvamento
      let syncData = updateData;
      let pipelineLeadsToUpdate = [];
      
      if (saveMethod === 'rpc' && updateResult?.updated_data) {
        // Se RPC funcionou, usar dados retornados
        syncData = updateResult.updated_data;
      } else if (saveMethod === 'direct_leads_master' && updateResult?.updated_data) {
        // Se update direto funcionou, usar dados retornados
        syncData = updateResult.updated_data;
      } else if (saveMethod === 'pipeline_leads_fallback') {
        // Se já atualizamos pipeline_leads, não precisamos sincronizar novamente
        console.log('✅ [LeadViewModal] Pipeline_leads já atualizado via fallback, pulando sincronização');
      }
      
      // Sincronizar apenas se não foi via pipeline_leads_fallback
      if (saveMethod !== 'pipeline_leads_fallback') {
        try {
          await syncWithPipelineLeads(leadData.id, syncData);
      console.log('✅ [LeadViewModal] Sincronização com pipeline_leads concluída');
        } catch (syncError) {
          console.warn('⚠️ [LeadViewModal] Erro na sincronização, mas salvamento principal foi bem-sucedido:', syncError);
        }
      }

      // ✅ EVENTO DE SINCRONIZAÇÃO GLOBAL MELHORADO
      console.log('🎯 [LeadViewModal] Preparando evento de sincronização global melhorado...');
      
      // 🔍 DIAGNÓSTICO ETAPA 1: Verificar timing dos dados
      console.log('🔍 [DIAGNÓSTICO] Estado dos dados antes da construção do cardData:', {
        updateData: {
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          email: updateData.email
        },
        localLeadData: {
          first_name: localLeadData?.first_name,
          last_name: localLeadData?.last_name,
          email: localLeadData?.email
        },
        timing: 'ANTES da construção do cardData'
      });
      
      // ✅ ETAPA 1: MAPEAMENTO CORRIGIDO PARA SINCRONIZAÇÃO PERFEITA
      const cardData = {
        // ✅ FONTE ÚNICA GARANTIDA: Usar APENAS updateData (dados de leads_master)
        nome_lead: updateData.first_name && updateData.last_name 
          ? `${updateData.first_name} ${updateData.last_name}`.trim()
          : updateData.first_name || 'Lead sem nome',
        
        // ✅ CAMPOS DE CONTATO - SEMPRE ATUALIZADOS DE LEADS_MASTER
        email: updateData.email || '',
        telefone: updateData.phone || '',
        
        // ✅ CAMPOS PROFISSIONAIS - SEMPRE ATUALIZADOS DE LEADS_MASTER
        empresa: updateData.company || '',
        cargo: updateData.job_title || '',
        
        // ✅ CAMPOS DE ORIGEM E STATUS - SEMPRE ATUALIZADOS DE LEADS_MASTER
        origem: updateData.lead_source || '',
        temperatura: updateData.lead_temperature || 'warm',
        status: updateData.status || 'active',
        
        // ✅ CAMPOS DE LOCALIZAÇÃO - SEMPRE ATUALIZADOS DE LEADS_MASTER
        cidade: updateData.city || '',
        estado: updateData.state || '',
        pais: updateData.country || '',
        
        // ✅ CAMPOS DE OBSERVAÇÕES - SEMPRE ATUALIZADOS DE LEADS_MASTER
        observacoes: updateData.notes || '',
        
        // ✅ CAMPOS DE VALOR E CAMPANHA - SEMPRE ATUALIZADOS DE LEADS_MASTER
        valor: updateData.estimated_value || 0,
        campanha: updateData.campaign_name || '',
        
        // ✅ CAMPOS UTM - SEMPRE ATUALIZADOS DE LEADS_MASTER
        utm_source: updateData.utm_source || '',
        utm_medium: updateData.utm_medium || '',
        utm_campaign: updateData.utm_campaign || '',
        utm_term: updateData.utm_term || '',
        utm_content: updateData.utm_content || '',
        
        // Campos adicionais para compatibilidade
        nome_oportunidade: updateData.first_name && updateData.last_name
          ? `Proposta - ${updateData.first_name} ${updateData.last_name}`.trim()
          : 'Proposta - Lead sem nome',
        
        // ✅ VINCULAÇÃO COM FONTE ÚNICA
        lead_master_id: leadData.id,
        
        // ✅ METADADOS DE SINCRONIZAÇÃO
        last_sync_at: new Date().toISOString(),
        data_source: 'leads_master',
        sync_method: 'leadViewModal_edit'
      };
      
      // 🔍 DIAGNÓSTICO ETAPA 1: Verificar resultado da construção do cardData
      console.log('🔍 [DIAGNÓSTICO] cardData construído:', {
        nome_lead_resultado: cardData.nome_lead,
        fonte_usada: updateData.first_name && updateData.last_name 
          ? 'updateData (CORRETO)' 
          : updateData.first_name 
            ? 'updateData.first_name apenas'
            : localLeadData?.first_name && localLeadData?.last_name
              ? 'localLeadData (PROBLEMA - dados antigos)'
              : 'fallback final',
        timing: 'APÓS construção do cardData'
      });
      
      // 🔍 ETAPA 2: DIAGNÓSTICO APRIMORADO - Verificar resultado da construção do cardData
      console.log('🔍 [ETAPA 2] cardData construído com fonte única:', {
        nome_lead_resultado: cardData.nome_lead,
        email_resultado: cardData.email,
        empresa_resultado: cardData.empresa,
        data_source: cardData.data_source,
        sync_method: cardData.sync_method,
        lead_master_id: cardData.lead_master_id,
        timing: 'APÓS construção do cardData com dados de leads_master'
      });
      
      // ✅ ETAPA 2: VALIDAÇÃO DE INTEGRIDADE DOS DADOS
      const dataIntegrityCheck = {
        hasNome: Boolean(cardData.nome_lead && cardData.nome_lead !== 'Lead sem nome'),
        hasEmail: Boolean(cardData.email),
        hasLeadMasterId: Boolean(cardData.lead_master_id),
        hasDataSource: cardData.data_source === 'leads_master',
        isComplete: Boolean(cardData.nome_lead && cardData.email && cardData.lead_master_id)
      };
      
      console.log('✅ [ETAPA 2] Validação de integridade:', dataIntegrityCheck);
      
      if (!dataIntegrityCheck.isComplete) {
        console.warn('⚠️ [ETAPA 2] Dados incompletos detectados:', {
          updateData,
          cardData,
          integrityCheck: dataIntegrityCheck
        });
      }

      // ✅ ETAPA 2: BUSCA MELHORADA COM MÚLTIPLOS CRITÉRIOS E VINCULAÇÃO AUTOMÁTICA
      let pipelineLeadIds: string[] = [];
      let vinculationCount = 0;
      
      try {
        console.log('🔍 [LeadViewModal] ETAPA 2: Busca inteligente de pipeline_leads...');
        
        // 1. Buscar por lead_master_id primeiro
        const { data: masterLeads } = await supabase
          .from('pipeline_leads')
          .select('id, custom_data, lead_master_id')
          .eq('lead_master_id', leadData.id);
        
        console.log('📊 [LeadViewModal] Busca por lead_master_id:', {
          leadMasterId: leadData.id,
          encontrados: masterLeads?.length || 0
        });
        
        // 2. Buscar órfãos por email para vincular automaticamente
        const { data: emailLeads } = await supabase
          .from('pipeline_leads')
          .select('id, custom_data, lead_master_id')
          .eq('custom_data->>email', cardData.email)
          .is('lead_master_id', null);
        
        console.log('📊 [LeadViewModal] Busca por email (órfãos):', {
          email: cardData.email,
          orfaosEncontrados: emailLeads?.length || 0
        });
        
        // 3. Buscar por nome + email (identificação composta)
        const { data: nameEmailLeads } = await supabase
          .from('pipeline_leads')
          .select('id, custom_data, lead_master_id')
          .eq('custom_data->>nome_lead', cardData.nome_lead)
          .eq('custom_data->>email', cardData.email)
          .is('lead_master_id', null);
        
        console.log('📊 [LeadViewModal] Busca por nome+email:', {
          nome: cardData.nome_lead,
          email: cardData.email,
          encontrados: nameEmailLeads?.length || 0
        });
        
        // 4. VINCULAR AUTOMATICAMENTE leads órfãos encontrados
        const orphanLeads = [
          ...(emailLeads || []),
          ...(nameEmailLeads || [])
        ].filter((lead, index, self) => 
          // Remover duplicados por ID
          index === self.findIndex(l => l.id === lead.id)
        );
        
        if (orphanLeads.length > 0) {
          console.log('🔗 [LeadViewModal] VINCULANDO automaticamente leads órfãos:', orphanLeads.length);
          
          // Vincular cada lead órfão ao lead_master_id
          const vinculationPromises = orphanLeads.map(async (orphan) => {
            try {
              const { error } = await supabase
                .from('pipeline_leads')
                .update({ 
                  lead_master_id: leadData.id,
                  custom_data: {
                    ...orphan.custom_data,
                    ...cardData, // Atualizar com dados mais recentes
                    lead_master_id: leadData.id
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', orphan.id);
              
              if (!error) {
                console.log('✅ [LeadViewModal] Lead órfão vinculado:', orphan.id);
                return orphan.id;
              } else {
                console.error('❌ [LeadViewModal] Erro ao vincular órfão:', orphan.id, error);
                return null;
              }
            } catch (err) {
              console.error('❌ [LeadViewModal] Erro na vinculação:', err);
              return null;
            }
          });
          
          const vinculatedIds = await Promise.all(vinculationPromises);
          vinculationCount = vinculatedIds.filter(id => id !== null).length;
          
          console.log('🎉 [LeadViewModal] Vinculação automática concluída:', {
            tentativas: orphanLeads.length,
            sucessos: vinculationCount,
            falhas: orphanLeads.length - vinculationCount
          });
        }
        
        // 5. Combinar todos os IDs encontrados
        const allRelatedIds = [
          ...(masterLeads?.map(l => l.id) || []),
          ...(emailLeads?.map(l => l.id) || []),
          ...(nameEmailLeads?.map(l => l.id) || [])
        ];
        
        pipelineLeadIds = [...new Set(allRelatedIds)];
        
        console.log('🔗 [LeadViewModal] ETAPA 2 CONCLUÍDA - Resultado final:', {
          porMasterId: masterLeads?.length || 0,
          porEmail: emailLeads?.length || 0,
          porNomeEmail: nameEmailLeads?.length || 0,
          vinculacoes: vinculationCount,
          totalEncontrados: pipelineLeadIds.length,
          ids: pipelineLeadIds
        });
        
      } catch (error) {
        console.error('❌ [LeadViewModal] Erro na busca melhorada:', error);
        pipelineLeadIds = [];
      }
      
      // Preparar dados completos para o evento
      const eventData = {
        // IDs para identificação múltipla
        leadMasterId: leadData.id,
        pipelineLeadIds,
        
        // Dados em múltiplos formatos
        rawData: updateData,
        cardData,
        customData: cardData, // Mesmo formato para custom_data
        
        // Dados completos do lead
        leadData: {
          ...localLeadData,
          ...updateData
        },
        
        // Metadados
        timestamp: Date.now(),
        source: 'LeadViewModal',
        saveMethod: saveMethod,
        
        // Compatibilidade com versão anterior
        updatedData: updateData,
        pipelineLeadsUpdated: pipelineLeadIds
      };
      
      // ✅ ETAPA 3: GARANTIR QUE EVENTO SEJA DISPARADO COM DADOS CORRETOS
      console.log('🔄 [LeadViewModal] Disparando evento leadDataUpdated com cardData:', {
        nome_lead: cardData.nome_lead,
        email: cardData.email,
        lead_master_id: cardData.lead_master_id,
        pipelineLeadIds: pipelineLeadIds.length
      });

      // Disparar evento para sincronização
      window.dispatchEvent(new CustomEvent('leadDataUpdated', {
        detail: {
          leadMasterId: leadData.id,
          leadData: updateData,
          cardData: cardData, // ✅ DADOS CORRETOS COM NOME ATUALIZADO
          pipelineLeadIds: pipelineLeadIds
        }
      }));

      // Chamar callback de atualização se fornecido
      if (onLeadUpdated) {
        console.log('📡 [LeadViewModal] Chamando callback onLeadUpdated...');
        const updatedData = {
          ...localLeadData,
          ...updateData
        } as LeadMaster;
        onLeadUpdated(updatedData);
      }

      // Limpar campo de edição
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[frontendField];
        return newValues;
      });

      // Limpar estado de edição
      setEditing(prev => ({ ...prev, [frontendField]: false }));

      console.log('🎉 [LeadViewModal] Processo de salvamento MELHORADO completo!');
      toast({
        title: 'Campo atualizado com sucesso!',
        variant: 'default'
      });

    } catch (error: any) {
      console.error('❌ [LeadViewModal] Erro no salvamento MELHORADO:', error);
      toast({
        title: 'Erro ao salvar campo: ' + error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(prev => ({ ...prev, [frontendField]: false }));
    }
  }, [editValues, leadData?.id, toast, localLeadData, syncWithPipelineLeads, onLeadUpdated]);

  const handleInputChange = useCallback((field: string, value: string) => {
    console.log('🔄 [LeadViewModal] handleInputChange - field:', field, 'value:', value);
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []); // ✅ CORRETO: Não precisa de dependências

  const startEditing = useCallback((field: string, currentValue: string) => {
    console.log('🔄 [LeadViewModal] startEditing - field:', field, 'currentValue:', currentValue);
    setEditing(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue || '' }));
  }, []); // ✅ CORRETO: Não precisa de dependências

  const cancelEditing = useCallback((field: string) => {
    console.log('🔄 [LeadViewModal] cancelEditing - field:', field);
    setEditing(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => ({ ...prev, [field]: '' }));
  }, []); // ✅ CORRETO: Não precisa de dependências

  const renderEditableField = useCallback((
    field: string, 
    label: string, 
    icon: React.ReactNode, 
    currentValue: string,
    placeholder: string = '',
    disabled: boolean = false
  ) => {
    const isEditing = editing[field];
    const isSaving = saving[field];
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <label className="text-sm font-medium text-gray-700">{label}</label>
          </div>
          {!disabled && (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => saveField(field)}
                    disabled={isSaving}
                    className="p-1 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                    title="Salvar alterações"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </button>
                  <button 
                    onClick={() => cancelEditing(field)}
                    disabled={isSaving}
                    className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    title="Cancelar edição"
                  >
                    <XIcon className="h-3 w-3 text-red-600" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => startEditing(field, currentValue)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Editar campo"
                >
                  <Edit className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          )}
        </div>
        {isEditing ? (
          <Input
            value={editValues[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            className="text-sm"
            disabled={isSaving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSaving) {
                saveField(field);
              } else if (e.key === 'Escape') {
                cancelEditing(field);
              }
            }}
          />
        ) : (
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[2.5rem] flex items-center">
            {currentValue || 'Não informado'}
          </p>
        )}
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
            Salvando...
          </div>
        )}
      </div>
    );
  }, [editing, saving, editValues, saveField, handleInputChange, startEditing, cancelEditing]); // ✅ CORRIGIDO: Todas dependências necessárias

  const loadOpportunityHistory = useCallback(async () => {
    console.log('🚀 [LeadViewModal] === INICIANDO CARREGAMENTO DE HISTÓRICO ===');
    console.log('📋 [LeadViewModal] Verificando dados necessários:', {
      currentLeadData_exists: !!currentLeadData,
      currentLeadData_id: currentLeadData?.id,
      currentLeadData_email: currentLeadData?.email,
      user_exists: !!user,
      user_id: user?.id,
      user_email: user?.email
    });
    
    // ✅ CORREÇÃO: Verificação mais flexível - só precisa do lead_id
    if (!currentLeadData?.id) {
      console.log('⚠️ [LeadViewModal] loadOpportunityHistory cancelado - currentLeadData.id não encontrado');
      console.log('📊 [LeadViewModal] Dados disponíveis:', {
        leadData_original: !!leadData,
        localLeadData: !!localLeadData,
        currentLeadData_keys: currentLeadData ? Object.keys(currentLeadData) : []
      });
      return;
    }
    
    // ✅ AVISO: Se user não estiver disponível, continuar mesmo assim
    if (!user?.id) {
      console.log('⚠️ [LeadViewModal] user.id não disponível, mas continuando busca...');
    }
    
    console.log('📋 [LeadViewModal] Dados do lead atual:', {
      id: currentLeadData.id,
      email: currentLeadData.email,
      first_name: currentLeadData.first_name,
      last_name: currentLeadData.last_name,
      phone: currentLeadData.phone
    });
    
    setLoadingOpportunities(true);
    try {
      console.log('🔍 [LeadViewModal] Carregando histórico para lead:', currentLeadData.id, 'email:', currentLeadData.email);
      
      // ✅ DIAGNÓSTICO: Primeiro verificar se existem registros
      const { data: allPipelineLeads, error: allError } = await supabase
        .from('pipeline_leads')
        .select('id, lead_master_id, custom_data, created_at')
        .order('created_at', { ascending: false });
      
      console.log('🔍 [LeadViewModal] Total de pipeline_leads no banco:', allPipelineLeads?.length || 0);
      console.log('🔍 [LeadViewModal] Primeiros 3 registros:', allPipelineLeads?.slice(0, 3));
      
      // Verificar quantos têm lead_master_id
      const withMasterId = allPipelineLeads?.filter(pl => pl.lead_master_id) || [];
      console.log('🔍 [LeadViewModal] Pipeline_leads com lead_master_id:', withMasterId.length);
      
      // Verificar se algum tem o ID do lead atual
      const matchingLeads = allPipelineLeads?.filter(pl => 
        pl.lead_master_id === currentLeadData.id || 
        pl.custom_data?.email === currentLeadData.email ||
        pl.custom_data?.lead_master_id === currentLeadData.id
      ) || [];
      console.log('🔍 [LeadViewModal] Pipeline_leads que podem ser do lead atual:', matchingLeads.length, matchingLeads);
      
      // ✅ CORREÇÃO 1: Query simplificada sem foreign key problemática
      let { data: leadOpportunities, error: leadError } = await supabase
        .from('pipeline_leads')
        .select(`
          id,
          custom_data,
          created_at,
          stage_id,
          pipeline_id,
          assigned_to,
          created_by,
          lead_master_id
        `)
        .eq('lead_master_id', currentLeadData.id)
        .order('created_at', { ascending: false });
      
      console.log('🔍 [LeadViewModal] Query result - leadOpportunities:', leadOpportunities?.length || 0, leadOpportunities);

      if (leadError) {
        console.error('❌ [LeadViewModal] Erro ao buscar oportunidades:', leadError);
        setOpportunities([]);
        return;
      }

      // ✅ CORREÇÃO 2: Fallbacks múltiplos
      if (!leadOpportunities || leadOpportunities.length === 0) {
        console.log('ℹ️ [LeadViewModal] Nenhuma oportunidade encontrada por lead_master_id, tentando fallbacks...');
        
        // Fallback 1: Por email no custom_data
        const { data: fallback1, error: error1 } = await supabase
          .from('pipeline_leads')
          .select(`id, custom_data, created_at, stage_id, pipeline_id, assigned_to, created_by, lead_master_id`)
          .eq('custom_data->>email', currentLeadData.email)
          .order('created_at', { ascending: false });
        
        if (!error1 && fallback1 && fallback1.length > 0) {
          leadOpportunities = fallback1;
          console.log('✅ [LeadViewModal] Encontradas via custom_data->email:', fallback1.length);
        } else {
          // Fallback 2: Buscar todas e filtrar localmente (último recurso)
          console.log('ℹ️ [LeadViewModal] Tentando fallback final - buscar todas as oportunidades...');
          const { data: fallback2, error: error2 } = await supabase
            .from('pipeline_leads')
            .select(`id, custom_data, created_at, stage_id, pipeline_id, assigned_to, created_by, lead_master_id`)
            .order('created_at', { ascending: false });
          
          if (!error2 && fallback2 && fallback2.length > 0) {
            // Filtrar localmente por qualquer campo que possa indicar que é do lead atual
            const filteredOpportunities = fallback2.filter(opp => {
              const customData = opp.custom_data || {};
              
              return (
                // Por lead_master_id
                opp.lead_master_id === currentLeadData.id ||
                // Por email em custom_data
                customData.email === currentLeadData.email ||
                // Por lead_master_id em custom_data
                customData.lead_master_id === currentLeadData.id ||
                // Por nome do lead (se bater exatamente)
                (customData.nome_lead && 
                 customData.nome_lead === `${currentLeadData.first_name} ${currentLeadData.last_name}`.trim()) ||
                // Por telefone
                (customData.telefone && currentLeadData.phone && 
                 customData.telefone === currentLeadData.phone)
              );
            });
            
            if (filteredOpportunities.length > 0) {
              leadOpportunities = filteredOpportunities;
              console.log('✅ [LeadViewModal] Encontradas via fallback final (filtro local):', filteredOpportunities.length);
              console.log('📊 [LeadViewModal] Critérios de match utilizados:', {
                lead_master_id: currentLeadData.id,
                email: currentLeadData.email,
                nome_completo: `${currentLeadData.first_name} ${currentLeadData.last_name}`.trim(),
                telefone: currentLeadData.phone
              });
            } else {
              console.log('ℹ️ [LeadViewModal] Nenhuma oportunidade encontrada em nenhum fallback');
              setOpportunities([]);
              return;
            }
          } else {
            console.log('ℹ️ [LeadViewModal] Nenhuma oportunidade encontrada em nenhum fallback');
            setOpportunities([]);
            return;
          }
        }
      }

      // Buscar nomes das pipelines e estágios
      const pipelineIds = [...new Set(leadOpportunities.map(item => item.pipeline_id).filter(Boolean))];
      const stageIds = [...new Set(leadOpportunities.map(item => item.stage_id).filter(Boolean))];
      
      let pipelineNames: Record<string, string> = {};
      let stageNames: Record<string, string> = {};
      
      if (pipelineIds.length > 0) {
        const { data: pipelines } = await supabase
          .from('pipelines')
          .select('id, name')
          .in('id', pipelineIds);
        
        pipelineNames = (pipelines || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      if (stageIds.length > 0) {
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .in('id', stageIds);
        
        stageNames = (stages || []).reduce((acc, s) => {
          acc[s.id] = s.name;
          return acc;
        }, {} as Record<string, string>);
      }

      // ✅ CORREÇÃO 3: Buscar nomes dos criadores separadamente
      const createdByIds = [...new Set(leadOpportunities.map(item => item.created_by).filter(Boolean))];
      let userNames: Record<string, string> = {};
      
      if (createdByIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', createdByIds);
        
        userNames = (users || []).reduce((acc, u) => {
          acc[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuário sem nome';
          return acc;
        }, {} as Record<string, string>);
      }

      const formattedOpportunities: Opportunity[] = leadOpportunities.map((item: any) => {
        // ✅ CORREÇÃO 4: Usar apenas custom_data
        const dataField = item.custom_data || {};
        const createdByName = userNames[item.created_by] || 'Usuário não identificado';
        
        return {
          id: item.id,
          nome_oportunidade: dataField.nome_oportunidade || dataField.titulo_oportunidade || dataField.titulo || dataField.nome_lead || 'Oportunidade sem nome',
          valor: dataField.valor ? parseFloat(dataField.valor) : (dataField.valor_oportunidade ? parseFloat(dataField.valor_oportunidade) : undefined),
          created_at: item.created_at,
          pipeline_name: pipelineNames[item.pipeline_id] || 'Pipeline não identificada',
          stage_name: stageNames[item.stage_id] || 'Estágio não identificado',
          status: 'active',
          created_by_name: createdByName
        };
      });

      console.log('✅ [LeadViewModal] Histórico carregado com sucesso:', formattedOpportunities.length, 'oportunidades');
      console.log('📊 [LeadViewModal] Oportunidades formatadas:', formattedOpportunities);
      setOpportunities(formattedOpportunities);
    } catch (error) {
      console.error('❌ [LeadViewModal] Erro ao carregar histórico de oportunidades:', error);
      setOpportunities([]);
    } finally {
      setLoadingOpportunities(false);
    }
  }, [currentLeadData?.id, currentLeadData?.email, user?.id]);

  // ============================================
  // EFFECTS SIMPLIFICADOS
  // ============================================

  // Inicializar dados locais quando leadData mudar
  useEffect(() => {
    if (leadData) {
      console.log('🔄 [LeadViewModal] Inicializando dados locais com:', leadData);
      setLocalLeadData({ ...leadData });
    }
  }, [leadData]);

  useEffect(() => {
    console.log('🔄 [LeadViewModal] useEffect - isOpen:', isOpen, 'activeTab:', activeTab, 'leadData?.id:', currentLeadData?.id);
    if (isOpen && activeTab === 'history' && currentLeadData?.id) {
      console.log('✅ [LeadViewModal] Condições atendidas - carregando histórico');
      loadOpportunityHistory();
    }
  }, [isOpen, activeTab, currentLeadData?.id, loadOpportunityHistory]);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [LeadViewModal] Modal aberto - resetando tab para info');
      setActiveTab('info');
    }
  }, [isOpen]);

  // ============================================
  // RENDER
  // ============================================

  // Campos unificados para evitar duplicação (CORRIGIDO: useMemo para recálculo automático)
  const displayName = useMemo(() => {
    const name = `${currentLeadData.first_name || ''} ${currentLeadData.last_name || ''}`.trim();
    console.log('🔄 [LeadViewModal] displayName recalculado:', name, 'first_name:', currentLeadData.first_name, 'last_name:', currentLeadData.last_name);
    return name;
  }, [currentLeadData.first_name, currentLeadData.last_name]);
  
  const displayJobTitle = useMemo(() => {
    const jobTitle = currentLeadData.job_title || currentLeadData.position || 'Não informado';
    console.log('🔄 [LeadViewModal] displayJobTitle recalculado:', jobTitle, 'job_title:', currentLeadData.job_title, 'position:', currentLeadData.position);
    return jobTitle;
  }, [currentLeadData.job_title, currentLeadData.position]);
  
  const displaySource = useMemo(() => {
    const source = currentLeadData.lead_source || currentLeadData.source || 'Não informado';
    console.log('🔄 [LeadViewModal] displaySource recalculado:', source, 'lead_source:', currentLeadData.lead_source, 'source:', currentLeadData.source);
    return source;
  }, [currentLeadData.lead_source, currentLeadData.source]);

  // ✅ FUNÇÃO SIMPLIFICADA - FONTE ÚNICA DE DADOS
  const handleSaveChanges = async () => {
    if (!localLeadData) return;

    try {
      setSaving(prev => ({ ...prev, general: true }));
      console.log('💾 [LeadViewModal] Salvando alterações em fonte única (leads_master)...');

      // ✅ SALVAMENTO DIRETO NA FONTE ÚNICA
      const { data: updatedLead, error } = await supabase
        .from('leads_master')
        .update({
          first_name: editValues.first_name || localLeadData.first_name,
          last_name: editValues.last_name || localLeadData.last_name,
          email: editValues.email || localLeadData.email,
          phone: editValues.phone || localLeadData.phone,
          company: editValues.company || localLeadData.company,
          job_title: editValues.job_title || localLeadData.job_title,
          lead_source: editValues.lead_source || localLeadData.lead_source,
          lead_temperature: editValues.lead_temperature || localLeadData.lead_temperature,
          city: editValues.city || localLeadData.city,
          state: editValues.state || localLeadData.state,
          country: editValues.country || localLeadData.country,
          notes: editValues.notes || localLeadData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', localLeadData.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ [LeadViewModal] Lead atualizado com sucesso na fonte única:', updatedLead.id);

      // ✅ ATUALIZAR ESTADO LOCAL
      setLocalLeadData(updatedLead);
      setEditValues({});
      setEditing({});

      // ✅ NOTIFICAR COMPONENTES SOBRE ATUALIZAÇÃO (FONTE ÚNICA)
      if (onLeadUpdated) {
        onLeadUpdated(updatedLead);
      }

      // ✅ DISPARAR EVENTO GLOBAL SIMPLIFICADO
      const eventData = {
        leadMasterId: updatedLead.id,
        leadData: updatedLead,
        // Dados já vêm da fonte única, não precisa de mapeamento complexo
        cardData: {
          nome_lead: updatedLead.first_name && updatedLead.last_name 
            ? `${updatedLead.first_name} ${updatedLead.last_name}`.trim()
            : updatedLead.first_name || '',
          email: updatedLead.email || '',
          telefone: updatedLead.phone || '',
          empresa: updatedLead.company || '',
          cargo: updatedLead.job_title || '',
          origem: updatedLead.lead_source || '',
          temperatura: updatedLead.lead_temperature || 'warm',
          cidade: updatedLead.city || '',
          estado: updatedLead.state || '',
          pais: updatedLead.country || '',
          observacoes: updatedLead.notes || '',
          lead_master_id: updatedLead.id
        }
      };

      console.log('📡 [LeadViewModal] Disparando evento de sincronização (fonte única):', eventData);
      
      window.dispatchEvent(new CustomEvent('leadDataUpdated', {
        detail: eventData
      }));

      toast({
        title: "Sucesso!",
        description: "Lead atualizado com sucesso.",
        variant: "default"
      });

    } catch (error: any) {
      console.error('❌ [LeadViewModal] Erro ao salvar alterações:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar alterações",
        variant: "destructive"
      });
    } finally {
      setSaving(prev => ({ ...prev, general: false }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Detalhes do Lead
          </DialogTitle>
          <DialogDescription>
            Informações completas do lead "{displayName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Informações Básicas
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Dados de Rastreamento
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Oportunidades
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="info" className="space-y-6 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  {renderEditableField('nome', 'Nome', <User className="h-4 w-4 text-gray-500" />, displayName)}

                  {/* Email */}
                  {renderEditableField('email', 'Email', <Mail className="h-4 w-4 text-gray-500" />, currentLeadData.email || 'Não informado')}

                  {/* Telefone */}
                  {renderEditableField('telefone', 'Telefone', <Phone className="h-4 w-4 text-gray-500" />, currentLeadData.phone || 'Não informado')}

                  {/* Empresa */}
                  {renderEditableField('empresa', 'Empresa', <Building className="h-4 w-4 text-gray-500" />, currentLeadData.company || 'Não informado')}

                  {/* Cargo */}
                  {renderEditableField('cargo', 'Cargo', <Target className="h-4 w-4 text-gray-500" />, displayJobTitle)}

                  {/* Origem */}
                  {renderEditableField('origem', 'Origem', <ExternalLink className="h-4 w-4 text-gray-500" />, displaySource)}

                  {/* Data de Criação */}
                  {renderEditableField('data_criacao', 'Data de Criação', <Calendar className="h-4 w-4 text-gray-500" />, formatDate(currentLeadData.created_at), '', true)}

                  {/* Última Atualização */}
                  {renderEditableField('ultima_atualizacao', 'Última Atualização', <Clock className="h-4 w-4 text-gray-500" />, formatDate(currentLeadData.updated_at), '', true)}

                  {/* Cidade */}
                  {currentLeadData.city && renderEditableField('cidade', 'Cidade', <MapPin className="h-4 w-4 text-gray-500" />, currentLeadData.city)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-6 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Dados de Rastreamento UTM
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      UTM Source
                    </label>
                    <p className="text-gray-900">
                      {currentLeadData.utm_source || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      UTM Medium
                    </label>
                    <p className="text-gray-900">
                      {currentLeadData.utm_medium || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      UTM Campaign
                    </label>
                    <p className="text-gray-900">
                      {currentLeadData.utm_campaign || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      UTM Term
                    </label>
                    <p className="text-gray-900">
                      {currentLeadData.utm_term || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">UTM Content</label>
                    <p className="text-gray-900">
                      {currentLeadData.utm_content || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Referrer
                    </label>
                    <p className="text-gray-900 break-all">
                      {currentLeadData.referrer || 'Não informado'}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Landing Page
                    </label>
                    <p className="text-gray-900 break-all">
                      {currentLeadData.landing_page || 'Não informado'}
                    </p>
                  </div>

                  {currentLeadData.campaign_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nome da Campanha</label>
                      <p className="text-gray-900">
                        {currentLeadData.campaign_name}
                      </p>
                    </div>
                  )}

                  {currentLeadData.city && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Localização
                      </label>
                      <p className="text-gray-900">
                        {[currentLeadData.city, currentLeadData.state, currentLeadData.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {currentLeadData.ip_address && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">IP Address</label>
                      <p className="text-gray-900 font-mono text-sm">
                        {currentLeadData.ip_address}
                      </p>
                    </div>
                  )}

                  {currentLeadData.user_agent && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">User Agent</label>
                      <p className="text-gray-900 text-sm break-all">
                        {currentLeadData.user_agent}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Oportunidades
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Todas as oportunidades criadas a partir deste lead
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingOpportunities ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Carregando histórico...</span>
                    </div>
                  ) : opportunities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma oportunidade criada a partir deste lead</p>
                      <p className="text-sm mt-1">
                        Use o botão "Criar Oportunidade" na lista de leads para criar a primeira oportunidade
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {opportunities.map((opportunity) => (
                        <div
                          key={opportunity.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="mb-3">
                              <span className="font-medium text-gray-600">Nome da oportunidade:</span>{' '}
                              <span className="font-medium text-gray-900">{opportunity.nome_oportunidade}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Vendedor:</span>{' '}
                                <span className="text-gray-900">{opportunity.created_by_name}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Data de criação:</span>{' '}
                                <span className="text-gray-900">{formatDate(opportunity.created_at)}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Valor:</span>{' '}
                                <span className="text-lg font-semibold text-green-600">
                                  {opportunity.valor ? formatCurrency(opportunity.valor) : 'Não informado'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end p-4 border-t">
          <Button onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadViewModal;
