
import React, { useState, useEffect } from 'react';

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
      // Carregar empresas
      const companiesResponse = await fetch('http://localhost:5001/api/companies');
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData.companies || []);
      }

      // Carregar admins
      const usersResponse = await fetch('http://localhost:5001/api/users?role=admin');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setAdmins(usersData.users || []);
      }

      // Carregar integrações
      const integrationsResponse = await fetch('http://localhost:5001/api/integrations');
      if (integrationsResponse.ok) {
        const integrationsData = await integrationsResponse.json();
        setIntegrations(integrationsData.integrations || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (companyId: string) => {
    try {
      const membersResponse = await fetch(`http://localhost:5001/api/users?tenant_id=${companyId}&role=member`);
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          segment: formData.segment,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword
        }),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({
          companyName: '',
          segment: '',
          adminName: '',
          adminEmail: '',
          adminPassword: ''
        });
        loadData(); // Recarregar dados
      } else {
        console.error('Erro ao criar empresa');
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:5001/api/users/${adminId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        loadData();
      }
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
