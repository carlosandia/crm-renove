import React, { useState, useEffect } from 'react';
import { X, Plus, User, Mail, Phone, DollarSign, Calendar, FileText, List, File, AlertTriangle, Briefcase, Search, UserPlus, Users, Building2, MapPin, Hash, Globe, ChevronDown } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

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

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'super_admin' | 'admin' | 'member';
  tenant_id?: string;
}

interface ExistingLead {
  id: string;
  custom_data: any;
  lead_data?: any;
  pipeline_id?: string;
  stage_id?: string;
  temperature?: number;
  assigned_to?: string;
  created_by?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: any;
  formData: any;
  onFieldChange: (field: string, value: string) => void;
  onSubmit: () => void;
  currentUser?: User;
  mode?: 'create' | 'edit';
  leadId?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  formData,
  onFieldChange,
  onSubmit,
  currentUser,
  mode = 'create',
  leadId
}) => {
  const { user } = useAuth();
  
  // Estados principais
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [selectedExistingLead, setSelectedExistingLead] = useState<ExistingLead | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [filteredExistingLeads, setFilteredExistingLeads] = useState<ExistingLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const log = (message: string, ...args: any[]) => {
    console.log(`🔄 LeadModal: ${message}`, ...args);
  };

  const logError = (message: string, error?: any) => {
    console.error(`❌ LeadModal: ${message}`, error);
  };

  // ============================================
  // CARREGAR LEADS EXISTENTES
  // ============================================

  const loadExistingLeads = async () => {
    if (!user?.tenant_id) return;

    setLoadingLeads(true);
    try {
      log('🔍 [LeadModal] Carregando leads existentes da fonte única (leads_master)');

      // ✅ FONTE ÚNICA: Buscar leads_master diretamente
      let query = supabase
        .from('leads_master')
        .select('id, first_name, last_name, email, phone, company, job_title, status, created_at, updated_at')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Se for member, só ver seus leads
      if (user.role === 'member') {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) {
        logError('❌ [LeadModal] Erro ao carregar leads da fonte única:', error);
        setExistingLeads([]);
        setFilteredExistingLeads([]);
        return;
      }

      // ✅ Transformar dados para formato esperado pelo componente
      const processedLeads = (data || []).map(lead => ({
        id: lead.id,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        // ✅ DADOS REAIS de leads_master (fonte única)
        custom_data: {
          nome: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead sem nome',
          name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Lead sem nome',
          email: lead.email || '',
          telefone: lead.phone || '',
          phone: lead.phone || '',
          empresa: lead.company || '',
          company: lead.company || '',
          cargo: lead.job_title || '',
          status: lead.status || 'active',
          lead_master_id: lead.id
        }
      }));

      log('✅ [LeadModal] Leads carregados da fonte única:', processedLeads.length);
      setExistingLeads(processedLeads);
      setFilteredExistingLeads(processedLeads);

    } catch (error: any) {
      logError('❌ [LeadModal] Erro ao carregar leads:', error);
      
      // ✅ SEM FALLBACK PROBLEMÁTICO: Retornar lista vazia em vez de quebrar
      log('🔄 [LeadModal] Sistema funcionando em modo de recuperação - lista vazia');
      setExistingLeads([]);
      setFilteredExistingLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  // ============================================
  // FILTRAR LEADS
  // ============================================

  useEffect(() => {
    if (!leadSearchTerm.trim()) {
      setFilteredExistingLeads(existingLeads);
      return;
    }

    const filtered = existingLeads.filter(lead => {
      const searchLower = leadSearchTerm.toLowerCase();
      const customData = lead.custom_data || {};
      
      // Buscar em campos comuns
      const searchableFields = [
        customData.nome || customData.name || '',
        customData.email || '',
        customData.telefone || customData.phone || '',
        customData.empresa || customData.company || ''
      ];

      return searchableFields.some(field => 
        field.toString().toLowerCase().includes(searchLower)
      );
    });

    setFilteredExistingLeads(filtered);
  }, [leadSearchTerm, existingLeads]);

  // ============================================
  // SELECIONAR LEAD EXISTENTE
  // ============================================

  const handleSelectExistingLead = (lead: ExistingLead) => {
    log('📋 Selecionando lead existente:', lead.id);
    setSelectedExistingLead(lead);
    
    // Preencher formulário com dados do lead selecionado
    const customData = lead.custom_data || {};
    Object.keys(customData).forEach(key => {
      onFieldChange(key, customData[key] || '');
    });
  };

  // ============================================
  // VALIDAÇÃO
  // ============================================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const customFields = pipeline?.pipeline_custom_fields || pipeline?.custom_fields || [];

    customFields.forEach((field: CustomField) => {
      if (field.is_required && !formData[field.field_name]?.trim()) {
        errors[field.field_name] = `${field.field_label} é obrigatório`;
      }

      // Validações específicas por tipo
      if (formData[field.field_name]) {
        const value = formData[field.field_name];
        
        switch (field.field_type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors[field.field_name] = 'Email inválido';
            }
            break;
          case 'phone':
            const phoneRegex = /^[\d\s\(\)\-\+]+$/;
            if (!phoneRegex.test(value)) {
              errors[field.field_name] = 'Telefone inválido';
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              errors[field.field_name] = 'URL inválida';
            }
            break;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // SUBMISSÃO
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      log('❌ Validação falhou');
      return;
    }

    setIsSubmitting(true);
    log('📤 Submetendo formulário...');

    try {
      await onSubmit();
      log('✅ Lead salvo com sucesso');
      onClose();
    } catch (error: any) {
      logError('❌ Erro ao salvar lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDERIZAR CAMPO
  // ============================================

  const renderField = (field: CustomField) => {
    const value = formData[field.field_name] || '';
    const hasError = validationErrors[field.field_name];

    const fieldProps = {
      id: field.field_name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        onFieldChange(field.field_name, e.target.value),
      placeholder: field.placeholder || `Digite ${field.field_label.toLowerCase()}`,
      className: hasError ? 'border-red-500' : ''
    };

    const getFieldIcon = () => {
      switch (field.field_type) {
        case 'email': return <Mail className="w-4 h-4" />;
        case 'phone': return <Phone className="w-4 h-4" />;
        case 'number':
        case 'currency': return <DollarSign className="w-4 h-4" />;
        case 'date': return <Calendar className="w-4 h-4" />;
        case 'url': return <Globe className="w-4 h-4" />;
        case 'textarea': return <FileText className="w-4 h-4" />;
        case 'select': return <List className="w-4 h-4" />;
        default: return <User className="w-4 h-4" />;
      }
    };

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.field_name} className="flex items-center gap-2 text-sm font-medium">
          {getFieldIcon()}
          {field.field_label}
          {field.is_required && <span className="text-red-500">*</span>}
        </Label>
        
        {field.field_type === 'textarea' ? (
          <Textarea
            {...fieldProps}
            rows={3}
            className={`resize-none ${hasError ? 'border-red-500' : ''}`}
          />
        ) : field.field_type === 'select' ? (
          <Select value={value} onValueChange={(val) => onFieldChange(field.field_name, val)}>
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {(field.field_options || []).map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            {...fieldProps}
            type={field.field_type === 'email' ? 'email' : 
                  field.field_type === 'number' || field.field_type === 'currency' ? 'number' :
                  field.field_type === 'date' ? 'date' :
                  field.field_type === 'url' ? 'url' : 'text'}
          />
        )}
        
        {hasError && (
          <p className="text-red-500 text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {hasError}
          </p>
        )}
      </div>
    );
  };

  // ============================================
  // EFFECTS
  // ============================================

  // Carregar leads quando modal abrir
  useEffect(() => {
    if (isOpen && pipeline) {
      log('🚀 Modal aberto - carregando leads existentes');
      loadExistingLeads();
    }
  }, [isOpen, pipeline]);

  // Filtrar leads baseado na busca
  useEffect(() => {
    if (!leadSearchTerm.trim()) {
      setFilteredExistingLeads(existingLeads);
      return;
    }

    const filtered = existingLeads.filter(lead => {
      const searchLower = leadSearchTerm.toLowerCase();
      const customData = lead.custom_data || {};
      
      // Buscar em campos comuns
      const searchableFields = [
        customData.nome || customData.name || '',
        customData.email || '',
        customData.telefone || customData.phone || '',
        customData.empresa || customData.company || ''
      ];

      return searchableFields.some(field => 
        field.toString().toLowerCase().includes(searchLower)
      );
    });

    setFilteredExistingLeads(filtered);
  }, [leadSearchTerm, existingLeads]);

  // Reset quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('new');
      setSelectedExistingLead(null);
      setLeadSearchTerm('');
      setValidationErrors({});
      // Limpar leads carregados quando fechar
      setExistingLeads([]);
      setFilteredExistingLeads([]);
    }
  }, [isOpen]);

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  const customFields = pipeline?.pipeline_custom_fields || pipeline?.custom_fields || [];
  const sortedFields = [...customFields].sort((a, b) => a.field_order - b.field_order);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {mode === 'edit' ? 'Editar Lead' : 'Adicionar Novo Lead'}
          </DialogTitle>
          <DialogDescription>
            Pipeline: <Badge variant="outline">{pipeline?.name}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'new' | 'existing')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo Lead
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Lead Existente
              </TabsTrigger>
            </TabsList>

            {/* ============================================ */}
            {/* TAB: NOVO LEAD */}
            {/* ============================================ */}
            <TabsContent value="new" className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedFields.map(renderField)}
                </div>
              </form>
            </TabsContent>

            {/* ============================================ */}
            {/* TAB: LEAD EXISTENTE */}
            {/* ============================================ */}
            <TabsContent value="existing" className="mt-4 space-y-4">
              <div className="space-y-4">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, email, telefone ou empresa..."
                    value={leadSearchTerm}
                    onChange={(e) => setLeadSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Lista de leads */}
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {loadingLeads ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Carregando leads...</p>
                    </div>
                  ) : filteredExistingLeads.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">
                        {leadSearchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead disponível'}
                      </p>
                    </div>
                  ) : (
                    filteredExistingLeads.map(lead => {
                      const customData = lead.custom_data || {};
                      const isSelected = selectedExistingLead?.id === lead.id;
                      
                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectExistingLead(lead)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {customData.nome || customData.name || 'Lead sem nome'}
                              </h4>
                              <div className="mt-1 space-y-1">
                                {customData.email && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {customData.email}
                                  </p>
                                )}
                                {(customData.telefone || customData.phone) && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {customData.telefone || customData.phone}
                                  </p>
                                )}
                                {(customData.empresa || customData.company) && (
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {customData.empresa || customData.company}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {lead.temperature && (
                                <Badge 
                                  variant={lead.temperature > 70 ? 'default' : lead.temperature > 40 ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {lead.temperature}°
                                </Badge>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ============================================ */}
        {/* FOOTER COM BOTÕES */}
        {/* ============================================ */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {activeTab === 'existing' && selectedExistingLead && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Lead selecionado: {selectedExistingLead.custom_data?.nome || selectedExistingLead.custom_data?.name || 'Lead sem nome'}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || (activeTab === 'existing' && !selectedExistingLead)}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {mode === 'edit' ? 'Atualizar' : 'Adicionar'} Lead
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal; 