import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Mail, Phone, Building, DollarSign, Search, 
  Target, Check, X, ChevronLeft, ChevronRight,
  Loader2, Settings, GitBranch
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast } from '../../hooks/useToast';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// ============================================
// INTERFACES E TIPOS
// ============================================

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
}

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

interface Pipeline {
  id: string;
  name: string;
  pipeline_custom_fields?: CustomField[];
  pipeline_stages?: any[];
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  pipeline_id: string;
}

interface LeadToOpportunityModalProps {
  leadData: LeadMaster;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (opportunityData: any) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const LeadToOpportunityModal: React.FC<LeadToOpportunityModalProps> = ({
  leadData,
  isOpen,
  onClose,
  onSubmit
}) => {
  const { user } = useAuth();
  
  // ============================================
  // ESTADOS
  // ============================================
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dados do formulário
  const [opportunityData, setOpportunityData] = useState({
    nome_oportunidade: '',
    valor: '',
    responsavel: user?.id || ''
  });
  
  const [leadFormData, setLeadFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: ''
  });
  
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Estados para pipelines e estágios
  const [availablePipelines, setAvailablePipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  
  // Estados para vendedores (campo responsável)
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

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
  // EFFECTS
  // ============================================
  
  // Pré-preencher dados do lead quando modal abrir
  useEffect(() => {
    if (isOpen && leadData) {
      setLeadFormData({
        nome: `${leadData.first_name} ${leadData.last_name}`,
        email: leadData.email,
        telefone: leadData.phone || '',
        empresa: leadData.company || '',
        cargo: leadData.job_title || ''
      });
      
      // Sugerir nome da oportunidade baseado no lead
      setOpportunityData(prev => ({
        ...prev,
        nome_oportunidade: `Proposta - ${leadData.first_name} ${leadData.last_name}`,
        responsavel: leadData.assigned_to || user?.id || ''
      }));
      
      // Carregar pipelines disponíveis
      loadAvailablePipelines();
      
      // Carregar vendedores disponíveis para admins
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        loadAvailableMembers();
      }
    }
  }, [isOpen, leadData, user?.id, user?.role]);

