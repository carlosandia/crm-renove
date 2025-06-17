
import React from 'react';
import { 
  Building2, 
  Users, 
  BarChart3, 
  Target, 
  UserPlus,
  Workflow,
  UserCheck
} from 'lucide-react';

interface RoleBasedMenuProps {
  userRole: string;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ 
  userRole, 
  activeModule, 
  onModuleChange 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'member'] },
    { id: 'pipelines', label: 'Pipelines', icon: Workflow, roles: ['admin', 'member'] },
    { id: 'leads', label: 'Leads', icon: UserCheck, roles: ['admin', 'member'] },
    { id: 'clientes', label: 'Clientes', icon: Building2, roles: ['admin', 'member'] },
    { id: 'vendedores', label: 'Vendedores', icon: UserPlus, roles: ['admin'] },
    { id: 'performance', label: 'Performance', icon: Target, roles: ['admin', 'member'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="space-y-1">
      {filteredMenuItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
              activeModule === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <IconComponent className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default RoleBasedMenu;
