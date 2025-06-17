
import React from 'react';
import { Bell, Search } from 'lucide-react';

interface CRMHeaderProps {
  user: any;
  onLogout?: () => void;
  showSearch?: boolean;
}

const CRMHeader: React.FC<CRMHeaderProps> = ({ user, showSearch = true }) => {
  return (
    <header className="header-modern px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Search bar moderna */}
        {showSearch && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar leads, pipelines, formulários..."
                className="input-modern pl-10 w-full"
              />
            </div>
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center space-x-4 ml-auto">
          {/* Notifications */}
          <div className="relative">
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all duration-200 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              </span>
            </button>
          </div>

          {/* User avatar */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.email}
              </div>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white font-medium shadow-md">
              {user?.first_name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CRMHeader;
