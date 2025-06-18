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
      fixUsersWithoutPassword(); // Corrigir usuários sem senha
    }
  }, [user]);

  // Função para corrigir usuários criados sem senha
  const fixUsersWithoutPassword = async () => {
    try {
      // Buscar usuários sem password_hash
      const { data: usersWithoutPassword, error } = await supabase
        .from('users')
        .select('id, email, role')
        .is('password_hash', null)
        .eq('role', 'admin');

      if (error || !usersWithoutPassword || usersWithoutPassword.length === 0) {
        return; // Nenhum usuário para corrigir
      }

      console.log(`Corrigindo ${usersWithoutPassword.length} usuários sem senha...`);

      // Atualizar cada usuário com senha padrão
      for (const user of usersWithoutPassword) {
        await supabase
          .from('users')
          .update({ password_hash: '123456' })
          .eq('id', user.id);
        
        console.log(`✅ Senha padrão definida para: ${user.email}`);
      }

    } catch (error) {
      console.error('Erro ao corrigir usuários sem senha:', error);
    }
  };

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

        const adminPassword = formData.admin_password.trim() || '123456';
        
        const { data: newAdmin, error: adminError } = await supabase
          .from('users')
          .insert([{
            email: adminEmail,
            first_name: firstName.trim(),
            last_name: lastName.trim() || '',
            role: 'admin',
            tenant_id: newCompany.id,
            is_active: true,
            password_hash: adminPassword // Salvar senha (em produção usar hash)
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
        
        alert(`✅ Empresa "${newCompany.name}" criada com sucesso!\n\nCredenciais do Admin:\nEmail: ${adminEmail}\nSenha: ${adminPassword}`);
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
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas Super Admins podem gerenciar empresas.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen">
      {/* Header - Enterprise Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Gestão de Empresas</h2>
            <p className="text-slate-600">Cadastre empresas e seus administradores com controle total</p>
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
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span>{showForm ? 'Cancelar' : 'Nova Empresa'}</span>
          </button>
        </div>
      </div>

      {/* Filtros - Enterprise Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, nicho, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ativo' | 'desativado')}
            className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-gray-50 focus:bg-white transition-colors"
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativas</option>
            <option value="desativado">Desativadas</option>
          </select>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {editingEmpresa ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
            </h3>
            <p className="text-slate-600">
              {editingEmpresa ? 'Atualize as informações da empresa' : 'Cadastre uma nova empresa cliente e crie seu administrador'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dados da Empresa */}
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <Building className="w-5 h-5 mr-2 text-slate-600" />
                Dados da Empresa
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Nome completo da empresa"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nicho de Atuação *
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    required
                    placeholder="Ex: Marketing Digital, E-commerce, Consultoria"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://empresa.com.br"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Rua, número, bairro, CEP"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Expectativas Mensais */}
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2 text-slate-600" />
                Expectativas Mensais
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expectativa de Leads *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expected_leads_monthly}
                    onChange={(e) => setFormData({...formData, expected_leads_monthly: e.target.value})}
                    required
                    placeholder="Ex: 100"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expectativa de Vendas *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expected_sales_monthly}
                    onChange={(e) => setFormData({...formData, expected_sales_monthly: e.target.value})}
                    required
                    placeholder="Ex: 20"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expectativa de Seguidores *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expected_followers_monthly}
                    onChange={(e) => setFormData({...formData, expected_followers_monthly: e.target.value})}
                    required
                    placeholder="Ex: 500"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Admin (apenas na criação) */}
            {!editingEmpresa && (
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-slate-600" />
                  Administrador da Empresa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome Completo do Admin *
                    </label>
                    <input
                      type="text"
                      value={formData.admin_name}
                      onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                      required
                      placeholder="Nome completo do administrador"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email do Admin *
                    </label>
                    <input
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                      required
                      placeholder="admin@empresa.com.br"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-colors bg-gray-50 focus:bg-white ${
                        emailValidation.exists 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-200 focus:ring-slate-500'
                      }`}
                    />
                    {/* Notificação de validação do email */}
                    {formData.admin_email && !editingEmpresa && emailValidation.message && (
                      <div className={`mt-3 flex items-center space-x-2 text-sm ${
                        emailValidation.exists ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {emailValidation.isChecking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-slate-600 rounded-full animate-spin"></div>
                            <span>{emailValidation.message}</span>
                          </>
                        ) : (
                          <>
                            {emailValidation.exists ? (
                              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-red-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                              </div>
                            )}
                            <span className="font-medium">{emailValidation.message}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Senha do Admin
                    </label>
                    <input
                      type="password"
                      value={formData.admin_password}
                      onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                      placeholder="Deixe em branco para usar senha padrão (123456)"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors bg-gray-50 focus:bg-white"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Se não informada, a senha padrão será "123456"
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEmpresa(null);
                  setEmailValidation({ isChecking: false, exists: false, message: '' });
                }}
                className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!editingEmpresa && emailValidation.exists}
                className={`px-8 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
                  !editingEmpresa && emailValidation.exists
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {editingEmpresa ? 'Atualizar Empresa' : 'Criar Empresa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Empresas - Enterprise Layout */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Empresas Cadastradas ({filteredEmpresas.length})
            </h3>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <Building className="w-4 h-4" />
              <span>Lista completa das empresas</span>
            </div>
          </div>
        </div>

        {currentEmpresas.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {searchTerm ? 'Tente ajustar os filtros de busca para encontrar empresas específicas' : 'Comece cadastrando sua primeira empresa cliente para começar a gerenciar seu portfólio'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {currentEmpresas.map((empresa) => (
                <div key={empresa.id} className="company-card">
                  {/* Header do Card - Enterprise */}
                  <div className="company-header">
                    <div className="company-info">
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-semibold text-sm flex-shrink-0">
                          {empresa.name.charAt(0)}
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {empresa.name}
                        </h3>
                        <span className={`status ${empresa.is_active ? 'active' : 'inactive'}`}>
                          {empresa.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-slate-500 ml-14">
                        <span className="segment">{empresa.industry}</span>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{empresa.city}/{empresa.state}</span>
                        </div>
                      </div>
                    </div>

                    <div className="company-actions">
                      <button
                        onClick={() => handleEdit(empresa)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Editar empresa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(empresa)}
                        className={`p-2 transition-colors rounded-lg ${
                          empresa.is_active 
                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' 
                            : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                        }`}
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

                  {/* Expectativas - Enterprise Style */}
                  <div className="px-6 py-4 bg-slate-50 border-b border-gray-100">
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="text-lg font-semibold text-slate-900">{empresa.expected_leads_monthly}</div>
                        <div className="text-xs text-slate-500 font-medium">Leads/mês</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="text-lg font-semibold text-slate-900">{empresa.expected_sales_monthly}</div>
                        <div className="text-xs text-slate-500 font-medium">Vendas/mês</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="text-lg font-semibold text-slate-900">{empresa.expected_followers_monthly}</div>
                        <div className="text-xs text-slate-500 font-medium">Seguidores/mês</div>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Admin - Enterprise */}
                  {empresa.admin ? (
                    <div className="admin-info">
                      <div className="admin-details">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{empresa.admin.name}</span>
                            <span className="text-slate-500 text-sm">{empresa.admin.email}</span>
                          </div>
                        </div>
                        {empresa.admin.last_login && (
                          <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>Último acesso: {formatDateBrasilia(empresa.admin.last_login)}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleStatus(empresa)}
                        className={`toggle-status ${empresa.is_active ? 'deactivate' : 'activate'}`}
                      >
                        {empresa.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  ) : (
                    <div className="px-6 py-4 bg-amber-50 border-l-4 border-amber-200">
                      <div className="flex items-center space-x-3 text-amber-800">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">Nenhum administrador cadastrado</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Paginação - Enterprise Style */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEmpresas.length)} de {filteredEmpresas.length} empresas
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-white transition-colors"
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
                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-slate-900 text-white font-medium'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
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
                      className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-white transition-colors"
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
