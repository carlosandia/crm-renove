import React, { useState } from 'react';
import { Edit, Trash2, Save, X, Mail, User, CheckCircle, Clock, AlertTriangle, XCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { CompanyAdmin, AdminFormData } from '../../types/Company';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ConfirmationDialog } from '../ui/confirmation-dialog';

interface AdminListItemProps {
  admin: CompanyAdmin;
  isEditing: boolean;
  canRemove: boolean; // Não permitir remoção se é o único admin
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (adminData: AdminFormData) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
  isLoading?: boolean;
}

const AdminListItem: React.FC<AdminListItemProps> = ({
  admin,
  isEditing,
  canRemove,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<AdminFormData>({
    name: admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
    email: admin.email,
    first_name: admin.first_name,
    last_name: admin.last_name,
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRemoving, setIsRemoving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // AIDEV-NOTE: Renderizar badge de status de ativação
  const renderActivationStatus = () => {
    if (!admin.activation_status || admin.activation_status === 'activated') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    }

    const statusConfig = {
      pending: { 
        icon: Clock, 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        text: 'Pendente' 
      },
      sent: { 
        icon: Mail, 
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        text: 'Email Enviado' 
      },
      inactive: { 
        icon: XCircle, 
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
        text: 'Inativo' 
      },
      expired: { 
        icon: AlertTriangle, 
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
        text: 'Expirado' 
      }
    };

    const config = statusConfig[admin.activation_status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant="secondary" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  // Validação de formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    // Validar senhas apenas se estiver alterando senha
    if (isChangingPassword) {
      if (!formData.password?.trim()) {
        newErrors.password = 'Nova senha é obrigatória';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
      } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Senha deve conter pelo menos 1 letra e 1 número';
      }

      if (!formData.confirmPassword?.trim()) {
        newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não conferem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para submissão da edição
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const success = await onSave(formData);
      if (success) {
        setErrors({});
      }
    } catch (error) {
      console.error('❌ [AdminListItem] Erro ao salvar:', error);
    }
  };

  // Handler para remoção - abrir dialog de confirmação
  const handleRemove = () => {
    if (!canRemove) {
      return;
    }
    setShowConfirmDialog(true);
  };

  // Handler para confirmar remoção via dialog
  const handleConfirmRemove = async () => {
    setIsRemoving(true);
    
    try {
      await onRemove();
    } catch (error) {
      console.error('❌ [AdminListItem] Erro ao remover:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  // Handler para mudança nos campos
  const handleInputChange = (field: keyof AdminFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-slate-700 flex items-center">
            <Edit className="w-4 h-4 mr-2 text-blue-600" />
            Editando Administrador
          </h5>
          {renderActivationStatus()}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Campo Nome */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Campo Email */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Seção de Alteração de Senha */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-slate-600 flex items-center">
                <Lock className="w-3 h-3 mr-1" />
                Alterar Senha
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(!isChangingPassword);
                  if (isChangingPassword) {
                    // Limpar campos de senha ao desabilitar
                    setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.password;
                      delete newErrors.confirmPassword;
                      return newErrors;
                    });
                  }
                }}
                disabled={isLoading}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  isChangingPassword 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isChangingPassword ? 'Cancelar' : 'Alterar'}
              </button>
            </div>

            {isChangingPassword && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nova Senha */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={isLoading}
                      placeholder="••••••••"
                      className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword || ''}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={isLoading}
                      placeholder="••••••••"
                      className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
                  )}
                  {/* Indicador de senhas conferem */}
                  {formData.password && formData.confirmPassword && (
                    <div className="mt-1 flex items-center space-x-1">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600">Senhas conferem</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-600">Senhas não conferem</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={isLoading || !formData.name.trim() || !formData.email.trim() || (isChangingPassword && (!formData.password?.trim() || !formData.confirmPassword?.trim() || formData.password !== formData.confirmPassword))}
            size="sm"
            className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save className="w-3 h-3" />
            Salvar
          </Button>
          
          <Button
            onClick={onCancelEdit}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        {/* Informações do admin */}
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-slate-900 truncate">
                {admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Nome não definido'}
              </h4>
              {renderActivationStatus()}
            </div>
            <p className="text-xs text-slate-600 flex items-center truncate">
              <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
              {admin.email}
            </p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-1 ml-4">
          <Button
            onClick={onEdit}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Editar informações"
          >
            <Edit className="w-4 h-4" />
          </Button>
          
          {canRemove && (
            <Button
              onClick={handleRemove}
              disabled={isLoading || isRemoving}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Remover administrador"
            >
              {isRemoving ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Dialog de Confirmação para Remoção */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRemove}
        title="Remover Administrador"
        description={`Tem certeza que deseja remover o administrador "${admin.name || admin.email}"?\n\nEsta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isRemoving}
      />
    </div>
  );
};

export default AdminListItem;