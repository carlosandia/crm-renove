import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  segment: string;
  created_at: string;
  updated_at: string;
}

interface Admin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
}

interface Integration {
  id: string;
  company_id: string;
  google_ads_token?: string;
  meta_ads_token?: string;
  linkedin_ads_token?: string;
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
      // Carregar empresas usando Supabase
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error('Erro ao buscar empresas:', companiesError);
      } else {
        setCompanies(companies || []);
      }

      // Carregar admins usando Supabase
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
      } else {
        setAdmins(users || []);
      }

      // Carregar integrações usando Supabase
      const { data: integrations, error: integrationsError } = await supabase
        .from('integrations')
        .select('*');

      if (integrationsError) {
        console.error('Erro ao buscar integrações:', integrationsError);
      } else {
        setIntegrations(integrations || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (companyId: string) => {
    try {
      const { data: members, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', companyId)
        .eq('role', 'member');

      if (error) {
        console.error('Erro ao carregar membros:', error);
      } else {
        setMembers(members || []);
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Verificar se email já existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.adminEmail)
        .single();

      if (existingUser) {
        alert('Email já está em uso');
        return;
      }

      // Criar empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          name: formData.companyName, 
          segment: formData.segment 
        }])
        .select()
        .single();

      if (companyError) {
        console.error('Erro ao criar empresa:', companyError);
        throw companyError;
      }

      // Criar usuário admin
      const { data: admin, error: adminError } = await supabase
        .from('users')
        .insert([{
          email: formData.adminEmail,
          first_name: formData.adminName.split(' ')[0],
          last_name: formData.adminName.split(' ').slice(1).join(' ') || '',
          role: 'admin',
          tenant_id: company.id,
          is_active: true
        }])
        .select()
        .single();

      if (adminError) {
        console.error('Erro ao criar admin:', adminError);
        // Remover empresa se erro ao criar admin
        await supabase.from('companies').delete().eq('id', company.id);
        throw adminError;
      }

      // Criar registro de integração vazio
      try {
        await supabase
          .from('integrations')
          .insert([{
            company_id: company.id
          }]);
      } catch (integrationErr) {
        console.warn('Erro ao criar integração:', integrationErr);
      }

      setShowForm(false);
      setFormData({
        companyName: '',
        segment: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
      });
      loadData(); // Recarregar dados
      alert('Empresa e gestor criados com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      alert('Erro ao criar empresa. Verifique os dados e tente novamente.');
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', adminId);

      if (error) {
        console.error('Erro ao alterar status:', error);
        throw error;
      }

      loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
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
                <label>Nome da Empresa</label>
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
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Gestor Comercial</label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email do Gestor</label>
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
                required
              />
            </div>
            <button type="submit" className="submit-button">
              Criar Empresa + Gestor
            </button>
          </form>
        </div>
      )}

      <div className="companies-list">
        <h4>Empresas Cadastradas</h4>
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
                      <span className="segment">{company.segment}</span>
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
