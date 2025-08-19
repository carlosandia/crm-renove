import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { 
  BarChart3, 
  Users, 
  Settings, 
  GitBranch,
  FileText,
  Eye,
  Calendar,
  Link,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronDown,
  MoreHorizontal,
  LayoutGrid,
  Bell,
  Cog,
  PlusCircle,
  MinusCircle,
  Mail
} from 'lucide-react';

// Shadcn/UI Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

// Magic UI Components
import { BlurFade } from './ui/blur-fade';

// NotificationCenter com lazy loading
const NotificationCenter = React.lazy(() => 
  import('./NotificationCenter/NotificationCenter').then(module => ({
    default: module.NotificationCenter
  }))
);

// AIDEV-NOTE: Interface principal do CRMHeader mantém compatibilidade com CRMSidebar
interface CRMHeaderProps {
  activeModule: string;
  onNavigate: (module: string) => void;
  user: any;
  onLogout: () => void;
  subHeaderContent?: React.ReactNode;
}

// AIDEV-NOTE: Categorização inteligente dos menus baseada na análise de uso
interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  category: 'primary' | 'secondary' | 'admin';
}

const CRMHeader: React.FC<CRMHeaderProps> = ({ 
  activeModule, 
  onNavigate, 
  user, 
  onLogout,
  subHeaderContent
}) => {
  // Estados para responsividade
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // Estados para customização do header
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<{
    promoteToHeader: string[]; // IDs dos itens que devem aparecer no header
    hideItems: string[]; // IDs dos itens que devem ser ocultados
  }>({
    promoteToHeader: [],
    hideItems: []
  });

  // AIDEV-NOTE: Carregar configurações do localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(`header-config-${user?.id}`);
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setHeaderConfig(parsedConfig);
      } catch (error) {
        console.warn('Erro ao carregar configurações do header:', error);
      }
    }
  }, [user?.id]);

  // AIDEV-NOTE: Salvar configurações no localStorage
  const saveHeaderConfig = (newConfig: typeof headerConfig) => {
    setHeaderConfig(newConfig);
    localStorage.setItem(`header-config-${user?.id}`, JSON.stringify(newConfig));
  };

  // AIDEV-NOTE: Detectar tamanho da tela para responsividade
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // AIDEV-NOTE: Menu items baseados em role com categorização para responsividade
  const getMenuItems = (): MenuItem[] => {
    if (user?.role === 'super_admin') {
      // AIDEV-NOTE: Super Admin tem APENAS 4 itens específicos conforme CLAUDE.md
      // Relatórios, Feedback, Clientes, Configurações - SEM Dashboard Admin e SEM Admin Notif.
      return [
        { id: 'Relatório', label: 'Relatórios', icon: BarChart3, category: 'primary' },
        { id: 'Feedback', label: 'Feedback', icon: MessageSquare, category: 'primary' },
        { id: 'Clientes', label: 'Clientes', icon: Users, category: 'primary' },
        { id: 'Configurações da Plataforma', label: 'Configurações', icon: Cog, category: 'primary' }
      ];
    }
    
    if (user?.role === 'admin') {
      return [
        { id: 'Dashboard Admin', label: 'Dashboard', icon: BarChart3, category: 'primary' },
        { id: 'Leads', label: 'Leads', icon: Users, category: 'primary' },
        { id: 'Gestão de pipeline', label: 'Negócios', icon: GitBranch, category: 'primary' },
        { id: 'Vendedores', label: 'Equipe', icon: Users, category: 'secondary' },
        { id: 'Gestão de formulários', label: 'Formulários', icon: FileText, category: 'secondary' },
        { id: 'Acompanhamento', label: 'Acompanhamento', icon: Eye, category: 'secondary' }
      ];
    }
    
    if (user?.role === 'member') {
      return [
        { id: 'Meu Dashboard', label: 'Dashboard', icon: BarChart3, category: 'primary' },
        { id: 'Pipeline', label: 'Negócios', icon: GitBranch, category: 'primary' },
        { id: 'Leads', label: 'Leads', icon: Users, category: 'primary' },
        { id: 'Acompanhamento', label: 'Tarefas', icon: Eye, category: 'secondary' },
        { id: 'Integrações', label: 'Integrações', icon: Settings, category: 'secondary' }
      ];
    }
    
    return [];
  };

  const menuItems = getMenuItems();

  // AIDEV-NOTE: Separar menus por categoria considerando customização do usuário
  const allItems = menuItems.filter(item => !headerConfig.hideItems.includes(item.id));
  
  // Itens que foram promovidos para o header
  const promotedItems = allItems.filter(item => 
    headerConfig.promoteToHeader.includes(item.id) && item.category === 'secondary'
  );
  
  // Itens primários + itens promovidos
  const primaryItems = [
    ...allItems.filter(item => item.category === 'primary'),
    ...promotedItems
  ];
  
  // Itens secundários excluindo os promovidos
  const secondaryItems = allItems.filter(item => 
    item.category === 'secondary' && !headerConfig.promoteToHeader.includes(item.id)
  );
  
  // Items admin que não foram movidos para secundário
  const adminItems = allItems.filter(item => item.category === 'admin');

  // AIDEV-NOTE: Função para obter cor do role (mantém compatibilidade com sidebar)
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'from-purple-500 to-purple-600';
      case 'admin': return 'from-blue-500 to-blue-600';
      case 'member': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'member': return 'Vendedor';
      default: return role;
    }
  };

  // AIDEV-NOTE: Componente de customização do header
  const HeaderCustomization: React.FC = () => {
    const availableSecondaryItems = menuItems.filter(item => item.category === 'secondary');
    
    const togglePromoteToHeader = (itemId: string) => {
      const newConfig = { ...headerConfig };
      if (newConfig.promoteToHeader.includes(itemId)) {
        newConfig.promoteToHeader = newConfig.promoteToHeader.filter(id => id !== itemId);
      } else {
        // Limitar a 2 itens promovidos
        if (newConfig.promoteToHeader.length < 2) {
          newConfig.promoteToHeader.push(itemId);
        }
      }
      saveHeaderConfig(newConfig);
    };

    const toggleHideItem = (itemId: string) => {
      const newConfig = { ...headerConfig };
      if (newConfig.hideItems.includes(itemId)) {
        newConfig.hideItems = newConfig.hideItems.filter(id => id !== itemId);
      } else {
        newConfig.hideItems.push(itemId);
        // Se o item estava promovido, removê-lo da promoção
        newConfig.promoteToHeader = newConfig.promoteToHeader.filter(id => id !== itemId);
      }
      saveHeaderConfig(newConfig);
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Promover para Header</h3>
          <p className="text-xs text-gray-500 mb-4">
            Escolha até 2 itens para aparecer sempre no header (máximo 2)
          </p>
          <div className="space-y-2">
            {availableSecondaryItems.map((item) => {
              const IconComponent = item.icon;
              const isPromoted = headerConfig.promoteToHeader.includes(item.id);
              const isHidden = headerConfig.hideItems.includes(item.id);
              const canPromote = headerConfig.promoteToHeader.length < 2 || isPromoted;
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isHidden ? 'bg-gray-50 opacity-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isPromoted ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePromoteToHeader(item.id)}
                      disabled={!canPromote || isHidden}
                      className="h-8 px-3"
                    >
                      <PlusCircle className="w-3 h-3 mr-1" />
                      {isPromoted ? 'No Header' : 'Promover'}
                    </Button>
                    <Button
                      variant={isHidden ? "destructive" : "ghost"}
                      size="sm"
                      onClick={() => toggleHideItem(item.id)}
                      className="h-8 px-3"
                    >
                      <MinusCircle className="w-3 h-3 mr-1" />
                      {isHidden ? 'Mostrar' : 'Ocultar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Itens no header: {headerConfig.promoteToHeader.length}/2
              </p>
              <p className="text-xs text-gray-500">
                Itens ocultos: {headerConfig.hideItems.length}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveHeaderConfig({ promoteToHeader: [], hideItems: [] })}
            >
              Restaurar Padrão
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // AIDEV-NOTE: Renderizar submenu de Integrações
  const renderIntegrationsSubmenu = () => {
    // Verificar se deve mostrar o submenu (para admin e member - Super Admin NÃO tem acesso)
    if (user?.role !== 'admin' && user?.role !== 'member') return null;
    
    const integrationsSubmenuItems = [
      { 
        id: 'config', 
        label: 'Configurações', 
        icon: Cog, 
        path: 'Integrações?tab=config',
        description: 'Tokens API e Webhooks'
      },
      { 
        id: 'calendar', 
        label: 'Google Calendar', 
        icon: Calendar, 
        path: 'Integrações?tab=calendar',
        description: 'Sincronização de eventos'
      },
      { 
        id: 'email', 
        label: 'E-mail pessoal', 
        icon: Mail, 
        path: 'Integrações?tab=email',
        description: 'Configuração SMTP'
      }
    ];

    const isIntegrationsActive = activeModule === 'Integrações';
    
    return (
      <BlurFade delay={0.2}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={isIntegrationsActive ? "default" : "ghost"} 
              className={`gap-2 h-8 px-3 text-sm ${
                isIntegrationsActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Settings className="w-4 h-4" />
              Integrações
              <ChevronDown className="w-3 h-3" />
              {isIntegrationsActive && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-auto" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Módulos de Integração</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {integrationsSubmenuItems.map((subItem) => {
              const SubIconComponent = subItem.icon;
              return (
                <DropdownMenuItem
                  key={subItem.id}
                  onClick={() => onNavigate(subItem.path)}
                  className="gap-3 cursor-pointer p-3 hover:bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    subItem.id === 'config' ? 'bg-blue-100' :
                    subItem.id === 'calendar' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <SubIconComponent className={`w-4 h-4 ${
                      subItem.id === 'config' ? 'text-blue-600' :
                      subItem.id === 'calendar' ? 'text-green-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{subItem.label}</div>
                    <div className="text-xs text-gray-500">{subItem.description}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </BlurFade>
    );
  };

  // AIDEV-NOTE: Componente de item de menu reutilizável
  const NavItem: React.FC<{ 
    item: MenuItem; 
    isActive: boolean; 
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
  }> = ({ item, isActive, size = 'md', showLabel = true }) => {
    const IconComponent = item.icon;
    
    const sizeClasses = {
      sm: 'px-2 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2.5 text-base'
    };

    return (
      <button
        onClick={() => onNavigate(item.id)}
        className={`
          flex items-center gap-2 rounded-lg font-medium transition-all duration-200 hover:scale-105
          ${sizeClasses[size]}
          ${isActive 
            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }
        `}
        title={!showLabel ? item.label : undefined}
      >
        <IconComponent className="w-4 h-4 flex-shrink-0" />
        {showLabel && <span className="truncate">{item.label}</span>}
        {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-auto" />}
      </button>
    );
  };

  // AIDEV-NOTE: Renderização diferente baseada no tamanho da tela
  const renderDesktopMenu = () => (
    <nav className="hidden lg:flex items-center gap-1">
      {/* Menu principal sempre visível */}
      {primaryItems.map((item) => (
        <BlurFade key={item.id} delay={0.1}>
          <NavItem 
            item={item} 
            isActive={activeModule === item.id}
          />
        </BlurFade>
      ))}
      
      {/* Submenu de Integrações */}
      {renderIntegrationsSubmenu()}
      
      {/* Menu secundário em dropdown se existir - OCULTO para Super Admin */}
      {secondaryItems.length > 0 && user?.role !== 'super_admin' && (
        <BlurFade delay={0.2}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-8 px-3 text-sm">
                <PlusCircle className="w-4 h-4" />
                Mais
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Outras Ferramentas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {secondaryItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`gap-2 cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
              {secondaryItems.length > 0 && <DropdownMenuSeparator />}
              <Dialog open={customizationOpen} onOpenChange={setCustomizationOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-blue-600 hover:text-blue-700"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Cog className="w-4 h-4" />
                    Personalizar Header
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Personalizar Header</DialogTitle>
                  </DialogHeader>
                  <HeaderCustomization />
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </BlurFade>
      )}

      {/* Menu admin em dropdown separado se existir - removido pois Integrações foi movido para 'Mais' */}
      {adminItems.length > 0 && adminItems.some(item => item.id !== 'Integrações') && (
        <BlurFade delay={0.3}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-8 px-3 text-sm">
                <Settings className="w-4 h-4" />
                Admin
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Administração</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {adminItems.filter(item => item.id !== 'Integrações').map((item) => {
                const IconComponent = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`gap-2 cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </BlurFade>
      )}
    </nav>
  );

  // AIDEV-NOTE: Menu tablet com itens principais + dropdown para secundários
  const renderTabletMenu = () => (
    <nav className="hidden md:flex lg:hidden items-center gap-1">
      {/* Apenas primários no tablet */}
      {primaryItems.slice(0, 3).map((item) => (
        <BlurFade key={item.id} delay={0.1}>
          <NavItem 
            item={item} 
            isActive={activeModule === item.id}
            size="sm"
          />
        </BlurFade>
      ))}
      
      {/* Submenu de Integrações no tablet */}
      {renderIntegrationsSubmenu()}
      
      {/* Todo o resto em dropdown */}
      {(primaryItems.slice(3).length > 0 || secondaryItems.length > 0 || adminItems.length > 0) && (
        <BlurFade delay={0.2}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 h-8 px-3 text-sm">
                <LayoutGrid className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {primaryItems.slice(3).map((item) => {
                const IconComponent = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`gap-2 cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
              
              {(primaryItems.slice(3).length > 0 && (secondaryItems.length > 0 || adminItems.length > 0)) && (
                <DropdownMenuSeparator />
              )}
              
              {[...secondaryItems, ...adminItems].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`gap-2 cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </BlurFade>
      )}
    </nav>
  );

  // AIDEV-NOTE: Menu mobile hamburger com overlay
  const renderMobileMenu = () => (
    <>
      {/* Botão hamburger */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Overlay mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu content */}
          <div className="absolute top-0 left-0 right-0 bg-background border-b shadow-lg">
            {/* Header do menu mobile */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-gradient-to-br ${getRoleColor(user?.role)} rounded-lg flex items-center justify-center shadow-sm`}>
                  <span className="text-white font-bold text-xs">CRM</span>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">CRM Pro</h2>
                  <p className="text-xs text-muted-foreground">{getRoleDisplayName(user?.role)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Menu items mobile */}
            <nav className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <BlurFade key={item.id} delay={index * 0.05}>
                    <button
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                        ${isActive 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && <div className="w-2 h-2 bg-primary rounded-full ml-auto" />}
                    </button>
                  </BlurFade>
                );
              })}
              
              {/* Seção de Integrações no Mobile - para Admin e Member */}
              {(user?.role === 'admin' || user?.role === 'member') && (
                <>
                  <div className="pt-2 pb-1">
                    <div className="px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Integrações
                    </div>
                  </div>
                  
                  {[
                    { 
                      id: 'config', 
                      label: 'Configurações', 
                      icon: Cog, 
                      path: 'Integrações?tab=config',
                      description: 'Tokens API e Webhooks'
                    },
                    { 
                      id: 'calendar', 
                      label: 'Google Calendar', 
                      icon: Calendar, 
                      path: 'Integrações?tab=calendar',
                      description: 'Sincronização de eventos'
                    },
                    { 
                      id: 'email', 
                      label: 'E-mail pessoal', 
                      icon: Mail, 
                      path: 'Integrações?tab=email',
                      description: 'Configuração SMTP'
                    }
                  ].map((integrationItem, idx) => {
                    const IntegrationIcon = integrationItem.icon;
                    const isIntegrationActive = activeModule === 'Integrações';
                    
                    return (
                      <BlurFade key={integrationItem.id} delay={(menuItems.length + idx + 1) * 0.05}>
                        <button
                          onClick={() => {
                            onNavigate(integrationItem.path);
                            setMobileMenuOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                            ${isIntegrationActive 
                              ? 'bg-primary/10 text-primary border border-primary/20' 
                              : 'text-foreground hover:bg-muted'
                            }
                          `}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            integrationItem.id === 'config' ? 'bg-blue-100' :
                            integrationItem.id === 'calendar' ? 'bg-green-100' : 'bg-purple-100'
                          }`}>
                            <IntegrationIcon className={`w-4 h-4 ${
                              integrationItem.id === 'config' ? 'text-blue-600' :
                              integrationItem.id === 'calendar' ? 'text-green-600' : 'text-purple-600'
                            }`} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{integrationItem.label}</div>
                            <div className="text-xs text-gray-500">{integrationItem.description}</div>
                          </div>
                          {isIntegrationActive && <div className="w-2 h-2 bg-primary rounded-full ml-auto" />}
                        </button>
                      </BlurFade>
                    );
                  })}
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );

  return (
    <BlurFade delay={0.1}>
      <header className="fixed top-0 left-0 right-0 z-50 shadow-sm">
        {/* Header Principal */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center h-[60px] px-4 lg:px-6">
            {/* Logo e branding */}
            <BlurFade delay={0.1}>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-foreground">CRM Pro</h1>
                </div>
              </div>
            </BlurFade>

            {/* Menu de navegação responsivo - imediatamente após o logo */}
            <div className="ml-6">
              {renderDesktopMenu()}
              {renderTabletMenu()}
              {renderMobileMenu()}
            </div>

            {/* Área direita: Notificações + User */}
            <div className="flex items-center gap-2 md:gap-3 ml-auto">
              {/* Sistema de notificações integrado */}
              <BlurFade delay={0.3}>
                <Suspense fallback={
                  <div className="w-10 h-10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-muted-foreground animate-pulse" />
                  </div>
                }>
                  <NotificationCenter className="flex items-center" />
                </Suspense>
              </BlurFade>

              {/* User profile dropdown */}
              <BlurFade delay={0.4}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 focus:ring-2 focus:ring-primary/20">
                      <div className="hidden md:flex flex-col items-start">
                        <span className="text-sm font-medium text-foreground truncate max-w-28">
                          {user?.first_name} {user?.last_name}
                        </span>
                      </div>
                      <div className={`w-8 h-8 bg-gradient-to-br ${getRoleColor(user?.role)} rounded-full flex items-center justify-center text-white font-medium shadow-sm`}>
                        {user?.first_name?.charAt(0) || 'U'}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        onLogout();
                      }}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </BlurFade>
            </div>
          </div>
        </div>

        {/* SubHeader Condicional */}
        {subHeaderContent && (
          <div className="bg-white border-b border-gray-200 relative z-[10000]">
            {subHeaderContent}
          </div>
        )}
      </header>
    </BlurFade>
  );
};

export default CRMHeader;