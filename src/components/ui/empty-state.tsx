import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { 
  FileX, 
  Search, 
  Users, 
  Building, 
  GitBranch, 
  FileText, 
  MessageSquare,
  Plus,
  RefreshCw
} from 'lucide-react';

interface EmptyStateProps {
  variant?: 'companies' | 'leads' | 'pipelines' | 'forms' | 'feedback' | 'search' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'companies':
        return {
          icon: Building,
          defaultTitle: 'Nenhuma empresa encontrada',
          defaultDescription: 'Comece criando sua primeira empresa para gerenciar clientes e administradores.',
          defaultActionLabel: 'Nova Empresa',
          iconClass: 'text-blue-500',
          bgClass: 'bg-blue-50'
        };
      
      case 'leads':
        return {
          icon: Users,
          defaultTitle: 'Nenhum lead encontrado',
          defaultDescription: 'Ainda não há leads neste pipeline. Importe ou crie novos leads para começar.',
          defaultActionLabel: 'Adicionar Lead',
          iconClass: 'text-green-500',
          bgClass: 'bg-green-50'
        };
      
      case 'pipelines':
        return {
          icon: GitBranch,
          defaultTitle: 'Nenhuma pipeline encontrada',
          defaultDescription: 'Crie sua primeira pipeline para organizar e gerenciar seus leads de vendas.',
          defaultActionLabel: 'Criar Pipeline',
          iconClass: 'text-purple-500',
          bgClass: 'bg-purple-50'
        };
      
      case 'forms':
        return {
          icon: FileText,
          defaultTitle: 'Nenhum formulário encontrado',
          defaultDescription: 'Crie formulários personalizados para capturar leads de diferentes fontes.',
          defaultActionLabel: 'Criar Formulário',
          iconClass: 'text-orange-500',
          bgClass: 'bg-orange-50'
        };
      
      case 'feedback':
        return {
          icon: MessageSquare,
          defaultTitle: 'Nenhum feedback encontrado',
          defaultDescription: 'Ainda não há mensagens de feedback. Os usuários podem enviar sugestões e comentários.',
          defaultActionLabel: 'Atualizar',
          iconClass: 'text-indigo-500',
          bgClass: 'bg-indigo-50'
        };
      
      case 'search':
        return {
          icon: Search,
          defaultTitle: 'Nenhum resultado encontrado',
          defaultDescription: 'Tente ajustar os filtros ou termos de busca para encontrar o que procura.',
          defaultActionLabel: 'Limpar Filtros',
          iconClass: 'text-gray-500',
          bgClass: 'bg-gray-50'
        };
      
      default:
        return {
          icon: FileX,
          defaultTitle: 'Nenhum item encontrado',
          defaultDescription: 'Não há dados para exibir no momento.',
          defaultActionLabel: 'Tentar Novamente',
          iconClass: 'text-gray-500',
          bgClass: 'bg-gray-50'
        };
    }
  };

  const config = getVariantConfig();
  const IconComponent = config.icon;

  return (
    <Card className={`text-center py-12 px-6 ${className}`}>
      <div className="mx-auto max-w-md">
        {/* Ícone ilustrativo */}
        <div className={`mx-auto w-20 h-20 rounded-full ${config.bgClass} flex items-center justify-center mb-6`}>
          <IconComponent className={`w-10 h-10 ${config.iconClass}`} />
        </div>
        
        {/* Título */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title || config.defaultTitle}
        </h3>
        
        {/* Descrição */}
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {description || config.defaultDescription}
        </p>
        
        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {onAction && (
            <Button 
              onClick={onAction}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel || config.defaultActionLabel}
            </Button>
          )}
          
          {onSecondaryAction && (
            <Button 
              variant="outline"
              onClick={onSecondaryAction}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {secondaryActionLabel || 'Atualizar'}
            </Button>
          )}
        </div>
        
        {/* Dica adicional para mobile */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 Dica: Use os filtros acima para refinar sua busca
          </p>
        </div>
      </div>
    </Card>
  );
}; 