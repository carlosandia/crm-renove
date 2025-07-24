import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, Mail, Phone, Building, DollarSign, Search, 
  UserPlus, Users, Check, X, Star, FileText, 
  Calendar, MapPin, AlertCircle, Loader2, Eye, EyeOff,
  Target, Briefcase, Globe, Hash, AlignLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
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
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CustomField {
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

interface ExistingLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  status?: string;
  created_at: string;
  custom_data?: Record<string, any>;
}

interface Pipeline {
  id: string;
  name: string;
  pipeline_custom_fields?: CustomField[];
  pipeline_stages?: any[];
}

interface EnhancedLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: Pipeline;
  formData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
}

// ============================================
// CAMPOS PADRÃO DO SISTEMA (BASEADO NOS GRANDES CRMS)
// ============================================

const STANDARD_FIELDS = [
  {
    name: 'nome_oportunidade',
    label: '📋 Nome da Oportunidade',
    type: 'text' as const,
    required: true,
    placeholder: 'Ex: Proposta de Sistema - Empresa XYZ',
    description: 'Nome que identifica esta oportunidade',
    icon: Target,
    category: 'opportunity'
  },
  {
    name: 'valor_oportunidade',
    label: '💰 Valor da Oportunidade',
    type: 'currency' as const,
    required: false,
    placeholder: 'R$ 0,00',
    description: 'Valor estimado do negócio',
    icon: DollarSign,
    category: 'opportunity'
  },
  {
    name: 'nome_contato',
    label: '👤 Nome do Contato',
    type: 'text' as const,
    required: true,
    placeholder: 'Ex: João Silva',
    description: 'Nome da pessoa de contato',
    icon: User,
    category: 'contact'
  },
  {
    name: 'email_contato',
    label: '📧 Email do Contato',
    type: 'email' as const,
    required: true,
    placeholder: 'exemplo@empresa.com',
    description: 'Email principal para contato',
    icon: Mail,
    category: 'contact'
  },
  {
    name: 'telefone_contato',
    label: '📱 Telefone do Contato',
    type: 'phone' as const,
    required: false,
    placeholder: '(11) 99999-9999',
    description: 'Telefone para contato direto',
    icon: Phone,
    category: 'contact'
  },
  {
    name: 'empresa',
    label: '🏢 Empresa',
    type: 'text' as const,
    required: false,
    placeholder: 'Ex: Empresa XYZ Ltda',
    description: 'Nome da empresa do contato',
    icon: Building,
    category: 'contact'
  },
  {
    name: 'cargo_contato',
    label: '💼 Cargo',
    type: 'text' as const,
    required: false,
    placeholder: 'Ex: Gerente de TI',
    description: 'Cargo da pessoa na empresa',
    icon: Briefcase,
    category: 'contact'
  }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const EnhancedLeadModal: React.FC<EnhancedLeadModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  formData,
  onFieldChange,
  onSubmit
}) => {
  const { user } = useAuth();
  
  // DEBUG: Log sempre que o componente é renderizado
  console.log('🎯 EnhancedLeadModal renderizado:', {
    isOpen,
    pipeline: pipeline?.name,
    formDataKeys: Object.keys(formData || {}),
    timestamp: new Date().toISOString()
  });
  
  // ============================================
  // ESTADOS
  // ============================================
  
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<ExistingLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<ExistingLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // CAMPOS CUSTOMIZADOS DA PIPELINE
  // ============================================
  
  const customFields = useMemo(() => {
    return (pipeline?.pipeline_custom_fields || [])
      .sort((a, b) => a.field_order - b.field_order);
  }, [pipeline?.pipeline_custom_fields]);

  // ============================================
  // BUSCAR LEADS EXISTENTES
  // ============================================
  
  const loadExistingLeads = useCallback(async () => {
    if (!user?.tenant_id) return;
    
    setLoadingLeads(true);
    try {
      console.log('🔍 [EnhancedLeadModal] Carregando leads existentes da fonte única (leads_master)');
      
      // ✅ FONTE ÚNICA: Buscar leads_master diretamente
      let query = supabase
        .from('leads_master')
        .select('id, first_name, last_name, email, phone, company, job_title, status, created_at, updated_at')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Se for member, só ver seus leads
      if (user.role === 'member') {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [EnhancedLeadModal] Erro ao carregar leads da fonte única:', error);
        setExistingLeads([]);
        setFilteredLeads([]);
        return;
      }

      // ✅ Transformar dados para formato esperado pelo componente
      const transformedLeads = (data || []).map(lead => ({
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        job_title: lead.job_title,
        status: lead.status,
        created_at: lead.created_at,
        updated_at: lead.updated_at
      }));

      setExistingLeads(transformedLeads);
      setFilteredLeads(transformedLeads);
      console.log('✅ [EnhancedLeadModal] Leads carregados da fonte única:', transformedLeads.length);
      
    } catch (error) {
      console.error('❌ [EnhancedLeadModal] Erro ao buscar leads:', error);
      setExistingLeads([]);
      setFilteredLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [user]);

  // ============================================
  // FILTRAR LEADS POR BUSCA
  // ============================================
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLeads(existingLeads);
      return;
    }

    const filtered = existingLeads.filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (lead.first_name + ' ' + lead.last_name).toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.company?.toLowerCase().includes(searchLower) ||
        lead.phone?.includes(searchTerm)
      );
    });

    setFilteredLeads(filtered);
  }, [searchTerm, existingLeads]);

  // ============================================
  // CARREGAR LEADS AO ABRIR MODAL
  // ============================================
  
  useEffect(() => {
    if (isOpen && activeTab === 'existing') {
      loadExistingLeads();
    }
  }, [isOpen, activeTab, loadExistingLeads]);

  // ============================================
  // VALIDAÇÃO DE CAMPOS
  // ============================================
  
  const validateField = useCallback((fieldName: string, value: any) => {
    const errors: string[] = [];

    // Validação de email
    if (fieldName.includes('email') && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push('Email inválido');
      }
    }

    // Validação de telefone
    if (fieldName.includes('telefone') && value) {
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
      if (!phoneRegex.test(value)) {
        errors.push('Formato: (11) 99999-9999');
      }
    }

    // Validação de valor monetário
    if (fieldName.includes('valor') && value) {
      const numValue = parseFloat(value.toString().replace(/[^\d,]/g, '').replace(',', '.'));
      if (isNaN(numValue) || numValue < 0) {
        errors.push('Valor deve ser positivo');
      }
    }

    setFieldValidation(prev => ({
      ...prev,
      [fieldName]: errors.join(', ')
    }));

    return errors.length === 0;
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    onFieldChange(fieldName, value);
    validateField(fieldName, value);
  }, [onFieldChange, validateField]);

  const handleSelectExistingLead = useCallback((lead: ExistingLead) => {
    setSelectedLead(lead);
    
    // Preencher campos com dados do lead selecionado
    onFieldChange('nome_contato', `${lead.first_name} ${lead.last_name}`);
    onFieldChange('email_contato', lead.email);
    onFieldChange('telefone_contato', lead.phone || '');
    onFieldChange('empresa', lead.company || '');
    onFieldChange('cargo_contato', lead.job_title || '');
    
    // Se existir nome da oportunidade, preencher baseado na empresa
    if (lead.company) {
      onFieldChange('nome_oportunidade', `Oportunidade - ${lead.company}`);
    }
  }, [onFieldChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    const requiredFields = [
      { name: 'nome_oportunidade', label: 'Nome da Oportunidade' },
      { name: 'nome_contato', label: 'Nome do Contato' },
      { name: 'email_contato', label: 'Email do Contato' }
    ];

    // Adicionar campos customizados obrigatórios
    customFields.forEach(field => {
      if (field.is_required) {
        requiredFields.push({
          name: field.field_name,
          label: field.field_label
        });
      }
    });

    const missingFields = requiredFields.filter(field => 
      !formData[field.name] || formData[field.name].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios não preenchidos:\n${missingFields.map(f => f.label).join('\n')}`);
      return;
    }

    // Verificar se há erros de validação
    const hasValidationErrors = Object.values(fieldValidation).some(error => error.length > 0);
    if (hasValidationErrors) {
      toast.error('Corrija os erros de validação antes de continuar');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
      onClose();
    } catch (error) {
      console.error('Erro ao criar lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, customFields, fieldValidation, onSubmit, onClose]);

  // ============================================
  // FORMATADORES
  // ============================================
  
  const formatCurrency = useCallback((value: string): string => {
    const numValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(numValue)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  }, []);

  const formatPhone = useCallback((value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    } else if (digits.length >= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }
    return value;
  }, []);

  // ============================================
  // RENDERIZAÇÃO DE CAMPO CUSTOMIZADO
  // ============================================
  
  const renderCustomField = useCallback((field: CustomField) => {
    const value = formData[field.field_name] || '';
    const hasError = fieldValidation[field.field_name];

    const commonProps = {
      id: field.field_name,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let newValue = e.target.value;
        
        // Aplicar formatação específica
        if (field.field_type === 'phone') {
          newValue = formatPhone(newValue);
        } else if (field.field_name.includes('valor')) {
          newValue = formatCurrency(newValue);
        }
        
        handleFieldChange(field.field_name, newValue);
      },
      placeholder: field.placeholder,
      className: `${hasError ? 'border-red-500' : ''}`
    };

    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <select
            {...commonProps}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-500' : ''}`}
          >
            <option value="">Selecione...</option>
            {field.field_options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
          />
        );
      
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            step="0.01"
          />
        );
      
      default:
        return (
          <Input
            {...commonProps}
            type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
          />
        );
    }
  }, [formData, fieldValidation, handleFieldChange, formatPhone, formatCurrency]);

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-6 h-6 text-blue-600" />
            Criar Oportunidade
          </DialogTitle>
          <DialogDescription>
            Pipeline: <strong>{pipeline?.name}</strong> • Preencha os dados para criar uma nova oportunidade
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Nova Oportunidade
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Lead Existente
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* TAB: NOVA OPORTUNIDADE */}
          {/* ============================================ */}
          
          <TabsContent value="new" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* CAMPOS PADRÃO DA OPORTUNIDADE */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Dados da Oportunidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STANDARD_FIELDS.filter(f => f.category === 'opportunity').map(field => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        <field.icon className="w-4 h-4" />
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {field.type === 'currency' ? (
                        <Input
                          id={field.name}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, formatCurrency(e.target.value))}
                          placeholder={field.placeholder}
                          className={fieldValidation[field.name] ? 'border-red-500' : ''}
                        />
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type === 'email' ? 'email' : 'text'}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          className={fieldValidation[field.name] ? 'border-red-500' : ''}
                        />
                      )}
                      {field.description && (
                        <p className="text-xs text-gray-500">{field.description}</p>
                      )}
                      {fieldValidation[field.name] && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldValidation[field.name]}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* CAMPOS PADRÃO DO CONTATO */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-green-600" />
                    Dados do Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STANDARD_FIELDS.filter(f => f.category === 'contact').map(field => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        <field.icon className="w-4 h-4" />
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id={field.name}
                        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                        value={formData[field.name] || ''}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (field.type === 'phone') {
                            value = formatPhone(value);
                          }
                          handleFieldChange(field.name, value);
                        }}
                        placeholder={field.placeholder}
                        required={field.required}
                        className={fieldValidation[field.name] ? 'border-red-500' : ''}
                      />
                      {field.description && (
                        <p className="text-xs text-gray-500">{field.description}</p>
                      )}
                      {fieldValidation[field.name] && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldValidation[field.name]}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* CAMPOS CUSTOMIZADOS DA PIPELINE */}
              {customFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Campos Específicos da Pipeline
                      <Badge variant="secondary">{customFields.length} campos</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.field_name} className="flex items-center gap-2">
                          {field.field_type === 'text' && <AlignLeft className="w-4 h-4" />}
                          {field.field_type === 'email' && <Mail className="w-4 h-4" />}
                          {field.field_type === 'phone' && <Phone className="w-4 h-4" />}
                          {field.field_type === 'number' && <Hash className="w-4 h-4" />}
                          {field.field_type === 'date' && <Calendar className="w-4 h-4" />}
                          {field.field_type === 'select' && <FileText className="w-4 h-4" />}
                          {field.field_type === 'textarea' && <AlignLeft className="w-4 h-4" />}
                          
                          {field.field_label}
                          {field.is_required && <span className="text-red-500">*</span>}
                          {field.show_in_card && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Visível no card
                            </Badge>
                          )}
                        </Label>
                        {renderCustomField(field)}
                        {fieldValidation[field.field_name] && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldValidation[field.field_name]}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* BOTÕES DE AÇÃO */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando Oportunidade...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Oportunidade
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ============================================ */}
          {/* TAB: LEAD EXISTENTE */}
          {/* ============================================ */}
          
          <TabsContent value="existing" className="space-y-4">
            {/* BUSCA DE LEADS */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email, empresa ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* LISTA DE LEADS EXISTENTES */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2">Carregando leads...</span>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Nenhum lead encontrado para a busca' : 'Nenhum lead existente encontrado'}
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <Card
                    key={lead.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedLead?.id === lead.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectExistingLead(lead)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">
                              {lead.first_name} {lead.last_name}
                            </h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </p>
                            {lead.company && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {lead.company}
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedLead?.id === lead.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* FORMULÁRIO COM LEAD SELECIONADO */}
            {selectedLead && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Lead Selecionado: {selectedLead.first_name} {selectedLead.last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* DADOS DA OPORTUNIDADE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome_oportunidade" className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Nome da Oportunidade *
                        </Label>
                        <Input
                          id="nome_oportunidade"
                          value={formData.nome_oportunidade || ''}
                          onChange={(e) => handleFieldChange('nome_oportunidade', e.target.value)}
                          placeholder="Ex: Proposta de Sistema - Empresa XYZ"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="valor_oportunidade" className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Valor da Oportunidade
                        </Label>
                        <Input
                          id="valor_oportunidade"
                          value={formData.valor_oportunidade || ''}
                          onChange={(e) => handleFieldChange('valor_oportunidade', formatCurrency(e.target.value))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>

                    {/* CAMPOS CUSTOMIZADOS (se existirem) */}
                    {customFields.length > 0 && (
                      <>
                        <Separator />
                        <h4 className="font-medium text-gray-900">Campos Específicos da Pipeline</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {customFields.map(field => (
                            <div key={field.id} className="space-y-2">
                              <Label htmlFor={field.field_name} className="flex items-center gap-2">
                                {field.field_label}
                                {field.is_required && <span className="text-red-500">*</span>}
                              </Label>
                              {renderCustomField(field)}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* BOTÕES DE AÇÃO */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Criando Oportunidade...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Criar Oportunidade
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedLeadModal; 