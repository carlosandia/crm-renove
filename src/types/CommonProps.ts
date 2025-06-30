import { ReactNode } from 'react';

/**
 * 🔧 Interfaces base para eliminação de duplicação de props
 * Elimina repetição de props em 75+ interfaces *Props
 */

// ===== INTERFACES BASE DE MODAL =====

/**
 * Props base para todos os modais do sistema
 */
export interface BaseModalProps {
  /** Controla se o modal está aberto */
  isOpen: boolean;
  /** Função para fechar o modal */
  onClose: () => void;
  /** Título do modal (opcional) */
  title?: string;
  /** Indica se há operação em andamento */
  loading?: boolean;
  /** Conteúdo customizado do header */
  headerContent?: ReactNode;
  /** Classe CSS adicional */
  className?: string;
  /** Controla se o modal pode ser fechado clicando fora */
  closeOnOverlayClick?: boolean;
  /** Tamanho do modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Props para modais de operações CRUD
 */
export interface CrudModalProps<T> extends BaseModalProps {
  /** Item sendo editado (null para criação) */
  item?: T | null;
  /** Função chamada ao salvar */
  onSave: (item: T) => Promise<void> | void;
  /** Função chamada ao deletar (opcional) */
  onDelete?: (id: string) => Promise<void> | void;
  /** Dados iniciais do formulário */
  initialData?: Partial<T>;
  /** Modo do modal */
  mode?: 'create' | 'edit' | 'view';
  /** Indica se está salvando */
  saving?: boolean;
  /** Indica se está deletando */
  deleting?: boolean;
}

/**
 * Props para modais de confirmação
 */
export interface ConfirmModalProps extends BaseModalProps {
  /** Mensagem de confirmação */
  message: string;
  /** Tipo de confirmação */
  type?: 'info' | 'warning' | 'danger' | 'success';
  /** Texto do botão de confirmação */
  confirmText?: string;
  /** Texto do botão de cancelamento */
  cancelText?: string;
  /** Função chamada na confirmação */
  onConfirm: () => Promise<void> | void;
  /** Indica se a ação está sendo executada */
  executing?: boolean;
}

/**
 * Props para modais de detalhes/visualização
 */
export interface DetailsModalProps<T> extends BaseModalProps {
  /** Item sendo visualizado */
  item: T | null;
  /** Função para editar o item */
  onEdit?: (item: T) => void;
  /** Função para deletar o item */
  onDelete?: (item: T) => void;
  /** Ações customizadas */
  actions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: (item: T) => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  /** Indica se pode ser editado */
  canEdit?: boolean;
  /** Indica se pode ser deletado */
  canDelete?: boolean;
}

// ===== INTERFACES DE FILTRO =====

/**
 * Props base para componentes de filtro
 */
export interface FilterProps<T> {
  /** Lista de itens para filtrar */
  items: T[];
  /** Função chamada quando filtros mudam */
  onFilter: (filtered: T[]) => void;
  /** Termo de busca atual */
  searchTerm?: string;
  /** Função para alterar termo de busca */
  onSearchChange?: (term: string) => void;
  /** Placeholder do campo de busca */
  searchPlaceholder?: string;
  /** Filtros ativos */
  activeFilters?: Record<string, any>;
  /** Função para alterar filtros */
  onFiltersChange?: (filters: Record<string, any>) => void;
  /** Indica se está carregando */
  loading?: boolean;
}

/**
 * Props para filtros avançados com múltiplos campos
 */
export interface AdvancedFilterProps<T> extends FilterProps<T> {
  /** Configuração dos campos de filtro */
  filterFields: Array<{
    key: keyof T;
    label: string;
    type: 'text' | 'select' | 'date' | 'number' | 'boolean';
    options?: Array<{ label: string; value: any }>;
    placeholder?: string;
  }>;
  /** Indica se filtros podem ser salvos */
  canSaveFilters?: boolean;
  /** Filtros salvos */
  savedFilters?: Array<{
    id: string;
    name: string;
    filters: Record<string, any>;
  }>;
  /** Função para salvar filtro */
  onSaveFilter?: (name: string, filters: Record<string, any>) => void;
  /** Função para carregar filtro salvo */
  onLoadFilter?: (filters: Record<string, any>) => void;
}

// ===== INTERFACES DE FORMULÁRIO =====

/**
 * Props base para componentes de formulário
 */
export interface FormProps<T> {
  /** Dados iniciais do formulário */
  initialData?: Partial<T>;
  /** Função chamada ao submeter */
  onSubmit: (data: T) => Promise<void> | void;
  /** Função chamada ao cancelar */
  onCancel?: () => void;
  /** Indica se está salvando */
  loading?: boolean;
  /** Modo do formulário */
  mode?: 'create' | 'edit' | 'view';
  /** Schema de validação */
  validationSchema?: any;
  /** Indica se formulário está desabilitado */
  disabled?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Props para formulários em modal
 */
export interface ModalFormProps<T> extends FormProps<T>, BaseModalProps {
  /** Título específico para cada modo */
  titles?: {
    create?: string;
    edit?: string;
    view?: string;
  };
  /** Indica se deve resetar ao fechar */
  resetOnClose?: boolean;
}

// ===== INTERFACES DE LISTA =====

/**
 * Props base para componentes de lista
 */
export interface ListProps<T> {
  /** Itens a serem exibidos */
  items: T[];
  /** Indica se está carregando */
  loading?: boolean;
  /** Mensagem quando lista está vazia */
  emptyMessage?: string;
  /** Função para renderizar item */
  renderItem?: (item: T, index: number) => ReactNode;
  /** Função chamada ao clicar em item */
  onItemClick?: (item: T) => void;
  /** Item selecionado */
  selectedItem?: T | null;
  /** Múltiplos itens selecionados */
  selectedItems?: T[];
  /** Função para seleção múltipla */
  onSelectionChange?: (items: T[]) => void;
  /** Indica se suporta seleção múltipla */
  multiSelect?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Props para listas com paginação
 */
export interface PaginatedListProps<T> extends ListProps<T> {
  /** Página atual */
  currentPage: number;
  /** Total de páginas */
  totalPages: number;
  /** Itens por página */
  pageSize: number;
  /** Total de itens */
  totalItems: number;
  /** Função para mudar página */
  onPageChange: (page: number) => void;
  /** Função para mudar tamanho da página */
  onPageSizeChange?: (size: number) => void;
  /** Opções de tamanho de página */
  pageSizeOptions?: number[];
}

// ===== INTERFACES DE AÇÃO =====

/**
 * Props base para botões de ação
 */
export interface ActionButtonProps {
  /** Texto do botão */
  label?: string;
  /** Ícone do botão */
  icon?: ReactNode;
  /** Função chamada ao clicar */
  onClick: () => void;
  /** Variante visual */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  /** Tamanho do botão */
  size?: 'sm' | 'md' | 'lg';
  /** Indica se está carregando */
  loading?: boolean;
  /** Indica se está desabilitado */
  disabled?: boolean;
  /** Classe CSS adicional */
  className?: string;
  /** Tooltip */
  tooltip?: string;
}

/**
 * Props para grupos de ações
 */
export interface ActionGroupProps {
  /** Lista de ações */
  actions: ActionButtonProps[];
  /** Orientação do grupo */
  orientation?: 'horizontal' | 'vertical';
  /** Espaçamento entre ações */
  spacing?: 'sm' | 'md' | 'lg';
  /** Classe CSS adicional */
  className?: string;
}

// ===== INTERFACES DE DADOS =====

/**
 * Props para componentes que trabalham com dados do Supabase
 */
export interface SupabaseDataProps<T> {
  /** Nome da tabela */
  tableName: string;
  /** Filtros para a query */
  filters?: Record<string, any>;
  /** Campos a serem selecionados */
  select?: string;
  /** Ordenação */
  orderBy?: {
    field: keyof T;
    ascending?: boolean;
  };
  /** Indica se deve fazer fetch automático */
  autoFetch?: boolean;
  /** Função chamada após fetch */
  onDataLoaded?: (data: T[]) => void;
  /** Função chamada em caso de erro */
  onError?: (error: Error) => void;
}

// ===== INTERFACES DE NAVEGAÇÃO =====

/**
 * Props para componentes de tabs
 */
export interface TabsProps {
  /** Tab ativo */
  activeTab: string;
  /** Função para mudar tab */
  onTabChange: (tab: string) => void;
  /** Lista de tabs */
  tabs: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
    badge?: string | number;
  }>;
  /** Variante visual */
  variant?: 'default' | 'pills' | 'underline';
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Props para componentes de stepper
 */
export interface StepperProps {
  /** Passo atual */
  currentStep: number;
  /** Total de passos */
  totalSteps: number;
  /** Lista de passos */
  steps: Array<{
    id: number;
    label: string;
    description?: string;
    icon?: ReactNode;
    completed?: boolean;
    error?: boolean;
  }>;
  /** Função para mudar passo */
  onStepChange?: (step: number) => void;
  /** Orientação */
  orientation?: 'horizontal' | 'vertical';
  /** Classe CSS adicional */
  className?: string;
}

// ===== TIPOS UTILITÁRIOS =====

/**
 * Status padrão para entidades
 */
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived' | 'deleted';

/**
 * Variantes de cor padrão
 */
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

/**
 * Tamanhos padrão
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Props base para qualquer componente
 */
export interface BaseComponentProps {
  /** ID único do componente */
  id?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Estilos inline */
  style?: React.CSSProperties;
  /** Indica se componente está visível */
  visible?: boolean;
  /** Dados de teste */
  'data-testid'?: string;
}

// ===== EXPORTS AGRUPADOS (removidos para evitar conflitos) =====

// Todas as interfaces e tipos estão disponíveis através de exports individuais acima 