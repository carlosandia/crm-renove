
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  segment: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Admin {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tenant_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface Integration {
  id: string;
  company_id: string | null;
  google_ads_token?: string | null;
  meta_ads_token?: string | null;
  linkedin_ads_token?: string | null;
}

const ClientesModule: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState<string | null>(null);
  const [members, setMembers] = useState<Admin[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    companyName: '',
    segment: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Carregando dados...');

      // Carregar empresas
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error('Erro ao buscar empresas:', companiesError);
        throw companiesError;
      }
      
      console.log('Empresas carregadas:', companies);
      setCompanies(companies || []);

      // Carregar admins
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        throw usersError;
      }
      
      console.log('Admins carregados:', users);
      setAdmins(users || []);

      // Carregar integrações
      const { data: integrations, error: integrationsError } = await supabase
        .from('integrations')
        .select('*');

      if (integrationsError) {
        console.error('Erro ao buscar integrações:', integrationsError);
        throw integrationsError;
      }
      
      console.log('Integrações carregadas:', integrations);
      setIntegrations(integrations || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (companyId: string) => {
    try {
      console.log('Carregando membros para empresa:', companyId);
      
      const { data: members, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', companyId)
        .eq('role', 'member');

      if (error) {
        console.error('Erro ao carregar membros:', error);
        throw error;
      }
      
      console.log('Membros carregados:', members);
      setMembers(members || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      alert('Erro ao carregar membros.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.segment || !formData.adminName || !formData.adminEmail) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      console.log('Iniciando criação de empresa...');
      console.log('Dados do formulário:', formData);

      // Verificar se email já existe
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.adminEmail)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar email:', checkError);
        throw checkError;
      }

      if (existingUser) {
        alert('Email já está em uso');
        return;
      }

      console.log('Email disponível, criando empresa...');

      // Criar empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          name: formData.companyName, 
          segment: formData.segment || null
        }])
        .select()
        .single();

      if (companyError) {
        console.error('Erro ao criar empresa:', companyError);
        throw companyError;
      }

      console.log('Empresa criada com sucesso:', company);

      // Criar usuário admin
      const adminNames = formData.adminName.split(' ');
      const firstName = adminNames[0];
      const lastName = adminNames.slice(1).join(' ') || '';

      const { data: admin, error: adminError } = await supabase
        .from('users')
        .insert([{
          email: formData.adminEmail,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          tenant_id: company.id,
          is_active: true
        }])
        .select()
        .single();

      if (adminError) {
        console.error('Erro ao criar admin:', adminError);
        
        // Rollback: remover empresa criada
        await supabase.from('companies').delete().eq('id', company.id);
        throw adminError;
      }

      console.log('Admin criado com sucesso:', admin);

      // Criar registro de integração vazio
      try {
        const { error: integrationError } = await supabase
          .from('integrations')
          .insert([{
            company_id: company.id
          }]);

        if (integrationError) {
          console.warn('Erro ao criar integração (não crítico):', integrationError);
        } else {
          console.log('Integração criada com sucesso');
        }
      } catch (integrationErr) {
        console.warn('Erro ao criar integração:', integrationErr);
      }

      // Reset do formulário
      setShowForm(false);
      setFormData({
        companyName: '',
        segment: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
      });

      // Recarregar dados
      await loadData();
      
      alert('Empresa e gestor criados com sucesso!');
      
    } catch (error) {
      console.error('Erro completo ao criar empresa:', error);
      alert(`Erro ao criar empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean | null) => {
    try {
      console.log('Alterando status do admin:', { adminId, currentStatus });
      
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', adminId);

      if (error) {
        console.error('Erro ao alterar status:', error);
        throw error;
      }

      console.log('Status alterado com sucesso');
      await loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do usuário.');
    }
  };

  const getAdminForCompany = (companyId: string) => {
    return admins.find(admin => admin.tenant_id === companyId);
  };

  const getIntegrationForCompany = (companyId: string) => {
    return integrations.find(integration => integration.company_id === companyId);
  };

  if (loading) {
    return <div className="loading-container">Carregando...</div>;
  }

  return (
    <div className="clientes-module">
      <div className="module-header">
        <h3>🏢 Gestão de Clientes</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="add-button"
        >
          {showForm ? 'Cancelar' : '+ Nova Empresa'}
        </button>
      </div>

      {showForm && (
        <div className="company-form">
          <h4>Cadastrar Nova Empresa + Gestor</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nome da Empresa *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Segmento</label>
                <input
                  type="text"
                  value={formData.segment}
                  onChange={(e) => setFormData({...formData, segment: e.target.value})}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Gestor Comercial *</label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email do Gestor *</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Senha do Gestor</label>
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                placeholder="Opcional - senha será gerada automaticamente se não fornecida"
              />
            </div>
            <button type="submit" className="submit-button">
              Criar Empresa + Gestor
            </button>
          </form>
        </div>
      )}

      <div className="companies-list">
        <h4>Empresas Cadastradas ({companies.length})</h4>
        {companies.length === 0 ? (
          <p>Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="companies-table">
            {companies.map((company) => {
              const admin = getAdminForCompany(company.id);
              const integration = getIntegrationForCompany(company.id);
              
              return (
                <div key={company.id} className="company-card">
                  <div className="company-header">
                    <div className="company-info">
                      <h5>{company.name}</h5>
                      <span className="segment">{company.segment || 'Sem segmento'}</span>
                    </div>
                    <div className="company-actions">
                      <button 
                        onClick={() => {
                          if (showMembers === company.id) {
                            setShowMembers(null);
                          } else {
                            setShowMembers(company.id);
                            loadMembers(company.id);
                          }
                        }}
                        className="view-members-button"
                      >
                        {showMembers === company.id ? 'Ocultar' : 'Ver Vendedores'}
                      </button>
                      <button 
                        onClick={() => setSelectedCompany(selectedCompany === company.id ? null : company.id)}
                        className="integrations-button"
                      >
                        Integrações
                      </button>
                    </div>
                  </div>

                  {admin && (
                    <div className="admin-info">
                      <div className="admin-details">
                        <span><strong>Gestor:</strong> {admin.first_name} {admin.last_name}</span>
                        <span><strong>Email:</strong> {admin.email}</span>
                        <span className={`status ${admin.is_active ? 'active' : 'inactive'}`}>
                          {admin.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                        className={`toggle-status ${admin.is_active ? 'deactivate' : 'activate'}`}
                      >
                        {admin.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  )}

                  {!admin && (
                    <div className="admin-info">
                      <div className="admin-details">
                        <span><strong>Gestor:</strong> Não encontrado</span>
                      </div>
                    </div>
                  )}

                  {showMembers === company.id && (
                    <div className="members-section">
                      <h6>Vendedores da Empresa</h6>
                      {members.length === 0 ? (
                        <p>Nenhum vendedor cadastrado ainda.</p>
                      ) : (
                        <div className="members-list">
                          {members.map((member) => (
                            <div key={member.id} className="member-item">
                              <span>{member.first_name} {member.last_name}</span>
                              <span>{member.email}</span>
                              <span className={`status ${member.is_active ? 'active' : 'inactive'}`}>
                                {member.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedCompany === company.id && (
                    <div className="integrations-section">
                      <h6>Integrações de Anúncios</h6>
                      <div className="integrations-grid">
                        <div className="integration-item">
                          <span>Google Ads:</span>
                          <span className={integration?.google_ads_token ? 'connected' : 'not-connected'}>
                            {integration?.google_ads_token ? 'Conectado' : 'Não conectado'}
                          </span>
                        </div>
                        <div className="integration-item">
                          <span>Meta Ads:</span>
                          <span className={integration?.meta_ads_token ? 'connected' : 'not-connected'}>
                            {integration?.meta_ads_token ? 'Conectado' : 'Não conectado'}
                          </span>
                        </div>
                        <div className="integration-item">
                          <span>LinkedIn Ads:</span>
                          <span className={integration?.linkedin_ads_token ? 'connected' : 'not-connected'}>
                            {integration?.linkedin_ads_token ? 'Conectado' : 'Não conectado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientesModule;
