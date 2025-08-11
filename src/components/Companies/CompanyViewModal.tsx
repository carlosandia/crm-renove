import React, { useState } from 'react';
import { Company } from '../../types/Company';
import { 
  X, Building, User, Mail, Phone, Globe, MapPin, Calendar, 
  Edit, Save, Eye, EyeOff, Users, Target, TrendingUp, CheckCircle, XCircle, Lock
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { usePasswordManager } from '../../hooks/usePasswordManager';
import { formatPhone } from '../../utils/formatUtils';
import CityAutocomplete from '../CityAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';

// Lista de nichos/segmentos baseada em CRMs enterprise (igual ao formulário de criação)
const INDUSTRY_SEGMENTS = [
  // Tecnologia
  { value: 'software', label: 'Software e TI', description: 'Desenvolvimento de software, consultoria em TI', category: 'Tecnologia' },
  { value: 'ecommerce', label: 'E-commerce', description: 'Lojas virtuais, marketplaces', category: 'Tecnologia' },
  { value: 'saas', label: 'SaaS', description: 'Software como serviço', category: 'Tecnologia' },
  { value: 'fintech', label: 'Fintech', description: 'Tecnologia financeira', category: 'Tecnologia' },
  
  // Marketing e Vendas
  { value: 'marketing_digital', label: 'Marketing Digital', description: 'Agências de marketing, publicidade online', category: 'Marketing' },
  { value: 'agencia_publicidade', label: 'Agência de Publicidade', description: 'Criação publicitária, campanhas', category: 'Marketing' },
  { value: 'social_media', label: 'Social Media', description: 'Gestão de redes sociais', category: 'Marketing' },
  { value: 'influencer_marketing', label: 'Influencer Marketing', description: 'Marketing de influência', category: 'Marketing' },
  
  // Consultoria
  { value: 'consultoria_empresarial', label: 'Consultoria Empresarial', description: 'Consultoria estratégica, gestão', category: 'Consultoria' },
  { value: 'consultoria_financeira', label: 'Consultoria Financeira', description: 'Planejamento financeiro, investimentos', category: 'Consultoria' },
  { value: 'consultoria_rh', label: 'Consultoria em RH', description: 'Recursos humanos, recrutamento', category: 'Consultoria' },
  { value: 'coaching', label: 'Coaching', description: 'Coaching pessoal e empresarial', category: 'Consultoria' },
  
  // Educação
  { value: 'educacao_online', label: 'Educação Online', description: 'Cursos online, plataformas de ensino', category: 'Educação' },
  { value: 'treinamento_corporativo', label: 'Treinamento Corporativo', description: 'Capacitação empresarial', category: 'Educação' },
  { value: 'escola_idiomas', label: 'Escola de Idiomas', description: 'Ensino de idiomas', category: 'Educação' },
  
  // Saúde e Bem-estar
  { value: 'clinica_medica', label: 'Clínica Médica', description: 'Serviços médicos, clínicas', category: 'Saúde' },
  { value: 'estetica', label: 'Estética e Beleza', description: 'Clínicas de estética, salões', category: 'Saúde' },
  { value: 'fitness', label: 'Fitness', description: 'Academias, personal trainer', category: 'Saúde' },
  { value: 'nutricao', label: 'Nutrição', description: 'Consultoria nutricional', category: 'Saúde' },
  
  // Imobiliário
  { value: 'imobiliaria', label: 'Imobiliária', description: 'Venda e locação de imóveis', category: 'Imobiliário' },
  { value: 'construcao', label: 'Construção Civil', description: 'Construtoras, engenharia', category: 'Imobiliário' },
  { value: 'arquitetura', label: 'Arquitetura', description: 'Projetos arquitetônicos', category: 'Imobiliário' },
  
  // Serviços
  { value: 'juridico', label: 'Jurídico', description: 'Escritórios de advocacia', category: 'Serviços' },
  { value: 'contabilidade', label: 'Contabilidade', description: 'Serviços contábeis', category: 'Serviços' },
  { value: 'turismo', label: 'Turismo', description: 'Agências de viagem, turismo', category: 'Serviços' },
  { value: 'eventos', label: 'Eventos', description: 'Organização de eventos', category: 'Serviços' },
  
  // Outros
  { value: 'outros', label: 'Outros', description: 'Outros segmentos não listados', category: 'Outros' }
];

interface CompanyViewModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  onRefetch: () => void;
}

