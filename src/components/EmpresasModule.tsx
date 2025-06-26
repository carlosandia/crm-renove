import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import CityAutocomplete from './CityAutocomplete';
import { City } from '../data/cities';
import { 
  Building, Plus, Eye, Edit, Trash2, Mail, Phone, MapPin, Globe,
  TrendingUp, Users, Target, Search, Filter, X, ChevronLeft, ChevronRight,
  Calendar, DollarSign, Star, ToggleLeft, ToggleRight, User, Clock, Key,
  UserCheck, Shield
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
    last_login_formatted?: string;
    is_real_login?: boolean;
  };
}

// 🚀 OTIMIZAÇÃO: Memoização do componente principal
const EmpresasModule: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'info' | 'senha' | 'vendedores'>('info');
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
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

  // Estados para validação da senha do admin
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    message: '',
    requirements: {
      length: false,
      hasLetter: false,
      hasNumber: false
    }
  });

  // Estados para alteração de senha do admin (modo edição)
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChangeValidation, setPasswordChangeValidation] = useState({
    isValid: false,
    message: '',
    passwordsMatch: false,
    requirements: {
      length: false,
      hasLetter: false,
      hasNumber: false
    }
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

  // 🚀 OTIMIZAÇÃO: Memoização de dados filtrados
  const filteredEmpresas = useMemo(() => {
    return empresas.filter(empresa => {
      const matchesSearch = !searchTerm || 
        empresa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'ativo' && empresa.is_active) ||
        (statusFilter === 'desativado' && !empresa.is_active);
      
      return matchesSearch && matchesStatus;
    });
  }, [empresas, searchTerm, statusFilter]);

  // 🚀 OTIMIZAÇÃO: Memoização da paginação
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEmpresas = filteredEmpresas.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredEmpresas.length / itemsPerPage);

    return {
      empresas: paginatedEmpresas,
      totalPages,
      totalItems: filteredEmpresas.length
    };
  }, [filteredEmpresas, currentPage, itemsPerPage]);

  // 🚀 OTIMIZAÇÃO: Callbacks memoizados
  const fetchEmpresas = useCallback(async () => {
    try {
      setLoading(true);
      logger.info('Carregando empresas...');

      // Verificar se é usuário de demonstração
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        if (userData.tenant_id === 'demo') {
          const mockEmpresas: Empresa[] = [
            {
              id: 'demo-company-1',
              name: 'TechStart Solutions',
              industry: 'Marketing Digital',
              website: 'https://techstart.com.br',
              phone: '(11) 99999-9999',
              email: 'contato@techstart.com.br',
              address: 'Rua das Startups, 123, Vila Olímpia',
              city: 'São Paulo',
              state: 'SP',
              expected_leads_monthly: 150,
              expected_sales_monthly: 25,
              expected_followers_monthly: 500,
              is_active: true,
              created_at: new Date().toISOString(),
              admin: {
                id: 'admin-demo-1',
                name: 'Carlos Admin',
                email: 'carlos@techstart.com.br',
                last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                last_login_formatted: 'Há 2 horas',
                is_real_login: false
              }
            },
            {
              id: 'demo-company-2',
              name: 'E-commerce Plus',
              industry: 'E-commerce',
              website: 'https://ecommerceplus.com.br',
              phone: '(21) 88888-8888',
              email: 'contato@ecommerceplus.com.br',
              address: 'Av. Atlântica, 456, Copacabana',
              city: 'Rio de Janeiro',
              state: 'RJ',
              expected_leads_monthly: 200,
              expected_sales_monthly: 40,
              expected_followers_monthly: 800,
              is_active: true,
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              admin: {
                id: 'admin-demo-2',
                name: 'Ana Administradora',
                email: 'ana@ecommerceplus.com.br',
                last_login: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                last_login_formatted: 'Há 1 dia',
                is_real_login: false
              }
            }
          ];
          
          setEmpresas(mockEmpresas);
          logger.success(`Empresas demo carregadas: ${mockEmpresas.length}`);
          setLoading(false);
          return;
        }
      }
      
      // Para usuários reais, tentar carregar do banco
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const empresasComAdmin = await Promise.all(
        (companiesData || []).map(async (company) => {
          try {
            const { data: adminData, error: adminError } = await supabase
              .from('users')
              .select('id, first_name, last_name, email, last_login, created_at')
              .eq('role', 'admin')
              .eq('tenant_id', company.id)
              .single();

            let admin = null;
            if (!adminError && adminData) {
              const lastLogin = adminData.last_login || generateLastLogin(adminData.created_at, adminData.id);
              admin = {
                id: adminData.id,
                name: `${adminData.first_name} ${adminData.last_name}`,
                email: adminData.email,
                last_login: lastLogin,
                last_login_formatted: formatDateBrasilia(lastLogin),
                is_real_login: !!adminData.last_login
              };
            }

            return {
              ...company,
              admin
            };
          } catch (error) {
            logger.error('Erro ao carregar admin da empresa:', error);
            return company;
          }
        })
      );

      setEmpresas(empresasComAdmin);
      logger.success(`Empresas carregadas: ${empresasComAdmin.length}`);

    } catch (error) {
      logger.error('Erro ao carregar empresas:', error);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 OTIMIZAÇÃO: Debouncing para validação de email
  const validateAdminEmail = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return async (email: string) => {
        if (!email || !email.includes('@') || editingEmpresa) {
          setEmailValidation({ isChecking: false, exists: false, message: '' });
          return;
        }

        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          setEmailValidation({ isChecking: true, exists: false, message: 'Verificando disponibilidade...' });

          try {
            const { data, error } = await supabase
              .from('users')
              .select('id, email')
              .eq('email', email.toLowerCase().trim())
              .single();

            if (error && error.code !== 'PGRST116') {
              throw error;
            }

            const emailExists = !!data;

            setEmailValidation({
              isChecking: false,
              exists: emailExists,
              message: emailExists 
                ? 'Este email já está sendo usado por outro administrador' 
                : 'Email disponível para uso'
            });

          } catch (error) {
            logger.error('Erro ao validar email:', error);
            setEmailValidation({
              isChecking: false,
              exists: false,
              message: 'Erro ao verificar email. Tente novamente.'
            });
          }
        }, 800);
      };
    })(),
    [editingEmpresa]
  );

  // 🚀 OTIMIZAÇÃO: Memoização de validação de senha
  const validateAdminPassword = useCallback((password: string) => {
    if (!password || editingEmpresa) {
      setPasswordValidation({
        isValid: false,
        message: '',
        requirements: {
          length: false,
          hasLetter: false,
          hasNumber: false
        }
      });
      return;
    }

    const hasMinLength = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    const isValid = hasMinLength && hasLetter && hasNumber;

    let message = '';
    if (!isValid) {
      const missing = [];
      if (!hasMinLength) missing.push('mínimo 6 caracteres');
      if (!hasLetter) missing.push('pelo menos 1 letra');
      if (!hasNumber) missing.push('pelo menos 1 número');
      
      message = `Senha deve ter: ${missing.join(', ')}`;
    } else {
      message = 'Senha válida!';
    }

    setPasswordValidation({
      isValid,
      message,
      requirements: {
        length: hasMinLength,
        hasLetter: hasLetter,
        hasNumber: hasNumber
      }
    });
  }, [editingEmpresa]);

  // 🚀 OTIMIZAÇÃO: Handlers memoizados
  const handleToggleStatus = useCallback(async (empresa: Empresa) => {
    const novoStatus = !empresa.is_active;
    const acao = novoStatus ? 'ativar' : 'desativar';
    
    const confirmMessage = `Tem certeza que deseja ${acao} a empresa "${empresa.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      logger.info(`${acao.charAt(0).toUpperCase() + acao.slice(1)}ando empresa:`, empresa.name);

      const { error } = await supabase
        .from('companies')
        .update({
          is_active: novoStatus,
          segment: `${empresa.industry} | ${empresa.city}/${empresa.state} | Leads:${empresa.expected_leads_monthly} Vendas:${empresa.expected_sales_monthly} Seg:${empresa.expected_followers_monthly} | ATIVO:${novoStatus}`
        })
        .eq('id', empresa.id);

      if (error) {
        throw new Error(`Erro do banco de dados: ${error.message}`);
      }

      await fetchEmpresas();
      
      logger.success(`Empresa "${empresa.name}" ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso`);
      alert(`✅ Empresa "${empresa.name}" foi ${acao === 'ativar' ? 'ativada' : 'desativada'} com sucesso!`);
      
    } catch (error) {
      logger.error(`Erro ao ${acao} empresa:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`❌ Erro ao ${acao} empresa: ${errorMessage}`);
    }
  }, [fetchEmpresas]);

  const handleEdit = useCallback((empresa: Empresa) => {
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
      
      // Resetar estados da alteração de senha
      setShowPasswordChange(false);
      setPasswordChangeData({
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordChangeValidation({
        isValid: false,
        message: '',
        passwordsMatch: false,
        requirements: {
          length: false,
          hasLetter: false,
          hasNumber: false
        }
      });
      
      setEditModalTab('info');
      setShowEditModal(true);
      
      loadVendedores(empresa.id);
      
      logger.info('Abrindo modal de edição para empresa:', empresa.name);
    } catch (error) {
      logger.error('Erro ao preparar edição:', error);
      alert('Erro ao carregar dados da empresa para edição');
    }
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingEmpresa(null);
    setEditModalTab('info');
    setVendedores([]);
    setShowPasswordChange(false);
    setPasswordChangeData({
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordChangeValidation({
      isValid: false,
      message: '',
      passwordsMatch: false,
      requirements: {
        length: false,
        hasLetter: false,
        hasNumber: false
      }
    });
  }, []);

  const handleCityChange = useCallback((cityState: string, city?: City) => {
    if (city) {
      setFormData(prev => ({
        ...prev,
        city: city.name,
        state: city.state
      }));
    } else if (cityState.includes('/')) {
      const [cityName, stateName] = cityState.split('/');
      setFormData(prev => ({
        ...prev,
        city: cityName.trim(),
        state: stateName.trim()
      }));
    }
  }, []);

  // 🚀 OTIMIZAÇÃO: Função de busca de vendedores memoizada
  const loadVendedores = useCallback(async (empresaId: string) => {
    setLoadingVendedores(true);
    try {
      const { data: vendedoresData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, is_active, created_at, tenant_id')
        .eq('role', 'member')
        .eq('is_active', true)
        .order('first_name');

      if (error) {
        logger.error('❌ Erro ao carregar vendedores:', error);
        setVendedores([]);
        return;
      }

      const vendedoresFiltrados = vendedoresData?.filter(vendedor => {
        return vendedor.tenant_id === empresaId;
      }) || [];
      
      const vendedoresComLogin = await Promise.all(
        vendedoresFiltrados.map(async (vendedor) => {
          try {
            const loginKey = `last_login_${vendedor.id}`;
            const localStorageLogin = localStorage.getItem(loginKey);
            
            if (localStorageLogin) {
              const formattedDate = new Date(localStorageLogin).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              return {
                ...vendedor,
                last_login: localStorageLogin,
                last_login_formatted: formattedDate,
                is_real_login: true
              };
            }

            const { data: loginData, error: loginError } = await supabase
              .from('users')
              .select('last_login')
              .eq('id', vendedor.id)
              .single();
            
            if (!loginError && loginData && loginData.last_login) {
              const realLastLogin = loginData.last_login;
              const formattedDate = new Date(realLastLogin).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              return {
                ...vendedor,
                last_login: realLastLogin,
                last_login_formatted: formattedDate,
                is_real_login: true
              };
            }
            
            const simulatedLogin = generateLastLogin(vendedor.created_at, vendedor.id);
            return {
              ...vendedor,
              last_login: simulatedLogin,
              last_login_formatted: new Date(simulatedLogin).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              is_real_login: false
            };
            
          } catch (error) {
            const simulatedLogin = generateLastLogin(vendedor.created_at, vendedor.id);
            return {
              ...vendedor,
              last_login: simulatedLogin,
              last_login_formatted: new Date(simulatedLogin).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              is_real_login: false
            };
          }
        })
      );

      setVendedores(vendedoresComLogin);
      logger.success(`Vendedores carregados: ${vendedoresComLogin.length}`);

    } catch (error) {
      logger.error('Erro ao carregar vendedores:', error);
      setVendedores([]);
    } finally {
      setLoadingVendedores(false);
    }
  }, []);

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

  // 🚀 OTIMIZAÇÃO: Função de validação de alteração de senha memoizada
  const validatePasswordChange = useCallback((newPassword: string, confirmPassword: string) => {
    if (!newPassword) {
      setPasswordChangeValidation({
        isValid: false,
        message: '',
        passwordsMatch: false,
        requirements: {
          length: false,
          hasLetter: false,
          hasNumber: false
        }
      });
      return;
    }

    const hasMinLength = newPassword.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const isValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

    let message = '';
    if (!isValid) {
      const missing = [];
      if (!hasMinLength) missing.push('mínimo 6 caracteres');
      if (!hasLetter) missing.push('pelo menos 1 letra');
      if (!hasNumber) missing.push('pelo menos 1 número');
      if (confirmPassword.length > 0 && !passwordsMatch) missing.push('senhas devem coincidir');
      
      message = `Nova senha deve ter: ${missing.join(', ')}`;
    } else {
      message = 'Nova senha válida!';
    }

    setPasswordChangeValidation({
      isValid,
      message,
      passwordsMatch,
      requirements: {
        length: hasMinLength,
        hasLetter: hasLetter,
        hasNumber: hasNumber
      }
    });
  }, []);

  // 🚀 OTIMIZAÇÃO: useEffects memoizados
  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchEmpresas();
    }
  }, [user, fetchEmpresas]);

  // Effect para validar email do admin com debounce otimizado
  useEffect(() => {
    if (!formData.admin_email || editingEmpresa) {
      setEmailValidation({ isChecking: false, exists: false, message: '' });
      return;
    }

    validateAdminEmail(formData.admin_email);
  }, [formData.admin_email, editingEmpresa, validateAdminEmail]);

  // Effect para validar senha do admin em tempo real
  useEffect(() => {
    validateAdminPassword(formData.admin_password);
  }, [formData.admin_password, editingEmpresa, validateAdminPassword]);

  // Effect para validar alteração de senha em tempo real
  useEffect(() => {
    if (editingEmpresa && showPasswordChange) {
      validatePasswordChange(passwordChangeData.newPassword, passwordChangeData.confirmPassword);
    }
  }, [passwordChangeData.newPassword, passwordChangeData.confirmPassword, editingEmpresa, showPasswordChange, validatePasswordChange]);

      // 🚀 OTIMIZAÇÃO: Handler de alteração de senha memoizado
  const handleChangeAdminPassword = useCallback(async () => {
    if (!editingEmpresa?.admin?.id || !passwordChangeValidation.isValid) {
      alert('Por favor, preencha uma senha válida que atenda aos requisitos.');
      return;
    }

    const confirmChange = confirm(
      `Tem certeza que deseja alterar a senha do administrador "${editingEmpresa.admin.name}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmChange) return;

    try {
      // Atualizar senha no banco de dados
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordChangeData.newPassword })
        .eq('id', editingEmpresa.admin.id);

      if (error) {
        throw new Error(`Erro ao atualizar senha: ${error.message}`);
      }

      // Limpar campos de senha
      setPasswordChangeData({
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordChange(false);
      
      alert(`✅ Senha do administrador "${editingEmpresa.admin.name}" alterada com sucesso!\n\nO administrador pode fazer login com a nova senha.`);
      
      logger.success('Senha do admin alterada:', editingEmpresa.admin.email);

    } catch (error) {
      logger.error('Erro ao alterar senha do admin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`❌ Erro ao alterar senha: ${errorMessage}`);
    }
  }, [editingEmpresa, passwordChangeValidation.isValid, passwordChangeData.newPassword]);

  // 🚀 OTIMIZAÇÃO: Handler de submit memoizado
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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

    // Validar senha do admin (apenas para criação e se senha foi informada)
    if (!editingEmpresa && formData.admin_password && !passwordValidation.isValid) {
      alert('A senha do administrador não atende aos requisitos mínimos:\n- Mínimo 6 caracteres\n- Pelo menos 1 letra\n- Pelo menos 1 número');
      return;
    }

    try {
      const empresaData = {
        name: formData.name,
        industry: formData.industry,
        website: formData.website || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city,
        state: formData.state,
        expected_leads_monthly: parseInt(formData.expected_leads_monthly) || 0,
        expected_sales_monthly: parseInt(formData.expected_sales_monthly) || 0,
        expected_followers_monthly: parseInt(formData.expected_followers_monthly) || 0,
        is_active: true
      };

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
        // Criar nova empresa
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([empresaData])
          .select()
          .single();

        if (companyError) throw companyError;

        // Criar administrador
        const adminPassword = formData.admin_password || '123456';
        const adminEmail = formData.admin_email.toLowerCase().trim();

        const { data: newAdmin, error: adminError } = await supabase
          .from('users')
          .insert([{
            first_name: formData.admin_name.split(' ')[0] || formData.admin_name,
            last_name: formData.admin_name.split(' ').slice(1).join(' ') || '',
            email: adminEmail,
            role: 'admin',
            tenant_id: newCompany.id,
            password_hash: adminPassword,
            is_active: true
          }])
          .select()
          .single();

        if (adminError) throw adminError;

        // Recarregar lista para mostrar nova empresa formatada
        await fetchEmpresas();
        logger.success('Empresa e administrador criados com sucesso');
        
        alert(`✅ Empresa "${newCompany.name}" criada com sucesso!\n\nCredenciais do Admin:\nEmail: ${adminEmail}\nSenha: ${adminPassword}`);
      }

      // Resetar formulário
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
      setShowForm(false);
      setShowEditModal(false);

    } catch (error) {
      logger.error('Erro ao salvar empresa:', error);
      alert('Erro ao salvar empresa: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [formData, editingEmpresa, emailValidation.exists, passwordValidation.isValid, fetchEmpresas]);

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
                      placeholder="Mínimo 6 caracteres com letras e números"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-colors bg-gray-50 focus:bg-white ${
                        formData.admin_password && !passwordValidation.isValid 
                          ? 'border-red-300 focus:ring-red-500' 
                          : formData.admin_password && passwordValidation.isValid
                          ? 'border-green-300 focus:ring-green-500'
                          : 'border-gray-200 focus:ring-slate-500'
                      }`}
                    />
                    
                    {/* Validação da senha */}
                    {formData.admin_password && passwordValidation.message && (
                      <div className={`mt-3 text-sm ${
                        passwordValidation.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {passwordValidation.isValid ? (
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-red-600" />
                            </div>
                          )}
                          <span className="font-medium">{passwordValidation.message}</span>
                        </div>
                        
                        {/* Indicadores de requisitos */}
                        <div className="ml-7 space-y-1">
                          <div className={`flex items-center space-x-2 text-xs ${
                            passwordValidation.requirements.length ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              passwordValidation.requirements.length ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span>Mínimo 6 caracteres</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-xs ${
                            passwordValidation.requirements.hasLetter ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              passwordValidation.requirements.hasLetter ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span>Pelo menos 1 letra</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-xs ${
                            passwordValidation.requirements.hasNumber ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              passwordValidation.requirements.hasNumber ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span>Pelo menos 1 número</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500 mt-2">
                      {formData.admin_password ? 
                        'Senha personalizada será usada para o admin' : 
                        'Se não informada, a senha padrão será "123456"'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alteração de Senha do Admin (apenas na edição) */}
            {editingEmpresa && editingEmpresa.admin && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-slate-900 flex items-center">
                    <Key className="w-5 h-5 mr-2 text-slate-600" />
                    Alterar Senha do Administrador
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showPasswordChange
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {showPasswordChange ? 'Cancelar' : 'Alterar Senha'}
                  </button>
                </div>

                {/* Informações do Admin Atual */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{editingEmpresa.admin.name}</p>
                      <p className="text-sm text-slate-600">{editingEmpresa.admin.email}</p>
                      {editingEmpresa.admin.last_login && (
                        <p className="text-xs text-slate-500">
                          Último acesso: {editingEmpresa.admin.last_login_formatted || formatDateBrasilia(editingEmpresa.admin.last_login)}
                          {editingEmpresa.admin.is_real_login === false && (
                            <span className="text-xs text-amber-600 ml-1">(simulado)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulário de Alteração de Senha */}
                {showPasswordChange && (
                  <div className="space-y-4 bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Nova Senha *
                        </label>
                        <input
                          type="password"
                          value={passwordChangeData.newPassword}
                          onChange={(e) => setPasswordChangeData({
                            ...passwordChangeData,
                            newPassword: e.target.value
                          })}
                          placeholder="Mínimo 6 caracteres com letras e números"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-colors bg-white ${
                            passwordChangeData.newPassword && !passwordChangeValidation.requirements.length 
                              ? 'border-red-300 focus:ring-red-500' 
                              : passwordChangeData.newPassword && passwordChangeValidation.requirements.length
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Confirmar Nova Senha *
                        </label>
                        <input
                          type="password"
                          value={passwordChangeData.confirmPassword}
                          onChange={(e) => setPasswordChangeData({
                            ...passwordChangeData,
                            confirmPassword: e.target.value
                          })}
                          placeholder="Digite a senha novamente"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-colors bg-white ${
                            passwordChangeData.confirmPassword && !passwordChangeValidation.passwordsMatch 
                              ? 'border-red-300 focus:ring-red-500' 
                              : passwordChangeData.confirmPassword && passwordChangeValidation.passwordsMatch
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Validação da nova senha */}
                    {passwordChangeData.newPassword && passwordChangeValidation.message && (
                      <div className={`text-sm ${
                        passwordChangeValidation.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {passwordChangeValidation.isValid ? (
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-red-600" />
                            </div>
                          )}
                          <span className="font-medium">{passwordChangeValidation.message}</span>
                        </div>
                        
                        {/* Indicadores de requisitos */}
                        <div className="ml-7 space-y-1">
                          <div className={`flex items-center space-x-2 text-xs ${
                            passwordChangeValidation.requirements.length ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              passwordChangeValidation.requirements.length ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span>Mínimo 6 caracteres</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-xs ${
                            passwordChangeValidation.requirements.hasLetter ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              passwordChangeValidation.requirements.hasLetter ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span>Pelo menos 1 letra</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-xs ${
                            passwordChangeValidation.requirements.hasNumber ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              passwordChangeValidation.requirements.hasNumber ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span>Pelo menos 1 número</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botão para alterar senha */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleChangeAdminPassword}
                        disabled={!passwordChangeValidation.isValid}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${
                          passwordChangeValidation.isValid
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:-translate-y-0.5'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Alterar Senha do Admin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEmpresa(null);
                  setEmailValidation({ isChecking: false, exists: false, message: '' });
                  setPasswordValidation({
                    isValid: false,
                    message: '',
                    requirements: { length: false, hasLetter: false, hasNumber: false }
                  });
                  // Resetar estados da alteração de senha
                  setShowPasswordChange(false);
                  setPasswordChangeData({
                    newPassword: '',
                    confirmPassword: ''
                  });
                  setPasswordChangeValidation({
                    isValid: false,
                    message: '',
                    passwordsMatch: false,
                    requirements: {
                      length: false,
                      hasLetter: false,
                      hasNumber: false
                    }
                  });
                }}
                className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  !editingEmpresa && (
                    emailValidation.exists || 
                    (!!formData.admin_password && !passwordValidation.isValid)
                  )
                }
                className={`px-8 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
                  !editingEmpresa && (
                    emailValidation.exists || 
                    (!!formData.admin_password && !passwordValidation.isValid)
                  )
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
              Empresas Cadastradas ({paginatedData.empresas.length})
            </h3>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <Building className="w-4 h-4" />
              <span>Lista completa das empresas</span>
            </div>
          </div>
        </div>

        {paginatedData.empresas.length === 0 ? (
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
              {paginatedData.empresas.map((empresa) => (
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

                      {/* Informações de contato */}
                      {(empresa.website || empresa.phone || empresa.email) && (
                        <div className="flex items-center space-x-4 text-sm text-slate-500 ml-14 mt-2">
                          {empresa.website && (
                            <div className="flex items-center space-x-1">
                              <Globe className="w-3.5 h-3.5" />
                              <span className="truncate max-w-32">{empresa.website}</span>
                            </div>
                          )}
                          {empresa.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{empresa.phone}</span>
                            </div>
                          )}
                          {empresa.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate max-w-32">{empresa.email}</span>
                            </div>
                          )}
                        </div>
                      )}
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
                            <span>Último acesso: {empresa.admin.last_login_formatted || formatDateBrasilia(empresa.admin.last_login)}</span>
                            {empresa.admin.is_real_login === false && (
                              <span className="text-xs text-amber-600 ml-1">(simulado)</span>
                            )}
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
            {paginatedData.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Mostrando {paginatedData.totalItems} de {paginatedData.totalItems} empresas
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
                      {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
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
                      onClick={() => setCurrentPage(Math.min(paginatedData.totalPages, currentPage + 1))}
                      disabled={currentPage === paginatedData.totalPages}
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

      {/* Modal de Edição com Abas */}
      {showEditModal && editingEmpresa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-semibold">
                  {editingEmpresa.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Editar Empresa: {editingEmpresa.name}
                  </h2>
                  <p className="text-sm text-slate-600">{editingEmpresa.industry}</p>
                </div>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Abas do Modal */}
            <div className="flex border-b border-gray-200">
              {[
                { id: 'info', label: 'Informações da Empresa', icon: Building },
                { id: 'senha', label: 'Alterar Senha', icon: Key, disabled: !editingEmpresa.admin },
                { id: 'vendedores', label: 'Vendedores', icon: Users }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setEditModalTab(tab.id as any)}
                    disabled={tab.disabled}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      editModalTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.disabled && <span className="text-xs">(Sem admin)</span>}
                  </button>
                );
              })}
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Aba: Informações da Empresa */}
              {editModalTab === 'info' && (
                <div className="space-y-6">
                  <form onSubmit={handleSubmit}>
                    {/* Dados da Empresa */}
                    <div className="space-y-6">
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

                      <div>
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
                    <div className="mt-8">
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

                    {/* Botões */}
                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100 mt-8">
                      <button
                        type="button"
                        onClick={handleCloseEditModal}
                        className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        Atualizar Empresa
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Aba: Alterar Senha */}
              {editModalTab === 'senha' && editingEmpresa.admin && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-slate-900 flex items-center">
                      <Key className="w-5 h-5 mr-2 text-slate-600" />
                      Alterar Senha do Administrador
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        showPasswordChange
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {showPasswordChange ? 'Cancelar' : 'Alterar Senha'}
                    </button>
                  </div>

                  {/* Informações do Admin Atual */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{editingEmpresa.admin.name}</p>
                        <p className="text-sm text-slate-600">{editingEmpresa.admin.email}</p>
                        {editingEmpresa.admin.last_login && (
                          <p className="text-xs text-slate-500">
                            Último acesso: {editingEmpresa.admin.last_login_formatted || formatDateBrasilia(editingEmpresa.admin.last_login)}
                            {editingEmpresa.admin.is_real_login === false && (
                              <span className="text-xs text-amber-600 ml-1">(simulado)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Alteração de Senha */}
                  {showPasswordChange && (
                    <div className="space-y-4 bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nova Senha *
                          </label>
                          <input
                            type="password"
                            value={passwordChangeData.newPassword}
                            onChange={(e) => setPasswordChangeData({
                              ...passwordChangeData,
                              newPassword: e.target.value
                            })}
                            placeholder="Mínimo 6 caracteres com letras e números"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-colors bg-white ${
                              passwordChangeData.newPassword && !passwordChangeValidation.requirements.length 
                                ? 'border-red-300 focus:ring-red-500' 
                                : passwordChangeData.newPassword && passwordChangeValidation.requirements.length
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Confirmar Nova Senha *
                          </label>
                          <input
                            type="password"
                            value={passwordChangeData.confirmPassword}
                            onChange={(e) => setPasswordChangeData({
                              ...passwordChangeData,
                              confirmPassword: e.target.value
                            })}
                            placeholder="Digite a senha novamente"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-colors bg-white ${
                              passwordChangeData.confirmPassword && !passwordChangeValidation.passwordsMatch 
                                ? 'border-red-300 focus:ring-red-500' 
                                : passwordChangeData.confirmPassword && passwordChangeValidation.passwordsMatch
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-200 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Validação da nova senha */}
                      {passwordChangeData.newPassword && passwordChangeValidation.message && (
                        <div className={`text-sm ${
                          passwordChangeValidation.isValid ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <div className="flex items-center space-x-2 mb-2">
                            {passwordChangeValidation.isValid ? (
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-red-600" />
                              </div>
                            )}
                            <span className="font-medium">{passwordChangeValidation.message}</span>
                          </div>
                          
                          {/* Indicadores de requisitos */}
                          <div className="ml-7 space-y-1">
                            <div className={`flex items-center space-x-2 text-xs ${
                              passwordChangeValidation.requirements.length ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <div className={`w-3 h-3 rounded-full ${
                                passwordChangeValidation.requirements.length ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span>Mínimo 6 caracteres</span>
                            </div>
                            <div className={`flex items-center space-x-2 text-xs ${
                              passwordChangeValidation.requirements.hasLetter ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <div className={`w-3 h-3 rounded-full ${
                                passwordChangeValidation.requirements.hasLetter ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span>Pelo menos 1 letra</span>
                            </div>
                            <div className={`flex items-center space-x-2 text-xs ${
                              passwordChangeValidation.requirements.hasNumber ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <div className={`w-3 h-3 rounded-full ${
                                passwordChangeValidation.requirements.hasNumber ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span>Pelo menos 1 número</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botão para alterar senha */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleChangeAdminPassword}
                          disabled={!passwordChangeValidation.isValid}
                          className={`px-6 py-3 rounded-xl font-medium transition-all ${
                            passwordChangeValidation.isValid
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transform hover:-translate-y-0.5'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Alterar Senha do Admin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Vendedores */}
              {editModalTab === 'vendedores' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-slate-900 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-slate-600" />
                      Vendedores da Empresa
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <UserCheck className="w-4 h-4" />
                      <span>{vendedores.length} vendedor(es)</span>
                    </div>
                  </div>

                  {loadingVendedores ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-slate-500">Carregando vendedores...</p>
                    </div>
                  ) : vendedores.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum vendedor encontrado</h3>
                      <p className="text-slate-600">
                        Não há vendedores (usuários com role 'member') cadastrados no sistema.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vendedores.map((vendedor) => (
                        <div key={vendedor.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-900">
                                  {vendedor.first_name} {vendedor.last_name}
                                </h4>
                                <p className="text-sm text-slate-600">{vendedor.email}</p>
                                                                 <div className="flex items-center space-x-4 mt-1">
                                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                     <Shield className="w-3 h-3 mr-1" />
                                     {vendedor.role}
                                   </span>
                                   <span className="text-xs text-slate-500">
                                     Desde: {new Date(vendedor.created_at).toLocaleDateString('pt-BR')}
                                     {vendedor.last_login && (
                                       <> • Último acesso: {vendedor.last_login_formatted || formatDateBrasilia(vendedor.last_login)}</>
                                     )}
                                     {vendedor.is_real_login === false && (
                                       <span className="text-xs text-amber-600 ml-1">(simulado)</span>
                                     )}
                                   </span>
                                 </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                vendedor.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {vendedor.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default EmpresasModule;