  // Carregar estágios quando pipeline for selecionada
  useEffect(() => {
    if (selectedPipelineId) {
      loadPipelineStages(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  // Reset quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setValidationErrors({});
      setCustomFieldsData({});
      setSelectedPipelineId('');
      setPipelineStages([]);
      setSelectedStageId('');
    }
  }, [isOpen]);

  // ============================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================
  
  const loadAvailablePipelines = async () => {
    if (!user?.tenant_id) return;
    
    setLoadingPipelines(true);
    try {
      let query = supabase
        .from('pipelines')
        .select('id, name, created_by')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true);

      // Filtrar pipelines baseado no role
      if (user.role === 'member') {
        // Member vê apenas pipelines onde está vinculado
        const { data: memberPipelines } = await supabase
          .from('pipeline_members')
          .select('pipeline_id')
          .eq('member_id', user.id);
        
        if (memberPipelines && memberPipelines.length > 0) {
          const pipelineIds = memberPipelines.map(pm => pm.pipeline_id);
          query = query.in('id', pipelineIds);
        } else {
          // Se member não tem pipelines, retorna array vazio
          setAvailablePipelines([]);
          return;
        }
      } else if (user.role === 'admin') {
        // Admin vê apenas pipelines que criou
        query = query.or(`created_by.eq.${user.id},created_by.eq.${user.email}`);
      }
      // Super admin vê todas do tenant

      const { data, error } = await query.order('name');

      if (error) {
        console.error('Erro ao carregar pipelines:', error);
        setAvailablePipelines([]);
        return;
      }

      setAvailablePipelines(data || []);
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
      setAvailablePipelines([]);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const loadPipelineStages = async (pipelineId: string) => {
    try {
      const { data: stages, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, order_index, pipeline_id')
        .eq('pipeline_id', pipelineId)
        .order('order_index');

      if (error) throw error;

      setPipelineStages(stages || []);
      
      // Auto-selecionar primeiro estágio
      if (stages && stages.length > 0) {
        setSelectedStageId(stages[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar estágios:', error);
      setPipelineStages([]);
    }
  };

  const loadAvailableMembers = async () => {
    if (!user?.tenant_id) return;
    
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('tenant_id', user.tenant_id)
        .in('role', ['member', 'admin'])
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        console.error('Erro ao carregar vendedores:', error);
        return;
      }

      setAvailableMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

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
    
    setLeadFormData(prev => ({
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

  // ============================================
  // VALIDAÇÕES
  // ============================================
  
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!opportunityData.nome_oportunidade.trim()) {
          errors.nome_oportunidade = 'Nome da oportunidade é obrigatório';
        }
        if (!opportunityData.responsavel) {
          errors.responsavel = 'Responsável é obrigatório';
        }
        break;
        
      case 2:
        if (!leadFormData.nome.trim()) {
          errors.nome = 'Nome é obrigatório';
        }
        if (!leadFormData.email.trim()) {
          errors.email = 'Email é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadFormData.email)) {
          errors.email = 'Email inválido';
        }
        break;
        
      case 3:
        if (!selectedPipelineId) {
          errors.pipeline = 'Pipeline é obrigatória';
        }
        if (!selectedStageId) {
          errors.stage = 'Estágio é obrigatório';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // ============================================
  // SUBMISSÃO
  // ============================================
  
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setIsSubmitting(true);
    try {
      const opportunityPayload = {
        lead_id: leadData.id,
        nome_oportunidade: opportunityData.nome_oportunidade,
        valor: opportunityData.valor.replace(/[^\d,]/g, '').replace(',', '.'),
        responsavel: opportunityData.responsavel,
        pipeline_id: selectedPipelineId,
        stage_id: selectedStageId,
        lead_data: leadFormData,
        custom_fields: customFieldsData
      };
      
      console.log('🚀 Enviando dados da oportunidade:', opportunityPayload);
      
      await onSubmit(opportunityPayload);
      onClose();
    } catch (error) {
      console.error('❌ Erro ao criar oportunidade:', error);
      
      // Mostrar erro mais específico para o usuário
      let errorMessage = 'Erro ao criar oportunidade. ';
      if (error instanceof Error) {
        if (error.message.includes('unauthorized') || error.message.includes('401')) {
          errorMessage += 'Erro de autorização. Verifique suas permissões.';
        } else if (error.message.includes('pipeline')) {
          errorMessage += 'Problema com a pipeline selecionada.';
        } else if (error.message.includes('stage')) {
          errorMessage += 'Problema com o estágio selecionado.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Erro desconhecido.';
      }
      
      showErrorToast('Erro ao criar oportunidade', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Converter Lead em Oportunidade
          </DialogTitle>
          <DialogDescription>
            Transforme o lead "{leadData.first_name} {leadData.last_name}" em uma oportunidade de venda
          </DialogDescription>
        </DialogHeader>

        {/* INDICADOR DE PROGRESSO */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {currentStep > step ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 3 && (
                <div className={`
                  w-16 h-1 mx-2
                  ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* CONTEÚDO DO FORMULÁRIO */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ETAPA 1: DADOS DA OPORTUNIDADE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Dados da Oportunidade</h3>
                <p className="text-blue-700 text-sm">
                  Configure as informações básicas da oportunidade que será criada.
                </p>
              </div>

              <div>
                <Label htmlFor="nome_oportunidade" className="flex items-center gap-2">
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

              <div>
                <Label htmlFor="valor" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
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
                <Label htmlFor="responsavel" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Responsável <span className="text-red-500">*</span>
                  {user?.role === 'member' && (
                    <Badge variant="secondary" className="ml-2">Usuário Logado</Badge>
                  )}
                </Label>
                
                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                  <Select 
                    value={opportunityData.responsavel} 
                    onValueChange={(value) => handleOpportunityChange('responsavel', value)}
                  >
                    <SelectTrigger className={validationErrors.responsavel ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingMembers ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="ml-2">Carregando...</span>
                        </div>
                      ) : (
                        availableMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{member.first_name} {member.last_name}</span>
                              <span className="text-gray-500 text-sm">({member.email})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
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
                )}
                
                {validationErrors.responsavel && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.responsavel}</p>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 2: DADOS DO LEAD */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Dados pré-preenchidos do lead</h3>
                <p className="text-blue-700 text-sm">
                  Os dados abaixo foram carregados automaticamente. Você pode editá-los se necessário.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={leadFormData.nome}
                    onChange={(e) => handleLeadChange('nome', e.target.value)}
                    placeholder="Nome completo do lead"
                    className={validationErrors.nome ? 'border-red-500' : ''}
                  />
                  {validationErrors.nome && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.nome}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={leadFormData.email}
                    onChange={(e) => handleLeadChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    className={validationErrors.email ? 'border-red-500' : ''}
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="telefone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    value={leadFormData.telefone}
                    onChange={(e) => handleLeadChange('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="empresa" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Empresa
                  </Label>
                  <Input
                    id="empresa"
                    value={leadFormData.empresa}
                    onChange={(e) => handleLeadChange('empresa', e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="cargo" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Cargo
                  </Label>
                  <Input
                    id="cargo"
                    value={leadFormData.cargo}
                    onChange={(e) => handleLeadChange('cargo', e.target.value)}
                    placeholder="Cargo na empresa"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: PIPELINE E ESTÁGIO */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Selecione a pipeline de destino</h3>
                <p className="text-green-700 text-sm">
                  Escolha em qual pipeline e estágio a oportunidade será criada.
                </p>
              </div>

              <div>
                <Label htmlFor="pipeline" className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Pipeline <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                  <SelectTrigger className={validationErrors.pipeline ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione uma pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPipelines ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="ml-2">Carregando...</span>
                      </div>
                    ) : (
                      availablePipelines.map(pipeline => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {validationErrors.pipeline && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.pipeline}</p>
                )}
              </div>

              {selectedPipelineId && (
                <div>
                  <Label htmlFor="stage" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Estágio Inicial <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                    <SelectTrigger className={validationErrors.stage ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione um estágio" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.stage && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.stage}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTÕES DE NAVEGAÇÃO */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < 3 ? (
              <Button onClick={handleNextStep} disabled={isSubmitting}>
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadToOpportunityModal; 