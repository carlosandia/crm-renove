
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart3, 
  Users, 
  Settings, 
  GitBranch,
  FileText,
  Target,
  Eye,
  Calendar,
  Link,
  User,
  MessageSquare,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Edit
} from 'lucide-react';

interface CRMSidebarProps {
  activeModule: string;
  onNavigate: (module: string) => void;
  onToggle?: (collapsed: boolean) => void;
}

const CRMSidebar: React.FC<CRMSidebarProps> = ({ activeModule, onNavigate, onToggle }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!user) return null;

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  const handleEditUser = () => {
    setShowEditModal(true);
  };

  const getMenuItems = () => {
    if (user.role === 'super_admin') {
      return [
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Meu Perfil', label: 'Meu Perfil', icon: User },
        { id: 'Comentários', label: 'Comentários', icon: MessageSquare },
        { id: 'Clientes', label: 'Clientes', icon: Users },
        { id: 'Integrações', label: 'Integrações', icon: Zap }
      ];
    }
    
    if (user.role === 'admin') {
      return [
        { id: 'Meta', label: 'Meta', icon: Target },
        { id: 'Vendedores', label: 'Vendedores', icon: Users },
        { id: 'Criador de pipeline', label: 'Criador de pipeline', icon: Settings },
        { id: 'Criador de formulários', label: 'Criador de formulários', icon: FileText },
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: Eye },
        { id: 'Leads', label: 'Leads', icon: Users },
        { id: 'Meu Perfil', label: 'Meu Perfil', icon: User }
      ];
    }
    
    if (user.role === 'member') {
      return [
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Pipeline', label: 'Pipeline', icon: GitBranch },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: Eye },
        { id: 'Leads', label: 'Leads', icon: Users },
        { id: 'Meu Perfil', label: 'Meu Perfil', icon: User },
        { id: 'Calendário Público', label: 'Calendário Público', icon: Calendar },
        { id: 'Encurtador de URL', label: 'Encurtador de URL', icon: Link }
      ];
    }
    
    return [{ id: 'Meu Perfil', label: 'Meu Perfil', icon: User }];
  };

  const menuItems = getMenuItems();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'member': return 'Vendedor';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'from-purple-500 to-purple-600';
      case 'admin': return 'from-blue-500 to-blue-600';
      case 'member': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <>
      <div className={`sidebar-modern ${collapsed ? 'w-20' : 'w-64'}`}>
        {/* Header com branding moderno */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${getRoleColor(user?.role)} rounded-xl flex items-center justify-center shadow-md`}>
                <span className="text-white font-bold text-sm">CRM</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">CRM Pro</h1>
                <p className="text-xs text-muted-foreground">{getRoleDisplayName(user?.role)}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleToggle}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Navigation moderna */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`nav-item-modern w-full ${
                    collapsed ? 'justify-center px-2' : 'justify-start'
                  } ${isActive ? 'nav-item-active' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  {!collapsed && (
                    <span className={`truncate ${
                      isActive ? 'text-primary font-medium' : 'text-foreground'
                    }`}>
                      {item.label}
                    </span>
                  )}
                  {isActive && !collapsed && (
                    <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User info moderno */}
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-border">
            <div className={`w-10 h-10 bg-gradient-to-br ${getRoleColor(user?.role)} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 shadow-md`}>
              {user?.first_name?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
              </div>
            )}
            {/* Ícone de lápis para edição */}
            <button
              onClick={handleEditUser}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              title={collapsed ? 'Editar usuário' : ''}
            >
              <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {/* Logout button moderno */}
          <button
            onClick={logout}
            className={`nav-item-modern w-full text-destructive hover:bg-destructive/10 hover:text-destructive ${
              collapsed ? 'justify-center px-2' : 'justify-start'
            }`}
            title={collapsed ? 'Sair' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </div>

      {/* Modal de edição do usuário */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Usuário</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  defaultValue={`${user?.first_name} ${user?.last_name}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={user?.email}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <input
                  type="text"
                  defaultValue={getRoleDisplayName(user?.role)}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Aqui implementaria a lógica de salvamento
                  setShowEditModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CRMSidebar;
