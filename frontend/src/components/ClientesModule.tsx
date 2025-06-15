
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
      console.log('🔄 Carregando dados...');

      // Carregar empresas
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error('❌ Erro ao buscar empresas:', companiesError);
        throw companiesError;
      }
      
      console.log('✅ Empresas carregadas:', companies?.length || 0);
      setCompanies(companies || []);

      // Carregar admins (filtrar apenas role admin)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('❌ Erro ao buscar usuários:', usersError);
        throw usersError;
      }
      
      console.log('✅ Admins carregados:', users?.length || 0);
      setAdmins(users || []);

      // Carregar integrações
      const { data: integrations, error: integrationsError } = await supabase
        .from('integrations')
        .select('*');

      if (integrationsError) {
        console.error('❌ Erro ao buscar integrações:', integrationsError);
        // Não falhar por causa das integrações
        console.warn('⚠️ Tabela integrations pode não existir ainda');
        setIntegrations([]);
      } else {
        console.log('✅ Integrações carregadas:', integrations?.length || 0);
        setIntegrations(integrations || []);
      }

    } catch (error) {
      console.error('💥 Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (companyId: string) => {
    try {
      console.log('🔄 Carregando membros para empresa:', companyId);
      
      const { data: members, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', companyId)
        .eq('role', 'member');

      if (error) {
        console.error('❌ Erro ao carregar membros:', error);
        throw error;
      }
      
      console.log('✅ Membros carregados:', members?.length || 0);
      setMembers(members || []);
    } catch (error) {
      console.error('💥 Erro ao carregar membros:', error);
      alert('Erro ao carregar membros.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.adminName || !formData.adminEmail) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      alert('Por favor, insira um email válido.');
      return;
    }

    try {
      console.log('🚀 Iniciando criação de empresa...');
      console.log('📋 Dados do formulário:', {
        companyName: formData.companyName,
        segment: formData.segment || 'Não informado',
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        hasPassword: !!formData.adminPassword
      });

      // Verificar se email já existe
      console.log('🔍 Verificando se email já existe...');
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', formData.adminEmail)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Erro ao verificar email:', checkError);
        throw checkError;
      }

      if (existingUser) {
        alert(`Email já está em uso: ${formData.adminEmail}`);
        return;
      }

      console.log('✅ Email disponível, prosseguindo...');

      // Gerar senha se não fornecida
      const adminPassword = formData.adminPassword || `Admin${Math.floor(Math.random() * 10000)}!`;
      console.log('🔑 Senha gerada/fornecida para admin');

      // 1. CRIAR EMPRESA PRIMEIRO
      console.log('🏢 Criando empresa...');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          name: formData.companyName, 
          segment: formData.segment || null
        }])
        .select()
        .single();

      if (companyError) {
        console.error('❌ Erro ao criar empresa:', companyError);
        throw companyError;
      }

      console.log('✅ Empresa criada com sucesso:', company);

      // 2. CRIAR USUÁRIO NO SUPABASE AUTH
      console.log('👤 Criando usuário no Supabase Auth...');
      
      const adminNames = formData.adminName.trim().split(' ');
      const firstName = adminNames[0];
      const lastName = adminNames.slice(1).join(' ') || '';

      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: adminPassword,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin',
            tenant_id: company.id
          }
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário no Supabase Auth:', authError);
        // Rollback: remover empresa criada
        await supabase.from('companies').delete().eq('id', company.id);
        throw authError;
      }

      console.log('✅ Usuário criado no Supabase Auth:', authUser.user?.id);

      // 3. CRIAR USUÁRIO NA TABELA USERS
      console.log('📝 Criando usuário na tabela users...');
      const { data: admin, error: adminError } = await supabase
        .from('users')
        .insert([{
          id: authUser.user?.id, // Usar o mesmo ID do auth
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
        console.error('❌ Erro ao criar admin na tabela users:', adminError);
        
        // Rollback completo
        console.log('🔄 Fazendo rollback...');
        await supabase.from('companies').delete().eq('id', company.id);
        // Nota: não conseguimos deletar do auth via client, mas não é crítico
        throw adminError;
      }

      console.log('✅ Admin criado na tabela users:', admin);

      // 4. CRIAR REGISTRO DE INTEGRAÇÃO (OPCIONAL)
      try {
        console.log('🔗 Criando registro de integração...');
        const { error: integrationError } = await supabase
          .from('integrations')
          .insert([{
            company_id: company.id
          }]);

        if (integrationError) {
          console.warn('⚠️ Erro ao criar integração (não crítico):', integrationError.message);
        } else {
          console.log('✅ Integração criada com sucesso');
        }
      } catch (integrationErr) {
        console.warn('⚠️ Erro ao criar integração (tabela pode não existir):', integrationErr);
      }

      // 5. RESET E SUCESSO
      console.log('🎉 Processo concluído com sucesso!');
      
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
      
      alert(`✅ Empresa e gestor criados com sucesso!

📋 Detalhes:
• Empresa: ${formData.companyName}
• Admin: ${formData.adminName}

🔑 Credenciais de acesso:
• Email: ${formData.adminEmail}
• Senha: ${adminPassword}

✨ O admin já pode fazer login agora!`);
      
    } catch (error) {
      console.error('💥 Erro completo ao criar empresa:', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`❌ Erro ao criar empresa: ${errorMessage}\n\nVerifique o console para mais detalhes.`);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean | null) => {
    try {
      console.log('🔄 Alterando status do admin:', { adminId, currentStatus });
      
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', adminId);

      if (error) {
        console.error('❌ Erro ao alterar status:', error);
        throw error;
      }

      console.log('✅ Status alterado com sucesso');
      await loadData();
    } catch (error) {
      console.error('💥 Erro ao alterar status:', error);
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
    return (
      <div className="loading-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        fontSize: '16px'
      }}>
        🔄 Carregando...
      </div>
    );
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
          <h4>📝 Cadastrar Nova Empresa + Gestor</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nome da Empresa *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  required
                  placeholder="Digite o nome da empresa"
                />
              </div>
              <div className="form-group">
                <label>Segmento</label>
                <input
                  type="text"
                  value={formData.segment}
                  onChange={(e) => setFormData({...formData, segment: e.target.value})}
                  placeholder="Ex: Tecnologia, Saúde, Educação..."
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
                  placeholder="Nome completo do gestor"
                />
              </div>
              <div className="form-group">
                <label>Email do Gestor *</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                  required
                  placeholder="email@empresa.com"
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
              <small>💡 Se não informar uma senha, será gerada automaticamente</small>
            </div>
            <button type="submit" className="submit-button">
              🚀 Criar Empresa + Gestor
            </button>
          </form>
        </div>
      )}

      <div className="companies-list">
        <h4>🏢 Empresas Cadastradas ({companies.length})</h4>
        {companies.length === 0 ? (
          <p>📋 Nenhuma empresa cadastrada ainda.</p>
        ) : (
          <div className="companies-table">
            {companies.map((company) => {
              const admin = getAdminForCompany(company.id);
              const integration = getIntegrationForCompany(company.id);
              
              return (
                <div key={company.id} className="company-card">
                  <div className="company-header">
                    <div className="company-info">
                      <h5>🏢 {company.name}</h5>
                      <span className="segment">📊 {company.segment || 'Sem segmento'}</span>
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
                        {showMembers === company.id ? 'Ocultar' : '👥 Ver Vendedores'}
                      </button>
                      <button 
                        onClick={() => setSelectedCompany(selectedCompany === company.id ? null : company.id)}
                        className="integrations-button"
                      >
                        🔗 Integrações
                      </button>
                    </div>
                  </div>

                  {admin ? (
                    <div className="admin-info">
                      <div className="admin-details">
                        <span><strong>👤 Gestor:</strong> {admin.first_name} {admin.last_name}</span>
                        <span><strong>✉️ Email:</strong> {admin.email}</span>
                        <span className={`status ${admin.is_active ? 'active' : 'inactive'}`}>
                          {admin.is_active ? '✅ Ativo' : '❌ Inativo'}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                        className={`toggle-status ${admin.is_active ? 'deactivate' : 'activate'}`}
                      >
                        {admin.is_active ? '❌ Desativar' : '✅ Ativar'}
                      </button>
                    </div>
                  ) : (
                    <div className="admin-info">
                      <div className="admin-details">
                        <span><strong>👤 Gestor:</strong> ⚠️ Não encontrado</span>
                      </div>
                    </div>
                  )}

                  {showMembers === company.id && (
                    <div className="members-section">
                      <h6>👥 Vendedores da Empresa</h6>
                      {members.length === 0 ? (
                        <p>📋 Nenhum vendedor cadastrado ainda.</p>
                      ) : (
                        <div className="members-list">
                          {members.map((member) => (
                            <div key={member.id} className="member-item">
                              <span>👤 {member.first_name} {member.last_name}</span>
                              <span>✉️ {member.email}</span>
                              <span className={`status ${member.is_active ? 'active' : 'inactive'}`}>
                                {member.is_active ? '✅ Ativo' : '❌ Inativo'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedCompany === company.id && (
                    <div className="integrations-section">
                      <h6>🔗 Integrações de Anúncios</h6>
                      <div className="integrations-grid">
                        <div className="integration-item">
                          <span>🎯 Google Ads:</span>
                          <span className={integration?.google_ads_token ? 'connected' : 'not-connected'}>
                            {integration?.google_ads_token ? '✅ Conectado' : '❌ Não conectado'}
                          </span>
                        </div>
                        <div className="integration-item">
                          <span>📘 Meta Ads:</span>
                          <span className={integration?.meta_ads_token ? 'connected' : 'not-connected'}>
                            {integration?.meta_ads_token ? '✅ Conectado' : '❌ Não conectado'}
                          </span>
                        </div>
                        <div className="integration-item">
                          <span>💼 LinkedIn Ads:</span>
                          <span className={integration?.linkedin_ads_token ? 'connected' : 'not-connected'}>
                            {integration?.linkedin_ads_token ? '✅ Conectado' : '❌ Não conectado'}
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
