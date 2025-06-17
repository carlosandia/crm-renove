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
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CRMSidebarProps {
  activeModule: string;
  onNavigate: (module: string) => void;
  onToggle?: (collapsed: boolean) => void;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  tenant_id: string;
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
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [availablePipelines, setAvailablePipelines] = useState<Pipeline[]>([]);
  const [userPipelines, setUserPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadPipelines();
      loadUserPipelines();
    }
  }, [user]);

  const loadPipelines = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      
      // Buscar todas as pipelines do tenant
      const { data: pipelines, error } = await supabase
        .from('pipelines')
        .select('id, name, description, created_at, created_by, tenant_id')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pipelines:', error);
        setAvailablePipelines([]);
        return;
      }

      setAvailablePipelines(pipelines || []);
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
      setAvailablePipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPipelines = async () => {
    if (!user?.id) return;

    try {
      // Primeiro, garantir que a tabela existe
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: `
            CREATE TABLE IF NOT EXISTS user_pipeline_links (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id, pipeline_id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_user_id ON user_pipeline_links(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_pipeline_id ON user_pipeline_links(pipeline_id);
          `
        });
      } catch (createError) {
        console.log('Aviso: Não foi possível criar a tabela automaticamente:', createError);
      }

      // Buscar pipelines vinculadas ao usuário
      const { data: userLinks, error: linkError } = await supabase
        .from('user_pipeline_links')
        .select(`
          id,
          pipeline_id,
          pipelines!inner (
            id,
            name,
            description,
            created_at,
            created_by,
            tenant_id
          )
        `)
        .eq('user_id', user.id);

      if (linkError) {
        console.error('Erro ao carregar pipelines do usuário:', linkError);
        
        // Se a tabela não existir, retornar array vazio
        if (linkError.code === '42P01' || linkError.message?.includes('does not exist')) {
          console.log('Tabela user_pipeline_links não existe, retornando array vazio');
          setUserPipelines([]);
          return;
        }
        setUserPipelines([]);
        return;
      }

      // Extrair as pipelines dos links
      const linkedPipelines: Pipeline[] = (userLinks || []).map((link: any) => ({
        id: link.pipelines.id,
        name: link.pipelines.name,
        description: link.pipelines.description,
        created_at: link.pipelines.created_at,
        created_by: link.pipelines.created_by,
        tenant_id: link.pipelines.tenant_id
      }));

      setUserPipelines(linkedPipelines);
    } catch (error) {
      console.error('Erro ao carregar pipelines do usuário:', error);
      setUserPipelines([]);
    }
  };

  const handleLinkToPipeline = async (pipeline: Pipeline) => {
    if (!user?.id) {
      alert('Erro: Usuário não identificado');
      console.error('User ID não encontrado:', user);
      return;
    }

    // Verificar se já está vinculado
    const alreadyLinked = userPipelines.some(p => p.id === pipeline.id);
    if (alreadyLinked) {
      alert('Você já está vinculado a esta pipeline!');
      return;
    }

    try {
      console.log('Tentando vincular pipeline:', {
        user_id: user.id,
        pipeline_id: pipeline.id,
        user_email: user.email
      });

      // Criar o vínculo no banco de dados
      const { data, error } = await supabase
        .from('user_pipeline_links')
        .insert({
          user_id: user.id,
          pipeline_id: pipeline.id
        })
        .select();

      if (error) {
        console.error('Erro detalhado ao vincular pipeline:', error);
        
        // Mensagem de erro mais específica
        if (error.code === '42501') {
          alert('Erro de permissão: Execute o SQL de correção RLS no Supabase');
        } else if (error.code === '23505') {
          alert('Você já está vinculado a esta pipeline!');
        } else {
          alert(`Erro ao vincular pipeline: ${error.message}`);
        }
        return;
      }

      console.log('Pipeline vinculada com sucesso:', data);

      // Atualizar a lista local
      setUserPipelines([...userPipelines, pipeline]);
      alert(`✅ Vinculado com sucesso à pipeline "${pipeline.name}"!`);
      
      // Recarregar as pipelines do usuário para garantir consistência
      await loadUserPipelines();
    } catch (error) {
      console.error('Erro inesperado ao vincular pipeline:', error);
      alert('Erro inesperado ao vincular pipeline');
    }
  };

  const handleUnlinkFromPipeline = async (pipelineId: string) => {
    if (!user?.id) return;
    
    if (!confirm('Tem certeza que deseja desvincular desta pipeline?')) return;
    
    try {
      // Remover o vínculo do banco de dados
      const { error } = await supabase
        .from('user_pipeline_links')
        .delete()
        .eq('user_id', user.id)
        .eq('pipeline_id', pipelineId);

      if (error) {
        console.error('Erro ao desvincular pipeline:', error);
        alert('Erro ao desvincular pipeline');
        return;
      }

      // Atualizar a lista local
      setUserPipelines(userPipelines.filter(p => p.id !== pipelineId));
      alert('Pipeline desvinculada com sucesso!');
    } catch (error) {
      console.error('Erro ao desvincular pipeline:', error);
      alert('Erro ao desvincular pipeline');
    }
  };

  if (!user) return null;

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  const getMenuItems = () => {
    if (user.role === 'super_admin') {
      return [
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Feedback', label: 'Feedback', icon: MessageSquare },
        { id: 'Clientes', label: 'Clientes', icon: Users },
        { id: 'Integrações', label: 'Integrações', icon: Zap }
      ];
    }
    
    if (user.role === 'admin') {
      const baseItems = [
        { id: 'Meta', label: 'Meta', icon: Target },
        { id: 'Vendedores', label: 'Vendedores', icon: Users },
        { id: 'Criador de pipeline', label: 'Criador de pipeline', icon: Settings },
        { id: 'Cadências', label: 'Cadências', icon: Zap },
        { id: 'Criador de formulários', label: 'Criador de formulários', icon: FileText },
        { id: 'Relatório', label: 'Relatório', icon: BarChart3 },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: Eye },
        { id: 'Leads', label: 'Leads', icon: Users }
      ];

      // Se o admin está vinculado a alguma pipeline, adicionar o menu Pipeline
      if (userPipelines.length > 0) {
        baseItems.splice(3, 0, { id: 'Pipeline', label: 'Pipeline', icon: GitBranch });
      }

      return baseItems;
    }
    
    if (user.role === 'member') {
      return [
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

        {/* Seção de Pipelines Vinculadas para Admin */}
        {user.role === 'admin' && userPipelines.length > 0 && !collapsed && (
          <div className="p-4 border-b border-border bg-blue-50/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-900">Pipelines Vinculadas</h3>
              <button
                onClick={() => setShowPipelineModal(true)}
                className="p-1 rounded-md hover:bg-blue-100 transition-colors"
                title="Gerenciar pipelines"
              >
                <Plus className="w-4 h-4 text-blue-600" />
              </button>
            </div>
            <div className="space-y-2">
              {userPipelines.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-900 truncate">{pipeline.name}</span>
                  </div>
                  <button
                    onClick={() => handleUnlinkFromPipeline(pipeline.id)}
                    className="p-1 rounded-md hover:bg-red-100 transition-colors"
                    title="Desvincular"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão para vincular pipelines se admin não tem nenhuma */}
        {user.role === 'admin' && userPipelines.length === 0 && !collapsed && (
          <div className="p-4 border-b border-border">
            <button
              onClick={() => setShowPipelineModal(true)}
              className="w-full p-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Vincular Pipeline</span>
            </button>
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

      {/* Modal de gerenciamento de pipelines */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gerenciar Pipelines</h2>
                    <p className="text-sm text-gray-600">Vincule-se às pipelines que deseja acompanhar</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPipelineModal(false)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando pipelines...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-blue-600" />
                      <span>Pipelines Disponíveis ({availablePipelines.length})</span>
                    </h3>
                    
                    {availablePipelines.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">Nenhuma pipeline encontrada</p>
                        <p className="text-gray-400 text-sm">Crie pipelines no menu "Criador de pipeline" primeiro</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availablePipelines.map((pipeline) => {
                          const isLinked = userPipelines.some(p => p.id === pipeline.id);
                          return (
                            <div key={pipeline.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <GitBranch className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">{pipeline.name}</h4>
                                  {pipeline.description && (
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pipeline.description}</p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span>Criado por: {pipeline.created_by}</span>
                                    <span>Data: {new Date(pipeline.created_at).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                {isLinked ? (
                                  <>
                                    <span className="text-sm text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">✅ Vinculado</span>
                                    <button
                                      onClick={() => handleUnlinkFromPipeline(pipeline.id)}
                                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                                    >
                                      Desvincular
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleLinkToPipeline(pipeline)}
                                    className="px-4 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center space-x-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Vincular</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {userPipelines.length > 0 && (
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <GitBranch className="w-5 h-5 text-green-600" />
                        <span>Suas Pipelines ({userPipelines.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userPipelines.map((pipeline) => (
                          <div key={pipeline.id} className="p-3 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <GitBranch className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900 truncate">{pipeline.name}</span>
                              </div>
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Ativo</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    💡 Dica: Pipelines vinculadas aparecerão no menu "Pipeline" para acompanhamento
                  </div>
                  <button
                    onClick={() => setShowPipelineModal(false)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
                  >
                    <span>Concluído</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CRMSidebar;
