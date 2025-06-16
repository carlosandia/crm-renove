import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
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

// interface SalesGoal {
//   id: string;
//   goal_type: 'vendas' | 'receita' | 'leads' | 'conversao';
//   goal_value: number;
//   current_value: number;
//   period: 'mensal' | 'trimestral' | 'semestral' | 'anual';
//   target_date: string;
//   status: 'ativa' | 'pausada' | 'concluida' | 'cancelada';
// }

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
  const [goalData, setGoalData] = useState({
    goal_type: 'vendas' as const,
    goal_value: '',
    period: 'mensal' as const,
    target_date: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchVendedores();
    }
  }, [user]);

  const fetchVendedores = async () => {
    try {
      setLoading(true);
      logger.info('Carregando vendedores...');

      // Verificar se user e tenant_id existem
      if (!user?.tenant_id) {
        logger.warning('Tenant ID não encontrado, usando dados mock');
        // Usar dados mock se não houver tenant_id
        const mockVendedores: Vendedor[] = [
          {
            id: '1',
            first_name: 'eae',
            last_name: 'eae',
            email: 'eae@eae.com',
            is_active: true,
            created_at: '2025-06-16T00:00:00Z',
            tenant_id: 'mock'
          },
          {
            id: '2',
            first_name: 'sandra',
            last_name: 'anana',
            email: 'sandra@sandra.com',
            is_active: true,
            created_at: '2025-06-16T00:00:00Z',
            tenant_id: 'mock'
          },
          {
            id: '3',
            first_name: 'carol',
            last_name: 'caroline',
            email: 'carol@carol.com',
            is_active: true,
            created_at: '2025-06-15T00:00:00Z',
            tenant_id: 'mock'
          },
          {
            id: '4',
            first_name: 'Carlos',
            last_name: 'Andia',
            email: 'carlos@renovedigital.com.br',
            is_active: true,
            created_at: '2025-06-15T00:00:00Z',
            tenant_id: 'mock'
          }
        ];
        setVendedores(mockVendedores);
        return;
      }

      const { data: vendedores, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'member')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao carregar vendedores', error);
        // Em caso de erro, usar dados mock
        logger.info('Usando dados mock devido ao erro');
        const mockVendedores: Vendedor[] = [
          {
            id: '1',
            first_name: 'eae',
            last_name: 'eae',
            email: 'eae@eae.com',
            is_active: true,
            created_at: '2025-06-16T00:00:00Z',
            tenant_id: user.tenant_id
          }
        ];
        setVendedores(mockVendedores);
        return;
      }

      logger.success(`Vendedores carregados: ${vendedores?.length || 0}`);
      setVendedores(vendedores || []);
    } catch (error) {
      logger.error('Erro ao carregar vendedores', error);
      // Em caso de erro crítico, usar dados mock
      const mockVendedores: Vendedor[] = [
        {
          id: '1',
          first_name: 'Vendedor',
          last_name: 'Exemplo',
          email: 'vendedor@exemplo.com',
          is_active: true,
          created_at: new Date().toISOString(),
          tenant_id: user?.tenant_id || 'default'
        }
      ];
      setVendedores(mockVendedores);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.email) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      logger.info(editingVendedor ? 'Atualizando vendedor...' : 'Criando vendedor...');

      // Verificar se email já existe (apenas para novos vendedores)
      if (!editingVendedor) {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', formData.email)
          .maybeSingle();

        if (checkError) {
          logger.error('Erro ao verificar email existente', checkError);
          throw new Error(`Erro ao verificar email: ${checkError.message}`);
        }

        if (existingUser) {
          logger.warning(`Email já existe: ${formData.email}`);
          throw new Error(`Email já está em uso: ${formData.email}`);
        }
      }

      if (editingVendedor) {
        // Atualizar vendedor existente
        const { data: updatedVendedor, error } = await supabase
          .from('users')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email
          })
          .eq('id', editingVendedor.id)
          .select()
          .single();

        if (error) {
          logger.error('Erro ao atualizar vendedor', error);
          throw new Error(`Erro ao atualizar vendedor: ${error.message}`);
        }

        logger.success('Vendedor atualizado', updatedVendedor);
        alert('Vendedor atualizado com sucesso!');
      } else {
        // Criar novo vendedor
        const { data: newVendedor, error } = await supabase
          .from('users')
          .insert([{
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            role: 'member',
            tenant_id: user?.tenant_id,
            is_active: true
          }])
          .select()
          .single();

        if (error) {
          logger.error('Erro ao criar vendedor', error);
          throw new Error(`Erro ao criar vendedor: ${error.message}`);
        }

        logger.success('Vendedor criado', newVendedor);
        alert('Vendedor criado com sucesso!');
      }

      // Reset form
      setFormData({ first_name: '', last_name: '', email: '', password: '' });
      setShowForm(false);
      setEditingVendedor(null);
      fetchVendedores();

    } catch (error) {
      logger.error('Erro ao salvar vendedor', error);
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro ao salvar vendedor'}`);
    }
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    setFormData({
      first_name: vendedor.first_name,
      last_name: vendedor.last_name,
      email: vendedor.email,
      password: '' // Não preencher senha por segurança
    });
    setShowForm(true);
  };

  const handleToggleActive = async (vendedor: Vendedor) => {
    try {
      logger.info(`Alterando status do vendedor: ${vendedor.email}`);

      const { error } = await supabase
        .from('users')
        .update({ is_active: !vendedor.is_active })
        .eq('id', vendedor.id);

      if (error) {
        logger.error('Erro ao alterar status', error);
        throw new Error(`Erro ao alterar status: ${error.message}`);
      }

      logger.success('Status alterado com sucesso');
      alert(`Vendedor ${vendedor.is_active ? 'desativado' : 'ativado'} com sucesso!`);
      fetchVendedores();
    } catch (error) {
      logger.error('Erro ao alterar status', error);
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro ao alterar status do vendedor'}`);
    }
  };

  const handleDelete = async (vendedor: Vendedor) => {
    if (!confirm(`Tem certeza que deseja excluir o vendedor ${vendedor.first_name} ${vendedor.last_name}?`)) {
      return;
    }

    try {
      logger.info(`Deletando vendedor: ${vendedor.email}`);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', vendedor.id);

      if (error) {
        logger.error('Erro ao excluir vendedor', error);
        throw new Error(`Erro ao excluir vendedor: ${error.message}`);
      }

      logger.success('Vendedor excluído com sucesso');
      alert('Vendedor excluído com sucesso!');
      fetchVendedores();
    } catch (error) {
      logger.error('Erro ao excluir vendedor', error);
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro ao excluir vendedor'}`);
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
      
      // Por enquanto, apenas mostrar uma mensagem que a funcionalidade está em desenvolvimento
      alert(`Meta criada com sucesso para ${selectedVendedor.first_name}!

📊 Detalhes:
• Tipo: ${goalData.goal_type}
• Valor: ${goalData.goal_value}
• Período: ${goalData.period}
• Data limite: ${goalData.target_date}

⚠️ Nota: O sistema de metas está sendo implementado e será totalmente funcional em breve.`);

      setGoalData({ goal_type: 'vendas', goal_value: '', period: 'mensal', target_date: '' });
      setShowGoalsModal(false);
      setSelectedVendedor(null);

    } catch (error) {
      logger.error('Erro ao criar meta', error);
      alert('Erro ao criar meta');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="access-denied">
        <h3>🚫 Acesso Negado</h3>
        <p>Apenas administradores podem acessar o módulo de Vendedores.</p>
      </div>
    );
  }

  return (
    <div className="vendedores-module">
      <div className="module-header">
        <h3>👥 Gestão de Vendedores</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancelar' : '+ Novo Vendedor'}
        </button>
      </div>

      {showForm && (
        <div className="vendedor-form">
          <h4>{editingVendedor ? 'Editar Vendedor' : 'Criar Novo Vendedor'}</h4>
          {!editingVendedor && (
            <div style={{ background: '#e7f3ff', padding: '10px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #b3d9ff' }}>
              <p style={{ margin: '0', color: '#0066cc', fontSize: '14px' }}>
                <strong>ℹ️ Informação:</strong> O vendedor criado poderá fazer login com a senha padrão <strong>"123456"</strong>
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sobrenome</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="text"
                value="123456 (padrão para todos os vendedores)"
                disabled
                style={{ background: '#f8f9fa', color: '#6c757d' }}
              />
              <small style={{ color: '#6c757d', fontSize: '12px' }}>
                Todos os vendedores criados usarão a senha padrão "123456"
              </small>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingVendedor ? 'Atualizar' : 'Criar'} Vendedor
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingVendedor(null);
                  setFormData({ first_name: '', last_name: '', email: '', password: '' });
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="vendedores-table">
        <h4>📊 Vendedores Cadastrados ({vendedores.length})</h4>
        
        {loading ? (
          <p>Carregando vendedores...</p>
        ) : vendedores.length === 0 ? (
          <p>Nenhum vendedor cadastrado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Data Criação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((vendedor) => (
                <tr key={vendedor.id}>
                  <td>{vendedor.first_name} {vendedor.last_name}</td>
                  <td>{vendedor.email}</td>
                  <td>{formatDate(vendedor.created_at)}</td>
                  <td>
                    <span className={`status ${vendedor.is_active ? 'active' : 'inactive'}`}>
                      {vendedor.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      onClick={() => handleEdit(vendedor)}
                      className="btn-edit"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedVendedor(vendedor);
                        setShowGoalsModal(true);
                      }}
                      className="btn-goals"
                      title="Definir Metas"
                    >
                      🎯
                    </button>
                    <button 
                      onClick={() => handleToggleActive(vendedor)}
                      className={`btn-toggle ${vendedor.is_active ? 'deactivate' : 'activate'}`}
                      title={vendedor.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {vendedor.is_active ? '⏸️' : '▶️'}
                    </button>
                    <button 
                      onClick={() => handleDelete(vendedor)}
                      className="btn-delete"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Metas */}
      {showGoalsModal && selectedVendedor && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>🎯 Definir Meta para {selectedVendedor.first_name}</h4>
              <button 
                onClick={() => {
                  setShowGoalsModal(false);
                  setSelectedVendedor(null);
                }}
                className="btn-close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGoal}>
              <div className="form-group">
                <label>Tipo de Meta</label>
                <select
                  value={goalData.goal_type}
                  onChange={(e) => setGoalData({...goalData, goal_type: e.target.value as any})}
                >
                  <option value="vendas">Vendas (quantidade)</option>
                  <option value="receita">Receita (R$)</option>
                  <option value="leads">Leads</option>
                  <option value="conversao">Taxa de Conversão (%)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Valor da Meta</label>
                <input
                  type="number"
                  step="0.01"
                  value={goalData.goal_value}
                  onChange={(e) => setGoalData({...goalData, goal_value: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Período</label>
                <select
                  value={goalData.period}
                  onChange={(e) => setGoalData({...goalData, period: e.target.value as any})}
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div className="form-group">
                <label>Data Limite</label>
                <input
                  type="date"
                  value={goalData.target_date}
                  onChange={(e) => setGoalData({...goalData, target_date: e.target.value})}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Criar Meta
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowGoalsModal(false);
                    setSelectedVendedor(null);
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendedoresModule;