import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Phone, Building, Check, Search, 
  Target, Loader2, Users, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

// ✅ NOVA ARQUITETURA: Hooks com TanStack Query + API Backend
import { useExistingLeads } from '../../hooks/useExistingLeads';
import { usePipelineStages } from '../../hooks/usePipelineStages';
import { usePipelineMembers } from '../../hooks/usePipelineMembers';
import { useCreateOpportunity } from '../../hooks/useCreateOpportunity';
import { useDebouncedLeadByEmail, isValidEmail } from '../../hooks/useLeadByEmail';
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

// ✅ NOVA ARQUITETURA: Importar tipos do service
import { ExistingLead, PipelineMember } from '../../services/leadOpportunityApiService';

interface Pipeline {
  id: string;
  name: string;
  pipeline_custom_fields?: CustomField[];
  pipeline_stages?: any[];
}

interface StepLeadModalProps extends BaseModalProps {
  pipeline: Pipeline;
  members?: PipelineMember[];
  onSubmit: (leadData: any) => void;
  // ✅ NOVA ARQUITETURA: currentUser removido - usando useAuth() context
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const StepLeadModal: React.FC<StepLeadModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  members = [],
  onSubmit
  // ✅ NOVA ARQUITETURA: currentUser removido - usando useAuth() context
}) => {
  const { user } = useAuth();
  
  // ============================================
  // ESTADOS
  // ============================================
  
  const [leadMode, setLeadMode] = useState<'new' | 'existing'>('new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dados do formulário
  const [opportunityData, setOpportunityData] = useState(() => ({
    nome_oportunidade: '',
    valor: '',
    responsavel: user?.id || ''
  }));
  
  const [leadData, setLeadData] = useState({
    nome: '',
    email: '',
    telefone: ''
  });
  
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // ✅ NOVA ARQUITETURA: Estados simplificados + TanStack Query
  const [selectedLead, setSelectedLead] = useState<ExistingLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ NOVA ARQUITETURA: Hooks com cache inteligente
  const { data: existingLeads = [], isLoading: loadingLeads } = useExistingLeads(pipeline?.id);
  const { data: pipelineStages = [] } = usePipelineStages(pipeline?.id);
  const { data: loadedMembers = [] } = usePipelineMembers(pipeline?.id);
  const createOpportunityMutation = useCreateOpportunity();
  
  // 🔍 NOVA FUNCIONALIDADE: Validação inteligente de email existente
  const { 
    data: existingLeadByEmail, 
    isLoading: checkingEmail,
    error: emailCheckError 
  } = useDebouncedLeadByEmail(leadData.email, 500);
  
  // ✅ NOVA ARQUITETURA: Primeira stage calculada via memo
  const firstStageId = useMemo(() => {
    if (!pipelineStages.length) return null;
    const sortedStages = [...pipelineStages].sort((a, b) => a.order_index - b.order_index);
    return sortedStages[0]?.id || null;
  }, [pipelineStages]);

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
    // ✅ CORREÇÃO FINAL: Máscara monetária com centavos progressivos
    if (!value) return '';
    
    // Remove tudo exceto dígitos
    const onlyNumbers = value.replace(/\D/g, '');
    
    // Se não há números, retorna vazio
    if (!onlyNumbers) return '';
    
    // Converte para centavos e depois para reais (padrão brasileiro)
    const centavos = parseInt(onlyNumbers, 10);
    const reais = centavos / 100;
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(reais);
  };

  // ============================================
  // ✅ NOVA ARQUITETURA: Members carregados via hook (removido callback manual)

  // ✅ NOVA ARQUITETURA: Leads existentes carregados via hook (removido callback manual)

  // ✅ NOVA ARQUITETURA: Stages carregadas via hook (removido callback manual)

  // ✅ NOVA ARQUITETURA: Effects simplificados (dados carregados via hooks)

  // ✅ NOVA ARQUITETURA: Filtro de leads via useMemo para performance
  const filteredLeads = useMemo(() => {
    // Log apenas se necessário para debug
    if (import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('🔍 [StepLeadModal] filteredLeads calculation:', {
        searchTerm: searchTerm || 'EMPTY',
        existingLeads_total: existingLeads.length
      });
    }
    
    if (!searchTerm.trim()) {
      return existingLeads;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    const filtered = existingLeads.filter((lead, index) => {
      const customData = lead.custom_data as Record<string, any> || {};
      
      // 🔧 FALLBACK: Incluir dados diretos do lead além do custom_data
      const searchableFields = [
        // Campos do custom_data (primários)
        customData.nome || customData.nome_lead || customData.nome_contato || '',
        customData.email || customData.email_contato || '',
        customData.telefone || customData.telefone_contato || '',
        customData.empresa || '',
        customData.nome_oportunidade || '',
        
        // 🔧 FALLBACK: Campos alternativos diretos do lead (caso custom_data falhe)
        lead.id || '', // ID como fallback
        // Se houver campos diretos do leads_master no futuro
      ];

      // Debug removido - funcionalidade funcionando corretamente

      const matches = searchableFields.some(field => {
        // 🔧 ROBUSTEZ: Garantir que field nunca seja null/undefined
        if (!field) return false;
        
        // 🔧 ROBUSTEZ: Normalização mais abrangente
        const fieldStr = String(field); // Forçar conversão para string
        const fieldNormalized = fieldStr
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ' '); // Remover espaços duplos/múltiplos
        
        // 🔧 ROBUSTEZ: Verificar se campo não está vazio após normalização
        if (!fieldNormalized) return false;
        
        const isMatch = fieldNormalized.includes(searchLower);
        
        // Debug específico removido - busca funcionando corretamente
        
        return isMatch;
      });

      // 🔧 FALLBACK ADICIONAL: Se não encontrou match via campos normais, tentar busca em todo o objeto
      if (!matches && searchLower.length >= 3) {
        try {
          const leadStr = JSON.stringify(lead).toLowerCase();
          const fallbackMatch = leadStr.includes(searchLower);
          
          // Log de fallback simplificado - funcionalidade validada
          
          return fallbackMatch;
        } catch (e) {
          console.warn('[StepLeadModal] Fallback search failed:', e);
          return false;
        }
      }

      return matches;
    });
    
    // Log resultado apenas se busca ativa e verbose habilitado
    if (searchLower && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('🔍 [StepLeadModal] Search filtered results:', {
        original_count: existingLeads.length,
        filtered_count: filtered.length
      });
    }
    
    return filtered;
  }, [searchTerm, existingLeads]);

  // Garantir que o responsável sempre seja o usuário logado
  useEffect(() => {
    const loggedUserId = user?.id;
    if (loggedUserId && opportunityData.responsavel !== loggedUserId) {
      setOpportunityData(prev => ({
        ...prev,
        responsavel: loggedUserId
      }));
    }
  }, [user?.id, opportunityData.responsavel]);

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
        responsavel: user?.id || ''
      });
      setLeadData({
        nome: '',
        email: '',
        telefone: ''
      });
      setCustomFieldsData({});
      // ✅ NOVA ARQUITETURA: Não precisamos mais limpar dados (gerenciados pelos hooks)
    }
  }, [isOpen, user]);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleOpportunityChange = useCallback((field: string, value: string) => {
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
  }, [validationErrors]);

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

  // 🔄 NOVA FUNCIONALIDADE: Auto-switch para lead existente quando email é detectado
  const handleSwitchToExistingLead = useCallback((leadFromEmail: any) => {
    console.log('🔄 [StepLeadModal] Auto-switching para lead existente:', leadFromEmail.email);
    
    setLeadMode('existing');
    
    // Criar objeto ExistingLead a partir dos dados do leads_master
    const existingLead: ExistingLead = {
      id: `temp-${leadFromEmail.id}`, // Usar um ID temporário para o pipeline_leads
      pipeline_id: '',
      stage_id: '',
      created_at: new Date().toISOString(),
      lead_master_id: leadFromEmail.id,
      custom_data: {
        nome: `${leadFromEmail.first_name} ${leadFromEmail.last_name}`.trim(),
        nome_lead: `${leadFromEmail.first_name} ${leadFromEmail.last_name}`.trim(),
        email: leadFromEmail.email,
        telefone: leadFromEmail.phone || '',
        empresa: leadFromEmail.company || '',
        lead_master_id: leadFromEmail.id
      }
    };
    
    setSelectedLead(existingLead);
    
    // Preencher dados do formulário
    setLeadData({
      nome: `${leadFromEmail.first_name} ${leadFromEmail.last_name}`.trim(),
      email: leadFromEmail.email,
      telefone: leadFromEmail.phone || ''
    });
  }, []);

  const handleSelectExistingLead = (lead: ExistingLead) => {
    setSelectedLead(lead);
    const customData = lead.custom_data as Record<string, any> || {};
    
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
    // ✅ OTIMIZADO: Debug consolidado e condicional
    if (import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('🔍 [StepLeadModal] Validação:', {
        opportunity: !!opportunityData.nome_oportunidade,
        lead: !!leadData.nome,
        customFields: Object.keys(customFieldsData).length,
        mode: leadMode,
        selected: !!selectedLead,
        responsavel: opportunityData.responsavel
      });
    }
    
    const errors: Record<string, string> = {};
    
    // Validar dados da oportunidade
    if (!opportunityData.nome_oportunidade.trim()) {
      errors.nome_oportunidade = 'Nome da oportunidade é obrigatório';
    }
    
    // ✅ CORREÇÃO: Validar responsável apenas se não está definido
    if (!opportunityData.responsavel) {
      console.log('❌ Erro: Responsável não definido');
      errors.responsavel = 'Responsável é obrigatório';
    }
    
    // Validar dados do lead se for modo novo
    if (leadMode === 'new') {
      if (!leadData.nome.trim()) {
        errors.nome = 'Nome é obrigatório';
      }
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
    (pipeline?.pipeline_custom_fields || []).forEach(field => {
      if (field.is_required) {
        let hasValue = false;
        
        // ✅ CORREÇÃO: Mapear campos básicos para os dados corretos (novo lead OU lead existente)
        if (field.field_name.toLowerCase() === 'email') {
          hasValue = !!leadData.email.trim();
          if (!hasValue) {
            errors.email = 'Email é obrigatório';
          }
        } else if (field.field_name.toLowerCase() === 'telefone') {
          hasValue = !!leadData.telefone?.trim();
          if (!hasValue) {
            errors.telefone = 'Telefone é obrigatório';
          }
        } else if (field.field_name.toLowerCase() === 'nome') {
          hasValue = !!leadData.nome.trim();
          if (!hasValue) {
            errors.nome = 'Nome é obrigatório';
          }
        } else {
          // Para outros campos customizados
          hasValue = !!customFieldsData[field.field_name];
          if (!hasValue) {
            errors[field.field_name] = `${field.field_label} é obrigatório`;
          }
        }
      }
    });
    
    setValidationErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    // Log apenas em caso de erro para debug
    if (!isValid && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('❌ Validação falhou:', errors);
    }
    
    return isValid;
  };

  // ============================================
  // SUBMISSÃO
  // ============================================
  
  // ============================================
  // AIDEV-NOTE: Proteção contra dupla execução implementada
  // Sistema de debounce com controle de estado local
  // ============================================
  
  const [isSubmissionInProgress, setIsSubmissionInProgress] = React.useState(false);
  const submissionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleSubmit = async () => {
    console.log('🚀 [StepLeadModal] handleSubmit iniciado - NOVA ARQUITETURA');
    
    // ✅ PROTEÇÃO DUPLA EXECUÇÃO: Verificar se já há submissão em andamento
    if (isSubmissionInProgress || isSubmitting) {
      console.warn('⚠️ [StepLeadModal] Submissão já em andamento, ignorando nova chamada');
      return;
    }
    
    if (!validateForm()) return;
    
    // ✅ CORREÇÃO: Validar se temos stage_id antes de enviar
    if (!firstStageId) {
      console.error('Erro: stage_id não encontrado');
      return;
    }
    
    // ✅ DEBOUNCE: Limpar timeout anterior se existir
    if (submissionTimeoutRef.current) {
      clearTimeout(submissionTimeoutRef.current);
    }
    
    // ✅ BLOQUEAR DUPLA EXECUÇÃO: Definir flags de controle
    setIsSubmissionInProgress(true);
    setIsSubmitting(true);
    
    try {
      // ✅ NOVA ARQUITETURA: Preparar dados para API backend
      // ✅ CORREÇÃO SIMPLES: Converter formato brasileiro para decimal (R$ 33,00 → 33.00)
      const processedValue = opportunityData.valor ? 
        opportunityData.valor.replace(/[R$\s]/g, '').replace(',', '.') : '';
      
      console.log('💰 [StepLeadModal] Processamento de valor:', {
        valor_original: opportunityData.valor,
        valor_processado: processedValue,
        valor_tipo: typeof processedValue
      });
      
      const opportunityRequest = {
        pipeline_id: pipeline!.id,
        stage_id: firstStageId,
        nome_oportunidade: opportunityData.nome_oportunidade,
        valor: processedValue,
        responsavel: opportunityData.responsavel || user?.id,
        nome_lead: leadData.nome,
        nome_contato: leadData.nome,
        email: leadData.email,
        email_contato: leadData.email,
        telefone: leadData.telefone || '',
        telefone_contato: leadData.telefone || '',
        lead_source: leadMode === 'existing' ? 'existing_lead' as const : 'new_lead' as const,
        existing_lead_id: selectedLead?.id || null,
        // Incluir campos customizados
        ...customFieldsData
      };

      console.log('🚀 [StepLeadModal] Enviando para API backend:', {
        pipeline: pipeline?.id,
        stage: firstStageId,
        nome: opportunityRequest.nome_oportunidade,
        source: opportunityRequest.lead_source,
        existing_lead: opportunityRequest.existing_lead_id || 'N/A'
      });

      // ✅ NOVA ARQUITETURA: Usar mutation hook em vez de onSubmit prop
      await createOpportunityMutation.mutateAsync(opportunityRequest);
      
      // ✅ CORREÇÃO: Reset imediato (timeout removido - TanStack Query scope resolve o problema)
      // Fechar modal e resetar
      onClose();
      
      // Reset form
      setLeadMode('new');
      setOpportunityData({ 
        nome_oportunidade: '', 
        valor: '', 
        responsavel: user?.id || '' 
      });
      setLeadData({ nome: '', email: '', telefone: '' });
      setCustomFieldsData({});
      setSelectedLead(null);
      setValidationErrors({});
      
      // Liberar flags de controle
      setIsSubmissionInProgress(false);
      
    } catch (error) {
      console.error('❌ [StepLeadModal] Erro na criação:', error);
      // Em caso de erro, liberar flags imediatamente
      setIsSubmissionInProgress(false);
      // Erro já tratado pelo hook mutation
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ✅ CLEANUP: Limpar timeout no unmount
  React.useEffect(() => {
    return () => {
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
    };
  }, []);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl font-semibold text-gray-900 text-center">
            Nova Oportunidade
          </DialogTitle>
        </DialogHeader>

        {/* Formulário em uma única tela com seções */}
        <motion.div 
          className="flex-1 overflow-y-auto px-6 pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="space-y-8">
            
            {/* SEÇÃO 1: SOBRE A OPORTUNIDADE */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </motion.div>
                <h3 className="text-lg font-medium text-gray-900">Oportunidade</h3>
              </div>
              <div className="space-y-6 pl-11">
                <div>
                  <Label htmlFor="nome_oportunidade" className="block text-sm font-medium text-gray-700 mb-2">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Estimado
                    </Label>
                    <Input
                      id="valor"
                      value={opportunityData.valor}
                      onChange={(e) => handleOpportunityChange('valor', e.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="responsavel" className="block text-sm font-medium text-gray-700 mb-2">
                      Responsável <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Você</span>
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
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* SEÇÃO 2: SOBRE O LEAD */}
            <motion.div 
              className="space-y-6 pt-8 border-t border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <span className="text-green-600 font-semibold text-sm">2</span>
                </motion.div>
                <h3 className="text-lg font-medium text-gray-900">Lead</h3>
              </div>
              <div className="pl-11">
                {/* Tabs: Novo Lead / Lead Existente */}
                <Tabs value={leadMode} onValueChange={(value) => setLeadMode(value as 'new' | 'existing')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="new">
                      Novo Lead
                    </TabsTrigger>
                    <TabsTrigger value="existing">
                      Lead Existente
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="new" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
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
                        <Label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                          Telefone <span className="text-red-500">*</span>
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
                      <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                      
                      {/* 🔍 NOVA FUNCIONALIDADE: Indicador de validação de email */}
                      {leadData.email && isValidEmail(leadData.email) && leadMode === 'new' && (
                        <div className="mt-2">
                          {checkingEmail ? (
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Verificando email...</span>
                            </div>
                          ) : existingLeadByEmail ? (
                            <div className="flex items-center justify-between gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <div>
                                  <span className="text-sm font-medium text-yellow-800">
                                    Lead já existe: {existingLeadByEmail.first_name} {existingLeadByEmail.last_name}
                                  </span>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    Criar nova oportunidade para este lead existente?
                                  </p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSwitchToExistingLead(existingLeadByEmail)}
                                className="whitespace-nowrap"
                              >
                                Usar Este Lead
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Email disponível para novo lead</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="existing" className="space-y-4">
                    <div>
                      <Label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
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
                        <>
                          {filteredLeads.map(lead => {
                            const customData = lead.custom_data as Record<string, any> || {};
                            const isSelected = selectedLead?.id === lead.id;
                          
                          return (
                            <div 
                              key={lead.id} 
                              className={`cursor-pointer transition-all duration-200 p-3 rounded-lg border h-16 ${
                                isSelected ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                              }`}
                              onClick={() => handleSelectExistingLead(lead)}
                            >
                              {/* ✅ Layout compacto de 2 linhas - Magic UI otimizado */}
                              <div className="flex items-center justify-between h-full">
                                <div className="flex-1 min-w-0">
                                  {/* Linha 1: Nome + Empresa */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-gray-900 truncate">
                                      {customData.nome || customData.nome_lead || customData.nome_contato || 'Lead sem nome'}
                                    </span>
                                    {customData.empresa && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 shrink-0">
                                        {customData.empresa}
                                      </span>
                                    )}
                                  </div>
                                  {/* Linha 2: Email + Telefone */}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    {(customData.email || customData.email_contato) && (
                                      <span className="truncate">
                                        {customData.email || customData.email_contato}
                                      </span>
                                    )}
                                    {(customData.telefone || customData.telefone_contato) && (
                                      <span className="shrink-0">
                                        {customData.telefone || customData.telefone_contato}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-green-600 shrink-0 ml-2" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </>
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
              </div>
            </motion.div>

            {/* SEÇÃO 3: CAMPOS ADICIONAIS */}
            <motion.div 
              className="space-y-6 pt-8 border-t border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <span className="text-purple-600 font-semibold text-sm">3</span>
                </motion.div>
                <h3 className="text-lg font-medium text-gray-900">Campos Customizados</h3>
              </div>
              <div className="pl-11">
                {customFields.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <Target className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm">Nenhum campo customizado configurado para esta pipeline</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customFields.map(field => (
                      <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                        <Label htmlFor={field.field_name} className="block text-sm font-medium text-gray-700 mb-2">
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
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Botões de Ação */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-gray-100 px-6 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="order-2 sm:order-1 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Button>
          
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || createOpportunityMutation.isPending || (leadMode === 'existing' && !selectedLead)}
            className="order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 shadow-sm transition-all duration-200 hover:shadow-md"
          >
            {(isSubmitting || createOpportunityMutation.isPending) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Criando Oportunidade...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                <span>Criar Oportunidade</span>
              </>
            )}
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// ✅ PERFORMANCE: Memorizar componente para evitar re-renders desnecessários
export default memo(StepLeadModal); 