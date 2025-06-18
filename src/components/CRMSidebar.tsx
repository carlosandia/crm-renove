// Sidebar do CRM com navegação principal
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  Building2, 
  PanelLeft, 
  Workflow, 
  FileSpreadsheet, 
  MessageSquare, 
  Settings, 
  LogOut, 
  BarChart,
  TrendingUp,
  Zap,
  FormInput,
  MessagesSquare
} from 'lucide-react';

interface CRMSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeModule: string;
  onNavigate: (module: string) => void;
}

const CRMSidebar: React.FC<CRMSidebarProps> = ({ 
  isCollapsed, 
  onToggle, 
  activeModule, 
  onNavigate 
}) => {
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { 
      id: 'Relatório', 
      label: 'Relatório', 
      icon: BarChart, 
      color: '#10B981',
      roles: ['super_admin', 'admin', 'member']
    },
    { 
      id: 'Relatórios', 
      label: 'Relatórios', 
      icon: TrendingUp, 
      color: '#8B5CF6',
      roles: ['super_admin']
    },
    { 
      id: 'Pipeline', 
      label: 'Pipeline', 
      icon: Workflow, 
      color: '#3B82F6',
      roles: ['super_admin', 'admin', 'member']
    },
    { 
      id: 'Criador de pipeline', 
      label: 'Criador de Pipeline', 
      icon: PanelLeft, 
      color: '#F59E0B',
      roles: ['super_admin', 'admin']
    },
    { 
      id: 'Leads', 
      label: 'Leads', 
      icon: FileSpreadsheet, 
      color: '#EC4899',
      roles: ['super_admin', 'admin', 'member']
    },
    { 
      id: 'Vendedores', 
      label: 'Vendedores', 
      icon: Users, 
      color: '#6366F1',
      roles: ['super_admin', 'admin']
    },
    { 
      id: 'Clientes', 
      label: 'Clientes', 
      icon: Building2, 
      color: '#14B8A6',
      roles: ['super_admin']
    },
    { 
      id: 'Criador de formulários', 
      label: 'Criador de Formulários', 
      icon: FormInput, 
      color: '#8B5CF6',
      roles: ['super_admin', 'admin']
    },
    { 
      id: 'Cadências', 
      label: 'Cadências', 
      icon: Zap, 
      color: '#F97316',
      roles: ['super_admin', 'admin']
    },
    { 
      id: 'Feedback', 
      label: 'Feedback', 
      icon: MessagesSquare, 
      color: '#06B6D4',
      roles: ['super_admin', 'admin', 'member']
    },
    { 
      id: 'Integrações', 
      label: 'Integrações', 
      icon: Settings, 
      color: '#6B7280',
      roles: ['super_admin', 'admin']
    }
  ];

  // Filtrar itens do menu com base na role do usuário
  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  if (isMobile && isCollapsed) {
    return null;
  }

  return (
    <div 
      className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${
        isCollapsed ? 'w-[70px]' : 'w-[250px]'
      }`}
    >
      {/* Logo e Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center">
            <span className="font-bold text-lg text-gray-800">CRM</span>
            <span className="text-blue-600 ml-1 font-bold">Marketing</span>
          </div>
        )}
        <button 
          onClick={onToggle}
          className={`p-1 rounded-md hover:bg-gray-100 ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center w-full px-3 py-2 rounded-md transition-colors ${
                activeModule === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div 
                className="p-1 rounded-md" 
                style={{ color: item.color }}
              >
                <item.icon size={20} />
              </div>
              {!isCollapsed && (
                <span className="ml-3 text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className={`flex ${isCollapsed ? 'justify-center' : 'items-center'}`}>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === 'super_admin' ? 'Super Admin' : 
                 user?.role === 'admin' ? 'Administrador' : 'Membro'}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRMSidebar;
