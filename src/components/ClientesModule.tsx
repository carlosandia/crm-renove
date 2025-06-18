import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getBrasiliaDateTime, formatBrasiliaDateTime, formatBrasiliaDate } from '../utils/timezone';
import { 
  Users, User, Mail, Phone, MapPin, Building, Plus, Eye, Edit, Trash2, 
  Calendar, DollarSign, TrendingUp, Star, Search, Filter, X, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Cliente {
  id: string;
  name: string; // Campo do Supabase
  email: string;
  phone: string; // Campo do Supabase
  company?: string;
  endereco?: string;
  created_at: string;
  tenant_id: string;
  status: 'ativo' | 'desativado';
  valor_total?: number;
  ultimo_acesso?: string;
  updated_at?: string;
}

const ClientesModule: React.FC = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'desativado'>('all');
  
  // Estados da paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    endereco: ''
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      fetchClientes();
    }
  }, [user]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      logger.info('Carregando clientes do Supabase...');
      
      if (!user?.tenant_id) {
        logger.warning('Usuário sem tenant_id definido');
        setClientes([]);
        return;
      }
      
      // Buscar na tabela customers do Supabase
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao carregar clientes do Supabase:', error);
        
        // Se a tabela não existir, criar dados mock
        if (error.code === 'PGRST116' || error.message.includes('relation "customers" does not exist')) {
          logger.warning('Tabela customers não existe. Execute o SQL CRIAR-TABELA-CUSTOMERS.sql');
          
          // Fallback para dados mock
          const mockClientes: Cliente[] = [
            {
              id: 'mock-1',
              name: 'João Silva',
              email: 'joao@empresaabc.com',
              phone: '(11) 99999-9999',
              company: 'Empresa ABC Ltda',
              endereco: 'Rua das Flores, 123 - São Paulo, SP',
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              tenant_id: user.tenant_id,
              status: 'ativo',
              valor_total: 45000,
              ultimo_acesso: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'mock-2',
              name: 'Maria Santos',
              email: 'maria@techcorp.com',
              phone: '(11) 88888-8888',
              company: 'TechCorp Solutions',
              endereco: 'Av. Paulista, 456 - São Paulo, SP',
              created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              tenant_id: user.tenant_id,
              status: 'ativo',
              valor_total: 78000,
              ultimo_acesso: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
            }
          ];
          setClientes(mockClientes);
          alert('⚠️ Tabela customers não encontrada. Execute o SQL CRIAR-TABELA-CUSTOMERS.sql no Supabase para persistir os dados.');
          return;
        }
        
        // Outros erros
        throw error;
      }

      // Processar dados do Supabase e adicionar campos customizados
      const clientesProcessados = data.map(cliente => ({
        ...cliente,
        status: 'ativo' as const, // Status padrão
        valor_total: Math.floor(Math.random() * 100000), // Valor simulado
        ultimo_acesso: getBrasiliaDateTime() // Data/hora atual de Brasília
      }));

      logger.success(`✅ Clientes carregados do Supabase: ${clientesProcessados.length}`);
      setClientes(clientesProcessados);
      
    } catch (error) {
      logger.error('Erro ao carregar clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.company) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      logger.info('Salvando cliente no Supabase...');

      const clienteData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        tenant_id: user?.tenant_id || '',
        // Campos customizados não vão para o Supabase
      };

      if (editingCliente) {
        // Atualizar cliente existente
        const { data, error } = await supabase
          .from('customers')
          .update(clienteData)
          .eq('id', editingCliente.id)
          .select()
          .single();

        if (error) {
          logger.error('Erro ao atualizar cliente:', error);
          throw error;
        }

        // Atualizar na lista local
        const updatedClientes = clientes.map(c => 
          c.id === editingCliente.id 
            ? { ...data, status: editingCliente.status, valor_total: editingCliente.valor_total, ultimo_acesso: editingCliente.ultimo_acesso }
            : c
        );
        setClientes(updatedClientes);
        logger.success('Cliente atualizado com sucesso');
        
      } else {
        // Criar novo cliente
        const { data, error } = await supabase
          .from('customers')
          .insert([clienteData])
          .select()
          .single();

        if (error) {
          logger.error('Erro ao criar cliente:', error);
          throw error;
        }

        // Adicionar à lista local com campos customizados
        const newCliente: Cliente = {
          ...data,
          status: 'ativo',
          valor_total: 0,
          ultimo_acesso: getBrasiliaDateTime(),
          endereco: formData.endereco
        };
        setClientes([newCliente, ...clientes]);
        logger.success('Cliente criado com sucesso');
      }

      // Limpar formulário
      setFormData({ name: '', email: '', phone: '', company: '', endereco: '' });
      setShowForm(false);
      setEditingCliente(null);

      alert(`✅ Cliente ${editingCliente ? 'atualizado' : 'criado'} com sucesso!`);
      
      // Recarregar dados para sincronizar
      await fetchClientes();
      
    } catch (error) {
      logger.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      name: cliente.name,
      email: cliente.email,
      phone: cliente.phone,
      company: cliente.company || '',
      endereco: cliente.endereco || ''
    });
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleDelete = async (clienteId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      logger.info('Excluindo cliente do Supabase...');
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', clienteId);

      if (error) {
        logger.error('Erro ao excluir cliente:', error);
        throw error;
      }

      // Remover da lista local
      const updatedClientes = clientes.filter(c => c.id !== clienteId);
      setClientes(updatedClientes);
      logger.success('Cliente excluído com sucesso');
      
    } catch (error) {
      logger.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const toggleClienteStatus = (clienteId: string) => {
    // Esta função atualiza apenas o estado local, pois status não está no Supabase
    const updatedClientes = clientes.map(c => 
      c.id === clienteId 
        ? { ...c, status: (c.status === 'ativo' ? 'desativado' : 'ativo') as 'ativo' | 'desativado' }
        : c
    );
    setClientes(updatedClientes);
    logger.success('Status do cliente atualizado (local)');
  };

  const handleViewDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    return formatBrasiliaDate(dateString);
  };

  const formatDateTime = (dateString: string) => {
    return formatBrasiliaDateTime(dateString);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'desativado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Star className="w-3 h-3" />;
      case 'desativado':
        return <X className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const filteredClientes = clientes.filter(cliente => {
    const matchesSearch = 
      cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.company && cliente.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      cliente.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || cliente.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Cálculos da paginação
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClientes = filteredClientes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPaginationNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar este módulo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const stats = {
    total: clientes.length,
    ativos: clientes.filter(c => c.status === 'ativo').length,
    desativados: clientes.filter(c => c.status === 'desativado').length,
    valorTotal: clientes.reduce((sum, c) => sum + (c.valor_total || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header com título */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestão de Clientes</h2>
            <p className="text-gray-600">Gerencie seus clientes e prospectos</p>
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', email: '', phone: '', company: '', endereco: '' });
              setEditingCliente(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>{showForm ? 'Cancelar' : 'Novo Cliente'}</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, email, empresa ou telefone..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Apenas Ativos</option>
              <option value="desativado">Apenas Desativados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total de Clientes</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.ativos}</div>
              <div className="text-sm text-gray-500">Clientes Ativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.desativados}</div>
              <div className="text-sm text-gray-500">Clientes Desativados</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.valorTotal)}</div>
              <div className="text-sm text-gray-500">Valor Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {editingCliente ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
            </h3>
            <p className="text-gray-600">
              {editingCliente ? 'Atualize as informações do cliente' : 'Adicione um novo cliente ao seu portfólio'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Nome completo do cliente"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa *
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  required
                  placeholder="Nome da empresa"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="email@empresa.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                placeholder="Endereço completo"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCliente(null);
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                {editingCliente ? 'Atualizar Cliente' : 'Criar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Clientes Cadastrados ({filteredClientes.length})
          </h2>
        </div>

        {filteredClientes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Adicione clientes ao seu portfólio para começar'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Adicionar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {currentClientes.map((cliente) => (
                <div key={cliente.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
                        {cliente.company ? cliente.company.charAt(0) : cliente.name.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {cliente.company || cliente.name}
                          </h3>
                          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cliente.status)}`}>
                            {getStatusIcon(cliente.status)}
                            <span className="capitalize">{cliente.status}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Responsável:</strong> {cliente.name}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{cliente.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{cliente.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>Criado em {formatDate(cliente.created_at)}</span>
                          </div>
                        </div>

                        {cliente.endereco && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{cliente.endereco}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                          {cliente.valor_total && cliente.valor_total > 0 && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="font-medium text-green-600">
                                {formatCurrency(cliente.valor_total)}
                              </span>
                            </div>
                          )}
                          {cliente.ultimo_acesso && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span>
                                <strong>Último acesso:</strong> {formatDateTime(cliente.ultimo_acesso)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleClienteStatus(cliente.id)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          cliente.status === 'ativo' 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={cliente.status === 'ativo' ? 'Desativar cliente' : 'Ativar cliente'}
                      >
                        {cliente.status === 'ativo' ? <X className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                      </button>
                      
                      <button
                        onClick={() => handleViewDetails(cliente)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                        title="Editar cliente"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredClientes.length)} de {filteredClientes.length} clientes
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {getPaginationNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedCliente && (
        <div 
          className="client-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
            }
          }}
        >
          <div className="client-modal-content">
            <div className="client-modal-header">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Detalhes do Cliente</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="client-modal-body space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  {selectedCliente.company ? selectedCliente.company.charAt(0) : selectedCliente.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedCliente.company || selectedCliente.name}</h4>
                  <p className="text-gray-600">Responsável: {selectedCliente.name}</p>
                  <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(selectedCliente.status)}`}>
                    {getStatusIcon(selectedCliente.status)}
                    <span className="capitalize">{selectedCliente.status}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Informações de Contato</h5>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{selectedCliente.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{selectedCliente.phone}</span>
                    </div>
                    {selectedCliente.endereco && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <span className="text-gray-600">{selectedCliente.endereco}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Informações Adicionais</h5>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Criado em {formatDate(selectedCliente.created_at)}</span>
                    </div>
                    {selectedCliente.ultimo_acesso && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        <span className="text-gray-600">Último acesso: {formatDateTime(selectedCliente.ultimo_acesso)}</span>
                      </div>
                    )}
                    {selectedCliente.valor_total && selectedCliente.valor_total > 0 && (
                      <div className="flex items-center space-x-3">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <span className="text-green-600 font-medium">{formatCurrency(selectedCliente.valor_total)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesModule;
