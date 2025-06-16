
import React from 'react';
import { Bell } from 'lucide-react';

interface CRMHeaderProps {
  user: any;
  onLogout?: () => void;
  showSearch?: boolean;
}

const CRMHeader: React.FC<CRMHeaderProps> = ({ user, showSearch = true }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-end">
        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
            
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.first_name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CRMHeader;
