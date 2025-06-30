import React, { useState, useEffect } from 'react';
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
  Plus,
  X,
  Edit,
  Bell,
  Cog
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Sistema de logs condicionais
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

interface CRMSidebarProps {
  activeModule: string;
  onNavigate: (module: string) => void;
  onToggle?: (collapsed: boolean) => void;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  created_by?: string;
  tenant_id?: string;
}

interface UserPipelineLink {
  id: string;
  user_id: string;
  pipeline_id: string;
  created_at: string;
}

const CRMSidebar: React.FC<CRMSidebarProps> = ({ activeModule, onNavigate, onToggle }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [availablePipelines, setAvailablePipelines] = useState<Pipeline[]>([]);
  const [userPipelines, setUserPipelines] = useState<Pipeline[]>([]);

  // Carregar pipelines com logs condicionais
  const loadPipelines = async () => {
    if (!user?.id) {
      if (isDebugMode) {
        console.log('🔧 SIDEBAR: Aguardando user.id para carregar pipelines');
      }
      return;
    }

    try {
      let query;
      
      if (user.role === 'super_admin') {
        query = supabase
          .from('pipelines')
          .select('id, name, description, is_active')
          .eq('tenant_id', user.tenant_id)
          .eq('is_active', true)
          .order('name');
      } else if (user.role === 'admin') {
        query = supabase
          .from('pipelines')
          .select('id, name, description, is_active')
          .eq('created_by', user.id)
          .eq('is_active', true)
          .order('name');
      } else {
        // Member - buscar pipelines vinculadas
        query = supabase
          .from('pipeline_members')
          .select(`
            pipelines!inner(
              id, name, description, is_active
            )
          `)
          .eq('member_id', user.id)
          .eq('pipelines.is_active', true);
      }

      const { data, error } = await query.limit(10);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation')) {
          // Tabela não existe - modo graceful
          if (isDebugMode) {
            console.log('🔧 SIDEBAR: Tabelas de pipeline não configuradas (modo demo)');
          }
          setAvailablePipelines([]);
          return;
        } else {
          console.warn('⚠️ SIDEBAR: Erro ao carregar pipelines:', error.message);
          setAvailablePipelines([]);
          return;
        }
      }

      // Processar dados baseado no role
      let processedPipelines: Pipeline[] = [];
      
      if (user.role === 'member' && data) {
        processedPipelines = data.map((item: any) => item.pipelines).filter(Boolean);
      } else {
        processedPipelines = (data || []) as Pipeline[];
      }

      setAvailablePipelines(processedPipelines);

      if (isDebugMode && processedPipelines.length > 0) {
        console.log(`🔧 SIDEBAR: ${processedPipelines.length} pipelines carregadas para ${user.role}`);
      }

    } catch (error: any) {
      if (isDebugMode) {
        console.log('🔧 SIDEBAR: Erro de conexão ao carregar pipelines:', error.message);
      }
      setAvailablePipelines([]);
    }
  };

  useEffect(() => {
    loadPipelines();
  }, [user?.id, user?.role]);

  if (!user) return null;

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  const getMenuItems = () => {
    if (user.role === 'super_admin') {
      return [
        { id: 'Dashboard Administrativo', label: 'Dashboard Admin', icon: BarChart3 },
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Feedback', label: 'Feedback', icon: MessageSquare },
        { id: 'Clientes', label: 'Clientes', icon: Users },
        { id: 'Configurações da Plataforma', label: 'Configurações da Plataforma', icon: Cog },
        { id: 'Notificações', label: 'Notificações', icon: Bell }
      ];
    }
    
    if (user.role === 'admin') {
      const baseItems = [
        { id: 'Dashboard Administrativo', label: 'Dashboard Admin', icon: BarChart3 },
        { id: 'Vendedores', label: 'Vendedores', icon: Users },
        { id: 'Gestão de pipeline', label: 'Gestão de pipeline', icon: GitBranch },
        { id: 'Gestão de formulários', label: 'Gestão de formulários', icon: FileText },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: Eye },
        { id: 'Leads', label: 'Leads', icon: Users },
        { id: 'Integrações', label: 'Integrações', icon: Settings }
      ];

      // REMOVIDO: "Gestão de Pipelines" e "Cadências" conforme solicitado
      // RENOMEADO: "Criador de pipeline" para "Gestão de pipeline"  
      // RENOMEADO: "Criador de formulários" para "Gestão de formulários"

      return baseItems;
    }
    
    if (user.role === 'member') {
      return [
        { id: 'Meu Dashboard', label: 'Meu Dashboard', icon: BarChart3 },
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Pipeline', label: 'Pipeline', icon: GitBranch },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: Eye },
        { id: 'Leads', label: 'Leads', icon: Users },
        { id: 'Calendário Público', label: 'Calendário Público', icon: Calendar },
        { id: 'Encurtador de URL', label: 'Encurtador de URL', icon: Link }
      ];
    }
    
    return [];
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

  // Funções de vinculação removidas - admin vê automaticamente suas pipelines criadas

  return (
    <>
      <div className={`sidebar-modern fixed h-full z-30 ${collapsed ? 'w-20' : 'w-64'}`}>
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

        {/* Seção de Pipelines Criadas para Admin */}
        {user.role === 'admin' && availablePipelines.length > 0 && !collapsed && (
          <div className="p-4 border-b border-border bg-blue-50/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-900">Minhas Pipelines</h3>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {availablePipelines.length}
              </span>
            </div>
            <div className="space-y-2">
              {availablePipelines.slice(0, 3).map((pipeline) => (
                <div key={pipeline.id} className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-blue-200">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-900 truncate flex-1">{pipeline.name}</span>
                </div>
              ))}
              {availablePipelines.length > 3 && (
                <div className="text-xs text-blue-600 text-center py-1">
                  +{availablePipelines.length - 3} mais
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mensagem para Admin sem pipelines */}
        {user.role === 'admin' && availablePipelines.length === 0 && !collapsed && (
          <div className="p-4 border-b border-border">
            <div className="text-center p-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600">
              <GitBranch className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma Pipeline</p>
              <p className="text-xs opacity-75">Crie sua primeira pipeline</p>
            </div>
          </div>
        )}

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
          <div className="flex items-center space-x-3 mb-4">
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
            {!collapsed && (
              <button
                onClick={() => {
                  alert('Funcionalidade de edição do usuário será implementada em breve');
                }}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                title="Editar perfil"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
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
    </>
  );
};

export default CRMSidebar;
