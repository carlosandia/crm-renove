
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
  LogOut
} from 'lucide-react';

interface CRMSidebarProps {
  activeModule: string;
  onNavigate: (module: string) => void;
}

const CRMSidebar: React.FC<CRMSidebarProps> = ({ activeModule, onNavigate }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

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

  return (
    <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CRM</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">CRM Pro</h1>
              <p className="text-xs text-gray-500">{getRoleDisplayName(user?.role)}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.email}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeModule === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  collapsed ? 'justify-center' : 'space-x-3'
                } ${
                  isActive
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={collapsed ? item.label : ''}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-green-700' : 'text-gray-500'
                }`} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer com Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50 ${
            collapsed ? 'justify-center' : 'space-x-3'
          }`}
          title={collapsed ? 'Sair' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default CRMSidebar;
