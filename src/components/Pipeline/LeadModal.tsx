import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, User, Mail, Phone, DollarSign, Calendar, FileText, List, File, AlertTriangle, Briefcase, Search, UserPlus, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
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
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature?: string;
  status?: string;
  created_at: string;
}

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: any;
  formData: any;
  onFieldChange: (field: string, value: string) => void;
  onSubmit: () => void;
  currentUser?: User;
}

const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  formData,
  onFieldChange,
  onSubmit,
  currentUser
}) => {
  const { user } = useAuth();
  
  // Estados para seleção de lead existente
  const [leadSelectionMode, setLeadSelectionMode] = useState<'new' | 'existing'>('new');
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [selectedExistingLead, setSelectedExistingLead] = useState<ExistingLead | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [filteredExistingLeads, setFilteredExistingLeads] = useState<ExistingLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Função para carregar leads existentes
  const loadExistingLeads = async () => {
    console.log('🔍 Iniciando carregamento de leads existentes...');
    console.log('👤 Dados do usuário completos:', user);
    
    if (!user) {
      console.error('❌ Usuário não encontrado');
      return;
    }

    if (!user.tenant_id) {
      console.warn('⚠️ Usuário sem tenant_id:', user);
      // Tentar buscar sem filtro de tenant para debug
      console.log('🔄 Tentando buscar leads sem filtro de tenant para debug...');
    }

    console.log('🔍 Carregando leads existentes...', {
      userId: user.id,
      tenantId: user.tenant_id,
      userRole: user.role,
      userEmail: user.email,
      userCompleto: user
    });

    setLoadingLeads(true);
    try {
      // Tentar primeiro na tabela leads_master
      console.log('📋 Tentando buscar na tabela leads_master...');
      let query = supabase
        .from('leads_master')
        .select('id, first_name, last_name, email, phone, company, job_title, lead_temperature, status, created_at, tenant_id, assigned_to')
        .order('created_at', { ascending: false })
        .limit(100);

      // Aplicar filtro de tenant apenas se existir
      if (user.tenant_id) {
        console.log('🔍 Aplicando filtro de tenant_id:', user.tenant_id);
        query = query.eq('tenant_id', user.tenant_id);
      } else {
        console.log('⚠️ Buscando todos os leads (sem filtro de tenant) para debug');
      }

      // Se for member, ver apenas seus leads
      if (user.role === 'member' && user.id) {
        console.log('🔍 Aplicando filtro de assigned_to para member:', user.id);
        query = query.eq('assigned_to', user.id);
      }

      const { data: masterData, error: masterError } = await query;

      if (masterError) {
        console.error('❌ Erro na tabela leads_master:', masterError);
        
        // Tentar na tabela leads (caso os leads estejam em outra tabela)
        console.log('🔄 Tentando buscar na tabela leads...');
        let leadsQuery = supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone, company, job_title, lead_temperature, status, created_at, tenant_id, assigned_to')
          .order('created_at', { ascending: false })
          .limit(100);

        // Aplicar filtro de tenant apenas se existir
        if (user.tenant_id) {
          leadsQuery = leadsQuery.eq('tenant_id', user.tenant_id);
        }

        if (user.role === 'member' && user.id) {
          leadsQuery = leadsQuery.eq('assigned_to', user.id);
        }

        const { data: leadsData, error: leadsError } = await leadsQuery;

        if (leadsError) {
          console.error('❌ Erro na tabela leads:', leadsError);
          
          // Debug final - buscar em todas as tabelas possíveis
          console.log('🔍 Fazendo debug completo...');
          const { data: debugData, error: debugError } = await supabase
            .from('leads_master')
            .select('*')
            .limit(5);
            
          if (!debugError && debugData) {
            console.log('🔍 Estrutura da tabela leads_master:', debugData);
          }
          
          const { data: debugLeads, error: debugLeadsError } = await supabase
            .from('leads')
            .select('*')
            .limit(5);
            
          if (!debugLeadsError && debugLeads) {
            console.log('🔍 Estrutura da tabela leads:', debugLeads);
          }
          
          return;
        } else {
          console.log('✅ Leads encontrados na tabela leads:', leadsData?.length || 0);
          if (leadsData && leadsData.length > 0) {
            console.log('📋 Primeiros 3 leads da tabela leads:', leadsData.slice(0, 3));
            setExistingLeads(leadsData);
            setFilteredExistingLeads(leadsData);
            return;
          }
        }
      } else {
        console.log('✅ Leads encontrados na tabela leads_master:', masterData?.length || 0);
        
        if (masterData && masterData.length > 0) {
          console.log('📋 Primeiros 3 leads encontrados:', masterData.slice(0, 3));
          console.log('📋 Todos os leads encontrados:', masterData);
          
          // Não filtrar por status - mostrar todos os leads
          console.log('✅ Carregando todos os leads sem filtro de status');
          setExistingLeads(masterData);
          setFilteredExistingLeads(masterData);
          return;
        } else {
          console.warn('⚠️ Nenhum lead encontrado na tabela leads_master');
        }
      }

      // Se chegou aqui, não encontrou leads em nenhuma tabela
      console.warn('⚠️ Nenhum lead encontrado em nenhuma tabela');
      setExistingLeads([]);
      setFilteredExistingLeads([]);
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar leads existentes:', error);
      setExistingLeads([]);
      setFilteredExistingLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Filtrar leads existentes por busca
  useEffect(() => {
    if (!leadSearchTerm) {
      setFilteredExistingLeads(existingLeads);
      return;
    }

    const filtered = existingLeads.filter(lead => {
      const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
      const searchLower = leadSearchTerm.toLowerCase();
      
      return fullName.includes(searchLower) ||
             lead.email.toLowerCase().includes(searchLower) ||
             (lead.phone && lead.phone.includes(leadSearchTerm)) ||
             (lead.company && lead.company.toLowerCase().includes(searchLower));
    });

    setFilteredExistingLeads(filtered);
  }, [leadSearchTerm, existingLeads]);

  // Carregar leads quando modal abre e modo for 'existing'
  useEffect(() => {
    if (isOpen && leadSelectionMode === 'existing') {
      console.log('🔄 Modo "Lead Existente" ativado, carregando leads...');
      loadExistingLeads();
    }
  }, [isOpen, leadSelectionMode]);

  // Limpar dados quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setExistingLeads([]);
      setFilteredExistingLeads([]);
      setSelectedExistingLead(null);
      setLeadSearchTerm('');
      setLeadSelectionMode('new');
    }
  }, [isOpen]);

  // Função para selecionar lead existente
  const handleSelectExistingLead = (lead: ExistingLead) => {
    setSelectedExistingLead(lead);
    
    // Preencher campos do formulário com dados do lead selecionado
    onFieldChange('nome_lead', `${lead.first_name} ${lead.last_name}`.trim());
    onFieldChange('email', lead.email);
    onFieldChange('telefone', lead.phone || '');
    onFieldChange('empresa', lead.company || '');
    onFieldChange('cargo', lead.job_title || '');
    onFieldChange('temperatura', lead.lead_temperature || 'frio');
    onFieldChange('existing_lead_id', lead.id); // Campo especial para identificar que é lead existente
  };

  if (!isOpen) return null;

  // Função para formatar valor monetário
  const formatCurrency = (value: string): string => {
    // Remove tudo que não é dígito
    const onlyNumbers = value.replace(/\D/g, '');
    
    if (!onlyNumbers) return '';
    
    // Converte para centavos
    const cents = parseInt(onlyNumbers);
    const reais = cents / 100;
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(reais);
  };

  // Função para formatar telefone
  const formatPhone = (value: string): string => {
    // Remove tudo que não é dígito
    const onlyNumbers = value.replace(/\D/g, '');
    
    if (!onlyNumbers) return '';
    
    // Aplica a máscara baseada no tamanho
    if (onlyNumbers.length <= 10) {
      // Telefone fixo: (11) 1234-5678
      return onlyNumbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      // Celular: (11) 91234-5678
      return onlyNumbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
  };

  // Função para validar email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handler para campo de valor com máscara
  const handleValueChange = (value: string) => {
    const formatted = formatCurrency(value);
    onFieldChange('valor', formatted);
  };

  // Handler para campo de telefone com máscara
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    onFieldChange('telefone', formatted);
  };

  // Handler para campo de email com validação
  const handleEmailChange = (value: string) => {
    onFieldChange('email', value.toLowerCase().trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return <User className="w-4 h-4 text-gray-500" />;
      case 'email': return <Mail className="w-4 h-4 text-gray-500" />;
      case 'phone': return <Phone className="w-4 h-4 text-gray-500" />;
      case 'number': return <DollarSign className="w-4 h-4 text-gray-500" />;
      case 'date': return <Calendar className="w-4 h-4 text-gray-500" />;
      case 'textarea': return <FileText className="w-4 h-4 text-gray-500" />;
      case 'select': return <List className="w-4 h-4 text-gray-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filtra campos customizados para evitar duplicação dos campos nativos
  const filteredCustomFields = (pipeline?.custom_fields || pipeline?.pipeline_custom_fields || []).filter((field: CustomField) => 
    !['nome', 'email', 'telefone', 'valor', 'nome_lead', 'responsavel'].includes(field.field_name.toLowerCase())
  ).sort((a: CustomField, b: CustomField) => a.field_order - b.field_order);

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Novo Lead</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Primeira Etapa - Sobre a oportunidade */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">1</span>
                Sobre a oportunidade
              </h3>
              
              <div className="space-y-4">
                {/* Nome da Oportunidade */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Nome da Oportunidade</span>
                    <span className="text-red-500 text-xs">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome || ''}
                    onChange={(e) => onFieldChange('nome', e.target.value)}
                    placeholder="Ex: Proposta de Marketing Digital"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>Valor</span>
                  </label>
                  <input
                    type="text"
                    value={formData.valor || ''}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                  />
                </div>

                {/* Responsável */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Responsável</span>
                  </label>
                  <input
                    type="text"
                    value={currentUser && currentUser.role === 'member' 
                      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email
                      : formData.responsavel || ''
                    }
                    onChange={(e) => onFieldChange('responsavel', e.target.value)}
                    placeholder="Nome do responsável"
                    readOnly={currentUser?.role === 'member'}
                    className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm ${
                      currentUser?.role === 'member' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Segunda Etapa - Sobre o lead */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">2</span>
                Sobre o lead
              </h3>
              
              {/* Seletor de Modo: Novo Lead ou Lead Existente */}
              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLeadSelectionMode('new');
                      setSelectedExistingLead(null);
                      // Limpar campos do lead
                      onFieldChange('nome_lead', '');
                      onFieldChange('email', '');
                      onFieldChange('telefone', '');
                      onFieldChange('existing_lead_id', '');
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      leadSelectionMode === 'new'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Novo Lead</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🔄 Clicou em "Lead Existente"');
                      setLeadSelectionMode('existing');
                      // Sempre carregar leads quando clicar no botão
                      setTimeout(() => {
                        loadExistingLeads();
                      }, 100);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      leadSelectionMode === 'existing'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Lead Existente</span>
                  </button>
                </div>
              </div>

              {/* Conteúdo baseado no modo selecionado */}
              {leadSelectionMode === 'existing' ? (
                <div className="space-y-4">
                  {/* Busca de Leads Existentes */}
                  <div>
                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <span>Buscar Lead Existente</span>
                    </label>
                    <input
                      type="text"
                      value={leadSearchTerm}
                      onChange={(e) => setLeadSearchTerm(e.target.value)}
                      placeholder="Digite nome, email ou telefone..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                    />
                  </div>

                  {/* Lista de Leads Existentes */}
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {loadingLeads ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                        Carregando leads...
                      </div>
                    ) : filteredExistingLeads.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {leadSearchTerm ? (
                          <div>
                            <p>Nenhum lead encontrado com o termo "{leadSearchTerm}"</p>
                            <p className="text-xs mt-1">Tente buscar por nome, email, telefone ou empresa</p>
                          </div>
                        ) : (
                          <div>
                            <p>Nenhum lead disponível</p>
                            <p className="text-xs mt-1">
                              {user?.role === 'member' 
                                ? 'Você ainda não tem leads atribuídos a você'
                                : 'Nenhum lead cadastrado na empresa'
                              }
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                console.log('🔄 Recarregando leads...');
                                loadExistingLeads();
                              }}
                              className="mt-2 text-xs text-green-600 hover:text-green-700 underline"
                            >
                              Recarregar
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      filteredExistingLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectExistingLead(lead)}
                          className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedExistingLead?.id === lead.id ? 'bg-green-50 border-green-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </h4>
                              <p className="text-sm text-gray-600">{lead.email}</p>
                              {lead.phone && (
                                <p className="text-xs text-gray-500">{lead.phone}</p>
                              )}
                              {lead.company && (
                                <p className="text-xs text-gray-500">{lead.company}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                lead.lead_temperature === 'hot' ? 'bg-red-100 text-red-800' :
                                lead.lead_temperature === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {lead.lead_temperature === 'hot' ? '🔥 Quente' :
                                 lead.lead_temperature === 'warm' ? '🌡️ Morno' : '❄️ Frio'}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Lead Selecionado */}
                  {selectedExistingLead && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-green-900">Lead Selecionado</h4>
                          <p className="text-sm text-green-700">
                            {selectedExistingLead.first_name} {selectedExistingLead.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-green-600 font-medium">Email:</span>
                          <span className="ml-1 text-green-800">{selectedExistingLead.email}</span>
                        </div>
                        {selectedExistingLead.phone && (
                          <div>
                            <span className="text-green-600 font-medium">Telefone:</span>
                            <span className="ml-1 text-green-800">{selectedExistingLead.phone}</span>
                          </div>
                        )}
                        {selectedExistingLead.company && (
                          <div>
                            <span className="text-green-600 font-medium">Empresa:</span>
                            <span className="ml-1 text-green-800">{selectedExistingLead.company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Nome</span>
                    <span className="text-red-500 text-xs">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome_lead || ''}
                    onChange={(e) => onFieldChange('nome_lead', e.target.value)}
                    placeholder="Nome completo do lead"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>Email</span>
                    <span className="text-red-500 text-xs">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                    className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white ${
                      formData.email && !validateEmail(formData.email) ? 'border-red-300 focus:ring-red-500' : ''
                    }`}
                  />
                  {formData.email && !validateEmail(formData.email) && (
                    <p className="text-red-500 text-xs mt-1">Email inválido</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>Telefone</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone || ''}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                  />
                </div>

                {/* Campos Customizados */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700 border-t pt-4">Campos Adicionais</h4>
                  {filteredCustomFields.length > 0 ? (
                    filteredCustomFields.map((field: CustomField) => (
                      <div key={field.id}>
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {getFieldIcon(field.field_type)}
                          <span>{field.field_label}</span>
                          {field.is_required && <span className="text-red-500 text-xs">*</span>}
                        </label>
                        
                        {field.field_type === 'textarea' ? (
                          <textarea
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.is_required}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white resize-none"
                          />
                        ) : field.field_type === 'select' ? (
                          <select
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                            required={field.is_required}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                          >
                            <option value="">Selecione uma opção</option>
                            {field.field_options?.map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : field.field_type === 'date' ? (
                          <input
                            type="date"
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                            required={field.is_required}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                          />
                        ) : field.field_type === 'email' ? (
                          <input
                            type="email"
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, e.target.value.toLowerCase().trim())}
                            placeholder={field.placeholder}
                            required={field.is_required}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                          />
                        ) : field.field_type === 'phone' ? (
                          <input
                            type="tel"
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, formatPhone(e.target.value))}
                            placeholder={field.placeholder || "(11) 99999-9999"}
                            required={field.is_required}
                            maxLength={15}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                          />
                        ) : field.field_type === 'number' ? (
                          <input
                            type="text"
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, formatCurrency(e.target.value))}
                            placeholder={field.placeholder || "R$ 0,00"}
                            required={field.is_required}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[field.field_name] || ''}
                            onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.is_required}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-300 transition-all duration-200 text-sm bg-white"
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <p>Nenhum campo adicional configurado para esta pipeline.</p>
                      <p className="text-xs mt-1">Os campos customizados podem ser configurados nas configurações da pipeline.</p>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
          >
            Criar Oportunidade
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LeadModal;
