import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, Mail, Phone, Building, DollarSign, Search, 
  UserPlus, Users, Check, X, ChevronLeft, ChevronRight,
  Target, Briefcase, Eye, EyeOff, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BaseModalProps } from '../../types/CommonProps';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date' | 'url' | 'currency';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card?: boolean;
}

interface ExistingLead {
  id: string;
  custom_data: any; // Campo real do banco
  pipeline_id?: string;
  stage_id?: string;
  created_at: string;
}

interface Member {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface Pipeline {
  id: string;
  name: string;
  pipeline_custom_fields?: CustomField[];
  pipeline_stages?: any[];
}

interface StepLeadModalProps extends BaseModalProps {
  pipeline: Pipeline;
  members?: Member[];
  onSubmit: (leadData: any) => void;
  currentUser?: any;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const StepLeadModal: React.FC<StepLeadModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  members = [],
  onSubmit,
  currentUser
}) => {
  const { user } = useAuth();
  
  // ============================================
  // ESTADOS
  // ============================================
  
  const [leadMode, setLeadMode] = useState<'new' | 'existing'>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dados do formulário
  const [opportunityData, setOpportunityData] = useState({
    nome_oportunidade: '',
    valor: '',
    responsavel: user?.id || currentUser?.id || ''
  });
  
  const [leadData, setLeadData] = useState({
    nome: '',
    email: '',
    telefone: ''
  });
  
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Estados para leads existentes
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<ExistingLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<ExistingLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  
  // Estados para stages da pipeline
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [firstStageId, setFirstStageId] = useState<string | null>(null);

  // ============================================
  // CAMPOS CUSTOMIZADOS DA PIPELINE
  // ============================================
  
  const customFields = useMemo(() => {
    // ✅ CORREÇÃO: Filtrar campos básicos para evitar duplicação
    const basicFields = ['email', 'telefone', 'phone', 'nome', 'name', 'first_name', 'last_name'];
    
    return (pipeline?.pipeline_custom_fields || [])
      .filter(field => !basicFields.includes(field.field_name.toLowerCase()))
      .sort((a, b) => a.field_order - b.field_order);
  }, [pipeline?.pipeline_custom_fields]);

  // ============================================
  // MÁSCARAS DE INPUT
  // ============================================
  
  const applyPhoneMask = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
    if (!match) return value;
    
    const [, area, first, second] = match;
    if (second) return `(${area}) ${first}-${second}`;
    if (first) return `(${area}) ${first}`;
    if (area) return `(${area}`;
    return '';
  };

  const applyCurrencyMask = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const number = parseFloat(cleaned) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number || 0);
  };

  // ============================================
  // CARREGAR MEMBERS DA PIPELINE
  // ============================================
  
  const [loadedMembers, setLoadedMembers] = useState<Member[]>([]);
  
  const loadPipelineMembers = useCallback(async () => {
    if (!user?.tenant_id || !pipeline?.id) return;
    
    try {
      const { data: pipelineMembers, error } = await supabase
        .from('pipeline_members')
        .select(`
          member_id,
          users!inner(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('pipeline_id', pipeline.id);

      if (error) throw error;

      const processedMembers = (pipelineMembers || []).map((pm: any) => ({
        id: pm.users.id,
        email: pm.users.email,
        first_name: pm.users.first_name,
        last_name: pm.users.last_name
      }));

      setLoadedMembers(processedMembers);
    } catch (error) {
      console.error('Erro ao carregar members:', error);
      setLoadedMembers([]);
    }
  }, [user?.tenant_id, pipeline?.id]);

  // ============================================
  // CARREGAR LEADS EXISTENTES
  // ============================================
  
  const loadExistingLeads = useCallback(async () => {
    if (!user?.tenant_id || !pipeline?.id) return;
    
    setLoadingLeads(true);
    try {
      
      // ✅ CORREÇÃO: Buscar pipeline_leads existentes com dados do leads_master
      const { data: allLeadsData, error: leadsError } = await supabase
        .from('pipeline_leads')
        .select(`
          id,
          lead_master_id,
          pipeline_id,
          stage_id,
          created_at,
          leads_master!lead_master_id(
            first_name,
            last_name,
            email,
            phone,
            company,
            job_title,
            lead_temperature,
            status,
            estimated_value
          )
        `)
        .eq('tenant_id', user.tenant_id)
        .neq('pipeline_id', pipeline.id) // Evitar leads da mesma pipeline
        .order('created_at', { ascending: false })
        .limit(100);

      if (leadsError) {
        throw leadsError;
      }

      // ✅ Transformar dados para formato esperado pelo componente
      const transformedLeads = (allLeadsData || []).map(pipelineLead => {
        const leadMaster = pipelineLead.leads_master || {};
        return {
          id: pipelineLead.id, // ✅ CORREÇÃO: Usar pipeline_leads.id real
          pipeline_id: pipelineLead.pipeline_id,
          stage_id: pipelineLead.stage_id,
          created_at: pipelineLead.created_at,
          lead_master_id: pipelineLead.lead_master_id,
          custom_data: {
            nome: `${leadMaster?.first_name || ''} ${leadMaster?.last_name || ''}`.trim() || 'Lead sem nome',
            nome_lead: `${leadMaster?.first_name || ''} ${leadMaster?.last_name || ''}`.trim() || 'Lead sem nome',
            email: leadMaster?.email || '',
            telefone: leadMaster?.phone || '',
            empresa: leadMaster?.company || '',
            cargo: leadMaster?.job_title || '',
            temperatura: leadMaster?.lead_temperature || 'warm',
            status: leadMaster?.status || 'active',
            valor: leadMaster?.estimated_value || 0,
            lead_master_id: pipelineLead.lead_master_id
          }
        };
      });

      setExistingLeads(transformedLeads);
      setFilteredLeads(transformedLeads);
      
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setExistingLeads([]);
      setFilteredLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [user?.tenant_id, pipeline?.id]);

  // ============================================
  // CARREGAR STAGES DA PIPELINE
  // ============================================
  
  const loadPipelineStages = useCallback(async () => {
    if (!user?.tenant_id || !pipeline?.id) return;
    
    try {
      
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select(`
          id,
          name,
          order_index,
          stage_type
        `)
        .eq('pipeline_id', pipeline.id)
        .order('order_index', { ascending: true });

      if (stagesError) {
        return;
      }

      if (stagesData && stagesData.length > 0) {
        setPipelineStages(stagesData);
        // Selecionar a primeira stage (menor order_index) como padrão
        const firstStage = stagesData[0];
        setFirstStageId(firstStage.id);
      }
      
    } catch (error) {
      console.error('Erro ao carregar stages:', error);
    }
  }, [user?.tenant_id, pipeline?.id]);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Carregar leads e stages quando modal abrir
  useEffect(() => {
    if (isOpen && pipeline?.id) {
      console.log('🚀 Modal StepLead aberto - carregando leads existentes e stages da pipeline');
      loadExistingLeads();
      loadPipelineStages();
    }
  }, [isOpen, pipeline?.id, loadExistingLeads, loadPipelineStages]);

  // Filtrar leads baseado na busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLeads(existingLeads);
      return;
    }

    const filtered = existingLeads.filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      const customData = lead.custom_data || {};
      
      const searchableFields = [
        customData.nome || customData.nome_lead || customData.nome_contato || '',
        customData.email || customData.email_contato || '',
        customData.telefone || customData.telefone_contato || '',
        customData.empresa || '',
        customData.nome_oportunidade || ''
      ];

      return searchableFields.some(field => 
        field.toString().toLowerCase().includes(searchLower)
      );
    });

    setFilteredLeads(filtered);
  }, [searchTerm, existingLeads]);

  // Garantir que o responsável sempre seja o usuário logado
  useEffect(() => {
    const loggedUserId = user?.id || currentUser?.id;
    if (loggedUserId && opportunityData.responsavel !== loggedUserId) {
      setOpportunityData(prev => ({
        ...prev,
        responsavel: loggedUserId
      }));
    }
  }, [user?.id, currentUser?.id, opportunityData.responsavel]);

  // Reset quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setLeadMode('new');
      setSelectedLead(null);
      setSearchTerm('');
      setValidationErrors({});
      // Limpar dados do formulário
      setOpportunityData({
        nome_oportunidade: '',
        valor: '',
        responsavel: user?.id || currentUser?.id || ''
      });
      setLeadData({
        nome: '',
        email: '',
        telefone: ''
      });
      setCustomFieldsData({});
      // Limpar leads carregados
      setExistingLeads([]);
      setFilteredLeads([]);
      // Limpar stages da pipeline
      setPipelineStages([]);
      setFirstStageId(null);
    }
  }, [isOpen, currentUser, user]);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleOpportunityChange = (field: string, value: string) => {
    let processedValue = value;
    
    if (field === 'valor') {
      processedValue = applyCurrencyMask(value);
    }
    
    setOpportunityData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Limpar erro de validação
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLeadChange = (field: string, value: string) => {
    let processedValue = value;
    
    if (field === 'telefone') {
      processedValue = applyPhoneMask(value);
    }
    
    setLeadData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Limpar erro de validação
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldsData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Limpar erro de validação
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSelectExistingLead = (lead: ExistingLead) => {
    setSelectedLead(lead);
    const customData = lead.custom_data || {};
    
    // Preencher dados do lead
    setLeadData({
      nome: customData.nome || customData.nome_lead || customData.nome_contato || '',
      email: customData.email || customData.email_contato || '',
      telefone: customData.telefone || customData.telefone_contato || ''
    });
    
    // Preencher campos customizados se existirem
    customFields.forEach(field => {
      if (customData[field.field_name]) {
        setCustomFieldsData(prev => ({
          ...prev,
          [field.field_name]: customData[field.field_name]
        }));
      }
    });
  };

  // ============================================
  // VALIDAÇÃO
  // ============================================
  
  const validateForm = (): boolean => {
    console.log('🔍 DEBUG - INICIANDO VALIDAÇÃO');
    console.log('📋 Dados da oportunidade:', opportunityData);
    console.log('👤 Dados do lead:', leadData);
    console.log('🎛️ Dados campos customizados:', customFieldsData);
    console.log('🔄 Modo do lead:', leadMode);
    console.log('📝 Lead selecionado:', selectedLead);
    
    const errors: Record<string, string> = {};
    
    // Validar dados da oportunidade
    console.log('🏢 Validando nome da oportunidade:', opportunityData.nome_oportunidade);
    if (!opportunityData.nome_oportunidade.trim()) {
      console.log('❌ Erro: Nome da oportunidade vazio');
      errors.nome_oportunidade = 'Nome da oportunidade é obrigatório';
    } else {
      console.log('✅ Nome da oportunidade válido');
    }
    
    // Validar dados do lead se for modo novo
    if (leadMode === 'new') {
      console.log('👤 Validando dados do lead (modo novo)');
      
      console.log('📝 Validando nome:', leadData.nome);
      if (!leadData.nome.trim()) {
        console.log('❌ Erro: Nome vazio');
        errors.nome = 'Nome é obrigatório';
      } else {
        console.log('✅ Nome válido');
      }
      
      console.log('📧 Validando email:', leadData.email);
      if (!leadData.email.trim()) {
        console.log('❌ Erro: Email vazio');
        errors.email = 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
        console.log('❌ Erro: Email inválido');
        errors.email = 'Email inválido';
      } else {
        console.log('✅ Email válido');
      }
    }
    
    // Validar lead existente selecionado
    if (leadMode === 'existing' && !selectedLead) {
      console.log('❌ Erro: Nenhum lead existente selecionado');
      errors.selectedLead = 'Selecione um lead existente';
    }
    
    // ✅ CORREÇÃO: Validar campos customizados obrigatórios incluindo os filtrados
    // Para campos básicos filtrados, mapear para os dados preenchidos
    console.log('🎛️ Validando campos customizados...');
    console.log('📋 Pipeline custom fields:', pipeline?.pipeline_custom_fields);
    
    (pipeline?.pipeline_custom_fields || []).forEach(field => {
      console.log(`🔍 Verificando campo: ${field.field_name} (${field.field_label}) - Obrigatório: ${field.is_required}`);
      
      if (field.is_required) {
        let hasValue = false;
        
        // ✅ CORREÇÃO: Mapear campos básicos para os dados corretos (novo lead OU lead existente)
        if (field.field_name.toLowerCase() === 'email') {
          // Para lead existente, dados estão em leadData (já preenchidos)
          // Para novo lead, dados também estão em leadData
          hasValue = !!leadData.email.trim();
          console.log(`📧 Campo email mapeado (${leadMode}) - Valor: "${leadData.email}" - Tem valor: ${hasValue}`);
          if (!hasValue) {
            console.log('❌ Erro: Email obrigatório (campo customizado)');
            errors.email = 'Email é obrigatório';
          }
        } else if (field.field_name.toLowerCase() === 'telefone') {
          // Para lead existente, dados estão em leadData (já preenchidos)
          // Para novo lead, dados também estão em leadData
          hasValue = !!leadData.telefone?.trim();
          console.log(`📞 Campo telefone mapeado (${leadMode}) - Valor: "${leadData.telefone}" - Tem valor: ${hasValue}`);
          if (!hasValue) {
            console.log('❌ Erro: Telefone obrigatório (campo customizado)');
            errors.telefone = 'Telefone é obrigatório';
          }
        } else if (field.field_name.toLowerCase() === 'nome') {
          // Para lead existente, dados estão em leadData (já preenchidos)
          // Para novo lead, dados também estão em leadData
          hasValue = !!leadData.nome.trim();
          console.log(`👤 Campo nome mapeado (${leadMode}) - Valor: "${leadData.nome}" - Tem valor: ${hasValue}`);
          if (!hasValue) {
            console.log('❌ Erro: Nome obrigatório (campo customizado)');
            errors.nome = 'Nome é obrigatório';
          }
        } else {
          // Para outros campos customizados
          hasValue = !!customFieldsData[field.field_name];
          console.log(`🎛️ Campo customizado "${field.field_name}" - Valor: "${customFieldsData[field.field_name]}" - Tem valor: ${hasValue}`);
          if (!hasValue) {
            console.log(`❌ Erro: ${field.field_label} obrigatório`);
            errors[field.field_name] = `${field.field_label} é obrigatório`;
          }
        }
      }
    });
    
    console.log('🚨 Erros encontrados:', errors);
    console.log('📊 Total de erros:', Object.keys(errors).length);
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('✅ Validação final:', isValid ? 'SUCESSO' : 'FALHOU');
    
    return isValid;
  };

  // ============================================
  // SUBMISSÃO
  // ============================================
  
  const handleSubmit = async () => {
    console.log('🚀 [DEBUG] handleSubmit iniciado');
    console.log('📊 [DEBUG] firstStageId:', firstStageId);
    console.log('🏢 [DEBUG] pipeline:', pipeline?.name, 'ID:', pipeline?.id);
    console.log('🎯 [DEBUG] pipelineStages:', pipelineStages?.length, 'stages');
    
    if (!validateForm()) return;
    
    // ✅ CORREÇÃO: Validar se temos stage_id antes de enviar
    if (!firstStageId) {
      console.error('Erro: stage_id não encontrado');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Combinar todos os dados
      const finalData = {
        // ✅ CORREÇÃO: Adicionar pipeline_id e stage_id obrigatórios
        pipeline_id: pipeline?.id,
        stage_id: firstStageId,
        
        // Dados da oportunidade
        nome_oportunidade: opportunityData.nome_oportunidade,
        valor: opportunityData.valor.replace(/[^\d,]/g, '').replace(',', '.'),
        responsavel: opportunityData.responsavel,
        
        // Dados do lead
        nome_lead: leadData.nome,
        nome_contato: leadData.nome, // Compatibilidade
        email: leadData.email,
        email_contato: leadData.email, // Compatibilidade
        telefone: leadData.telefone,
        telefone_contato: leadData.telefone, // Compatibilidade
        
        // Campos customizados
        ...customFieldsData,
        
        // Metadados
        lead_source: leadMode === 'existing' ? 'existing_lead' : 'new_lead',
        existing_lead_id: selectedLead?.id || null
      };

      console.log('🚀 [DEBUG] finalData being sent:', finalData);
      console.log('📋 [DEBUG] pipeline_id:', pipeline?.id);
      console.log('🎯 [DEBUG] stage_id:', firstStageId);
      console.log('👤 [DEBUG] leadMode:', leadMode);
      console.log('🔍 [DEBUG] existing_lead_id:', selectedLead?.id);

      await onSubmit(finalData);
      onClose();
      
      // Reset form
      setLeadMode('new');
      setOpportunityData({ nome_oportunidade: '', valor: '', responsavel: user?.id || currentUser?.id || '' });
      setLeadData({ nome: '', email: '', telefone: '' });
      setCustomFieldsData({});
      setSelectedLead(null);
      setValidationErrors({});
      
    } catch (error) {
      console.error('Erro ao criar lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDERIZAÇÃO DOS CAMPOS CUSTOMIZADOS
  // ============================================
  
  const renderCustomField = (field: CustomField) => {
    const value = customFieldsData[field.field_name] || '';
    const hasError = validationErrors[field.field_name];
    
    const baseProps = {
      id: field.field_name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleCustomFieldChange(field.field_name, e.target.value),
      placeholder: field.placeholder || `Digite ${field.field_label.toLowerCase()}`,
      required: field.is_required,
      className: `w-full ${hasError ? 'border-red-500' : ''}`
    };

    switch (field.field_type) {
      case 'textarea':
        return <Textarea {...baseProps} rows={3} />;
      
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleCustomFieldChange(field.field_name, val)}>
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Selecione ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.field_options || []).map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'currency':
        return (
          <Input
            {...baseProps}
            onChange={(e) => handleCustomFieldChange(field.field_name, applyCurrencyMask(e.target.value))}
          />
        );
      
      case 'phone':
        return (
          <Input
            {...baseProps}
            onChange={(e) => handleCustomFieldChange(field.field_name, applyPhoneMask(e.target.value))}
          />
        );
      
      default:
        return <Input {...baseProps} type={field.field_type} />;
    }
  };

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center text-xl">
            Nova Oportunidade
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Crie uma nova oportunidade selecionando um lead existente ou criando um novo lead
          </DialogDescription>
        </DialogHeader>

        {/* Formulário em uma única tela com seções */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            
            {/* SEÇÃO 1: SOBRE A OPORTUNIDADE */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  1. Sobre a Oportunidade
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <Label htmlFor="nome_oportunidade" className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4" />
                    Nome da Oportunidade <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome_oportunidade"
                    value={opportunityData.nome_oportunidade}
                    onChange={(e) => handleOpportunityChange('nome_oportunidade', e.target.value)}
                    placeholder="Ex: Proposta de Marketing Digital"
                    className={validationErrors.nome_oportunidade ? 'border-red-500' : ''}
                  />
                  {validationErrors.nome_oportunidade && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.nome_oportunidade}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor" className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4" />
                      Valor
                    </Label>
                    <Input
                      id="valor"
                      value={opportunityData.valor}
                      onChange={(e) => handleOpportunityChange('valor', e.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="responsavel" className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      Responsável <span className="text-red-500">*</span>
                      <Badge variant="secondary" className="ml-2">Usuário Logado</Badge>
                    </Label>
                    <div className="relative">
                      <Input
                        id="responsavel"
                        value={user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name} (${user.email})` 
                          : user?.email || 'Usuário não identificado'
                        }
                        disabled
                        className="bg-gray-50 text-gray-700 cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEÇÃO 2: SOBRE O LEAD */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  2. Sobre o Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Tabs: Novo Lead / Lead Existente */}
                <Tabs value={leadMode} onValueChange={(value) => setLeadMode(value as 'new' | 'existing')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="new" className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Novo Lead
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Lead Existente
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="new" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nome" className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          Nome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nome"
                          value={leadData.nome}
                          onChange={(e) => handleLeadChange('nome', e.target.value)}
                          placeholder="Nome completo do lead"
                          className={validationErrors.nome ? 'border-red-500' : ''}
                        />
                        {validationErrors.nome && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.nome}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="telefone" className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4" />
                          Telefone {validationErrors.telefone && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          id="telefone"
                          value={leadData.telefone}
                          onChange={(e) => handleLeadChange('telefone', e.target.value)}
                          placeholder="(11) 99999-9999"
                          className={validationErrors.telefone ? 'border-red-500' : ''}
                        />
                        {validationErrors.telefone && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.telefone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4" />
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={leadData.email}
                        onChange={(e) => handleLeadChange('email', e.target.value)}
                        placeholder="email@exemplo.com"
                        className={validationErrors.email ? 'border-red-500' : ''}
                      />
                      {validationErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="existing" className="space-y-4">
                    <div>
                      <Label htmlFor="search" className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4" />
                        Buscar Lead Existente
                      </Label>
                      <Input
                        id="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Busque por nome, email ou empresa..."
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {loadingLeads ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : filteredLeads.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhum lead encontrado</p>
                        </div>
                      ) : (
                        filteredLeads.map(lead => {
                          const customData = lead.custom_data || {};
                          const isSelected = selectedLead?.id === lead.id;
                          
                          return (
                            <Card 
                              key={lead.id} 
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'border-green-500 bg-green-50' : 'hover:border-gray-300'
                              }`}
                              onClick={() => handleSelectExistingLead(lead)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">
                                      {customData.nome || customData.nome_lead || customData.nome_contato || 'Lead sem nome'}
                                    </h4>
                                    <div className="mt-1 space-y-1">
                                      {(customData.email || customData.email_contato) && (
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <Mail className="w-3 h-3" />
                                          {customData.email || customData.email_contato}
                                        </p>
                                      )}
                                      {(customData.telefone || customData.telefone_contato) && (
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <Phone className="w-3 h-3" />
                                          {customData.telefone || customData.telefone_contato}
                                        </p>
                                      )}
                                      {customData.empresa && (
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <Building className="w-3 h-3" />
                                          {customData.empresa}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-5 h-5 text-green-600" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>

                    {selectedLead && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✓ Lead selecionado: {selectedLead.custom_data?.nome || selectedLead.custom_data?.nome_lead || 'Lead sem nome'}
                        </p>
                      </div>
                    )}
                    
                    {validationErrors.selectedLead && (
                      <p className="text-red-500 text-sm">{validationErrors.selectedLead}</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* SEÇÃO 3: CAMPOS ADICIONAIS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  3. Campos Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {customFields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum campo adicional configurado para esta pipeline</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map(field => (
                      <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                        <Label htmlFor={field.field_name} className="flex items-center gap-2">
                          {field.field_label}
                          {field.is_required && <span className="text-red-500">*</span>}
                        </Label>
                        {renderCustomField(field)}
                        {validationErrors[field.field_name] && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors[field.field_name]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4 border-t px-6 pb-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (leadMode === 'existing' && !selectedLead)}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Criar Oportunidade
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StepLeadModal; 