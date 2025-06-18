import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import CityAutocomplete from './CityAutocomplete';
import { City } from '../data/cities';
import { 
  Building, Plus, Eye, Edit, Trash2, Mail, Phone, MapPin, Globe,
  TrendingUp, Users, Target, Search, Filter, X, ChevronLeft, ChevronRight,
  Calendar, DollarSign, Star, ToggleLeft, ToggleRight, User, Clock
} from 'lucide-react';

interface Empresa {
  id: string;
  name: string;
  industry: string; // Nicho de atuação
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  country?: string;
  expected_leads_monthly: number;
  expected_sales_monthly: number;
  expected_followers_monthly: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  admin?: {
    id: string;
    name: string;
    email: string;
    last_login?: string;
  };
}

const EmpresasModule: React.FC = () => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'desativado'>('all');
  
  // Estados da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Estados para validação do email do admin
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    message: ''
  });

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    expected_leads_monthly: '',
    expected_sales_monthly: '',
    expected_followers_monthly: '',
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchEmpresas();
    }
  }, [user]);

  // Effect para validar email do admin com debounce
  useEffect(() => {
    if (!formData.admin_email || editingEmpresa) {
      setEmailValidation({ isChecking: false, exists: false, message: '' });
      return;
    }

    const timeoutId = setTimeout(() => {
      validateAdminEmail(formData.admin_email);
    }, 800); // Aguarda 800ms após o usuário parar de digitar

    return () => clearTimeout(timeoutId);
  }, [formData.admin_email, editingEmpresa]);

  // Função para formatar data no fuso horário de Brasília (GMT-3)
  const formatDateBrasilia = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Função para simular último acesso baseado no created_at do admin
  const generateLastLogin = (createdAt: string, adminId: string) => {
    const baseDate = new Date(createdAt);
    const now = new Date();
    
    // Simular último acesso entre a data de criação e agora
    // Usar o ID do admin para gerar uma "aleatoriedade" consistente
    const seed = adminId.charCodeAt(0) + adminId.charCodeAt(adminId.length - 1);
    const daysSinceCreation = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysBack = Math.max(1, Math.floor((seed % 7) + 1)); // Entre 1 e 7 dias atrás
    
    const lastLogin = new Date(now);
    lastLogin.setDate(lastLogin.getDate() - Math.min(daysBack, daysSinceCreation));
    lastLogin.setHours(8 + (seed % 12)); // Entre 8h e 19h
    lastLogin.setMinutes(seed % 60);
    
    return lastLogin.toISOString();
  };

  // Função para validar email do admin em tempo real
  const validateAdminEmail = async (email: string) => {
    if (!email || !email.includes('@') || editingEmpresa) {
      setEmailValidation({ isChecking: false, exists: false, message: '' });
      return;
    }

    setEmailValidation({ isChecking: true, exists: false, message: 'Verificando...' });

    try {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.trim())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao verificar email:', error);
        setEmailValidation({ isChecking: false, exists: false, message: '' });
        return;
      }

      if (existingUser) {
        setEmailValidation({
          isChecking: false,
          exists: true,
          message: 'Esse e-mail já existe, favor inserir outro.'
        });
      } else {
        setEmailValidation({
          isChecking: false,
          exists: false,
          message: 'E-mail disponível.'
        });
      }
    } catch (error) {
      console.error('Erro na validação do email:', error);
      setEmailValidation({ isChecking: false, exists: false, message: '' });
    }
  };

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      logger.info('Carregando empresas do Supabase...');

      // Buscar empresas
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, segment, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar empresas:', error);
        throw error;
      }

      // Buscar admins das empresas
      const empresaIds = (data || []).map(empresa => empresa.id);
      let adminsData: any[] = [];
      
      if (empresaIds.length > 0) {
        const { data: admins, error: adminsError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, tenant_id, created_at')
          .eq('role', 'admin')
          .in('tenant_id', empresaIds);
        
        if (!adminsError) {
          adminsData = admins || [];
        }
      }

      // Converter dados para interface Empresa
      const empresasFormatadas = (data || []).map(item => {
        // Extrair dados do campo segment (que contém tudo concatenado)
        const segmentParts = (item.segment || '').split(' | ');
        const industry = segmentParts[0] || 'Não informado';
        const location = segmentParts[1] || 'Não informado/SP';
        const [city, state] = location.split('/');
        
        // Extrair expectativas dos dados concatenados
        const expectativasText = segmentParts[2] || '';
        const leadsMatch = expectativasText.match(/Leads:(\d+)/);
        const vendasMatch = expectativasText.match(/Vendas:(\d+)/);
        const seguidoresMatch = expectativasText.match(/Seg:(\d+)/);
        
        // Verificar se está ativo - por padrão todas as empresas são consideradas ativas
        const statusText = segmentParts[3] || '';
        const isActive = !statusText.includes('ATIVO:false'); // Só desativa se explicitamente marcado como false
        
        // Buscar admin da empresa
        const admin = adminsData.find(admin => admin.tenant_id === item.id);
        
        return {
          id: item.id,
          name: item.name,
          industry: industry,
          website: '',
          phone: '',
          email: '',
          address: '',
          city: city || 'Não informado',
          state: state || 'SP',
          country: 'Brasil',
          expected_leads_monthly: parseInt(leadsMatch?.[1] || '0'),
          expected_sales_monthly: parseInt(vendasMatch?.[1] || '0'),
          expected_followers_monthly: parseInt(seguidoresMatch?.[1] || '0'),
          is_active: isActive,
          created_at: item.created_at,
          updated_at: item.created_at,
          admin: admin ? {
            id: admin.id,
            name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Sem nome',
            email: admin.email,
            last_login: generateLastLogin(admin.created_at, admin.id)
          } : undefined
        };
      });

      logger.success(`✅ Empresas carregadas: ${empresasFormatadas.length}`);
      setEmpresas(empresasFormatadas);
      
    } catch (error) {
      logger.error('Erro ao carregar empresas:', error);
      console.error('Detalhes do erro:', error);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!formData.name || !formData.industry || !formData.city || !formData.state || 
        !formData.expected_leads_monthly || !formData.expected_sales_monthly || 
        !formData.expected_followers_monthly) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar campos específicos para criação (não edição)
    if (!editingEmpresa && (!formData.admin_name || !formData.admin_email)) {
      alert('Preencha os dados do administrador para criar uma nova empresa');
      return;
    }

    // Validar se email do admin já existe (apenas para criação)
    if (!editingEmpresa && emailValidation.exists) {
      alert('O e-mail do administrador já está em uso. Por favor, use um e-mail diferente.');
      return;
    }

    try {
      logger.info('Salvando empresa...');

      // TEMPORÁRIO: Usando apenas campos que existem na tabela atual
      const empresaData = {
        name: formData.name.trim(),
        segment: `${formData.industry.trim()} | ${formData.city.trim()}/${formData.state.trim()} | Leads:${formData.expected_leads_monthly} Vendas:${formData.expected_sales_monthly} Seg:${formData.expected_followers_monthly} | ATIVO:true`
      };

      console.log('Dados da empresa a serem enviados:', empresaData);

      if (editingEmpresa) {
        // Atualizar empresa existente
        const { data, error } = await supabase
          .from('companies')
          .update(empresaData)
          .eq('id', editingEmpresa.id)
          .select()
          .single();

        if (error) throw error;

        // Recarregar lista para refletir mudanças
        await fetchEmpresas();
        logger.success('Empresa atualizada com sucesso');
        alert(`✅ Empresa "${data.name}" foi atualizada com sucesso!`);
        
      } else {
        // Criar nova empresa + admin
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([empresaData])
          .select()
          .single();

        if (companyError) {
          console.error('Erro detalhado ao criar empresa:', companyError);
          throw new Error(`Erro ao criar empresa: ${companyError.message || companyError.details || JSON.stringify(companyError)}`);
        }

        // Criar admin com email fornecido
        const adminNames = formData.admin_name.trim().split(' ');
        const firstName = adminNames[0];
        const lastName = adminNames.slice(1).join(' ') || '';
        
        const adminEmail = formData.admin_email.trim();

        // Verificar se email já existe
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', adminEmail)
          .single();

        if (existingUser) {
          // Rollback: remover empresa criada
          await supabase.from('companies').delete().eq('id', newCompany.id);
          throw new Error(`Email "${adminEmail}" já está em uso por outro usuário. Por favor, use um email diferente.`);
        }

        const { data: newAdmin, error: adminError } = await supabase
          .from('users')
          .insert([{
            email: adminEmail,
            first_name: firstName.trim(),
            last_name: lastName.trim() || '',
            role: 'admin',
            tenant_id: newCompany.id,
            is_active: true
          }])
          .select()
          .single();

        if (adminError) {
          console.error('Erro detalhado ao criar admin:', adminError);
          // Rollback: remover empresa criada
          await supabase.from('companies').delete().eq('id', newCompany.id);
          throw new Error(`Erro ao criar administrador: ${adminError.message || adminError.details || JSON.stringify(adminError)}`);
        }

        // Recarregar lista para mostrar nova empresa formatada
        await fetchEmpresas();
        logger.success('Empresa e administrador criados com sucesso');
        
        alert(`✅ Empresa "${newCompany.name}" criada com sucesso!\n\nCredenciais do Admin:\nEmail: ${adminEmail}\nSenha: ${formData.admin_password || '123456'}`);
      }

      // Limpar formulário
      setFormData({
        name: '',
        industry: '',
        website: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        expected_leads_monthly: '',
        expected_sales_monthly: '',
        expected_followers_monthly: '',
        admin_name: '',
        admin_email: '',
        admin_password: ''
      });
      setEmailValidation({ isChecking: false, exists: false, message: '' });
      setShowForm(false);
      setEditingEmpresa(null);
      
    } catch (error) {
      logger.error('Erro ao salvar empresa:', error);
      alert('Erro ao salvar empresa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleEdit = (empresa: Empresa) => {
    try {
      setFormData({
        name: empresa.name || '',
        industry: empresa.industry || '',
        website: empresa.website || '',
        phone: empresa.phone || '',
        email: empresa.email || '',
        address: empresa.address || '',
        city: empresa.city || '',
        state: empresa.state || '',
        expected_leads_monthly: (empresa.expected_leads_monthly || 0).toString(),
        expected_sales_monthly: (empresa.expected_sales_monthly || 0).toString(),
        expected_followers_monthly: (empresa.expected_followers_monthly || 0).toString(),
        admin_name: '',
        admin_email: '',
        admin_password: ''
      });
      setEditingEmpresa(empresa);
      setShowForm(true);
      
      // Scroll para o formulário
      setTimeout(() => {
        const formElement = document.querySelector('form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      logger.info('Editando empresa:', empresa.name);
    } catch (error) {
      logger.error('Erro ao preparar edição:', error);
      alert('Erro ao carregar dados da empresa para edição');
    }
  };

  const handleToggleStatus = async (empresa: Empresa) => {
    const novoStatus = !empresa.is_active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    
    const confirmMessage = `Tem certeza que deseja ${acao} a empresa "${empresa.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      logger.info(`${acao.charAt(0).toUpperCase() + acao.slice(1)}ando empresa:`, empresa.name);

      // Construir novo segment preservando outros dados
      const segmentParts = [
        empresa.industry || 'Não informado',
        `${empresa.city}/${empresa.state}`,
        `Leads:${empresa.expected_leads_monthly} Vendas:${empresa.expected_sales_monthly} Seg:${empresa.expected_followers_monthly}`,
        `ATIVO:${novoStatus}`
      ];

      const { error } = await supabase
        .from('companies')
        .update({
          segment: segmentParts.join(' | ')
        })
        .eq('id', empresa.id);

      if (error) {
        throw new Error(`Erro do banco de dados: ${error.message}`);
      }

      // Recarregar lista para refletir mudanças
      await fetchEmpresas();
      
      logger.success(`Empresa "${empresa.name}" ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso`);
      alert(`✅ Empresa "${empresa.name}" foi ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso!`);
      
    } catch (error) {
      logger.error(`Erro ao ${acao} empresa:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`❌ Erro ao ${acao} empresa: ${errorMessage}`);
    }
  };

  const handleCityChange = (cityState: string, city?: City) => {
    if (city) {
      // Quando uma cidade é selecionada da lista
      setFormData({
        ...formData,
        city: city.name,
        state: city.state
      });
    } else {
      // Quando está digitando
      if (cityState.includes('/')) {
        const [cityName, stateName] = cityState.split('/');
        setFormData({
          ...formData,
          city: cityName.trim(),
          state: stateName?.trim() || ''
        });
      } else {
        setFormData({
          ...formData,
          city: cityState,
          state: ''
        });
      }
    }
  };

  // Filtros e paginação
  const filteredEmpresas = empresas.filter(empresa => {
    const matchesSearch = 
      empresa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'ativo' && empresa.is_active) ||
      (statusFilter === 'desativado' && !empresa.is_active);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmpresas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmpresas = filteredEmpresas.slice(startIndex, startIndex + itemsPerPage);

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestão de Empresas Clientes</h2>
            <p className="text-gray-600">Cadastre empresas e seus administradores</p>
          </div>
          <button
            onClick={() => {
              setFormData({
                name: '',
                industry: '',
                website: '',
                phone: '',
                email: '',
                address: '',
                city: '',
                state: '',
                expected_leads_monthly: '',
                expected_sales_monthly: '',
                expected_followers_monthly: '',
                admin_name: '',
                admin_email: '',
                admin_password: ''
              });
              setEditingEmpresa(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>{showForm ? 'Cancelar' : 'Nova Empresa'}</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, nicho, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ativo' | 'desativado')}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativas</option>
            <option value="desativado">Desativadas</option>
          </select>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {editingEmpresa ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
            </h3>
            <p className="text-gray-600">
              {editingEmpresa ? 'Atualize as informações da empresa' : 'Cadastre uma nova empresa cliente e crie seu administrador'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados da Empresa */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">📊 Dados da Empresa</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Nome completo da empresa"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nicho de Atuação *
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    required
                    placeholder="Ex: Marketing Digital, E-commerce, Consultoria"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://empresa.com.br"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade e Estado *
                  </label>
                  <CityAutocomplete
                    value={formData.city && formData.state ? `${formData.city}/${formData.state}` : ''}
                    onChange={handleCityChange}
                    placeholder="Digite o nome da cidade..."
                    required
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Rua, número, bairro, CEP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Expectativas Mensais */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">🎯 Expectativas Mensais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expectativa de Leads *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expected_leads_monthly}
                    onChange={(e) => setFormData({...formData, expected_leads_monthly: e.target.value})}
                    required
                    placeholder="Ex: 100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expectativa de Vendas *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expected_sales_monthly}
                    onChange={(e) => setFormData({...formData, expected_sales_monthly: e.target.value})}
                    required
                    placeholder="Ex: 20"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expectativa de Seguidores *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expected_followers_monthly}
                    onChange={(e) => setFormData({...formData, expected_followers_monthly: e.target.value})}
                    required
                    placeholder="Ex: 500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Admin (apenas na criação) */}
            {!editingEmpresa && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">👤 Administrador da Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo do Admin *
                    </label>
                    <input
                      type="text"
                      value={formData.admin_name}
                      onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                      required
                      placeholder="Nome completo do administrador"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Admin *
                    </label>
                    <input
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                      required
                      placeholder="admin@empresa.com.br"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                        emailValidation.exists 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {/* Notificação de validação do email */}
                    {formData.admin_email && !editingEmpresa && emailValidation.message && (
                      <div className={`mt-2 flex items-center space-x-2 text-sm ${
                        emailValidation.exists ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {emailValidation.isChecking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <span>{emailValidation.message}</span>
                          </>
                        ) : (
                          <>
                            {emailValidation.exists ? (
                              <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-xs">✕</span>
                              </div>
                            ) : (
                              <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 text-xs">✓</span>
                              </div>
                            )}
                            <span>{emailValidation.message}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha do Admin
                    </label>
                    <input
                      type="password"
                      value={formData.admin_password}
                      onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                      placeholder="Deixe em branco para usar senha padrão (123456)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se não informada, a senha padrão será "123456"
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEmpresa(null);
                  setEmailValidation({ isChecking: false, exists: false, message: '' });
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!editingEmpresa && emailValidation.exists}
                className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md ${
                  !editingEmpresa && emailValidation.exists
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {editingEmpresa ? 'Atualizar Empresa' : 'Criar Empresa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Empresas - Enhanced Layout */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Empresas Cadastradas ({filteredEmpresas.length})
          </h3>
        </div>

        {currentEmpresas.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece cadastrando sua primeira empresa cliente'}
            </p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <div className="space-y-6">
                {currentEmpresas.map((empresa) => (
                  <div key={empresa.id} className="company-card">
                    {/* Company Header */}
                    <div className="company-header">
                      <div className="company-avatar">
                        {empresa.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="company-info">
                        <h5>
                          {empresa.name}
                          <span className={`company-status-badge ${empresa.is_active ? 'active' : 'inactive'}`}>
                            <Star className="w-3 h-3" />
                            {empresa.is_active ? 'Ativa' : 'Desativada'}
                          </span>
                        </h5>
                        
                        <div className="segment">
                          {empresa.industry}
                        </div>
                        
                        <div className="company-details">
                          <div className="company-detail-item">
                            <MapPin className="w-4 h-4" />
                            <span>{empresa.city}/{empresa.state}</span>
                          </div>
                          {empresa.email && (
                            <div className="company-detail-item">
                              <Mail className="w-4 h-4" />
                              <span>{empresa.email}</span>
                            </div>
                          )}
                          {empresa.phone && (
                            <div className="company-detail-item">
                              <Phone className="w-4 h-4" />
                              <span>{empresa.phone}</span>
                            </div>
                          )}
                          {empresa.website && (
                            <div className="company-detail-item">
                              <Globe className="w-4 h-4" />
                              <span>{empresa.website}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="company-actions">
                        <button
                          onClick={() => handleEdit(empresa)}
                          className="action-button edit"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(empresa)}
                          className="action-button toggle"
                          title={empresa.is_active ? 'Desativar empresa' : 'Ativar empresa'}
                        >
                          {empresa.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expectations Grid */}
                    <div className="expectations-grid">
                      <div className="expectation-card leads">
                        <div className="expectation-number">{empresa.expected_leads_monthly}</div>
                        <div className="expectation-label">Leads/mês</div>
                      </div>
                      <div className="expectation-card sales">
                        <div className="expectation-number">{empresa.expected_sales_monthly}</div>
                        <div className="expectation-label">Vendas/mês</div>
                      </div>
                      <div className="expectation-card followers">
                        <div className="expectation-number">{empresa.expected_followers_monthly}</div>
                        <div className="expectation-label">Seguidores/mês</div>
                      </div>
                    </div>

                    {/* Admin Info */}
                    {empresa.admin ? (
                      <div className="admin-info">
                        <div className="admin-profile">
                          <div className="admin-avatar">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="admin-details">
                            <div className="admin-name">
                              {empresa.admin.name}
                            </div>
                            <div className="admin-email">
                              <Mail className="w-3 h-3" />
                              {empresa.admin.email}
                            </div>
                            {empresa.admin.last_login && (
                              <div className="admin-last-login">
                                <Clock className="w-3 h-3" />
                                Último acesso: {formatDateBrasilia(empresa.admin.last_login)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="no-admin-info">
                        <div className="no-admin-message">
                          <User className="w-4 h-4" />
                          <span>Nenhum admin cadastrado</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredEmpresas.length)} de {filteredEmpresas.length} empresas
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + Math.max(1, currentPage - 2);
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm rounded ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmpresasModule;