const CompanyViewModal: React.FC<CompanyViewModalProps> = ({
  company,
  isOpen,
  onClose,
  onRefetch
}) => {
  const { user } = useAuth();
  
  // 🚀 REFACTOR: Usar hook especializado para gerenciamento de senhas
  const passwordManager = usePasswordManager();
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingExpectations, setIsEditingExpectations] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  
  // Estados para edição da empresa
  const [companyData, setCompanyData] = useState({
    name: company.name || '',
    industry: company.industry || '',
    city: company.city || '',
    state: company.state || '',
    website: company.website || '',
    email: company.email || '',
    phone: company.phone || '',
    address: company.address || ''
  });
  
  // Estados para edição do admin - corrigindo estrutura de dados
  const [adminData, setAdminData] = useState({
    name: company.admin ? `${company.admin.first_name || ''} ${company.admin.last_name || ''}`.trim() : '',
    email: company.admin?.email || ''
  });
  
  const [expectations, setExpectations] = useState({
    expected_leads_monthly: company.expected_leads_monthly || 0,
    expected_sales_monthly: company.expected_sales_monthly || 0,
    expected_followers_monthly: company.expected_followers_monthly || 0
  });

  // Agrupa segmentos por categoria para o select
  const segmentsByCategory = INDUSTRY_SEGMENTS.reduce((acc, segment) => {
    if (!acc[segment.category]) {
      acc[segment.category] = [];
    }
    acc[segment.category].push(segment);
    return acc;
  }, {} as Record<string, typeof INDUSTRY_SEGMENTS>);

  // Função para encontrar o label do nicho
  const getIndustryLabel = (value: string) => {
    const industry = INDUSTRY_SEGMENTS.find(segment => segment.value === value);
    return industry ? industry.label : value;
  };

  // Handler para mudança de cidade com autocomplete
  const handleCityChange = (cityState: string) => {
    const [city, state] = cityState.split('/');
    setCompanyData(prev => ({ 
      ...prev, 
      city: city || '', 
      state: state || '' 
    }));
  };

  // Handler para formatação do telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedPhone = formatPhone(inputValue);
    setCompanyData(prev => ({ ...prev, phone: formattedPhone }));
  };

  // 🚀 REFACTOR: Handler simplificado usando o hook especializado
  const handlePasswordUpdate = async () => {
    try {
      const result = await passwordManager.updateAdminPassword(company.id);
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        setIsEditingPassword(false);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado:', error);
      alert(`❌ Erro inesperado: ${error.message}`);
    }
  };

  // Handler para cancelar edição de senha
  const handleCancelPasswordEdit = () => {
    passwordManager.resetForm();
    setIsEditingPassword(false);
  };

  const handleExpectationsUpdate = async () => {
    try {
      console.log('🔧 [COMPANY-VIEW] Enviando requisição para alterar expectativas...');
      console.log('🔧 [COMPANY-VIEW] Company ID:', company.id);

      // ✅ CORREÇÃO: Usar Supabase diretamente
      const { data, error } = await supabase
        .from('companies')
        .update({
          expected_leads_monthly: expectations.expected_leads_monthly,
          expected_sales_monthly: expectations.expected_sales_monthly,
          expected_followers_monthly: expectations.expected_followers_monthly
        })
        .eq('id', company.id)
        .select()
        .single();

      console.log('🔧 [COMPANY-VIEW] Resposta Supabase:', { data, error });

      if (!error && data) {
        alert('Expectativas atualizadas com sucesso!');
        setIsEditingExpectations(false);
        onRefetch();
      } else {
        alert(`Erro ao atualizar expectativas: ${error?.message || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar expectativas:', error);
      alert(`Erro ao atualizar expectativas: ${error.message || 'Network Error'}`);
    }
  };

  // Handler para atualizar informações da empresa
  const handleCompanyUpdate = async () => {
    try {
      // Validações prévia dos dados
      if (!company?.id) {
        console.error('❌ [COMPANY-VIEW] Company ID está vazio ou inválido:', company);
        alert('❌ Erro interno: ID da empresa não encontrado');
        return;
      }

      if (!companyData.name || !companyData.industry) {
        alert('❌ Preencha todos os campos obrigatórios (Nome e Nicho)');
        return;
      }

      console.log('🔧 [COMPANY-VIEW] === INICIANDO ATUALIZAÇÃO EMPRESA ===');
      console.log('🔧 [COMPANY-VIEW] Company Object:', company);
      console.log('🔧 [COMPANY-VIEW] Company ID:', company.id);
      console.log('🔧 [COMPANY-VIEW] Company ID Type:', typeof company.id);
      console.log('🔧 [COMPANY-VIEW] Company ID Length:', company.id?.length);
      console.log('🔧 [COMPANY-VIEW] Company Data:', companyData);

      const requestPayload = {
        companyId: company.id,
        companyData: companyData
      };

      console.log('🔧 [COMPANY-VIEW] Request Payload:', requestPayload);

      const { data, error } = await supabase
        .from('companies')
        .update({
          name: requestPayload.companyData.name,
          industry: requestPayload.companyData.industry,
          website: requestPayload.companyData.website,
          phone: requestPayload.companyData.phone,
          city: requestPayload.companyData.city,
          state: requestPayload.companyData.state
        })
        .eq('id', company.id)
        .select()
        .single();

      console.log('🔧 [COMPANY-VIEW] Resposta Supabase:', { data, error });

      if (!error && data) {
        console.log('✅ [COMPANY-VIEW] Sucesso:', data);
        alert('✅ Informações da empresa atualizadas com sucesso!');
        setIsEditingCompany(false);
        onRefetch();
      } else {
        console.log('❌ [COMPANY-VIEW] Erro Supabase:', error);
        alert(`❌ Erro ao atualizar empresa: ${error?.message || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('❌ [COMPANY-VIEW] Exception:', error);
      console.error('❌ [COMPANY-VIEW] Error Stack:', error.stack);
      alert(`❌ Erro ao atualizar empresa: ${error.message || 'Network Error'}`);
    }
  };

  // Handler para atualizar informações do admin
  const handleAdminUpdate = async () => {
    try {
      // Validações prévia dos dados
      if (!company?.id) {
        console.error('❌ [COMPANY-VIEW] Company ID está vazio ou inválido:', company);
        alert('❌ Erro interno: ID da empresa não encontrado');
        return;
      }

      if (!adminData.name || !adminData.email) {
        alert('❌ Preencha todos os campos obrigatórios (Nome e Email)');
        return;
      }

      console.log('🔧 [COMPANY-VIEW] === INICIANDO ATUALIZAÇÃO ADMIN ===');
      console.log('🔧 [COMPANY-VIEW] Company Object:', company);
      console.log('🔧 [COMPANY-VIEW] Company ID:', company.id);
      console.log('🔧 [COMPANY-VIEW] Company ID Type:', typeof company.id);
      console.log('🔧 [COMPANY-VIEW] Admin Data:', adminData);

      const requestPayload = {
        companyId: company.id,
        adminData: adminData
      };

      console.log('🔧 [COMPANY-VIEW] Request Payload:', requestPayload);

      // ✅ CORREÇÃO: Primeiro buscar usuário admin, depois atualizar
      const { data: adminUser, error: adminQueryError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('tenant_id', company.id)
        .single();

      if (adminQueryError || !adminUser) {
        console.error('❌ [COMPANY-VIEW] Admin não encontrado:', adminQueryError);
        alert('❌ Erro: Admin não encontrado para esta empresa');
        return;
      }

      // Atualizar informações do admin - separar nome completo
      const fullName = requestPayload.adminData.name.trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: requestPayload.adminData.email
        })
        .eq('id', adminUser.id)
        .select()
        .single();

      console.log('🔧 [COMPANY-VIEW] Resposta Supabase Admin:', { data, error });

      if (!error && data) {
        console.log('✅ [COMPANY-VIEW] Sucesso Admin:', data);
        alert('✅ Informações do administrador atualizadas com sucesso!');
        setIsEditingAdmin(false);
        onRefetch();
      } else {
        console.error('❌ [COMPANY-VIEW] Erro Admin:', error);
        alert(`❌ Erro ao atualizar admin: ${error?.message || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('❌ [COMPANY-VIEW] Exception Admin:', error);
      console.error('❌ [COMPANY-VIEW] Error Stack Admin:', error.stack);
      alert(`❌ Erro ao atualizar admin: ${error.message || 'Network Error'}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const passwordStrength = passwordManager.getPasswordStrength();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-semibold">
              {company.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{company.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                company.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {company.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Informações da Empresa */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Building className="w-5 h-5 mr-2 text-slate-600" />
                Informações da Empresa
              </h3>
              <button
                onClick={() => setIsEditingCompany(!isEditingCompany)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditingCompany ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {isEditingCompany ? (
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Nome *</label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Nicho de Atuação *</label>
                    <Select value={companyData.industry} onValueChange={(value) => setCompanyData(prev => ({ ...prev, industry: value }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(segmentsByCategory).map(([category, segments]) => (
                          <div key={category}>
                            <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                              {category}
                            </div>
                            {segments.map((segment) => (
                              <SelectItem key={segment.value} value={segment.value}>
                                <div className="flex flex-col">
                                  <span>{segment.label}</span>
                                  <span className="text-xs text-muted-foreground">{segment.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Cidade/Estado *</label>
                    <CityAutocomplete
                      value={companyData.city && companyData.state ? `${companyData.city}/${companyData.state}` : ''}
                      onChange={handleCityChange}
                      placeholder="Digite a cidade..."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Website</label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={handlePhoneChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-2">Endereço</label>
                    <textarea
                      value={companyData.address}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Endereço completo"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCompanyUpdate}
                    disabled={!companyData.name || !companyData.industry}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                      companyData.name && companyData.industry
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingCompany(false);
                      setCompanyData({
                        name: company.name || '',
                        industry: company.industry || '',
                        city: company.city || '',
                        state: company.state || '',
                        website: company.website || '',
                        email: company.email || '',
                        phone: company.phone || '',
                        address: company.address || ''
                      });
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-lg p-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Nome</label>
                  <p className="text-slate-900 font-medium">{company.name || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Nicho de Atuação</label>
                  <p className="text-slate-900">{getIndustryLabel(company.industry) || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Localização</label>
                  <p className="text-slate-900 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                    {company.city && company.state 
                      ? `${company.city}/${company.state}` 
                      : 'Não informado'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Website</label>
                  <p className="text-slate-900 flex items-center">
                    <Globe className="w-4 h-4 mr-1 text-slate-400" />
                    {company.website ? (
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      'Não informado'
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <p className="text-slate-900 flex items-center">
                    <Mail className="w-4 h-4 mr-1 text-slate-400" />
                    {company.email || 'Não informado'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Telefone</label>
                  <p className="text-slate-900 flex items-center">
                    <Phone className="w-4 h-4 mr-1 text-slate-400" />
                    {company.phone ? formatPhone(company.phone) : 'Não informado'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-600">Endereço</label>
                  <p className="text-slate-900">{company.address || 'Não informado'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-600">Data de Criação</label>
                  <p className="text-slate-900 flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                    {company.created_at ? formatDate(company.created_at) : 'Não informado'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Informações do Administrador */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-600" />
                Administrador
              </h3>
              {company.admin && (
                <button
                  onClick={() => setIsEditingAdmin(!isEditingAdmin)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isEditingAdmin ? 'Cancelar' : 'Editar Info'}
                </button>
              )}
            </div>
            {company.admin ? (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                {isEditingAdmin ? (
                  <div className="space-y-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Nome *</label>
                        <input
                          type="text"
                          value={adminData.name}
                          onChange={(e) => setAdminData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nome do administrador"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Email *</label>
                        <input
                          type="email"
                          value={adminData.email}
                          onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="email@empresa.com"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAdminUpdate}
                        disabled={!adminData.name || !adminData.email}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                          adminData.name && adminData.email
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Salvar Alterações
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingAdmin(false);
                          setAdminData({
                            name: company.admin?.name || '',
                            email: company.admin?.email || ''
                          });
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                                  <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Nome</label>
                    <p className="text-slate-900 font-medium">
                      {company.admin.name || 
                       `${company.admin.first_name || ''} ${company.admin.last_name || ''}`.trim() ||
                       'Nome não informado'
                      }
                    </p>
                  </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Email</label>
                      <p className="text-slate-900 flex items-center">
                        <Mail className="w-4 h-4 mr-1 text-slate-400" />
                        {company.admin.email}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Edição de Senha Enterprise */}
                <div className="border-t border-blue-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-600">Senha de Acesso</label>
                    <button
                      onClick={() => {
                        if (isEditingPassword) {
                          handleCancelPasswordEdit();
                        } else {
                          setIsEditingPassword(true);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {isEditingPassword ? 'Cancelar' : 'Alterar Senha'}
                    </button>
                  </div>
                  
                  {isEditingPassword ? (
                    <div className="space-y-4 bg-white rounded-lg p-4 border border-blue-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="font-medium text-blue-900 text-sm mb-1">🔐 Alteração de Senha Enterprise</h5>
                        <p className="text-blue-700 text-xs">
                          Configure uma nova senha segura para o administrador da empresa.
                        </p>
                      </div>

                      {/* Nova Senha */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nova Senha *
                        </label>
                        <div className="relative">
                          <input
                            type={passwordManager.showPassword ? 'text' : 'password'}
                            value={passwordManager.newPassword}
                            onChange={(e) => passwordManager.setNewPassword(e.target.value)}
                            placeholder="Digite a nova senha"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => passwordManager.setShowPassword(!passwordManager.showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {passwordManager.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {/* Password Strength */}
                        {passwordManager.newPassword && (
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">Força da senha:</span>
                              <span className={`text-xs font-medium ${
                                passwordStrength.strength === 'Forte' ? 'text-green-600' :
                                passwordStrength.strength === 'Boa' ? 'text-yellow-600' :
                                passwordStrength.strength === 'Fraca' ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {passwordStrength.strength}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                style={{ width: passwordStrength.width }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirmar Senha */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirmar Senha *
                        </label>
                        <div className="relative">
                          <input
                            type={passwordManager.showConfirmPassword ? 'text' : 'password'}
                            value={passwordManager.confirmPassword}
                            onChange={(e) => passwordManager.setConfirmPassword(e.target.value)}
                            placeholder="Confirme a nova senha"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => passwordManager.setShowConfirmPassword(!passwordManager.showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {passwordManager.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {/* Password Match Indicator */}
                        {passwordManager.confirmPassword && (
                          <div className="mt-2 flex items-center space-x-2">
                            {passwordManager.newPassword === passwordManager.confirmPassword ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-600">Senhas conferem</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-600">Senhas não conferem</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Password Requirements */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Requisitos da senha:</h4>
                        <div className="space-y-2">
                          {[
                            { key: 'length', text: 'Pelo menos 8 caracteres' },
                            { key: 'hasLetter', text: 'Pelo menos 1 letra' },
                            { key: 'hasNumber', text: 'Pelo menos 1 número' },
                            { key: 'hasSpecialChar', text: 'Pelo menos 1 caractere especial (!@#$%^&*)' }
                          ].map(req => (
                            <div key={req.key} className="flex items-center space-x-2">
                              {passwordManager.passwordRequirements[req.key as keyof typeof passwordManager.passwordRequirements] ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-sm ${
                                passwordManager.passwordRequirements[req.key as keyof typeof passwordManager.passwordRequirements] 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                              }`}>
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handlePasswordUpdate}
                        disabled={!passwordManager.isPasswordValid() || passwordManager.isChangingPassword}
                        className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                          passwordManager.isPasswordValid() && !passwordManager.isChangingPassword
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {passwordManager.isChangingPassword ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Alterando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Salvar Nova Senha</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-sm">••••••••</p>
                      <span className="text-xs text-slate-400">Senha protegida</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm font-medium">Nenhum administrador cadastrado</p>
              </div>
            )}
          </div>

          {/* Expectativas Mensais */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-slate-600" />
                Expectativas Mensais
              </h3>
              <button
                onClick={() => setIsEditingExpectations(!isEditingExpectations)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditingExpectations ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {isEditingExpectations ? (
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Leads por mês
                    </label>
                    <input
                      type="number"
                      value={expectations.expected_leads_monthly}
                      onChange={(e) => setExpectations(prev => ({
                        ...prev,
                        expected_leads_monthly: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Vendas por mês
                    </label>
                    <input
                      type="number"
                      value={expectations.expected_sales_monthly}
                      onChange={(e) => setExpectations(prev => ({
                        ...prev,
                        expected_sales_monthly: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Seguidores por mês
                    </label>
                    <input
                      type="number"
                      value={expectations.expected_followers_monthly}
                      onChange={(e) => setExpectations(prev => ({
                        ...prev,
                        expected_followers_monthly: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={handleExpectationsUpdate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvar Expectativas
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-600">Leads</span>
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {expectations.expected_leads_monthly}
                  </div>
                  <div className="text-xs text-slate-500">por mês</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-slate-600">Vendas</span>
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {expectations.expected_sales_monthly}
                  </div>
                  <div className="text-xs text-slate-500">por mês</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-slate-600">Seguidores</span>
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {expectations.expected_followers_monthly}
                  </div>
                  <div className="text-xs text-slate-500">por mês</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyViewModal; 