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
        </div>
      </div>
    </header>
  );
};

export default CRMHeader;
