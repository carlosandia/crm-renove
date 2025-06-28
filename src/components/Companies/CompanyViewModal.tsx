import React, { useState } from 'react';
import { Company } from '../../types/Company';
import { 
  X, Building, User, Mail, Phone, Globe, MapPin, Calendar, 
  Edit, Save, Eye, EyeOff, Users, Target, TrendingUp, CheckCircle, XCircle, Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePasswordManager } from '../../hooks/usePasswordManager';

interface CompanyViewModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  onRefetch: () => void;
}

const CompanyViewModal: React.FC<CompanyViewModalProps> = ({
  company,
  isOpen,
  onClose,
  onRefetch
}) => {
  const { authenticatedFetch } = useAuth();
  
  // 🚀 REFACTOR: Usar hook especializado para gerenciamento de senhas
  const passwordManager = usePasswordManager();
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingExpectations, setIsEditingExpectations] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  
  // Estados para edição da empresa
  const [companyData, setCompanyData] = useState({
    name: company.name || '',
    industry: company.industry || '',
    city: company.city || '',
    state: company.state || '',
    website: company.website || '',
    email: company.email || '',
    phone: company.phone || '',
    address: company.address || ''
  });
  
  // Estados para edição do admin
  const [adminData, setAdminData] = useState({
    name: company.admin?.name || '',
    email: company.admin?.email || ''
  });
  
  const [expectations, setExpectations] = useState({
    expected_leads_monthly: company.expected_leads_monthly || 0,
    expected_sales_monthly: company.expected_sales_monthly || 0,
    expected_followers_monthly: company.expected_followers_monthly || 0
  });

  // 🚀 REFACTOR: Handler simplificado usando o hook especializado
  const handlePasswordUpdate = async () => {
    try {
      const result = await passwordManager.updateAdminPassword(company.id);
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        setIsEditingPassword(false);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado:', error);
      alert(`❌ Erro inesperado: ${error.message}`);
    }
  };

  // Handler para cancelar edição de senha
  const handleCancelPasswordEdit = () => {
    passwordManager.resetForm();
    setIsEditingPassword(false);
  };

  const handleExpectationsUpdate = async () => {
    try {
      console.log('🔧 [COMPANY-VIEW] Enviando requisição para alterar expectativas...');
      console.log('🔧 [COMPANY-VIEW] Company ID:', company.id);

      // 🔧 CORREÇÃO: Usar authenticatedFetch em vez de fetch direto
      const response = await authenticatedFetch('/companies/update-expectations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: company.id,
          expectations: expectations
        })
      });

      console.log('🔧 [COMPANY-VIEW] Status da resposta:', response.status);

      if (response.ok) {
        const result = await response.json();
        alert('Expectativas atualizadas com sucesso!');
        setIsEditingExpectations(false);
        onRefetch();
      } else {
        const errorData = await response.json();
        alert(`Erro ao atualizar expectativas: ${errorData.message || errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar expectativas:', error);
      alert(`Erro ao atualizar expectativas: ${error.message || 'Network Error'}`);
    }
  };

  // Handler para atualizar informações da empresa
  const handleCompanyUpdate = async () => {
    try {
      console.log('🔧 [COMPANY-VIEW] Enviando requisição para alterar empresa...');
      console.log('🔧 [COMPANY-VIEW] Company ID:', company.id);

      const response = await authenticatedFetch('/companies/update-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: company.id,
          companyData: companyData
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('Informações da empresa atualizadas com sucesso!');
        setIsEditingCompany(false);
        onRefetch();
      } else {
        const errorData = await response.json();
        alert(`Erro ao atualizar empresa: ${errorData.message || errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar empresa:', error);
      alert(`Erro ao atualizar empresa: ${error.message || 'Network Error'}`);
    }
  };

  // Handler para atualizar informações do admin
  const handleAdminUpdate = async () => {
    try {
      console.log('🔧 [COMPANY-VIEW] Enviando requisição para alterar admin...');
      console.log('🔧 [COMPANY-VIEW] Company ID:', company.id);

      const response = await authenticatedFetch('/companies/update-admin-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: company.id,
          adminData: adminData
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('Informações do administrador atualizadas com sucesso!');
        setIsEditingAdmin(false);
        onRefetch();
      } else {
        const errorData = await response.json();
        alert(`Erro ao atualizar admin: ${errorData.message || errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar admin:', error);
      alert(`Erro ao atualizar admin: ${error.message || 'Network Error'}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const passwordStrength = passwordManager.getPasswordStrength();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-semibold">
              {company.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{company.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                company.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {company.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Informações da Empresa */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Building className="w-5 h-5 mr-2 text-slate-600" />
                Informações da Empresa
              </h3>
              <button
                onClick={() => setIsEditingCompany(!isEditingCompany)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditingCompany ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {isEditingCompany ? (
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Nome *</label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Nicho de Atuação *</label>
                    <input
                      type="text"
                      value={companyData.industry}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Tecnologia, Marketing, Consultoria"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Cidade</label>
                    <input
                      type="text"
                      value={companyData.city}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Estado</label>
                    <input
                      type="text"
                      value={companyData.state}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Estado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Website</label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-2">Endereço</label>
                    <input
                      type="text"
                      value={companyData.address}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCompanyUpdate}
                    disabled={!companyData.name || !companyData.industry}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                      companyData.name && companyData.industry
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingCompany(false);
                      setCompanyData({
                        name: company.name || '',
                        industry: company.industry || '',
                        city: company.city || '',
                        state: company.state || '',
                        website: company.website || '',
                        email: company.email || '',
                        phone: company.phone || '',
                        address: company.address || ''
                      });
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-lg p-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Nome</label>
                  <p className="text-slate-900 font-medium">{company.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Nicho de Atuação</label>
                  <p className="text-slate-900">{company.industry}</p>
                </div>
                {company.city && company.state && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Localização</label>
                    <p className="text-slate-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                      {company.city}/{company.state}
                    </p>
                  </div>
                )}
                {company.website && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Website</label>
                    <p className="text-slate-900 flex items-center">
                      <Globe className="w-4 h-4 mr-1 text-slate-400" />
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    </p>
                  </div>
                )}
                {company.email && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <p className="text-slate-900 flex items-center">
                      <Mail className="w-4 h-4 mr-1 text-slate-400" />
                      {company.email}
                    </p>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Telefone</label>
                    <p className="text-slate-900 flex items-center">
                      <Phone className="w-4 h-4 mr-1 text-slate-400" />
                      {company.phone}
                    </p>
                  </div>
                )}
                {company.address && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-slate-600">Endereço</label>
                    <p className="text-slate-900">{company.address}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Informações do Administrador */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-600" />
                Administrador
              </h3>
              {company.admin && (
                <button
                  onClick={() => setIsEditingAdmin(!isEditingAdmin)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isEditingAdmin ? 'Cancelar' : 'Editar Info'}
                </button>
              )}
            </div>
            {company.admin ? (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                {isEditingAdmin ? (
                  <div className="space-y-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Nome *</label>
                        <input
                          type="text"
                          value={adminData.name}
                          onChange={(e) => setAdminData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nome do administrador"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Email *</label>
                        <input
                          type="email"
                          value={adminData.email}
                          onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="email@empresa.com"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAdminUpdate}
                        disabled={!adminData.name || !adminData.email}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                          adminData.name && adminData.email
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Salvar Alterações
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingAdmin(false);
                          setAdminData({
                            name: company.admin?.name || '',
                            email: company.admin?.email || ''
                          });
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Nome</label>
                      <p className="text-slate-900 font-medium">{company.admin.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Email</label>
                      <p className="text-slate-900 flex items-center">
                        <Mail className="w-4 h-4 mr-1 text-slate-400" />
                        {company.admin.email}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Edição de Senha Enterprise */}
                <div className="border-t border-blue-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-600">Senha de Acesso</label>
                    <button
                      onClick={() => {
                        if (isEditingPassword) {
                          handleCancelPasswordEdit();
                        } else {
                          setIsEditingPassword(true);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {isEditingPassword ? 'Cancelar' : 'Alterar Senha'}
                    </button>
                  </div>
                  
                  {isEditingPassword ? (
                    <div className="space-y-4 bg-white rounded-lg p-4 border border-blue-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="font-medium text-blue-900 text-sm mb-1">🔐 Alteração de Senha Enterprise</h5>
                        <p className="text-blue-700 text-xs">
                          Configure uma nova senha segura para o administrador da empresa.
                        </p>
                      </div>

                      {/* Nova Senha */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nova Senha *
                        </label>
                        <div className="relative">
                          <input
                            type={passwordManager.showPassword ? 'text' : 'password'}
                            value={passwordManager.newPassword}
                            onChange={(e) => passwordManager.setNewPassword(e.target.value)}
                            placeholder="Digite a nova senha"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => passwordManager.setShowPassword(!passwordManager.showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {passwordManager.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {/* Password Strength */}
                        {passwordManager.newPassword && (
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">Força da senha:</span>
                              <span className={`text-xs font-medium ${
                                passwordStrength.strength === 'Forte' ? 'text-green-600' :
                                passwordStrength.strength === 'Boa' ? 'text-yellow-600' :
                                passwordStrength.strength === 'Fraca' ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {passwordStrength.strength}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                style={{ width: passwordStrength.width }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirmar Senha */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirmar Senha *
                        </label>
                        <div className="relative">
                          <input
                            type={passwordManager.showConfirmPassword ? 'text' : 'password'}
                            value={passwordManager.confirmPassword}
                            onChange={(e) => passwordManager.setConfirmPassword(e.target.value)}
                            placeholder="Confirme a nova senha"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => passwordManager.setShowConfirmPassword(!passwordManager.showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {passwordManager.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        
                        {/* Password Match Indicator */}
                        {passwordManager.confirmPassword && (
                          <div className="mt-2 flex items-center space-x-2">
                            {passwordManager.newPassword === passwordManager.confirmPassword ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-600">Senhas conferem</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-red-600">Senhas não conferem</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Password Requirements */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Requisitos da senha:</h4>
                        <div className="space-y-2">
                          {[
                            { key: 'length', text: 'Pelo menos 8 caracteres' },
                            { key: 'hasLetter', text: 'Pelo menos 1 letra' },
                            { key: 'hasNumber', text: 'Pelo menos 1 número' },
                            { key: 'hasSpecialChar', text: 'Pelo menos 1 caractere especial (!@#$%^&*)' }
                          ].map(req => (
                            <div key={req.key} className="flex items-center space-x-2">
                              {passwordManager.passwordRequirements[req.key as keyof typeof passwordManager.passwordRequirements] ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-sm ${
                                passwordManager.passwordRequirements[req.key as keyof typeof passwordManager.passwordRequirements] 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                              }`}>
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handlePasswordUpdate}
                        disabled={!passwordManager.isPasswordValid() || passwordManager.isChangingPassword}
                        className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                          passwordManager.isPasswordValid() && !passwordManager.isChangingPassword
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {passwordManager.isChangingPassword ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Alterando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Salvar Nova Senha</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-slate-500 text-sm">••••••••</p>
                      <span className="text-xs text-slate-400">Senha protegida</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 text-sm font-medium">Nenhum administrador cadastrado</p>
              </div>
            )}
          </div>

          {/* Expectativas Mensais */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-slate-600" />
                Expectativas Mensais
              </h3>
              <button
                onClick={() => setIsEditingExpectations(!isEditingExpectations)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditingExpectations ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {isEditingExpectations ? (
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Leads por mês
                    </label>
                    <input
                      type="number"
                      value={expectations.expected_leads_monthly}
                      onChange={(e) => setExpectations(prev => ({
                        ...prev,
                        expected_leads_monthly: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Vendas por mês
                    </label>
                    <input
                      type="number"
                      value={expectations.expected_sales_monthly}
                      onChange={(e) => setExpectations(prev => ({
                        ...prev,
                        expected_sales_monthly: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Seguidores por mês
                    </label>
                    <input
                      type="number"
                      value={expectations.expected_followers_monthly}
                      onChange={(e) => setExpectations(prev => ({
                        ...prev,
                        expected_followers_monthly: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={handleExpectationsUpdate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvar Expectativas
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-600">Leads</span>
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {expectations.expected_leads_monthly}
                  </div>
                  <div className="text-xs text-slate-500">por mês</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-slate-600">Vendas</span>
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {expectations.expected_sales_monthly}
                  </div>
                  <div className="text-xs text-slate-500">por mês</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-slate-600">Seguidores</span>
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {expectations.expected_followers_monthly}
                  </div>
                  <div className="text-xs text-slate-500">por mês</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyViewModal; 