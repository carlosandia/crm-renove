import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { 
  Users, User, Mail, Shield, Plus, Eye, EyeOff, CheckCircle, XCircle, 
  Target, Edit, Trash2, Calendar, Phone, Building
} from 'lucide-react';
import '../styles/VendedoresModule.css';

interface Vendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
}

type GoalType = 'vendas' | 'receita' | 'leads' | 'conversao';

interface SalesGoal {
  id: string;
  goal_type: GoalType;
  goal_value: number;
  current_value: number;
  period: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  target_date: string;
  status: 'ativa' | 'pausada' | 'concluida' | 'cancelada';
}

const VendedoresModule: React.FC = () => {
  const { user } = useAuth();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });

  // Estados das metas
  const [goalData, setGoalData] = useState<{
    goal_type: GoalType;
    goal_value: string;
    period: 'mensal' | 'trimestral' | 'semestral' | 'anual';
    target_date: string;
  }>({
    goal_type: 'vendas',
    goal_value: '',
    period: 'mensal',
    target_date: ''
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      fetchVendedores();
    }
  }, [user]);

  const fetchVendedores = async () => {
    try {
      logger.info('Carregando vendedores...');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'member')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao carregar vendedores:', error);
        throw error;
      }

      logger.success(`Vendedores carregados: ${data?.length || 0}`);
      setVendedores(data || []);
    } catch (error) {
      logger.error('Erro ao carregar vendedores:', error);
      alert('Erro ao carregar vendedores. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      logger.info('Salvando vendedor...');

      const vendedorData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: 'member',
        tenant_id: user?.tenant_id,
        is_active: true
      };

      if (editingVendedor) {
        // Atualizar vendedor existente
        const { data, error } = await supabase
          .from('users')
          .update(vendedorData)
          .eq('id', editingVendedor.id)
          .select()
          .single();

        if (error) {
          logger.error('Erro ao atualizar vendedor:', error);
          throw error;
        }

        logger.success('Vendedor atualizado com sucesso');
      } else {
        // Criar novo vendedor
        const { data, error } = await supabase
          .from('users')
          .insert([vendedorData])
          .select()
          .single();

        if (error) {
          logger.error('Erro ao criar vendedor:', error);
          throw error;
        }

        logger.success('Vendedor criado com sucesso');
      }

      // Limpar formulário e recarregar dados
      setFormData({ first_name: '', last_name: '', email: '', password: '' });
      setShowForm(false);
      setEditingVendedor(null);
      await fetchVendedores();

      alert(`✅ Vendedor ${editingVendedor ? 'atualizado' : 'criado'} com sucesso!`);
    } catch (error) {
      logger.error('Erro ao salvar vendedor:', error);
      
      // Tratamento de erros específicos
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          alert('Erro: Este email já está sendo usado por outro usuário.');
        } else if (error.message.includes('invalid input')) {
          alert('Erro: Dados inválidos. Verifique se todos os campos estão preenchidos corretamente.');
        } else {
          alert(`Erro ao salvar vendedor: ${error.message}`);
        }
      } else {
        alert('Erro desconhecido ao salvar vendedor. Tente novamente.');
      }
    }
  };

  const handleEdit = (vendedor: Vendedor) => {
    setFormData({
      first_name: vendedor.first_name,
      last_name: vendedor.last_name,
      email: vendedor.email,
      password: ''
    });
    setEditingVendedor(vendedor);
    setShowForm(true);
  };

  const handleDelete = async (vendedorId: string) => {
    if (!confirm('Tem certeza que deseja excluir este vendedor?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', vendedorId);

      if (error) throw error;

      logger.success('Vendedor excluído com sucesso');
      await fetchVendedores();
    } catch (error) {
      logger.error('Erro ao excluir vendedor:', error);
      alert('Erro ao excluir vendedor.');
    }
  };

  const toggleVendedorStatus = async (vendedorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', vendedorId);

      if (error) throw error;

      logger.success('Status alterado com sucesso');
      await fetchVendedores();
    } catch (error) {
      logger.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do vendedor.');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVendedor || !goalData.goal_value || !goalData.target_date) {
      alert('Preencha todos os campos da meta');
      return;
    }

    try {
      logger.info('Criando meta para vendedor...');
      
      const metaData = {
        user_id: selectedVendedor.id,
        tenant_id: user?.tenant_id,
        goal_type: goalData.goal_type,
        goal_value: parseFloat(goalData.goal_value),
        current_value: 0,
        period: goalData.period,
        target_date: goalData.target_date,
        status: 'ativa',
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('sales_goals')
        .insert([metaData])
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar meta:', error);
        
        // Tratamento de erros específicos
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          alert('Erro: Já existe uma meta similar para este vendedor neste período.');
          return;
        }
        
        throw error;
      }

      logger.success('Meta criada com sucesso');
      
      alert(`✅ Meta criada com sucesso para ${selectedVendedor.first_name}!

📊 Detalhes:
• Tipo: ${formatGoalType(goalData.goal_type)}
• Valor: ${formatGoalValue(goalData.goal_type, goalData.goal_value.toString())}
• Período: ${goalData.period}
• Data limite: ${new Date(goalData.target_date).toLocaleDateString('pt-BR')}

🎯 A meta foi salva no sistema e já está ativa!`);

      // Limpar formulário e fechar modal
      setGoalData({ goal_type: 'vendas', goal_value: '', period: 'mensal', target_date: '' });
      setShowGoalsModal(false);
      setSelectedVendedor(null);

    } catch (error) {
      logger.error('Erro ao criar meta', error);
      
      if (error instanceof Error) {
        alert(`Erro ao criar meta: ${error.message}`);
      } else {
        alert('Erro desconhecido ao criar meta. Tente novamente.');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatGoalType = (goalType: GoalType): string => {
    switch (goalType) {
      case 'vendas':
        return 'Vendas';
      case 'receita':
        return 'Receita';
      case 'leads':
        return 'Leads';
      case 'conversao':
        return 'Conversão';
      default:
        return goalType;
    }
  };

  const formatGoalValue = (goalType: GoalType, value: string): string => {
    if (goalType === 'receita') {
      return 'R$ ' + parseFloat(value).toLocaleString('pt-BR');
    }
    return value;
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
    total: vendedores.length,
    active: vendedores.filter(v => v.is_active).length,
    inactive: vendedores.filter(v => !v.is_active).length,
    recent: vendedores.filter(v => {
      const createdDate = new Date(v.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate > thirtyDaysAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total de Vendedores</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-sm text-gray-500">Vendedores Ativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.inactive}</div>
              <div className="text-sm text-gray-500">Vendedores Inativos</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.recent}</div>
              <div className="text-sm text-gray-500">Novos (30 dias)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Header com botão de ação */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestão de Vendedores</h2>
            <p className="text-gray-600">Gerencie sua equipe de vendas e defina metas</p>
          </div>
          <button
            onClick={() => {
              setFormData({ first_name: '', last_name: '', email: '', password: '' });
              setEditingVendedor(null);
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>{showForm ? 'Cancelar' : 'Novo Vendedor'}</span>
          </button>
        </div>
      </div>

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {editingVendedor ? 'Editar Vendedor' : 'Cadastrar Novo Vendedor'}
            </h3>
            <p className="text-gray-600">
              {editingVendedor ? 'Atualize as informações do vendedor' : 'Adicione um novo membro à sua equipe'}
            </p>
          </div>

          {!editingVendedor && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>ℹ️ Informação:</strong> O vendedor criado poderá fazer login com a senha padrão <strong>"123456"</strong>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                  placeholder="Nome do vendedor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sobrenome *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  required
                  placeholder="Sobrenome do vendedor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

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

            {editingVendedor && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha (opcional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingVendedor(null);
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                {editingVendedor ? 'Atualizar Vendedor' : 'Criar Vendedor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Vendedores */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Vendedores Cadastrados ({vendedores.length})
          </h2>
        </div>

        {vendedores.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum vendedor cadastrado</h3>
            <p className="text-gray-500 mb-6">
              Adicione vendedores à sua equipe para começar
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Adicionar primeiro vendedor
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {vendedores.map((vendedor) => (
              <div key={vendedor.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
                      {vendedor.first_name.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {vendedor.first_name} {vendedor.last_name}
                        </h3>
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                          vendedor.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vendedor.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Inativo</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{vendedor.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Criado em {formatDate(vendedor.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedVendedor(vendedor);
                        setShowGoalsModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                      title="Definir meta"
                    >
                      <Target className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => handleEdit(vendedor)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Editar vendedor"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => toggleVendedorStatus(vendedor.id, vendedor.is_active)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        vendedor.is_active 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={vendedor.is_active ? 'Desativar vendedor' : 'Ativar vendedor'}
                    >
                      {vendedor.is_active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(vendedor.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Excluir vendedor"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Metas */}
      {showGoalsModal && selectedVendedor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Definir Meta</h2>
                  <p className="text-sm text-gray-600">
                    Configurar meta para {selectedVendedor.first_name} {selectedVendedor.last_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowGoalsModal(false);
                    setSelectedVendedor(null);
                  }}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateGoal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Meta
                    </label>
                    <select
                      value={goalData.goal_type}
                      onChange={(e) => setGoalData({...goalData, goal_type: e.target.value as any})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="vendas">Vendas (quantidade)</option>
                      <option value="receita">Receita (R$)</option>
                      <option value="leads">Leads</option>
                      <option value="conversao">Taxa de Conversão (%)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor da Meta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={goalData.goal_value}
                      onChange={(e) => setGoalData({...goalData, goal_value: e.target.value})}
                      required
                      placeholder="Ex: 100"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período
                    </label>
                    <select
                      value={goalData.period}
                      onChange={(e) => setGoalData({...goalData, period: e.target.value as any})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Limite
                    </label>
                    <input
                      type="date"
                      value={goalData.target_date}
                      onChange={(e) => setGoalData({...goalData, target_date: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGoalsModal(false);
                      setSelectedVendedor(null);
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                  >
                    Criar Meta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendedoresModule;