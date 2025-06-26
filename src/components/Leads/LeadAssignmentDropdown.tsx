import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface LeadAssignmentDropdownProps {
  currentAssignedTo?: string;
  onAssign: (memberId: string) => void;
  className?: string;
}

const LeadAssignmentDropdown: React.FC<LeadAssignmentDropdownProps> = ({
  currentAssignedTo,
  onAssign,
  className = ''
}) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar membros do tenant
  useEffect(() => {
    if (user?.tenant_id && user?.role === 'admin') {
      loadMembers();
    }
  }, [user?.tenant_id, user?.role]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', user?.tenant_id)
        .eq('role', 'member')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAssignedMember = () => {
    if (!currentAssignedTo) return null;
    return members.find(member => member.id === currentAssignedTo);
  };

  const handleAssign = (memberId: string) => {
    onAssign(memberId);
    setIsOpen(false);
  };

  // Só mostrar para admins
  if (user?.role !== 'admin') {
    return null;
  }

  const assignedMember = getCurrentAssignedMember();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
      >
        <User size={14} />
        <span className="text-xs">
          {assignedMember 
            ? `${assignedMember.first_name} ${assignedMember.last_name}`
            : 'Atribuir vendedor'
          }
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1 max-h-60 overflow-y-auto">
              {members.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {loading ? 'Carregando...' : 'Nenhum vendedor encontrado'}
                </div>
              ) : (
                <>
                  {/* Opção para remover atribuição */}
                  <button
                    onClick={() => handleAssign('')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span className="text-gray-500">Não atribuído</span>
                    {!currentAssignedTo && <Check size={14} className="text-blue-600" />}
                  </button>
                  
                  <div className="border-t border-gray-100" />
                  
                  {/* Lista de membros */}
                  {members.map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleAssign(member.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.email}
                        </div>
                      </div>
                      {currentAssignedTo === member.id && (
                        <Check size={14} className="text-blue-600" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadAssignmentDropdown; 